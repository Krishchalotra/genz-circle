const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema({
  text:     { type: String },
  group:    { type: String },
  userId:   { type: String },
  userName: { type: String },
  time:     { type: String },
  status:   { type: String, default: "sent" },
  fileData: { type: String },   // base64
  fileName: { type: String },
  fileType: { type: String },   // mime type
}, { timestamps: true });

module.exports = mongoose.model("Message", messageSchema);
