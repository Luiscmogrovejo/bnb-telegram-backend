// models/Game.js

const mongoose = require("mongoose");
const { shuffleDeck, createDeck } = require("../utils/helper"); // Add this line

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

GameSchema.pre("save", function (next) {
  if (this.deck.length !== 52) {
    return next(new Error("Deck must contain exactly 52 cards."));
  }
  next();
});

GameSchema.virtual("remainingCards").get(function () {
  return this.deck.length;
});


// In Game model
GameSchema.methods.resetGame = function () {
  this.players.forEach(player => {
    player.bet = 0;
    player.cards = [];
    player.sum = 0;
    player.hasAce = false;
    player.isReady = false;
    player.blackjack = false;
    player.hasLeft = false;
  });
  this.dealer = { cards: [], sum: 0, hiddenCard: null };
  this.deck = shuffleDeck(createDeck());
  this.gameOn = false;
  this.currentPlayerIndex = 0;
  this.isDealerTurn = false;
};

module.exports = mongoose.model("Game", GameSchema);
