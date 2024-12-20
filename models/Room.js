// models/Room.js

const mongoose = require("mongoose");

const RoomSchema = new mongoose.Schema({
  roomId: {
    type: String,
    required: true,
    unique: true,
  },
  isOffline: {
    type: Boolean,
    default: false,
  },
  players: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  ],
  spectators: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  ],
  game: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Game",
  },
  status: {
    type: String,
    enum: ["active", "closed"],
    default: "active",
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: { expires: "24h" }, // Automatically delete after 24 hours
  },
});

module.exports = mongoose.model("Room", RoomSchema);
