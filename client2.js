const io = require("socket.io-client");

// Replace with your backend URL
const BACKEND_URL = "http://localhost:8080";

// User 2's JWT token
const JWT_TOKEN =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY3NjcwYjVjOWVmMWRlNWVhZGZjZmFkOSIsImlhdCI6MTczNDgwNjM4MCwiZXhwIjoxNzM3Mzk4MzgwfQ.oshYL6nGXxhFA25bmxvINnpe8KxRBiUrQuEYbkAoYX0";

// Initialize the socket connection
const socket = io(BACKEND_URL, {
  auth: { token: JWT_TOKEN },
});

const roomId = "room-ly7p7m"; // Replace with the roomId created by User 1

// On successful connection
socket.on("connect", () => {
  console.log("User 2 connected with Socket ID:", socket.id);

  // Join the room
  socket.emit(
    "joinGame",
    { roomId, nickname: "User2", avatar: "avatar2.png" },
    (response) => {
      if (response.status === "success") {
        console.log("User 2 joined the room successfully.");

        // Place a bet
        setTimeout(() => {
          socket.emit("placeBet", { roomId, betAmount: 150 }, (response) => {
            if (response.status === "success") {
              console.log("User 2 placed a bet.");
            } else {
              console.error("Error placing bet:", response.message);
            }
          });
        }, 2000);
      } else {
        console.error("Error joining game room:", response.message);
      }
    }
  );
});

// Handle events from the server
socket.on("gameStarted", (data) => {
  console.log("Game Started:", data);
});

socket.on("betsUpdated", (data) => {
  console.log("Bets Updated:", data);
});

socket.on("yourTurn", (data) => {
  console.log("It's User 2's turn:", data);

  // Automate move decision
  const move = data.player.sum < 17 ? "hit" : "stand";
  console.log(`User 2 decides to ${move}`);

  // Simulate a player move
  socket.emit("playerMove", { roomId: data.game.roomId, move }, (response) => {
    if (response.status === "success") {
      console.log(`User 2 executed move: ${move}`);
    } else {
      console.error("Error making a move:", response.message);
    }
  });
});

socket.on("dealerRevealed", (data) => {
  console.log("Dealer revealed card:", data.card);
});

socket.on("dealerHit", (data) => {
  console.log("Dealer hits and draws a card:", data.card);
});

socket.on("dealerBusted", (data) => {
  console.log("Dealer busted with sum:", data.sum);
});

socket.on("dealerStands", (data) => {
  console.log("Dealer stands with sum:", data.sum);
});

socket.on("gameConcluded", (data) => {
  console.log("Game Concluded:", data);
});
