// index.js

const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const cors = require("cors");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const apiRoutes = require("./routes/api");
const gameSockets = require("./sockets/gameSockets");
const { connectDB } = require("./config/db");

// Load environment variables
dotenv.config();

// Connect to MongoDB
connectDB();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// API Routes
app.use("/api", apiRoutes);

// Create HTTP server
const server = http.createServer(app);

// Initialize Socket.io
const io = socketIo(server, {
  cors: {
    origin: "*", // Update to your frontend URL in production
    methods: ["GET", "POST"],
  },
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
