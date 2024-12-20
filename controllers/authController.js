// controllers/authController.js

const User = require("../models/User");
const jwt = require("jsonwebtoken");
const dotenv = require("dotenv");

dotenv.config();

// Function to generate JWT Token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: "30d",
  });
};

// @desc    Register a new user
// @route   POST /api/auth/signup
// @access  Public
const signup = async (req, res) => {
  const { walletAddress, nickname, avatar, password } = req.body;

  if (!walletAddress || !password) {
    return res
      .status(400)
      .json({ message: "Wallet address and password are required." });
  }

  try {
    const userExists = await User.findOne({ walletAddress });

    if (userExists) {
      return res.status(400).json({ message: "User already exists." });
    }

    const user = await User.create({
      walletAddress,
      nickname,
      avatar,
      password,
    });

    if (user) {
      res.status(201).json({
        _id: user._id,
        walletAddress: user.walletAddress,
        nickname: user.nickname,
        avatar: user.avatar,
        balance: user.balance,
        token: generateToken(user._id),
      });
    } else {
      res.status(400).json({ message: "Invalid user data." });
    }
  } catch (error) {
    console.error("Error in signup:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

// @desc    Authenticate user & get token
// @route   POST /api/auth/login
// @access  Public
const login = async (req, res) => {
  const { walletAddress, password } = req.body;

  console.log("Login Request:", { walletAddress, password }); // Debugging log

  try {
    const user = await User.findOne({ walletAddress }).select("+password");
    console.log("User Found:", user); // Debugging log

    if (user && (await user.matchPassword(password))) {
      res.json({
        _id: user._id,
        walletAddress: user.walletAddress,
        nickname: user.nickname,
        avatar: user.avatar,
        balance: user.balance,
        token: generateToken(user._id),
      });
    } else {
      res.status(401).json({ message: "Invalid wallet address or password." });
    }
  } catch (error) {
    console.error("Error in login:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

module.exports = {
  signup,
  login,
};
