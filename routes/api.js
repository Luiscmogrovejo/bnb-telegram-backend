// routes/api.js

const express = require("express");
const router = express.Router();
const {
  createGame,
  joinGame,
  handleBet,
  handlePlayerMove,
} = require("../controllers/gameController");
const { leaveGame } = require("../controllers/roomController");

// Route to create a new game
router.post("/create-game", (req, res) => {
  // This route can be used for HTTP-based game creation if needed
  res.status(200).json({ message: "Use Socket.io to create a game." });
});

// Route to join an existing game
router.post("/join-game", (req, res) => {
  // This route can be used for HTTP-based game joining if needed
  res.status(200).json({ message: "Use Socket.io to join a game." });
});

// Route to handle a player's bet
router.post("/bet", (req, res) => {
  // This route can be used for HTTP-based bet handling if needed
  res.status(200).json({ message: "Use Socket.io to handle a bet." });
});

// Route to handle a player's move
router.post("/move", (req, res) => {
  // This route can be used for HTTP-based move handling if needed
  res.status(200).json({ message: "Use Socket.io to handle a move." });
});

// Route to leave a game
router.post("/leave-game", (req, res) => {
  // This route can be used for HTTP-based game leaving if needed
  res.status(200).json({ message: "Use Socket.io to leave a game." });
});


router.post("/conclude-game", async (req, res) => {
  const { roomId } = req.body;

  try {
    const room = await Room.findOne({ roomId });
    if (!room || !room.game) {
      return res.status(404).json({ message: "Room or game not found." });
    }

    const game = await Game.findById(room.game).populate("players.user");

    if (!game.gameOn) {
      return res.status(400).json({ message: "Game is not active." });
    }

    // Conclude the game (replicate concludeGame logic from controller)
    await concludeGame(null, null, game);

    res.status(200).json({ message: "Game concluded successfully." });
  } catch (error) {
    console.error("Error concluding game:", error);
    res.status(500).json({ message: "Server error." });
  }
});



module.exports = router;
