import { io } from "socket.io-client";

// SINGLE socket instance (VERY IMPORTANT)
const socket = io("http://localhost:5000", {
  autoConnect: true,
});

// optional debug
socket.on("connect", () => {
  console.log("Connected:", socket.id);
});

export default socket;