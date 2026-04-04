const express = require("express");
const router = express.Router();
const Group = require("../models/Group");
const Message = require("../models/Message");

// GET all groups with last message preview
router.get("/", async (req, res) => {
  const groups = await Group.find();
  const groupsWithLastMessage = await Promise.all(
    groups.map(async (group) => {
      const lastMessage = await Message.findOne({ group: group.name }).sort({ createdAt: -1 });
      return {
        ...group._doc,
        lastMessage: lastMessage?.text || "",
        lastMessageTime: lastMessage?.time || "",
      };
    })
  );
  res.json(groupsWithLastMessage);
});

// CREATE group
router.post("/create", async (req, res) => {
  const { name, interest, userId } = req.body;

  const group = new Group({
    name,
    interest,
    admin: userId, // creator becomes admin
  });

  await group.save();
  res.json(group);
});

// JOIN group
router.post("/join/:id", async (req, res) => {
  const group = await Group.findById(req.params.id);

  if (!group.members.includes(req.body.userId)) {
    group.members.push(req.body.userId);
    await group.save();
  }

  res.json(group);
});

module.exports = router;