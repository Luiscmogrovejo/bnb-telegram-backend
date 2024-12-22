const GameRoom = require("./GameRoom"); // Adjust the path if necessary

class RoomManager {
  constructor() {
    this.rooms = new Map(); // Store rooms by room ID
  }

  createRoom(roomId) {
    if (!this.rooms.has(roomId)) {
      const room = new GameRoom(roomId);
      this.rooms.set(roomId, room);
      return room;
    } else {
      throw new Error("Room already exists");
    }
  }

  getRoom(roomId) {
    return this.rooms.get(roomId);
  }

  getGameForRoom(roomId) {
    const room = this.getRoom(roomId);
    if (!room) throw new Error("Room not found");
    return room.game; // Assuming `game` is a property in `GameRoom`
  }
}

module.exports = RoomManager;
