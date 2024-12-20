// models/User.js

const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema({
  walletAddress: {
    type: String,
    required: true,
    unique: true,
  },
  nickname: {
    type: String,
    default: "Player",
  },
  avatar: {
    type: String,
    default: "default",
  },
  balance: {
    type: Number,
    default: 1000, // Starting balance
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("User", UserSchema);
