const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const http = require("http");
const { Server } = require("socket.io");
const messageRoutes = require("./routes/messageRoutes");
require("dotenv").config();

const Message = require("./models/Message");
const groupRoutes = require("./routes/groupRoutes");
const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");

const app = express();
const server = http.createServer(app);

app.use(cors());
app.use(express.json());

app.use("/api/groups", groupRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/users", userRoutes);

process.on("uncaughtException", (err) => {
  console.log("CRASH ERROR:", err);
});

mongoose
  .connect(process.env.MONGO_URI)
  .then(async () => {
    console.log("MongoDB connected");

    const Group = require("./models/Group");
    const allGroups = await Group.find();
    const seen = new Set();
    for (const g of allGroups) {
      if (seen.has(g.name)) {
        await Group.deleteOne({ _id: g._id });
      } else {
        seen.add(g.name);
      }
    }

    const count = await Group.countDocuments();
    if (count === 0) {
      await Group.insertMany([
        { name: "Programming" },
        { name: "Gaming" },
        { name: "AI" },
        { name: "Photography" },
      ]);
      console.log("Default groups seeded");
    }
  })
  .catch((err) => console.error(err));

const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] },
});

// { groupName: Map(socketId -> userName) }
const onlineUsers = {};

// { groupName: Set(userName) }
const deleteVotes = {};

async function doDeleteGroup(group) {
  const Group = require("./models/Group");
  await Group.deleteOne({ name: group });
  await Message.deleteMany({ group });
  delete deleteVotes[group];
  delete onlineUsers[group];
  io.to(group).emit("group_deleted", { group });
  console.log(`Group "${group}" deleted`);
}

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  socket.on("join_group", (groupName, userName) => {
    if (userName) {
      const prevGroup = socket.data.group;
      if (prevGroup && prevGroup !== groupName && onlineUsers[prevGroup]) {
        onlineUsers[prevGroup].delete(socket.id);
        io.to(prevGroup).emit("online_users", Array.from(onlineUsers[prevGroup].values()));
      }
      socket.data.group = groupName;
      socket.data.userName = userName;
      if (!onlineUsers[groupName]) onlineUsers[groupName] = new Map();
      onlineUsers[groupName].set(socket.id, userName);
      io.to(groupName).emit("online_users", Array.from(onlineUsers[groupName].values()));
    }
    socket.join(groupName);
    console.log("Joined group:", groupName, userName ? `| user: ${userName}` : "(passive)");
  });

  socket.on("get_messages", async (groupName) => {
    try {
      const messages = await Message.find({ group: groupName }).sort({ _id: 1 }).limit(100);
      socket.emit("load_messages", messages);
    } catch (err) {
      console.error("Error loading messages:", err);
    }
  });

  socket.on("send_message", async (data) => {
    try {
      console.log("send_message received:", data);

      // server-side size guard — base64 of 2MB image ≈ 2.7MB string
      const MAX_BASE64 = 2.7 * 1024 * 1024;
      if (data.fileData && data.fileData.length > MAX_BASE64) {
        socket.emit("upload_error", { message: "Image too large. Max size is 2MB." });
        return;
      }

      // block empty messages
      if (!data.text?.trim() && !data.fileData) return;

      socket.join(data.group);
      const message = new Message({
        text:     data.text,
        group:    data.group,
        userId:   data.userId,
        userName: data.userName,
        time:     data.time,
        status:   "sent",
        fileData: data.fileData || null,
        fileName: data.fileName || null,
        fileType: data.fileType || null,
      });
      await message.save();
      console.log("Message saved:", message._id);
      await Message.findByIdAndUpdate(message._id, { status: "delivered" });
      io.to(data.group).emit("receive_message", {
        ...data,
        id: message._id,
        status: "delivered",
      });
    } catch (err) {
      console.error("Error saving message:", err);
    }
  });

  socket.on("mark_seen", async ({ group, userName }) => {
    const result = await Message.updateMany(
      { group, userName: { $ne: userName }, status: { $ne: "seen" } },
      { status: "seen" }
    );
    if (result.modifiedCount > 0) {
      socket.to(group).emit("messages_seen", { by: userName });
    }
  });

  // REQUEST DELETE — admin only
  socket.on("request_delete_group", async ({ group, userId, userName }) => {
    const Group = require("./models/Group");
    const groupData = await Group.findOne({ name: group });
    if (!groupData) return;

    // if group has an admin set, only admin can initiate delete
    if (groupData.admin && groupData.admin !== userId) {
      socket.emit("delete_error", { message: "Only the group admin can delete this group" });
      return;
    }

    if (!deleteVotes[group]) deleteVotes[group] = new Set();
    deleteVotes[group].add(userName);

    const activeMembers = onlineUsers[group]
      ? Array.from(onlineUsers[group].values()).filter((n) => n && n.trim() !== "")
      : [userName];
    const onlineCount = activeMembers.length;
    const voteCount = deleteVotes[group].size;

    console.log(`Delete requested: "${group}" by ${userName} | ${voteCount}/${onlineCount}`);

    io.to(group).emit("delete_vote_request", {
      group,
      initiator: userName,
      votes: voteCount,
      total: onlineCount,
    });

    // single user — delete immediately
    if (onlineCount <= 1) {
      await doDeleteGroup(group);
    }
  });

  // VOTE
  socket.on("vote_delete_group", async ({ group, userName, approve }) => {
    if (!approve) {
      delete deleteVotes[group];
      io.to(group).emit("delete_vote_cancelled", { group, by: userName });
      console.log(`Delete cancelled: "${group}" by ${userName}`);
      return;
    }

    if (!deleteVotes[group]) deleteVotes[group] = new Set();
    deleteVotes[group].add(userName);

    const activeMembers = onlineUsers[group]
      ? Array.from(onlineUsers[group].values()).filter((n) => n && n.trim() !== "")
      : [];
    const onlineCount = Math.max(activeMembers.length, 1);
    const voteCount = deleteVotes[group].size;

    console.log(`Vote: "${group}" by ${userName} | ${voteCount}/${onlineCount}`);
    io.to(group).emit("delete_vote_update", { group, votes: voteCount, total: onlineCount });

    if (voteCount >= onlineCount) {
      await doDeleteGroup(group);
    }
  });

  // LEAVE GROUP
  socket.on("leave_group", ({ group, userName }) => {
    socket.leave(group);
    if (onlineUsers[group]) {
      onlineUsers[group].delete(socket.id);
      io.to(group).emit("online_users", Array.from(onlineUsers[group].values()));
    }
    socket.data.group = null;
    console.log(`${userName} left group: ${group}`);

    // if a vote was in progress and this user was the last needed, cancel it
    if (deleteVotes[group]) {
      const remaining = onlineUsers[group]
        ? Array.from(onlineUsers[group].values()).filter((n) => n && n.trim() !== "")
        : [];
      if (remaining.length === 0) {
        delete deleteVotes[group];
      } else {
        io.to(group).emit("delete_vote_update", {
          group,
          votes: deleteVotes[group].size,
          total: remaining.length,
        });
      }
    }
  });

  // DELETE MESSAGE
  socket.on("delete_message", async ({ messageId, group, userName }) => {
    const msg = await Message.findById(messageId);
    if (!msg) return;
    if (msg.userName !== userName) return;
    await Message.findByIdAndDelete(messageId);
    // find new last message for sidebar update
    const lastMsg = await Message.findOne({ group }).sort({ _id: -1 });
    io.to(group).emit("message_deleted", {
      messageId,
      group,
      newLastMessage: lastMsg?.text || "",
      newLastMessageTime: lastMsg?.time || "",
    });
  });

  // TYPING
  socket.on("typing", ({ group, userName }) => {
    socket.to(group).emit("typing", userName);
  });

  socket.on("stop_typing", ({ group }) => {
    socket.to(group).emit("stop_typing");
  });

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
    const group = socket.data.group;
    if (group && onlineUsers[group]) {
      onlineUsers[group].delete(socket.id);
      io.to(group).emit("online_users", Array.from(onlineUsers[group].values()));

      // edge case: vote in progress, user disconnected
      if (deleteVotes[group]) {
        const remaining = Array.from(onlineUsers[group].values()).filter((n) => n && n.trim() !== "");
        if (remaining.length === 0) {
          // no one left, cancel vote
          delete deleteVotes[group];
        } else {
          // update vote count with new total
          io.to(group).emit("delete_vote_update", {
            group,
            votes: deleteVotes[group].size,
            total: remaining.length,
          });
          // check if remaining votes are now enough
          if (deleteVotes[group].size >= remaining.length) {
            doDeleteGroup(group);
          }
        }
      }
    }
  });
});

app.get("/", (req, res) => res.send("GenZ Circle API Running"));

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
