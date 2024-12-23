// controllers/gameController.js
const mongoose = require("mongoose");
const { v4: uuidv4 } = require("uuid");
const Game = require("../models/Game");
const Room = require("../models/Room");
const User = require("../models/User");
const { calculateSum, createDeck, shuffleDeck } = require("../utils/helper");
const { ethers } = require("ethers");
const dotenv = require("dotenv");
const BetHandlerABI = require("../smartContracts/BetHandlerABI.json"); // ABI of the smart contract
const roomManager = require("../managers/RoomManager");
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

// controllers/gameController.js

// Replace your createGame with something like this:
const createGame = async (io, socket, roomManager, data) => {
  try {
    // 1. Generate a roomId
    const roomId = `room-${Math.random().toString(36).substring(2, 8)}`;

    // 2. Create DB-based room
    const dbRoom = new Room({
      roomId: roomId,
      isOffline: data.isOffline || false,
      players: [socket.user.id],
    });
    await dbRoom.save();

    // 3. Create DB-based game
    const dbGame = new Game({
      room: dbRoom._id,
      players: [
        {
          user: socket.user.id,
          bet: 0,
          cards: [],
          sum: 0,
          hasAce: false,
          blackjack: false,
        },
      ],
      deck: shuffleDeck(createDeck()),
      gameOn: false,
      currentPlayerIndex: 0,
    });
    await dbGame.save();

    // 4. Link game <-> room in the DB
    dbRoom.game = dbGame._id;
    await dbRoom.save();

    // 5. Create or get an in-memory room
    const memoryRoom = roomManager.createRoom(roomId);
    memoryRoom.setGame(dbGame);   // Link the Mongoose Game doc to memory-based GameRoom
    memoryRoom.addPlayer(socket.user.id);

    // 6. Join the socket.io room
    socket.join(roomId);

    // 7. Optionally emit or callback
    if (data.callback) {
      data.callback({ status: "success", roomId });
    }

    // You might also do an `io.to(socket.id).emit("gameCreated", { roomId });`
    // to let front-end know the creation was successful.

  } catch (error) {
    console.error("Error creating game:", error);
    if (data.callback) {
      data.callback({ status: "error", message: error.message });
    }
  }
};


const joinGame = async (io, socket, roomManager, data) => {
  const { roomId } = data;

  try {
    // 1. Fetch from DB
    const dbRoom = await Room.findOne({ roomId }).populate("players");
    if (!dbRoom) {
      return io.to(socket.id).emit("error", { message: "Room not found." });
    }

    // 2. Ensure room isn't full
    if (dbRoom.players.length >= 7) {
      return io.to(socket.id).emit("error", { message: "Room is full." });
    }

    // 3. Add user to DB-based room
    if (!dbRoom.players.some((p) => p._id.equals(socket.user.id))) {
      dbRoom.players.push(socket.user.id);
      await dbRoom.save();
    }

    // 4. Add user to memory-based room
    let memoryRoom = roomManager.getRoom(roomId);
    if (!memoryRoom) {
      // If it wasn't created in memory for some reason, create it
      memoryRoom = roomManager.createRoom(roomId);
    }
    memoryRoom.addPlayer(socket.user.id);

    // 5. Link DB-based game to the memory-based room
    let dbGame = await Game.findById(dbRoom.game);
    if (dbGame) {
      memoryRoom.setGame(dbGame);
    }

    // 6. Join socket.io room
    socket.join(roomId);

    // 7. Notify all players in that room
    const updatedPlayers = await User.find({ _id: { $in: dbRoom.players } });
    io.to(roomId).emit("playerJoined", { players: updatedPlayers });
  } catch (err) {
    console.error("Error in joinGame:", err);
    io.to(socket.id).emit("error", { message: "Failed to join game." });
  }
};


const timers = {}; // Object to store timers for each room

const handleBet = async (io, socket, data) => {
  const { roomId, betAmount } = data;

  try {
    const room = await Room.findOne({ roomId }).populate("players");
    if (!room) {
      return io.to(socket.id).emit("error", { message: "Room not found." });
    }

    const user = await User.findById(socket.user.id);
    if (!user) {
      return io.to(socket.id).emit("error", { message: "User not found." });
    }

    if (betAmount > user.balance) {
      return io
        .to(socket.id)
        .emit("error", { message: "Insufficient balance." });
    }

    // Deduct bet from user's balance
    user.balance -= betAmount;
    await user.save();

    // Initialize game if it doesn't exist
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
      (p) => p.user.toString() === user._id.toString()
    );
    if (!player) {
      return io.to(socket.id).emit("error", {
        message: "Player not found in the game.",
      });
    }

    // Place the bet
    player.bet += betAmount;

    // Save the game state
    await game.save();

    // Emit updated bets to all players
    io.to(roomId).emit("betsUpdated", { players: game.players });
    if (timers[roomId]) {
      clearTimeout(timers[roomId]); // Clear existing timer
    }
    // Convert players to an array before using `.every`
    const playersArray = Array.isArray(room.players)
      ? room.players
      : [...room.players];
    if (playersArray.every((player) => player.betPlaced)) {
      clearTimeout(timers[roomId]); // Stop the timer
      startGame(io, roomId, room.game); // Start the game
    }
    timers[roomId] = setTimeout(async () => {
      // Start game logic
      try {
        const updatedGame = await Game.findById(game._id);
        if (updatedGame) {
          await startGame(io, roomId, updatedGame);
        }
      } catch (timerError) {
        console.error("Error starting game after timer:", timerError);
      } finally {
        delete timers[roomId];
      }
    }, 60000); // 60 seconds

    // Start a timer if this is the first bet
    if (!timers[roomId]) {
      timers[roomId] = setTimeout(async () => {
        try {
          const updatedRoom = await Room.findOne({ roomId }).populate(
            "players"
          );

          // Move non-betting players to spectators
          updatedRoom.players = updatedRoom.players.filter((playerId) => {
            const gamePlayer = game.players.find(
              (p) => p.user.toString() === playerId.toString()
            );
            if (gamePlayer && gamePlayer.bet === 0) {
              updatedRoom.spectators.push(playerId);
              return false;
            }
            return true;
          });

          await updatedRoom.save();

          // Emit updated room state
          io.to(roomId).emit("playersUpdated", {
            players: updatedRoom.players,
            spectators: updatedRoom.spectators,
          });

          // Start the game
          await startGame(io, roomId, game);
        } catch (error) {
          console.error("Error starting game after timeout:", error);
        } finally {
          // Clean up the timer
          delete timers[roomId];
        }
      }, 60000); // 60 seconds
    }
  } catch (error) {
    console.error("Error placing bet:", error);
    io.to(socket.id).emit("error", { message: "Failed to place bet." });
  }
};

// controllers/gameController.js
// In startGame
const startGame = async (io, roomId, game) => {
  if (game.gameOn) {
    console.log(`Game for room ${roomId} already started.`);
    return; // Exit if game is already active
  }

  game.gameOn = true; // Mark game as active

  try {
    // Ensure the deck is initialized properly
    if (!game.deck || game.deck.length !== 52) {
      game.deck = shuffleDeck(createDeck());
    }

    // Prepare updates for all players
    const playersUpdates = game.players.map((player) => {
      player.cards = [game.deck.pop(), game.deck.pop()];
      player.sum = calculateSum(player.cards);
      player.hasAce = player.cards.some((card) => card.value === "A");
      return player;
    });

    // Deal initial cards to the dealer
    game.dealer.cards = [game.deck.pop(), game.deck.pop()];
    game.dealer.sum = calculateSum(game.dealer.cards);
    game.dealer.hiddenCard = game.dealer.cards[1]; // Hide the second card

    // Save the updated game document
    await Game.findByIdAndUpdate(game._id, {
      $set: {
        players: playersUpdates,
        dealer: game.dealer,
        deck: game.deck,
        gameOn: game.gameOn,
      },
    });

    // Emit game started event
    io.to(roomId).emit("gameStarted", { game });

    // Notify the first player to take action
    // In controllers/gameController.js → startGame()
    const currentPlayer = game.players[game.currentPlayerIndex];
    if (currentPlayer) {
      io.to(currentPlayer.user.toString()).emit("yourTurn", {
        player: currentPlayer,
        game,
      });
    }
  } catch (error) {
    console.error(`Error in startGame: ${error.message}`);
    throw error;
  }
};

const handlePlayerMove = async (io, socket, data) => {
  const { roomId, move } = data;

  const room = await Room.findOne({ roomId }).populate("game");
  if (!room || !room.game) {
    io.to(socket.id).emit("error", { message: "Game not found." });
    return;
  }

  const game = await Game.findById(room.game).populate("players.user");
  if (!game.gameOn) {
    io.to(socket.id).emit("error", { message: "Game is not active." });
    return;
  }

  // Identify the current player
  const currentPlayer = game.players[game.currentPlayerIndex];
  if (!currentPlayer) {
    io.to(socket.id).emit("error", { message: "No current player found." });
    return;
  }

  // If the move is already in progress, block new moves
  if (currentPlayer.moveInProgress) {
    io.to(socket.id).emit("error", { message: "Move already in progress." });
    return;
  }

  // Mark move as in progress
  currentPlayer.moveInProgress = true;
  await game.save();

  try {
    // --- Perform the chosen move ---
    if (move === "hit") {
      const card = game.deck.pop();
      currentPlayer.cards.push(card);
      currentPlayer.sum = calculateSum(currentPlayer.cards);

      if (currentPlayer.sum > 21) {
        io.to(roomId).emit("playerBusted", {
          playerId: currentPlayer.user._id,
        });
        await nextPlayer(io, roomId, game);
      } else if (currentPlayer.sum === 21) {
        io.to(roomId).emit("player21", { playerId: currentPlayer.user._id });
        await nextPlayer(io, roomId, game);
      } else {
        // Let the same player continue if they want to hit again
        io.to(roomId).emit("playerHit", {
          playerId: currentPlayer.user._id,
          card,
        });
      }
    } else if (move === "stand") {
      io.to(roomId).emit("playerStands", { playerId: currentPlayer.user._id });
      await nextPlayer(io, roomId, game);
    } else if (move === "doubleDown") {
      // Double down logic
    }

    // Store the player's chosen move in the database
    currentPlayer.move = move;
    await game.save();
  } catch (err) {
    console.error("Error handling player move:", err);
    io.to(socket.id).emit("error", { message: err.message });
  } finally {
    // **Always reset the moveInProgress flag!**
    currentPlayer.moveInProgress = false;
    await game.save();
  }
};
// Next player logic
const nextPlayer = async (io, roomId, game) => {
  // Move to next index
  game.currentPlayerIndex += 1;
  await game.save();

  // If we've passed the last player, go to dealer turn
  if (game.currentPlayerIndex >= game.players.length) {
    await dealerTurn(io, roomId, game);
    return;
  }

  // Identify the next player
  const nextPlayerObj = game.players[game.currentPlayerIndex];

  // Notify the next player
  io.to(nextPlayerObj.user.toString()).emit("yourTurn", {
    player: nextPlayerObj,
    game,
  });

  // Start a 60-second timeout in case the next player doesn't move
setTimeout(async () => {
  // Re-fetch the game
  const updatedGame = await Game.findById(game._id).populate("players.user");
  const updatedPlayer = updatedGame.players[updatedGame.currentPlayerIndex];

  // If this player STILL hasn’t made a move, default to "stand"
  if (!updatedPlayer.move) {
    updatedPlayer.move = "stand";
    console.log(`Player ${updatedPlayer.user._id} defaulted to Stand.`);
    await updatedGame.save();
    await nextPlayer(io, roomId, updatedGame);
  }
}, 60000);
};

const dealerTurn = async (io, roomId, game) => {
  game.isDealerTurn = true;
  if (game.deck.length === 0) {
    game.deck = shuffleDeck(createDeck());
  }

  io.to(roomId).emit("dealerRevealed", { card: game.dealer.hiddenCard });

  game.dealer.sum = calculateSum(game.dealer.cards);

  while (game.dealer.sum < 17) {
    const card = game.deck.pop();
    game.dealer.cards.push(card);
    game.dealer.sum = calculateSum(game.dealer.cards);

    io.to(roomId).emit("dealerHit", { card, sum: game.dealer.sum });

    if (game.dealer.sum > 21) {
      io.to(roomId).emit("dealerBusted", { sum: game.dealer.sum });
      await concludeGame(io, roomId, game);
      return;
    }
  }

  io.to(roomId).emit("dealerStands", { sum: game.dealer.sum });
  await concludeGame(io, roomId, game);
};

const concludeGame = async (io, roomId, game) => {
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

  // Emit game concluded event
  io.to(roomId).emit("gameConcluded", {
    players: game.players,
    dealerSum: game.dealer.sum,
  });

  // Reset game state for next round
  game.resetGame();
  await game.save();
};

const handleWinPayout = async (player) => {
  try {
    const tx = await betHandlerContract.payoutWin(
      player.user.walletAddress,
      player.bet
    );
    await tx.wait();

    const user = await User.findById(player.user._id);
    user.balance += player.bet * 2;
    await user.save();
  } catch (error) {
    console.error("Smart contract transaction failed:", error.message);
  }
};

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

const gameService = require("../services/gameService");
const { param } = require("express-validator");

const createGameExpress = async (req, res) => {
  try {
    const room = await gameService.createGameRoom({
      nickname: req.body.nickname,
      avatar: req.body.avatar,
      isOffline: req.body.isOffline,
      userId: req.user._id,
    });

    res.status(201).json({
      success: true,
      roomId: room.roomId,
      room,
    });
  } catch (error) {
    console.error("Error creating game:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

const joinGameExpress = async (req, res) => {
  const { roomId } = req.params; // Extract roomId from URL parameters
  const { nickname, avatar } = req.body; // Extract other data from body
  const userId = req.user._id; // Extract userId from authenticated user

  try {
    // Fetch the user using userId
    let user = await User.findById(userId);
    if (!user) {
      return res
        .status(401)
        .json({ success: false, message: "User not found." });
    }

    // Find the room
    const room = await Room.findOne({ roomId })
      .populate("players")
      .populate("spectators");
    if (!room) {
      return res
        .status(404)
        .json({ success: false, message: "Room not found." });
    }

    // Check if room is full
    if (room.players.length >= 7) {
      return res.status(400).json({ success: false, message: "Room is full." });
    }

    // Add player to the room
    room.players.push(user._id);
    await room.save();

    const updatedPlayers = await User.find({ _id: { $in: room.players } });

    res.status(200).json({ success: true, players: updatedPlayers });
  } catch (error) {
    console.error("Error joining game:", error);
    res.status(500).json({ success: false, message: "Failed to join game." });
  }
};
const placeBetExpress = async (req, res) => {
  const { betAmount } = req.body;
  const { roomId } = req.params;
  const userId = req.user._id;

  try {
    const result = await gameService.placeBet({ roomId, betAmount, userId });
    res.status(200).json({
      success: true,
      message: "Bet placed successfully.",
      data: result,
    });
  } catch (error) {
    console.error("Error placing bet:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

const playerMoveExpress = async (req, res) => {
  const { roomId, move, userId } = req.body;

  try {
    // Fetch game and perform move logic
    // ...

    res
      .status(200)
      .json({ success: true, message: "Move executed successfully." });
  } catch (error) {
    console.error("Error executing move:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to execute move." });
  }
};

const leaveGameExpress = async (req, res) => {
  const { roomId, userId } = req.body;

  try {
    const room = await Room.findOne({ roomId })
      .populate("players")
      .populate("spectators");
    if (!room) {
      return res
        .status(404)
        .json({ success: false, message: "Room not found." });
    }

    // Remove user from players
    room.players = room.players.filter(
      (playerId) => playerId.toString() !== userId.toString()
    );
    // Optionally, add to spectators
    room.spectators.push(userId);

    await room.save();

    const updatedPlayers = await User.find({ _id: { $in: room.players } });

    res.status(200).json({ success: true, players: updatedPlayers });

    // If no players left, delete the room and associated game
    if (room.players.length === 0) {
      if (room.game) {
        await Game.findByIdAndDelete(room.game);
      }
      await Room.findByIdAndDelete(room._id);
      res.status(200).json({
        success: true,
        message: "Room has been closed due to no active players.",
      });
    }
  } catch (error) {
    console.error("Error leaving game:", error);
    res.status(500).json({ success: false, message: "Failed to leave game." });
  }
};

module.exports = {
  createGame,
  joinGame,
  handleBet,
  handlePlayerMove,
  concludeGame,
  createGameExpress,
  joinGameExpress,
  placeBetExpress,
  playerMoveExpress,
  leaveGameExpress,
  startGame,
};
