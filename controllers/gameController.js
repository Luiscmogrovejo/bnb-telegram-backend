// controllers/gameController.js

const { v4: uuidv4 } = require("uuid");
const Game = require("../models/Game");
const Room = require("../models/Room");
const User = require("../models/User");
const { calculateSum, createDeck, shuffleDeck } = require("../utils/helper");
const { ethers } = require("ethers");
const dotenv = require("dotenv");
const BetHandlerABI = require("../smartContracts/BetHandlerABI.json"); // ABI of the smart contract

dotenv.config();

// Initialize Ethereum Provider and Contract
const provider = new ethers.providers.InfuraProvider(
  "rinkeby",
  process.env.INFURA_PROJECT_ID
);
const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
const betHandlerContract = new ethers.Contract(
  process.env.SMART_CONTRACT_ADDRESS,
  BetHandlerABI,
  wallet
);

const createGame = async (io, socket, data) => {
  const { nickname, avatar, isOffline } = data;

  // Create or find the user
  let user = await User.findOne({
    walletAddress: socket.handshake.query.walletAddress,
  });
  if (!user) {
    user = new User({
      walletAddress: socket.handshake.query.walletAddress,
      nickname,
      avatar,
    });
    await user.save();
  }

  // Generate unique room ID
  const roomId = uuidv4().split("-")[0]; // Shorten UUID for simplicity

  // Create room
  const room = new Room({
    roomId,
    isOffline,
    players: [user._id],
    spectators: [],
    // Game will be created when needed
  });

  await room.save();

  // Join Socket.io room
  socket.join(roomId);

  // Emit room creation to the creator
  io.to(socket.id).emit("gameCreated", { roomId, room });
};

const joinGame = async (io, socket, data) => {
  const { roomId, nickname, avatar } = data;

  const room = await Room.findOne({ roomId })
    .populate("players")
    .populate("spectators");
  if (!room) {
    io.to(socket.id).emit("error", { message: "Room not found." });
    return;
  }

  // Create or find the user
  let user = await User.findOne({
    walletAddress: socket.handshake.query.walletAddress,
  });
  if (!user) {
    user = new User({
      walletAddress: socket.handshake.query.walletAddress,
      nickname,
      avatar,
    });
    await user.save();
  }

  // Check if room is full
  if (room.players.length >= 7) {
    io.to(socket.id).emit("error", { message: "Room is full." });
    return;
  }

  // Add player to the room
  room.players.push(user._id);
  await room.save();

  // Join Socket.io room
  socket.join(roomId);

  // Emit to all players in the room about the new player
  const updatedPlayers = await User.find({ _id: { $in: room.players } });
  io.to(roomId).emit("playerJoined", { players: updatedPlayers });

  // Optionally, emit current game state if a game is already ongoing
  if (room.game) {
    const game = await Game.findById(room.game).populate("players.user");
    io.to(socket.id).emit("currentGameState", { game });
  }
};

const handleBet = async (io, socket, data) => {
  const { roomId, betAmount } = data;

  const room = await Room.findOne({ roomId }).populate("players");
  if (!room) {
    io.to(socket.id).emit("error", { message: "Room not found." });
    return;
  }

  const user = await User.findOne({
    walletAddress: socket.handshake.query.walletAddress,
  });
  if (!user) {
    io.to(socket.id).emit("error", { message: "User not found." });
    return;
  }

  if (betAmount > user.balance) {
    io.to(socket.id).emit("error", { message: "Insufficient balance." });
    return;
  }

  // Deduct bet from user's balance
  user.balance -= betAmount;
  await user.save();

  // If no game exists, create one
  let game;
  if (!room.game) {
    game = new Game({
      room: room._id,
      players: room.players.map((playerId) => ({
        user: playerId,
        bet: 0,
        cards: [],
        sum: 0,
        hasAce: false,
        isReady: false,
        blackjack: false,
        hasLeft: false,
      })),
      dealer: {
        cards: [],
        sum: 0,
        hiddenCard: null,
      },
      deck: shuffleDeck(createDeck()),
      gameOn: false,
      currentPlayerIndex: 0,
      isDealerTurn: false,
    });
    await game.save();
    room.game = game._id;
    await room.save();
  } else {
    game = await Game.findById(room.game);
  }

  // Find the player in the game
  const player = game.players.find(
    (p) => p.user.toString() === user._id.toString()
  );
  if (!player) {
    io.to(socket.id).emit("error", {
      message: "Player not found in the game.",
    });
    return;
  }

  // Place the bet
  player.bet += betAmount;

  // Emit updated bets to all players
  io.to(roomId).emit("betsUpdated", { players: game.players });

  // Check if all players have placed their bets
  const allBetsPlaced = game.players.every((p) => p.bet > 0);
  if (allBetsPlaced && !game.gameOn) {
    startGame(io, roomId, game);
  }
};

const startGame = async (io, roomId, game) => {
  game.gameOn = true;

  // Deal initial cards to players
  for (let player of game.players) {
    player.cards.push(game.deck.pop());
    player.cards.push(game.deck.pop());
    player.sum = calculateSum(player.cards);
    player.hasAce = player.cards.some((card) => card.value === "A");
    if (player.sum === 21) {
      player.blackjack = true;
      // Handle blackjack payout via smart contract
      await handleBlackjackPayout(player);
    }
  }

  // Deal initial cards to dealer
  game.dealer.cards.push(game.deck.pop());
  game.dealer.cards.push(game.deck.pop());
  game.dealer.sum = calculateSum(game.dealer.cards);
  game.dealer.hasAce = game.dealer.cards.some((card) => card.value === "A");
  game.dealer.hiddenCard = game.dealer.cards[1]; // Second card is hidden

  await game.save();

  // Emit game started event
  io.to(roomId).emit("gameStarted", { game });

  // Notify the first player to take action
  const currentPlayer = game.players[game.currentPlayerIndex];
  io.to(currentPlayer.user.toString()).emit("yourTurn", {
    player: currentPlayer,
  });
};

const handlePlayerMove = async (io, socket, data) => {
  const { roomId, move } = data;

  const room = await Room.findOne({ roomId }).populate("game");
  if (!room || !room.game) {
    io.to(socket.id).emit("error", { message: "Game not found." });
    return;
  }

  const game = await Game.findById(room.game)
    .populate("players.user")
    .populate("dealer");
  if (!game.gameOn) {
    io.to(socket.id).emit("error", { message: "Game is not active." });
    return;
  }

  const currentPlayer = game.players[game.currentPlayerIndex];
  if (
    currentPlayer.user.walletAddress !== socket.handshake.query.walletAddress
  ) {
    io.to(socket.id).emit("error", { message: "Not your turn." });
    return;
  }

  if (move === "hit") {
    const card = game.deck.pop();
    currentPlayer.cards.push(card);
    currentPlayer.sum = calculateSum(currentPlayer.cards);
    currentPlayer.hasAce = currentPlayer.cards.some(
      (card) => card.value === "A"
    );

    if (currentPlayer.sum > 21) {
      // Player busts
      io.to(roomId).emit("playerBusted", { playerId: currentPlayer.user._id });
      nextPlayer(io, roomId, game);
    } else if (currentPlayer.sum === 21) {
      // Player has 21
      io.to(roomId).emit("player21", { playerId: currentPlayer.user._id });
      nextPlayer(io, roomId, game);
    } else {
      // Continue player's turn
      io.to(roomId).emit("playerHit", {
        playerId: currentPlayer.user._id,
        card,
      });
      // Optionally, allow player to take another action
    }

    await game.save();
  } else if (move === "stand") {
    // Player stands, move to next player
    io.to(roomId).emit("playerStands", { playerId: currentPlayer.user._id });
    nextPlayer(io, roomId, game);
    await game.save();
  } else if (move === "doubleDown") {
    if (currentPlayer.bet > currentPlayer.user.balance) {
      io.to(socket.id).emit("error", {
        message: "Insufficient balance for Double Down.",
      });
      return;
    }

    // Double the bet
    currentPlayer.bet *= 2;
    currentPlayer.user.balance -= currentPlayer.bet;
    await currentPlayer.user.save();

    // Draw one final card
    const card = game.deck.pop();
    currentPlayer.cards.push(card);
    currentPlayer.sum = calculateSum(currentPlayer.cards);
    currentPlayer.hasAce = currentPlayer.cards.some(
      (card) => card.value === "A"
    );

    io.to(roomId).emit("playerDoubleDown", {
      playerId: currentPlayer.user._id,
      card,
    });

    if (currentPlayer.sum > 21) {
      // Player busts
      io.to(roomId).emit("playerBusted", { playerId: currentPlayer.user._id });
    }

    nextPlayer(io, roomId, game);
    await game.save();
  }
};

const nextPlayer = async (io, roomId, game) => {
  game.currentPlayerIndex += 1;

  if (game.currentPlayerIndex >= game.players.length) {
    // All players have played, proceed to dealer's turn
    dealerTurn(io, roomId, game);
  } else {
    // Notify next player
    const nextPlayer = game.players[game.currentPlayerIndex];
    io.to(nextPlayer.user._id.toString()).emit("yourTurn", {
      player: nextPlayer,
    });
  }
};

const dealerTurn = async (io, roomId, game) => {
  game.isDealerTurn = true;

  // Reveal dealer's hidden card
  io.to(roomId).emit("dealerRevealed", { card: game.dealer.hiddenCard });

  // Calculate dealer's sum
  game.dealer.sum = calculateSum(game.dealer.cards);
  game.dealer.hasAce = game.dealer.cards.some((card) => card.value === "A");

  // Dealer hits until sum >= 17
  while (game.dealer.sum < 17) {
    const card = game.deck.pop();
    game.dealer.cards.push(card);
    game.dealer.sum = calculateSum(game.dealer.cards);
    game.dealer.hasAce = game.dealer.cards.some((card) => card.value === "A");

    io.to(roomId).emit("dealerHit", { card, sum: game.dealer.sum });

    await game.save();

    if (game.dealer.sum > 21) {
      // Dealer busts
      io.to(roomId).emit("dealerBusted", { sum: game.dealer.sum });
      concludeGame(io, roomId, game);
      return;
    }
  }

  // Dealer stands
  io.to(roomId).emit("dealerStands", { sum: game.dealer.sum });
  concludeGame(io, roomId, game);
};

const concludeGame = async (io, roomId, game) => {
  // Compare each player's sum with dealer's sum
  for (let player of game.players) {
    if (player.sum > 21) {
      // Player already busted
      continue;
    }
    if (player.blackjack) {
      // Player has blackjack, payout 1.5x via smart contract
      await handleBlackjackPayout(player);
      continue;
    }
    if (game.dealer.sum > 21) {
      // Dealer busted, player wins
      await handleWinPayout(player);
    } else if (player.sum > game.dealer.sum) {
      // Player wins
      await handleWinPayout(player);
    } else if (player.sum === game.dealer.sum) {
      // Push, refund bet via smart contract
      await handlePushPayout(player);
    } else {
      // Player loses, bet already deducted
      // Optionally, notify player
    }
  }

  // Emit game concluded event
  io.to(roomId).emit("gameConcluded", {
    players: game.players,
    dealerSum: game.dealer.sum,
  });

  // Reset game state for next round
  game.resetGame();
  await game.save();
};

const handleWinPayout = async (player) => {
  // Payout via smart contract
  const tx = await betHandlerContract.payoutWin(
    player.user.walletAddress,
    player.bet
  );
  await tx.wait();

  // Update player's balance locally
  const user = await User.findById(player.user._id);
  user.balance += player.bet * 2;
  await user.save();
};

const handlePushPayout = async (player) => {
  // Refund bet via smart contract
  const tx = await betHandlerContract.payoutPush(
    player.user.walletAddress,
    player.bet
  );
  await tx.wait();

  // Update player's balance locally
  const user = await User.findById(player.user._id);
  user.balance += player.bet;
  await user.save();
};

const handleBlackjackPayout = async (player) => {
  // Payout 1.5x via smart contract
  const tx = await betHandlerContract.payoutBlackjack(
    player.user.walletAddress,
    player.bet
  );
  await tx.wait();

  // Update player's balance locally
  const user = await User.findById(player.user._id);
  user.balance += player.bet * 1.5;
  await user.save();
};

module.exports = {
  createGame,
  joinGame,
  handleBet,
  handlePlayerMove,
};
