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
    } catch (error) {}
  });

  io.on("connection", (socket) => {
    /*  console.log("User Connected", socket.user);
    console.log("New Socket connection:", socket.id); */

    socket.on("ai-message", async (messagePayload) => {
      console.log(messagePayload);

      /* 
      // Task1: User message save in DB
      const message = await messageModel.create({
        chat: messagePayload.chat,
        content: messagePayload.content,
        user: socket.user._id,
        role: "user",
      });

      // Task2: Conversion of our message into vector
      const vectors = await aiService.generateVector(messagePayload.content); 
      */

      // These two tasks are independent of each other so we can do both of them together
      // This optimize our code as lesser time will be taken
      // Task1: User message save in DB
      const [message, vectors] = await Promise.all([
        messageModel.create({
          chat: messagePayload.chat,
          content: messagePayload.content,
          user: socket.user._id,
          role: "user",
        }),
        // Task2: Conversion of our message into vector
        aiService.generateVector(messagePayload.content),
      ]);

      // Task3: Storing the converted message in vector database(Pinecone)
      createMemory({
        vectors,
        messageId: message._id,
        metadata: {
          chat: messagePayload.chat,
          user: socket.user._id,
          text: messagePayload.content,
        },
      });

      /* 
      // Task4: Query Pinecone for related memories
      const memory = await queryMemory({
        queryVector: vectors,
        limit: 3,
        metadata: {
          user: socket.user._id,
        },
      });
      */

      /*
     // Task5: Get chat history from the DB
      const chatHistory = (
        await messageModel
          .find({
            chat: messagePayload.chat,
          })
          .sort({ createdAt: -1 })
          .limit(20)
          .lean()
      ).reverse();
      */

      const [memory, chatHistoryRaw] = await Promise.all([
        // Task4: Query Pinecone for related memories
        queryMemory({
          queryVector: vectors,
          limit: 3,
          metadata: {
            user: socket.user._id,
          },
        }),
        // Task5: Get chat history from the DB (latest 20)
        messageModel
          .find({ chat: messagePayload.chat })
          .sort({ createdAt: -1 })
          .limit(20)
          .lean(),
      ]);
      // reverse after awaiting, so it's oldest → newest
      const chatHistory = chatHistoryRaw.reverse();

      const shortTermMemory = chatHistory.map((item) => {
        return {
          role: item.role,
          parts: [{ text: item.content }],
        };
      });

      const longTermMemory = [
        {
          role: "user",
          parts: [
            {
              text: `
          these are some previous messages from the chat, use them to generate a response.

          ${memory.map((item) => item.metadata.text).join("\n")}
          `,
            },
          ],
        },
      ];

      // Task6: Generate Response of the message from AI.
      const response = await aiService.generateResponse([
        ...longTermMemory,
        ...shortTermMemory,
      ]);

      /*
        // Task7: Save AI Response in DB 
        const responseMessage = await messageModel.create({
        chat: messagePayload.chat,
        content: response,
        user: socket.user._id,
        role: "model",
      });
      */

      /*
      // Task8: AI Response will now again converted into vector
      const responseVectors = await aiService.generateVector(response);
      */

      // Task10(final): Send AI response to the user
      socket.emit("ai-message-response", {
        content: response,
        chat: messagePayload.chat,
      });

      const [responseMessage, responseVectors] = await Promise.all([
        // Task7: Save AI Response in DB
        messageModel.create({
          chat: messagePayload.chat,
          content: response,
          user: socket.user._id,
          role: "model",
        }),
        // Task8: Generate vector for AI response
        aiService.generateVector(response),
      ]);

      // Task9: The converted response is now stored in vector database
      await createMemory({
        vectors: responseVectors,
        messageId: responseMessage._id,
        metadata: {
          chat: messagePayload.chat,
          user: socket.user._id,
          text: response,
        },
      });
    });
  });
}

module.exports = initSocketServer;
