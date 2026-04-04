import { io } from "socket.io-client";

const URL = import.meta.env.VITE_SERVER_URL || "http://localhost:5000";

const socket = io(URL, {
  autoConnect: true,
  reconnection: true,
  reconnectionAttempts: Infinity,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  timeout: 20000,
  transports: ["websocket", "polling"], // fallback to polling for iOS
});

socket.on("connect", () => console.log("Socket connected:", socket.id));
socket.on("disconnect", (reason) => console.warn("Socket disconnected:", reason));
socket.on("connect_error", (err) => console.error("Socket error:", err.message));

export default socket;
