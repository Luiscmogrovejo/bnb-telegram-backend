// config/db.js

const mongoose = require("mongoose");
const dotenv = require("dotenv");

dotenv.config();

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      maxPoolSize: 50,
    });
    console.log("MongoDB connected successfully.");
  } catch (error) {
    mongoose.connection.on('error', err => {
      console.error(`Mongoose connection error: ${err}`);
    });

    mongoose.connection.on('disconnected', () => {
      console.log('Mongoose disconnected');
    });
    process.exit(1); // Exit process with failure
  }
};

module.exports = { connectDB };
