"use client";

import { useEffect } from "react";
import { io } from "socket.io-client";

export function SocketProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Only connect on the client side
    if (typeof window === "undefined") return;

    // We assume the backend socket runs on the same port as the API
    // (extract origin from NEXT_PUBLIC_API_URL or use a fallback)
    let socketUrl = "http://localhost:8081"; // default to BE port we used earlier
    const apiUrl = process.env.NEXT_PUBLIC_API_URL;
    if (apiUrl) {
      try {
        const urlObj = new URL(apiUrl);
        socketUrl = urlObj.origin;
      } catch (e) {
        console.error("Invalid API URL for socket connection");
      }
    }

    const socket = io(socketUrl, {
      transports: ["websocket", "polling"],
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    console.log(`[WebSocket] Đang thử kết nối tới: ${socketUrl}`);

    socket.on("connect", () => {
      console.log(`[WebSocket] Connected successfully with ID: ${socket.id}`);
      // toast.success("Đã kết nối Socket Server!"); // Bỏ comment nếu muốn hiện thông báo
    });

    socket.on("disconnect", (reason) => {
      console.log(`[WebSocket] Disconnected from server. Lỗi: ${reason}`);
    });

    socket.on("connect_error", (error) => {
      console.error(`[WebSocket] Lỗi kết nối tới ${socketUrl}:`, error.message);
      // toast.error("Lỗi kết nối Socket Server", { description: error.message });
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  return <>{children}</>;
}
