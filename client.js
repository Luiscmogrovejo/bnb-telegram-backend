const io = require("socket.io-client");

// Replace with your backend URL
const BACKEND_URL = "http://localhost:8080";

// User 1's JWT token
const JWT_TOKEN =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY3NjcwYjU4OWVmMWRlNWVhZGZjZmFkNiIsImlhdCI6MTczNDgwNjM2OSwiZXhwIjoxNzM3Mzk4MzY5fQ.59fLgnVMJGFARkSeKeIHnmrzgDT33yRP6RkbAJWZZDk";

// Initialize the socket connection
const socket = io(BACKEND_URL, {
  auth: { token: JWT_TOKEN },
});

let roomId; // To store the created room ID

// On successful connection
socket.on("connect", () => {
  console.log("User 1 connected with Socket ID:", socket.id);

  // Create a game room
  socket.emit(
    "createGame",
    { nickname: "User1", avatar: "avatar1.png", isOffline: false },
    (response) => {
      if (response.status === "success") {
        console.log(
          "Game room created successfully. Room ID:",
          response.roomId
        );
        roomId = response.roomId;

        // Place a bet
        setTimeout(() => {
          socket.emit("placeBet", { roomId, betAmount: 100 }, (response) => {
            if (response.status === "success") {
              console.log("User 1 placed a bet.");
            } else {
              console.error("Error placing bet:", response.message);
            }
          });
        }, 2000);
      } else {
        console.error("Error creating game room:", response.message);
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
  console.log("It's User 1's turn:", data);

  // Automate move decision
  const move = data.player.sum < 17 ? "hit" : "stand";
  console.log(`User 1 decides to ${move}`);

  // Simulate a player move
  socket.emit("playerMove", { roomId: data.game.roomId, move }, (response) => {
    if (response.status === "success") {
      console.log(`User 1 executed move: ${move}`);
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
