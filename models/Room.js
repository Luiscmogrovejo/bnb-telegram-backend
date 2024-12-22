const mongoose = require("mongoose");

const RoomSchema = new mongoose.Schema({
  roomId: {
    type: String,
    required: true,
    unique: true,
  },
  isOffline: {
    type: Boolean,
    default: false,
  },
  players: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      validate: {
        validator: function (v) {
          return mongoose.Types.ObjectId.isValid(v);
        },
        message: (props) => `${props.value} is not a valid user ID!`,
      },
    },
  ],
  spectators: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      validate: {
        validator: function (v) {
          return mongoose.Types.ObjectId.isValid(v);
        },
        message: (props) => `${props.value} is not a valid user ID!`,
      },
    },
  ],
  game: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Game",
  },
  status: {
    type: String,
    enum: ["active", "closed"],
    default: "active",
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: { expires: "24h" }, // Automatically delete after 24 hours
  },
});

RoomSchema.pre("save", function (next) {
  try {
    // Convert all players to ObjectId, if valid
    this.players = this.players.map((id) => {
      if (!mongoose.Types.ObjectId.isValid(id)) {
        throw new Error(`Invalid ObjectId: ${id}`);
      }
      return new mongoose.Types.ObjectId(id);
    });

    // Similarly, handle spectators
    this.spectators = this.spectators.map((id) => {
      if (!mongoose.Types.ObjectId.isValid(id)) {
        throw new Error(`Invalid ObjectId: ${id}`);
      }
      return new mongoose.Types.ObjectId(id);
    });

    next();
  } catch (err) {
    next(err);
  }
});


module.exports = mongoose.model("Room", RoomSchema);
