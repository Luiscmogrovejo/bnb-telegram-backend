// sockets/gameSockets.js

const {
  createGame,
  joinGame,
  handleBet,
  handlePlayerMove,
  concludeGame, // Ensure this is exported
} = require("../controllers/gameController");
const { leaveGame } = require("../controllers/roomController");
const jwt = require("jsonwebtoken");
const dotenv = require("dotenv");

dotenv.config();

// Function to authenticate socket connections
const authenticateSocket = (socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) {
    return next(new Error("Authentication error: No token provided"));
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.user = decoded; // Attach user info to socket
    next();
  } catch (err) {
    next(new Error("Authentication error: Invalid token"));
  }
};

module.exports = (io, socket) => {
  // Apply authentication middleware
  authenticateSocket(socket, (err) => {
    if (err) {
      socket.emit("authenticationError", { message: err.message });
      socket.disconnect();
      return;
    }

    // Create a new game
    socket.on("createGame", async (data, callback) => {
      try {
        await createGame(io, socket, { ...data, userId: socket.user.id });
        callback({ status: "success" });
      } catch (error) {
        console.error("Error in createGame:", error);
        callback({ status: "error", message: error.message });
      }
    });

    // Join an existing game
    socket.on("joinGame", async (data, callback) => {
      try {
        await joinGame(io, socket, { ...data, userId: socket.user.id });
        callback({ status: "success" });
      } catch (error) {
        console.error("Error in joinGame:", error);
        callback({ status: "error", message: error.message });
      }
    });

    // Handle placing a bet
    socket.on("placeBet", async (data, callback) => {
      try {
        await handleBet(io, socket, { ...data, userId: socket.user.id });
        callback({ status: "success" });
      } catch (error) {
        console.error("Error in placeBet:", error);
        callback({ status: "error", message: error.message });
      }
    });

    // Handle player moves (Hit, Stand, Double Down)
    socket.on("playerMove", async (data, callback) => {
      try {
        await handlePlayerMove(io, socket, { ...data, userId: socket.user.id });
        callback({ status: "success" });
      } catch (error) {
        console.error("Error in playerMove:", error);
        callback({ status: "error", message: error.message });
      }
    });

    // Handle leaving the game
    socket.on("leaveGame", async (data, callback) => {
      try {
        await leaveGame(io, socket, { ...data, userId: socket.user.id });
        callback({ status: "success" });
      } catch (error) {
        console.error("Error in leaveGame:", error);
        callback({ status: "error", message: error.message });
      }
    });

    // Additional socket event handlers can be added here
  });
};
