const { Server } = require("socket.io");
const cookie = require("cookie");
const jwt = require("jsonwebtoken");
const userModel = require("../models/user.model");
const aiService = require("../services/ai.service");
const messageModel = require("../models/message.model");
const { createMemory, queryMemory } = require("../services/vector.service");

function initSocketServer(httpServer) {
  const io = new Server(httpServer, {
    cors: {
      origin: "http://localhost:5173",
      allowedHeaders: ["Content-Type", "Authorization"],
      credentials: true,
    },
  });

  io.use(async (socket, next) => {
    const cookies = cookie.parse(socket.handshake.headers?.cookie || "");

    if (!cookies.token) {
      next(new Error("Authentication error: No token provided"));
    }

    try {
      const decoded = jwt.verify(cookies.token, process.env.JWT_SECRET);

      const user = await userModel.findById(decoded.id);

      socket.user = user;

      next();
    } catch (error) {
      console.error("Socket auth error:", error.message);
      next(new Error("Authentication error"));
    }
  });

  io.on("connection", (socket) => {
    /*  console.log("User Connected", socket.user);
    console.log("New Socket connection:", socket.id); */

    // ... (Auth and connection code remains same)

    socket.on("ai-message", async (messagePayload) => {
      try {
        // Task 1 & 2: Save and Vectorize
        const [message, vectors] = await Promise.all([
          messageModel.create({
            chat: messagePayload.chat,
            content: messagePayload.content,
            user: socket.user._id,
            role: "user",
          }),
          aiService.generateVector(messagePayload.content),
        ]);

        // Guard Clause for Vector Storage
        if (vectors) {
          createMemory({
            vectors,
            messageId: message._id,
            metadata: {
              chat: messagePayload.chat,
              user: socket.user._id,
              text: messagePayload.content,
            },
          });
        }

        // Task 4 & 5: Retrieve Memory and History
        const [memory, chatHistoryRaw] = await Promise.all([
          queryMemory({
            queryVector: vectors,
            limit: 3,
            metadata: { user: socket.user._id },
          }),
          messageModel
            .find({ chat: messagePayload.chat })
            .sort({ createdAt: -1 })
            .limit(20)
            .lean(),
        ]);

        const chatHistory = chatHistoryRaw.reverse();

        // Task 6: Prepare Payload for Gemini
        // We combine the memories into a single context block
        const contextFromMemory =
          memory.length > 0
            ? `Context from previous conversations:\n${memory.map((item) => item.metadata.text).join("\n")}\n\n`
            : "";

        const shortTermMemory = chatHistory.map((item) => ({
          role: item.role === "model" ? "model" : "user", // Ensure correct role mapping
          parts: [{ text: item.content }],
        }));

        // IMPORTANT: Inject the long-term memory into the current prompt or the first message
        const fullConversation = [...shortTermMemory];

        // Add the RAG context to the last message to keep it relevant
        if (fullConversation.length > 0) {
          fullConversation[fullConversation.length - 1].parts[0].text =
            contextFromMemory +
            fullConversation[fullConversation.length - 1].parts[0].text;
        }

        // Task 6: Generate Response
        // Pass the full array to generateResponse
        const response = await aiService.generateResponse(fullConversation);

        // Task 10: Immediate UI Feedback
        socket.emit("ai-message-response", {
          content: response,
          chat: messagePayload.chat,
        });

        // Task 7, 8, & 9: Post-response processing
        const [responseMessage, responseVectors] = await Promise.all([
          messageModel.create({
            chat: messagePayload.chat,
            content: response,
            user: socket.user._id,
            role: "model",
          }),
          aiService.generateVector(response),
        ]);

        if (responseVectors) {
          await createMemory({
            vectors: responseVectors,
            messageId: responseMessage._id,
            metadata: {
              chat: messagePayload.chat,
              user: socket.user._id,
              text: response,
            },
          });
        }
      } catch (error) {
        console.error("Socket Message Error:", error);
        socket.emit("error", { message: "Failed to process AI message" });
      }
    });
  });
}

module.exports = initSocketServer;
