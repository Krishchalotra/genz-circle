const express = require("express");
const router = express.Router();
const User = require("../models/User");
const Message = require("../models/Message");
const Group = require("../models/Group");

// GET /api/users/profile/:userId
router.get("/profile/:userId", async (req, res) => {
  try {
    const user = await User.findById(req.params.userId).select("-password");
    if (!user) return res.status(404).json({ message: "User not found" });

    // groups the user has sent at least one message in
    const groupNames = await Message.distinct("group", { userId: req.params.userId });
    const groups = await Group.find({ name: { $in: groupNames } }).select("name interest");

    // basic activity stats
    const totalMessages = await Message.countDocuments({ userId: req.params.userId });
    const lastMsg = await Message.findOne({ userId: req.params.userId }).sort({ _id: -1 });

    res.json({
      user,
      groups,
      activity: {
        totalMessages,
        lastSeen: lastMsg?.time || null,
        memberSince: user.createdAt,
      },
    });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
