const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI);
    console.log(`[MongoDB] Connected: ${conn.connection.host}`);
    return true;
  } catch (error) {
    console.warn(`[MongoDB] Connection skipped (${error.message}). Operating with in-memory persistence fallback.`);
    return false;
  }
};

module.exports = connectDB;
