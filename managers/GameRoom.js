class GameRoom {
  constructor(roomId) {
    this.roomId = roomId;
    this.players = new Map(); // Store players by ID
    this.betsPlaced = false;
    this.timer = null;
    this.gameStarted = false;
    this.game = null; // Track the associated game
  }

  addPlayer(playerId) {
    if (!this.players.has(playerId)) {
      this.players.set(playerId, {
        id: playerId,
        betPlaced: false,
        move: null,
      });
    }
  }

  placeBet(playerId) {
    if (!this.players.has(playerId)) {
      throw new Error("Player not in room");
    }
    this.players.get(playerId).betPlaced = true;

    if (!this.betsPlaced) {
      this.betsPlaced = true;
      this.startGameCountdown();
    }
  }

  setGame(game) {
    this.game = game;
  }

  getGame() {
    return this.game;
  }

  startGameCountdown() {
    console.log(`Room ${this.roomId}: Game will start in 1 minute`);
    this.timer = setTimeout(() => this.startGame(), 60000);
  }

  startGame() {
    this.gameStarted = true;
    console.log(`Room ${this.roomId}: Game started with players`, [
      ...this.players.keys(),
    ]);
    this.dealCards();
    this.startPlayerTurns();
  }

  // In GameRoom.js
  dealCards() {
    console.log(`Room ${this.roomId}: Dealing cards to players`);
    this.players.forEach((player) => {
      player.cards.push(this.deck.pop(), this.deck.pop());
    });
  }

  startPlayerTurns() {
    [...this.players.keys()].forEach((playerId) =>
      this.startPlayerTurn(playerId)
    );
    setTimeout(() => this.dealerTurn(), this.players.size * 60000);
  }

  startPlayerTurn(playerId) {
    console.log(`Room ${this.roomId}: Player ${playerId}'s turn started`);
    setTimeout(() => {
      if (!this.players.get(playerId).move) {
        this.players.get(playerId).move = "Stand";
        console.log(
          `Room ${this.roomId}: Player ${playerId} defaulted to Stand`
        );
      }
    }, 60000);
  }

  // In GameRoom.js
  startGameCountdown() {
    console.log(`Room ${this.roomId}: Game will start in 1 minute`);
    if (this.timer) clearTimeout(this.timer); // Reset timer if already set
    this.timer = setTimeout(() => this.startGame(), 60000);
  }

  dealerTurn() {
    console.log(`Room ${this.roomId}: Dealer's turn`);
    // Dealer logic
  }
}

module.exports = GameRoom;
