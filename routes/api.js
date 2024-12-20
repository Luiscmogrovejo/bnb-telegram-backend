// routes/api.js

const express = require("express");
const router = express.Router();
const { body, validationResult } = require("express-validator");
const { signup, login } = require("../controllers/authController");
const { protect } = require("../middleware/authMiddleware");

// Authentication Routes
router.post(
  "/auth/signup",
  [
    body("walletAddress").isString().trim().escape(),
    body("password")
      .isLength({ min: 6 })
      .matches(/^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{6,}$/)
      .withMessage("Password must contain at least one letter and one number"),
    // Add other validations as needed
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
    body("password").isLength({ min: 6 }).trim().escape(),
    // Add other validations as needed
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

// Example: Get All Active Rooms
const Room = require("../models/Room");

router.get("/rooms", protect, async (req, res, next) => {
  try {
    const rooms = await Room.find({}); // Add filters if needed
    res.status(200).json({ success: true, data: rooms });
  } catch (error) {
    next(error);
  }
});

// Export the router
module.exports = router;
