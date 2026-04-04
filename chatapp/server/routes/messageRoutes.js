const express = require("express");
const router = express.Router();
const Message = require("../models/Message");

//  GET messages by group
router.get("/:groupId", async (req, res) => {
  try {
    const messages = await Message.find({
      groupId: req.params.groupId
    }).populate("sender", "name");

    res.json(messages);
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Error fetching messages" });
  }
});

//  SEND message
router.post("/", async (req, res) => {
  try {
    const { text, groupId, sender } = req.body;

    const message = new Message({
      text,
      groupId,
      sender,
    });

    await message.save();

    res.json(message);
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Error sending message" });
  }
});

module.exports = router;