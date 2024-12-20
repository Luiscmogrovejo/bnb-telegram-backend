// models/Game.js

const mongoose = require("mongoose");

const CardSchema = new mongoose.Schema(
  {
    suit: String,
    value: String,
    img: String,
  },
  { _id: false }
);

const PlayerSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    bet: {
      type: Number,
      default: 0,
    },
    cards: [CardSchema],
    sum: {
      type: Number,
      default: 0,
    },
    hasAce: {
      type: Boolean,
      default: false,
    },
    isReady: {
      type: Boolean,
      default: false,
    },
    blackjack: {
      type: Boolean,
      default: false,
    },
    hasLeft: {
      type: Boolean,
      default: false,
    },
  },
  { _id: false }
);

const GameSchema = new mongoose.Schema({
  room: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Room",
  },
  players: [PlayerSchema],
  dealer: {
    cards: [CardSchema],
    sum: {
      type: Number,
      default: 0,
    },
    hiddenCard: CardSchema,
  },
  deck: [CardSchema],
  gameOn: {
    type: Boolean,
    default: false,
  },
  currentPlayerIndex: {
    type: Number,
    default: 0,
  },
  isDealerTurn: {
    type: Boolean,
    default: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("Game", GameSchema);
