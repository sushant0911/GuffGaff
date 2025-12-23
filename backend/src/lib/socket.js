import { Server } from "socket.io";
import http from "http";
import express from "express";

const app = express();
const server = http.createServer(app);

// Only enable real Socket.IO server when explicitly allowed.
// This makes the code safe to import in serverless environments
// (e.g. Vercel) where long-lived sockets are not supported.
const ENABLE_SOCKETS = process.env.ENABLE_SOCKETS === "true";

let io;
const userSocketMap = {}; // {userId: socketId}

export function getReceiverSocketId(userId) {
  return userSocketMap[userId];
}

if (ENABLE_SOCKETS) {
  io = new Server(server, {
    cors: {
      origin: ["http://localhost:5173", process.env.CLIENT_URL].filter(Boolean),
      credentials: true,
    },
  });

  io.on("connection", (socket) => {
    console.log("A user connected", socket.id);

    const userId = socket.handshake.query.userId;
    if (userId) userSocketMap[userId] = socket.id;

    io.emit("getOnlineUsers", Object.keys(userSocketMap));

    socket.on("disconnect", () => {
      console.log("A user disconnected", socket.id);
      delete userSocketMap[userId];
      io.emit("getOnlineUsers", Object.keys(userSocketMap));
    });
  });
} else {
  // Provide a minimal io stub so imports don't fail in serverless builds.
  io = {
    on: () => {},
    emit: () => {},
    to: () => ({ emit: () => {} }),
  };
}

export { io, app, server };
