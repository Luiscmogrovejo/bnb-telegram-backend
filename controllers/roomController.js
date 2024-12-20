// controllers/roomController.js

const Room = require("../models/Room");
const Game = require("../models/Game");
const User = require("../models/User");
const { v4: uuidv4 } = require("uuid");

const leaveGame = async (io, socket, data) => {
  const { roomId } = data;

  const room = await Room.findOne({ roomId })
    .populate("players")
    .populate("spectators");
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

  // Remove user from players
  room.players = room.players.filter(
    (playerId) => playerId.toString() !== user._id.toString()
  );
  // Optionally, add to spectators
  room.spectators.push(user._id);

  await room.save();

  // Notify remaining players
  const updatedPlayers = await User.find({ _id: { $in: room.players } });
  io.to(roomId).emit("playerLeft", { players: updatedPlayers });

  // If no players left, delete the room and associated game
  if (room.players.length === 0) {
    if (room.game) {
      await Game.findByIdAndDelete(room.game);
    }
    await Room.findByIdAndDelete(room._id);
    io.to(roomId).emit("roomClosed", {
      message: "Room has been closed due to no active players.",
    });
    io.in(roomId).socketsLeave(roomId);
  }
};

module.exports = {
  leaveGame,
};
