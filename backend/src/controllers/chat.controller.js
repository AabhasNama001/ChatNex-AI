// const chatModel = require("../models/chat.model");
// const messageModel = require("../models/message.model");

// async function createChat(req, res) {
//   const { title } = req.body;

//   const user = req.user;

//   const chat = await chatModel.create({
//     user: user._id,
//     title,
//   });

//   res.status(201).json({
//     message: "Chat created successfully",
//     chat: {
//       _id: chat._id,
//       title: chat.title,
//       lastActivity: chat.lastActivity,
//       user: chat.user,
//     },
//   });
// }

// async function getChats(req, res) {
//   const user = req.user;
//   const chats = await chatModel.find({ user: user._id });
//   res.status(200).json({
//     message: "Chats fetched successfully",
//     chats: chats.map((chat) => ({
//       _id: chat._id,
//       title: chat.title,
//       lastActivity: chat.lastActivity,
//       user: chat.user,
//     })),
//   });
// }

// async function getMessages(req, res) {
//   const chatId = req.params.id;
//   const messages = await messageModel
//     .find({ chat: chatId })
//     .sort({ createdAt: 1 });

//   res.status(200).json({
//     message: "Messages fetched successfully",
//     messages: messages,
//   });
// }

// module.exports = { createChat, getChats, getMessages };

const chatModel = require("../models/chat.model");
const messageModel = require("../models/message.model");

async function createChat(req, res) {
  const { title } = req.body;
  const user = req.user;

  try {
    const chat = await chatModel.create({
      user: user._id,
      title,
    });

    res.status(201).json({
      message: "Chat created successfully",
      chat: {
        _id: chat._id,
        title: chat.title,
        lastActivity: chat.lastActivity,
        user: chat.user,
      },
    });
  } catch (error) {
    console.error("Error creating chat:", error);
    res.status(500).json({ message: "Server error while creating chat." });
  }
}

async function getChats(req, res) {
  const user = req.user;
  try {
    const chats = await chatModel.find({ user: user._id });
    res.status(200).json({
      message: "Chats fetched successfully",
      chats: chats.map((chat) => ({
        _id: chat._id,
        title: chat.title,
        lastActivity: chat.lastActivity,
        user: chat.user,
      })),
    });
  } catch (error) {
    console.error("Error fetching chats:", error);
    res.status(500).json({ message: "Server error while fetching chats." });
  }
}

async function getMessages(req, res) {
  const chatId = req.params.id;
  try {
    const messages = await messageModel
      .find({ chat: chatId })
      .sort({ createdAt: 1 });

    res.status(200).json({
      message: "Messages fetched successfully",
      messages: messages,
    });
  } catch (error) {
    console.error("Error fetching messages:", error);
    res.status(500).json({ message: "Server error while fetching messages." });
  }
}

// ✨ NEW: Function to delete a chat and its messages
async function deleteChat(req, res) {
  const chatId = req.params.id;
  const user = req.user;

  try {
    // Ensure the chat exists and belongs to the user requesting deletion
    const chat = await chatModel.findOne({ _id: chatId, user: user._id });

    if (!chat) {
      return res
        .status(404)
        .json({ message: "Chat not found or you don't have permission." });
    }

    // Use a transaction to ensure both operations succeed or fail together
    // For simplicity here, we'll do them sequentially.

    // 1. Delete all messages associated with the chat
    await messageModel.deleteMany({ chat: chatId });

    // 2. Delete the chat itself
    await chatModel.findByIdAndDelete(chatId);

    res.status(200).json({ message: "Chat deleted successfully." });
  } catch (error) {
    console.error("Error deleting chat:", error);
    res.status(500).json({ message: "Server error while deleting chat." });
  }
}

module.exports = { createChat, getChats, getMessages, deleteChat };
