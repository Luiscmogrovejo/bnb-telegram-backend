// sockets/gameSockets.js

const {
  createGame,
  joinGame,
  handleBet,
  handlePlayerMove,
} = require("../controllers/gameController");
const { leaveGame } = require("../controllers/roomController");

module.exports = (io, socket) => {
  // Create a new game
  socket.on("createGame", async (data) => {
    await createGame(io, socket, data);
  });

  // Join an existing game
  socket.on("joinGame", async (data) => {
    await joinGame(io, socket, data);
  });

  // Handle placing a bet
  socket.on("placeBet", async (data) => {
    await handleBet(io, socket, data);
  });

  // Handle player moves (Hit, Stand, Double Down)
  socket.on("playerMove", async (data) => {
    await handlePlayerMove(io, socket, data);
  });

  // Handle leaving the game
  socket.on("leaveGame", async (data) => {
    await leaveGame(io, socket, data);
  });

  // Additional socket event handlers can be added here
};
