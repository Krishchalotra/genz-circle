const mongoose = require("mongoose");

const groupSchema = new mongoose.Schema({
  name: String,
  interest: String,
  members: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  admin: String, // userId of the group admin
}, { timestamps: true });

module.exports = mongoose.model("Group", groupSchema);