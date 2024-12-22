const express = require("express");
const router = express.Router();
const { body, validationResult } = require("express-validator");
const mongoose = require("mongoose");
const { signup, login } = require("../controllers/authController");
const { protect } = require("../middleware/authMiddleware");
const {
  createGameExpress,
  joinGameExpress,
  placeBetExpress,
  playerMoveExpress,
  leaveGameExpress,
  startGame,
} = require("../controllers/gameController");
const Game = require("../models/Game");
const Room = require("../models/Room");

// Authentication Routes
router.post(
  "/auth/signup",
  [
    body("walletAddress").isString().trim().escape(),
    body("password")
      .isLength({ min: 8 })
      .withMessage("Password must be at least 8 characters long")
      .matches(/(?=.*[A-Z])/, "i")
      .withMessage("Password must contain at least one uppercase letter")
      .matches(/(?=.*\d)/)
      .withMessage("Password must contain at least one number")
      .matches(/(?=.*[@$!%*?&])/)
      .withMessage("Password must contain at least one special character"),
  ],
  async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }
    try {
      await signup(req, res);
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  "/auth/login",
  [
    body("walletAddress").isString().trim().escape(),
    body("password")
      .isLength({ min: 8 })
      .withMessage("Password must be at least 8 characters long"),
  ],
  async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }
    try {
      await login(req, res);
    } catch (error) {
      next(error);
    }
  }
);

// Get All Active Rooms
router.get("/rooms", protect, async (req, res, next) => {
  try {
    const rooms = await Room.find({ status: "active" });
    res.status(200).json({ success: true, data: rooms });
  } catch (error) {
    next(error);
  }
});

// Create a new game
router.post(
  "/games",
  protect,
  [
    body("isOffline").optional().isBoolean(),
    body("nickname").optional().isString().trim().escape(),
    body("avatar").optional().isString().trim().escape(),
  ],
  async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }
    try {
      await createGameExpress(req, res);
    } catch (error) {
      next(error);
    }
  }
);

// Join an existing game
router.post(
  "/games/:roomId/join",
  protect,
  [
    body("nickname").optional().isString().trim().escape(),
    body("avatar").optional().isString().trim().escape(),
  ],
  async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }
    try {
      await joinGameExpress(req, res);
    } catch (error) {
      next(error);
    }
  }
);

// Place a bet
router.post(
  "/games/:roomId/bet",
  protect,
  [
    body("betAmount")
      .isNumeric()
      .withMessage("Bet amount must be a number")
      .custom((value) => value > 0)
      .withMessage("Bet amount must be greater than zero"),
  ],
  async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }
    try {
      await placeBetExpress(req, res);
    } catch (error) {
      next(error);
    }
  }
);

// Player move
router.post(
  "/games/:roomId/move",
  protect,
  [
    body("move")
      .isIn(["hit", "stand", "doubleDown"])
      .withMessage("Invalid move"),
  ],
  async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }
    try {
      await playerMoveExpress(req, res);
    } catch (error) {
      next(error);
    }
  }
);

// Leave game
router.post("/games/:roomId/leave", protect, async (req, res, next) => {
  try {
    await leaveGameExpress(req, res);
  } catch (error) {
    next(error);
  }
});

// Get game state
router.get("/games/:roomId", protect, async (req, res, next) => {
  try {
    // Find the room by `roomId` string
    const room = await Room.findOne({ roomId: req.params.roomId }).exec();

    if (!room) {
      return res
        .status(404)
        .json({ success: false, message: "Room not found." });
    }

    // Use the room's associated game ID to fetch the game
    const game = await Game.findOne({ _id: room.game })
      .populate("players.user")
      .populate("dealer");

    if (!game) {
      return res
        .status(404)
        .json({ success: false, message: "Game not found." });
    }

    res.status(200).json({ success: true, data: game });
  } catch (error) {
    console.error("Error fetching game:", error);
    next(error);
  }
});

router.post("/games/:roomId/start", async (req, res) => {
  try {
    const roomId = req.params.roomId;
    const room = await Room.findOne({ roomId })
      .populate("players")
      .populate("game");
    const game = await Game.findById(room.game);
    await startGame(req.app.locals.io, roomId, game);
    res.status(200).json({ success: true, message: "Game started." });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Export the router
module.exports = router;
