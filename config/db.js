// config/db.js
const mongoose = require('mongoose');
require('dotenv').config();


const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI_localtest, {
      dbName: process.env.MONGO_DB_NAME,
    });
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`❌ MongoDB Connection Error: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
