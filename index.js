// index.js (revised)
const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const cors = require("cors");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const helmet = require("helmet");
const apiRoutes = require("./routes/api");
const gameSockets = require("./sockets/gameSockets");
const { connectDB } = require("./config/db");

// Load environment variables
dotenv.config();

// Validate required environment variables
const requiredEnv = [
  "MONGO_URI",
  "JWT_SECRET",
  "INFURA_PROJECT_ID",
  "SMART_CONTRACT_ADDRESS",
  "PRIVATE_KEY",
  "FRONTEND_URL",
];
requiredEnv.forEach((env) => {
  if (!process.env[env]) {
    console.error(`Error: Missing environment variable ${env}`);
    process.exit(1);
  }
});

// Connect to MongoDB
connectDB();

const app = express();

// Middleware
app.use(helmet()); // Moved after app initialization
app.use(cors());
app.use(express.json());

// API Routes
app.use("/api", apiRoutes);

// Create HTTP server
const server = http.createServer(app);

// Initialize Socket.io
const io = socketIo(server, {
  cors: {
    origin: process.env.FRONTEND_URL, // e.g., https://your-frontend.com
    methods: ["GET", "POST"],
  },
});

// Make io accessible via app locals
app.locals.io = io;

// Error Handling Middleware (should be after all routes)
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ success: false, message: "Internal Server Error" });
});

// Handle Socket.io connections
io.on("connection", (socket) => {
  console.log(`New client connected: ${socket.id}`);

  // Initialize game sockets
  gameSockets(io, socket);

  // Handle disconnection
  socket.on("disconnect", () => {
    console.log(`Client disconnected: ${socket.id}`);
    // Additional cleanup can be performed here
  });
});

// Start the server
const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});

// Graceful Shutdown
process.on("SIGTERM", () => {
  server.close(() => {
    console.log("Process terminated");
    mongoose.connection.close(false, () => {
      console.log("MongoDB connection closed.");
      process.exit(0);
    });
  });
});
