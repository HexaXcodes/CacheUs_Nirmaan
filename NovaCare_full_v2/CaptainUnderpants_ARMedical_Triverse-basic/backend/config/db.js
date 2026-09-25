// config/db.js
const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 5000
    });
    console.log(`✅ MongoDB connected: ${conn.connection.host}`);
  } catch (err) {
    console.warn(`⚠️  MongoDB not connected: ${err.message}`);
    console.warn('   Server will run, but auth/user routes will fail.');
    console.warn('   Start MongoDB locally OR use MongoDB Atlas in .env');
  }
};

module.exports = connectDB;
