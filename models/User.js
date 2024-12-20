// models/User.js

const mongoose = require("mongoose");
const bcrypt = require("bcryptjs"); // Correct import

const UserSchema = new mongoose.Schema({
  walletAddress: {
    type: String,
    required: true,
    unique: true,
  },
  nickname: {
    type: String,
    default: "Player",
  },
  avatar: {
    type: String,
    default: "default",
  },
  balance: {
    type: Number,
    default: 1000, // Starting balance
  },
  password: {
    type: String,
    required: true,
    select: false, // Exclude by default
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Pre-save middleware to hash password
UserSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Instance method to compare password
UserSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Exclude password in JSON and Object outputs
UserSchema.set("toJSON", {
  transform: function (doc, ret, options) {
    delete ret.password;
    return ret;
  },
});
UserSchema.set("toObject", {
  transform: function (doc, ret, options) {
    delete ret.password;
    return ret;
  },
});

module.exports = mongoose.model("User", UserSchema);
