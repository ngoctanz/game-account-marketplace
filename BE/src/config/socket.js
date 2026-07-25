import { Server } from "socket.io";
import { corsOptions } from "./cors.js";

let io;

export const initSocket = (httpServer) => {
  io = new Server(httpServer, {
    cors: corsOptions,
  });

  io.on("connection", (socket) => {
    console.log(`[WebSocket] Client connected: ${socket.id}`);

    // Just log when disconnected
    socket.on("disconnect", () => {
      console.log(`[WebSocket] Client disconnected: ${socket.id}`);
    });
  });

  return io;
};

export const getIo = () => {
  if (!io) {
    throw new Error("Socket.io not initialized!");
  }
  return io;
};
