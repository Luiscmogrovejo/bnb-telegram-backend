const timerManager = require("../utils/timerManager");
const {
  createGame,
  joinGame,
  handleBet,
  handlePlayerMove,
  concludeGame,
  startGame,
} = require("../controllers/gameController");
const { leaveGame } = require("../controllers/roomController");
const jwt = require("jsonwebtoken");
const dotenv = require("dotenv");

dotenv.config();

// Middleware to authenticate WebSocket connections
const authenticateSocket = (socket, next) => {
  const token = socket.handshake.auth.token; // Extract token from handshake
  if (!token) {
    return next(new Error("Authentication error: No token provided"));
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET); // Verify JWT
    socket.user = decoded; // Attach decoded user to socket
    next();
  } catch (err) {
    next(new Error("Authentication error: Invalid token"));
  }
};

module.exports = (io, socket, roomManager) => {
  // Authenticate socket connection
  authenticateSocket(socket, (err) => {
    if (err) {
      console.error("Socket authentication error:", err.message);
      socket.disconnect();
      return;
    }
  });

  console.log(`Socket connected: ${socket.id}`);

  // Handle creating a game
  socket.on("createGame", (data, callback) => {
    try {
      createGame(io, socket, roomManager, { ...data, callback });
    } catch (err) {
      console.error("Error in createGame:", err.message);
      callback({ status: "error", message: "Failed to create game." });
    }
  });

  // Start the game manually
  socket.on("startGame", async ({ roomId }, callback) => {
    try {
      const room = roomManager.getRoom(roomId); // Retrieve the room
      if (!room) throw new Error("Room not found");

      const game = roomManager.getGameForRoom(roomId); // Retrieve the game
      if (!game) throw new Error("Game not found");

      await startGame(io, roomId, game); // Call the startGame logic
      callback({ status: "success", message: "Game started successfully" });

      // Notify all players in the room
      io.to(roomId).emit("gameStarted", { game });
    } catch (error) {
      console.error("Error in startGame:", error.message);
      callback({ status: "error", message: error.message });
    }
  });

  // Handle joining a game
  socket.on("joinGame", async ({ roomId }, callback) => {
    try {
      await joinGame(io, socket, { roomId, userId: socket.user.id });
      callback({ status: "success" });
    } catch (err) {
      console.error("Error in joinGame:", err.message);
      callback({ status: "error", message: "Failed to join game." });
    }
  });

  // Handle placing a bet
  socket.on("placeBet", async ({ roomId, betAmount }, callback) => {
    try {
      await handleBet(io, socket, {
        roomId,
        betAmount,
        userId: socket.user.id,
      });
      callback({ status: "success" });

      const room = roomManager.getRoom(roomId);
      const game = room.getGame();
      const playersArray = Array.isArray(room.players)
        ? room.players
        : [...room.players];

      if (room && game && playersArray.every((p) => p.betPlaced)) {
        timerManager.clearTimer(roomId);
        startGame(io, roomId, game);
      } else {
        timerManager.setTimer(
          roomId,
          () => {
            startGame(io, roomId, game);
          },
          60000
        );
      }
    } catch (err) {
      console.error("Error in placeBet:", err.message);
      callback({ status: "error", message: "Failed to place bet." });
    }
  });

socket.on("playerMove", async ({ roomId, move }, callback) => {
  try {
    await handlePlayerMove(io, socket, { roomId, move });
    callback({ status: "success" });
  } catch (err) {
    console.error("Error in playerMove:", err.message);
    callback({ status: "error", message: "Failed to execute move." });
  }
});

  // Handle leaving a game
  socket.on("leaveGame", async ({ roomId }, callback) => {
    try {
      await leaveGame(io, socket, { roomId, userId: socket.user.id }); // Use leaveGame
      callback({ status: "success" });
    } catch (error) {
      console.error("Error in leaveGame:", error);
      callback({ status: "error", message: error.message });
    }
  });

  // Handle disconnection
  socket.on("disconnect", () => {
    console.log(`Client disconnected: ${socket.id}`);
  });
};
