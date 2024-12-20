// client2.js

const io = require("socket.io-client");

// Replace with your backend URL
const BACKEND_URL = "http://localhost:8080";

// Replace with Player Two's JWT token
const JWT_TOKEN =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY3NjVmYWMyYTc1NjAyYjdjMmMwNTk5YyIsImlhdCI6MTczNDczNjU5OCwiZXhwIjoxNzM3MzI4NTk4fQ._4Qq1lKc9i6i3_gG2IA5nDVl30KdmK-a_-4PHgouHqk";

// Initialize Socket.io client with authentication
const socket = io(BACKEND_URL, {
  auth: {
    token: JWT_TOKEN,
  },
});

// Handle connection
socket.on("connect", () => {
  console.log("Player Two connected with Socket ID:", socket.id);

  // Replace with the roomId created by Player One
  const roomId = "4f218f03";

  // Step 2: Join the Game Room
  socket.emit(
    "joinGame",
    {
      roomId: roomId,
      nickname: "PlayerTwo",
      avatar: "avatar2.png",
    },
    (response) => {
      if (response.status === "success") {
        console.log(`Player Two joined game room: ${roomId}`);
        // Proceed to place a bet
        placeBet(roomId, 100);
      } else {
        console.error("Error joining game room:", response.message);
      }
    }
  );
});

// Function to place a bet
const placeBet = (roomId, amount) => {
  socket.emit(
    "placeBet",
    {
      roomId: roomId,
      betAmount: amount,
    },
    (response) => {
      if (response.status === "success") {
        console.log("Player Two placed a bet successfully.");
      } else {
        console.error("Error placing bet:", response.message);
      }
    }
  );
};

// Listen for other events similarly as in client.js
// ...

// Implement other event listeners as needed
