const { Server } = require("socket.io");

function initSocket(server) {

  const io = new Server(server, {
    cors: {
      origin: "http://localhost:5173",
      methods: ["GET", "POST"]
    }
  });

  io.on("connection", (socket) => {

    console.log("User connected:", socket.id);

    //  join group room
    socket.on("joinGroup", (groupId) => {
      socket.join(groupId);
      console.log("Joined group:", groupId);
    });

    // send message to group
    socket.on("sendMessage", (data) => {
      io.to(data.groupId).emit("receiveMessage", data);
    });

    socket.on("disconnect", () => {
      console.log("User disconnected:", socket.id);
    });

  });

}

module.exports = initSocket;