// index.js (revised)
const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const cors = require("cors");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const helmet = require("helmet");
const apiRoutes = require("./routes/api");
const gameSockets = require("./sockets/gamesockets");
const { connectDB } = require("./config/db");
const errorMiddleware = require("./middleware/errorMiddleware");
const RoomManager = require("./managers/RoomManager");
const roomManager = new RoomManager();
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
app.use(errorMiddleware);

// API Routes
app.use("/api", apiRoutes);

// Create HTTP server
const server = http.createServer(app);

// Initialize Socket.IO
const io = socketIo(server, {
  cors: {
    origin: process.env.FRONTEND_URL,
    methods: ["GET", "POST"],
  },
});

// Use the gameSockets module
io.on("connection", (socket) => {
    require("./sockets/gamesockets")(io, socket, roomManager);
  console.log(`New client connected: ${socket.id}`);
  gameSockets(io, socket, roomManager);

  socket.on("disconnect", () => {
    console.log(`Client disconnected: ${socket.id}`);
  });
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
  gameSockets(io, socket, roomManager);

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
    io.close(() => {
      console.log("Socket.IO server closed.");
    });
    console.log("Process terminated");
    mongoose.connection.close(false, () => {
      console.log("MongoDB connection closed.");
      process.exit(0);
    });
  });
});
