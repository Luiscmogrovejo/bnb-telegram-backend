// services/gameService.js

const mongoose = require("mongoose");
const { v4: uuidv4 } = require("uuid");
const Game = require("../models/Game");
const Room = require("../models/Room");
const User = require("../models/User");
const { calculateSum, createDeck, shuffleDeck } = require("../utils/helper");
const { ethers } = require("ethers");
const dotenv = require("dotenv");
const BetHandlerABI = require("../smartContracts/BetHandlerABI.json");

dotenv.config();

// Initialize Ethereum Provider and Contract
const provider = new ethers.providers.InfuraProvider(
  "sepolia",
  process.env.INFURA_PROJECT_ID
);
const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
const betHandlerContract = new ethers.Contract(
  process.env.SMART_CONTRACT_ADDRESS,
  BetHandlerABI.abi,
  wallet
);

// Timer storage
const timers = {};

const createGameRoom = async ({ nickname, avatar, isOffline, userId }) => {
  const roomId = uuidv4().split("-")[0]; // Shorten UUID for simplicity

  console.log("Creating room for user:", userId); // Debugging line

  const room = new Room({
    roomId,
    isOffline,
    players: [userId], // Correctly set userId
    spectators: [],
  });

  await room.save();

  return room;
};

// Join an existing game room
const joinGameRoom = async ({ roomId, userId }) => {
  const room = await Room.findOne({ roomId })
    .populate("players")
    .populate("spectators");
  if (!room) {
    throw new Error("Room not found.");
  }

  if (room.players.length >= 7) {
    throw new Error("Room is full.");
  }

  room.players.push(userId);
  await room.save();

  const updatedPlayers = await User.find({ _id: { $in: room.players } });

  return updatedPlayers;
};

// Place a bet
const placeBet = async ({ roomId, betAmount, userId }) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const room = await Room.findOne({ roomId })
      .populate("players")
      .session(session);
    if (!room) {
      throw new Error("Room not found.");
    }

    const user = await User.findById(userId).session(session);
    if (!user) {
      throw new Error("User not found.");
    }

    if (betAmount > user.balance) {
      throw new Error("Insufficient balance.");
    }

    // Deduct bet from user's balance
    user.balance -= betAmount;
    await user.save({ session });

    // If no game exists, create one
    let game;
    if (!room.game) {
      game = new Game({
        room: room._id,
        players: room.players.map((playerId) => ({
          user: playerId,
          bet: 0,
          cards: [],
          sum: 0,
          hasAce: false,
          isReady: false,
          blackjack: false,
          hasLeft: false,
        })),
        dealer: {
          cards: [],
          sum: 0,
          hiddenCard: null,
        },
        deck: shuffleDeck(createDeck()),
        gameOn: false,
        currentPlayerIndex: 0,
        isDealerTurn: false,
      });
      await game.save();
      room.game = game._id;
      await room.save();
    } else {
      game = await Game.findById(room.game);
    }

    // Find the player in the game
    const player = game.players.find(
      (p) => p.user.toString() === userId.toString()
    );
    if (!player) {
      throw new Error("Player not found in the game.");
    }

    // Place the bet
    player.bet += betAmount;

    // Emit updated bets to all players (handled by caller)

    // Start the timer if it's the first bet
    if (!timers[roomId]) {
      timers[roomId] = setTimeout(() => {
        startGame(roomId, game);
        delete timers[roomId];
      }, 60000); // 60 seconds
    }

    await game.save();

    await session.commitTransaction();
    session.endSession();

    return { game, timerStarted: !timers[roomId] };
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw error;
  }
};

// Start the game
const startGame = async (roomId, game) => {
  game.gameOn = true;

  // Deal initial cards to players
  for (let player of game.players) {
    player.cards.push(game.deck.pop());
    player.cards.push(game.deck.pop());
    player.sum = calculateSum(player.cards);
    player.hasAce = player.cards.some((card) => card.value === "A");
    if (player.sum === 21) {
      player.blackjack = true;
      // Handle blackjack payout via smart contract
      await handleBlackjackPayout(player);
    }
  }

  // Deal initial cards to dealer
  game.dealer.cards.push(game.deck.pop());
  game.dealer.cards.push(game.deck.pop());
  game.dealer.sum = calculateSum(game.dealer.cards);
  game.dealer.hasAce = game.dealer.cards.some((card) => card.value === "A");
  game.dealer.hiddenCard = game.dealer.cards[1]; // Second card is hidden

  await game.save();

  // Emit game started event (handled by caller)

  // Notify the first player to take action (handled by caller)
};

// Handle player move (Hit, Stand, Double Down)
const handlePlayerMove = async ({ roomId, move, userId }) => {
  const room = await Room.findOne({ roomId }).populate("game");
  if (!room || !room.game) {
    throw new Error("Game not found.");
  }

  const game = await Game.findById(room.game)
    .populate("players.user")
    .populate("dealer");
  if (!game.gameOn) {
    throw new Error("Game is not active.");
  }

  const currentPlayer = game.players[game.currentPlayerIndex];
  if (
    currentPlayer.user.walletAddress !== userId // Adjusted to match userId
  ) {
    throw new Error("Not your turn.");
  }

  if (move === "hit") {
    const card = game.deck.pop();
    currentPlayer.cards.push(card);
    currentPlayer.sum = calculateSum(currentPlayer.cards);
    currentPlayer.hasAce = currentPlayer.cards.some(
      (card) => card.value === "A"
    );

    if (currentPlayer.sum > 21) {
      // Player busts
      // Handle bust (emit event via caller)
      await game.save();
      nextPlayer(roomId, game);
    } else if (currentPlayer.sum === 21) {
      // Player has 21
      // Handle 21 (emit event via caller)
      await game.save();
      nextPlayer(roomId, game);
    } else {
      // Continue player's turn
      // Handle hit (emit event via caller)
    }

    await game.save();
  } else if (move === "stand") {
    // Player stands, move to next player
    // Handle stand (emit event via caller)
    nextPlayer(roomId, game);
    await game.save();
  } else if (move === "doubleDown") {
    if (currentPlayer.bet > currentPlayer.user.balance) {
      throw new Error("Insufficient balance for Double Down.");
    }

    // Double the bet
    currentPlayer.bet *= 2;
    currentPlayer.user.balance -= currentPlayer.bet;
    await currentPlayer.user.save();

    // Draw one final card
    const card = game.deck.pop();
    currentPlayer.cards.push(card);
    currentPlayer.sum = calculateSum(currentPlayer.cards);
    currentPlayer.hasAce = currentPlayer.cards.some(
      (card) => card.value === "A"
    );

    if (currentPlayer.sum > 21) {
      // Player busts
      // Handle bust (emit event via caller)
    }

    // Move to next player
    nextPlayer(roomId, game);
    await game.save();
  }
};

// Move to the next player
const nextPlayer = async (roomId, game) => {
  game.currentPlayerIndex += 1;

  if (game.currentPlayerIndex >= game.players.length) {
    // All players have played, proceed to dealer's turn
    await dealerTurn(roomId, game);
  } else {
    // Notify next player to take action (handled by caller)
  }
};

// Dealer's turn
const dealerTurn = async (roomId, game) => {
  game.isDealerTurn = true;

  // Reveal dealer's hidden card (emit event via caller)

  // Calculate dealer's sum
  game.dealer.sum = calculateSum(game.dealer.cards);
  game.dealer.hasAce = game.dealer.cards.some((card) => card.value === "A");

  // Dealer hits until sum >= 17
  while (game.dealer.sum < 17) {
    const card = game.deck.pop();
    game.dealer.cards.push(card);
    game.dealer.sum = calculateSum(game.dealer.cards);
    game.dealer.hasAce = game.dealer.cards.some((card) => card.value === "A");

    // Emit dealer hit event (handled by caller)

    await game.save();

    if (game.dealer.sum > 21) {
      // Dealer busts
      // Emit dealer bust event via caller
      await concludeGame(roomId, game);
      return;
    }
  }

  // Dealer stands
  // Emit dealer stands event via caller
  await concludeGame(roomId, game);
};

// Conclude the game by comparing players' hands with the dealer
const concludeGame = async (roomId, game) => {
  // Compare each player's sum with dealer's sum
  for (let player of game.players) {
    if (player.sum > 21) {
      // Player already busted
      continue;
    }
    if (player.blackjack) {
      // Player has blackjack, payout 1.5x via smart contract
      await handleBlackjackPayout(player);
      continue;
    }
    if (game.dealer.sum > 21) {
      // Dealer busted, player wins
      await handleWinPayout(player);
    } else if (player.sum > game.dealer.sum) {
      // Player wins
      await handleWinPayout(player);
    } else if (player.sum === game.dealer.sum) {
      // Push, refund bet via smart contract
      await handlePushPayout(player);
    } else {
      // Player loses, bet already deducted
      // Optionally, notify player
    }
  }

  // Emit game concluded event (handled by caller)

  // Reset game state for next round
  game.resetGame();
  await game.save();
};

// Handle win payout
const handleWinPayout = async (player) => {
  try {
    // Payout via smart contract
    const tx = await betHandlerContract.payoutWin(
      player.user.walletAddress,
      player.bet
    );
    await tx.wait();

    // Update player's balance locally
    const user = await User.findById(player.user._id);
    user.balance += player.bet * 2;
    await user.save();
  } catch (error) {
    console.error("Smart contract transaction failed:", error);
    // Implement compensating actions, such as reverting the balance deduction
    console.log("Reverting balance deduction...");
    // Optionally, notify the user about the failure
    console.log("Notifying user about the failure...");
  }
};

// Handle push payout
const handlePushPayout = async (player) => {
  // Refund bet via smart contract
  try {
    const tx = await betHandlerContract.payoutPush(
      player.user.walletAddress,
      player.bet
    );
    await tx.wait();
  } catch (error) {
    console.error("Smart contract transaction failed:", error);
  }

  // Update player's balance locally
  const user = await User.findById(player.user._id);
  user.balance += player.bet;
  await user.save();
};

// Handle blackjack payout
const handleBlackjackPayout = async (player) => {
  // Payout 1.5x via smart contract
  try {
    const tx = await betHandlerContract.payoutBlackjack(
      player.user.walletAddress,
      player.bet
    );
    await tx.wait();
  } catch (error) {
    console.error("Smart contract transaction failed:", error);
  }

  // Update player's balance locally
  const user = await User.findById(player.user._id);
  user.balance += player.bet * 1.5;
  await user.save();
};

module.exports = {
  createGameRoom,
  joinGameRoom,
  placeBet,
  handlePlayerMove,
  concludeGame,
  startGame,
  dealerTurn,
  handleWinPayout,
  handlePushPayout,
  handleBlackjackPayout,
};
