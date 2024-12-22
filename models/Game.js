// models/Game.js

const mongoose = require("mongoose");
const { shuffleDeck, createDeck } = require("../utils/helper");

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
    blackjack: {
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
  deck: {
    type: [CardSchema],
    default: () => shuffleDeck(createDeck()), // Default to a shuffled deck
    validate: {
      validator: function (deck) {
        return deck.length === 52;
      },
      message: "Deck must contain exactly 52 cards.",
    },
  },
  gameOn: {
    type: Boolean,
    default: false,
  },
  currentPlayerIndex: {
    type: Number,
    default: 0,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

GameSchema.methods.resetGame = function () {
  this.players.forEach((player) => {
    player.bet = 0;
    player.cards = [];
    player.sum = 0;
    player.hasAce = false;
    player.blackjack = false;
  });
  this.dealer = { cards: [], sum: 0, hiddenCard: null };
  this.deck = shuffleDeck(createDeck()); // Reset the deck
  this.gameOn = false;
  this.currentPlayerIndex = 0;
};

module.exports = mongoose.model("Game", GameSchema);
