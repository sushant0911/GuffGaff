import User from "../models/user.model.js";
import Message from "../models/message.model.js";

import cloudinary from "../lib/cloudinary.js";
import { getReceiverSocketId, io } from "../lib/socket.js";
import { encryptMessage, decryptMessage } from "../lib/encryption.js";

export const getUsersForSidebar = async (req, res) => {
  try {
    const loggedInUserId = req.user._id;
    const filteredUsers = await User.find({ _id: { $ne: loggedInUserId } }).select("-password");

    res.status(200).json(filteredUsers);
  } catch (error) {
    console.error("Error in getUsersForSidebar: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getMessages = async (req, res) => {
  try {
    const { id: userToChatId } = req.params;
    const myId = req.user._id;

    const messages = await Message.find({
      $or: [
        { senderId: myId, receiverId: userToChatId },
        { senderId: userToChatId, receiverId: myId },
      ],
    });

    // Decrypt all messages before sending to client
    const decryptedMessages = messages.map((msg) => {
      const decrypted = msg.toObject();
      if (decrypted.text) {
        decrypted.text = decryptMessage(decrypted.text);
      }
      return decrypted;
    });

    res.status(200).json(decryptedMessages);
  } catch (error) {
    console.log("Error in getMessages controller: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const sendMessage = async (req, res) => {
  try {
    const { text, image } = req.body;
    const { id: receiverId } = req.params;
    const senderId = req.user._id;

    let imageUrl;
    if (image) {
      // Upload base64 image to cloudinary
      const uploadResponse = await cloudinary.uploader.upload(image);
      imageUrl = uploadResponse.secure_url;
    }

    // Encrypt the text message
    const encryptedText = text ? encryptMessage(text) : null;

    const newMessage = new Message({
      senderId,
      receiverId,
      text: encryptedText,
      image: imageUrl,
    });

    await newMessage.save();

    // Prepare message for real-time emission (decrypt for display)
    const messageForEmit = newMessage.toObject();
    if (messageForEmit.text) {
      messageForEmit.text = decryptMessage(messageForEmit.text);
    }

    const receiverSocketId = getReceiverSocketId(receiverId);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("newMessage", messageForEmit);
    }

    res.status(201).json(messageForEmit);
  } catch (error) {
    console.log("Error in sendMessage controller: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};
