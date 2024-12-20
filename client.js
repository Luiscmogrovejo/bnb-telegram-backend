// client.js

const io = require("socket.io-client");

// Replace with your backend URL
const BACKEND_URL = "http://localhost:8080";

// Replace with your JWT token from the login/signup response
const JWT_TOKEN =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY3NjVmOGY1Yzc3MTJkMjdiNWM1YWZjMCIsImlhdCI6MTczNDczNjEyNywiZXhwIjoxNzM3MzI4MTI3fQ.01FzbeIjjiBTh8iXiB9Y6hkMISWI6Q36E2zWc09rmHw";

// Initialize Socket.io client with authentication
const socket = io(BACKEND_URL, {
  auth: {
    token: JWT_TOKEN,
  },
});

// Handle connection
socket.on("connect", () => {
  console.log("Connected to the server with Socket ID:", socket.id);

  // Step 1: Create a Game Room
  socket.emit(
    "createGame",
    {
      nickname: "PlayerOne",
      avatar: "avatar1.png",
      isOffline: false,
    },
    (response) => {
      if (response.status === "success") {
        console.log("Game room created successfully.");
        // Extract roomId from the gameCreated event
      } else {
        console.error("Error creating game room:", response.message);
      }
    }
  );
});

// Listen for gameCreated event to get roomId
socket.on("gameCreated", (data) => {
  console.log("Game Created:", data.roomId);
  const roomId = data.roomId;

  // Step 2: Join the Game Room
  socket.emit(
    "joinGame",
    {
      roomId: roomId,
      nickname: "PlayerOne",
      avatar: "avatar1.png",
    },
    (response) => {
      if (response.status === "success") {
        console.log(`Joined game room: ${roomId}`);
        // Proceed to place a bet or wait for other players
      } else {
        console.error("Error joining game room:", response.message);
      }
    }
  );
});

// Listen for playerJoined event
socket.on("playerJoined", (data) => {
  console.log("Players in room:", data.players);
});

// Step 3: Place a Bet
const placeBet = (roomId, amount) => {
  socket.emit(
    "placeBet",
    {
      roomId: roomId,
      betAmount: amount,
    },
    (response) => {
      if (response.status === "success") {
        console.log("Bet placed successfully.");
      } else {
        console.error("Error placing bet:", response.message);
      }
    }
  );
};

// Listen for betsUpdated event
socket.on("betsUpdated", (data) => {
  console.log("Bets Updated:", data.players);
  // Optionally, check if all bets are placed and game is starting
});

// Step 4: Handle Game Start
socket.on("gameStarted", (data) => {
  console.log("Game Started:", data.game);
  // Wait for your turn or handle initial card distribution
});

// Listen for your turn
socket.on("yourTurn", (data) => {
  console.log("It's your turn:", data.player);
  // Decide on an action: 'hit', 'stand', or 'doubleDown'
  const action = decideAction(data.player); // Implement your strategy here
  socket.emit(
    "playerMove",
    {
      roomId: data.game.roomId,
      move: action,
    },
    (response) => {
      if (response.status === "success") {
        console.log(`Action '${action}' executed successfully.`);
      } else {
        console.error("Error making a move:", response.message);
      }
    }
  );
});

// Implement a simple decision-making function
const decideAction = (player) => {
  // For demonstration, always 'hit' if sum < 17, else 'stand'
  if (player.sum < 17) {
    return "hit";
  } else {
    return "stand";
  }
};

// Listen for gameConcluded event
socket.on("gameConcluded", (data) => {
  console.log("Game Concluded:", data);
  // Handle payouts and update UI accordingly
});

// Handle errors
socket.on("error", (data) => {
  console.error("Error:", data.message);
});

// Step 5: Leaving the Game Room
const leaveRoom = (roomId) => {
  socket.emit(
    "leaveGame",
    {
      roomId: roomId,
    },
    (response) => {
      if (response.status === "success") {
        console.log("Left the game room successfully.");
        socket.disconnect();
      } else {
        console.error("Error leaving game room:", response.message);
      }
    }
  );
};

// Optionally, listen for playerLeft and roomClosed events
socket.on("playerLeft", (data) => {
  console.log("Player Left:", data.players);
});

socket.on("roomClosed", (data) => {
  console.log("Room Closed:", data.message);
});
