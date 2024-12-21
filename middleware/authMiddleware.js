// middleware/authMiddleware.js

const jwt = require("jsonwebtoken");
const User = require("../models/User");
const dotenv = require("dotenv");

dotenv.config();

const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    try {
      // Extract token from header
      token = req.headers.authorization.split(" ")[1];

      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Attach user to request
      req.user = await User.findById(decoded.id).select("-password");

      if (!req.user) {
        return res
          .status(401)
          .json({ success: false, message: "Not authorized, user not found." });
      }

      next();
    } catch (error) {
      console.error("Authentication error:", error);
      res
        .status(401)
        .json({ success: false, message: "Not authorized, token failed." });
    }
  }

  if (!token) {
    res
      .status(401)
      .json({ success: false, message: "Not authorized, no token." });
  }
};

module.exports = { protect };
