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

    // ... (Your imports and initSocketServer code remain the same)

    socket.on("ai-message", async (messagePayload) => {
      try {
        // 1. Save and Vectorize User Message
        const [message, vectors] = await Promise.all([
          messageModel.create({
            chat: messagePayload.chat,
            content: messagePayload.content,
            user: socket.user._id,
            role: "user",
          }),
          aiService.generateVector(messagePayload.content),
        ]);

        // 2. Fetch Memories and History
        const [memory, chatHistoryRaw] = await Promise.all([
          queryMemory({
            queryVector: vectors,
            limit: 3,
            metadata: { user: socket.user._id },
          }),
          messageModel
            .find({ chat: messagePayload.chat })
            .sort({ createdAt: -1 })
            .limit(15) // Keep a concise history
            .lean(),
        ]);

        const chatHistory = chatHistoryRaw.reverse();

        // 3. Format history for Gemini SDK
        const formattedHistory = chatHistory.map((item) => ({
          role: item.role === "model" ? "model" : "user",
          parts: [{ text: item.content }],
        }));

        // 4. Inject Long-term Context into the CURRENT user message
        // This ensures we always end on a user role and include the RAG data
        const context =
          memory.length > 0
            ? `[Memory Context: ${memory.map((m) => m.metadata.text).join(" | ")}]\n\n`
            : "";

        if (formattedHistory.length > 0) {
          const lastIndex = formattedHistory.length - 1;
          formattedHistory[lastIndex].parts[0].text =
            context + formattedHistory[lastIndex].parts[0].text;
        } else {
          // Fallback for first message
          formattedHistory.push({
            role: "user",
            parts: [{ text: context + messagePayload.content }],
          });
        }

        // 5. Get AI Response
        const aiResponseText =
          await aiService.generateResponse(formattedHistory);

        // 6. Emit to Frontend immediately for UX
        socket.emit("ai-message-response", {
          content: aiResponseText,
          chat: messagePayload.chat,
        });

        // 7. Save AI Response and Vectorize (Background)
        const [aiMsg, aiVectors] = await Promise.all([
          messageModel.create({
            chat: messagePayload.chat,
            content: aiResponseText,
            user: socket.user._id,
            role: "model",
          }),
          aiService.generateVector(aiResponseText),
        ]);

        if (aiVectors) {
          createMemory({
            vectors: aiVectors,
            messageId: aiMsg._id,
            metadata: {
              chat: messagePayload.chat,
              user: socket.user._id,
              text: aiResponseText,
            },
          });
        }
      } catch (error) {
        console.error("Socket Logic Error:", error);
        socket.emit("ai-message-response", {
          content: "❌ Something went wrong in my circuits!",
          chat: messagePayload.chat,
        });
      }
    });
  });
}

module.exports = initSocketServer;
