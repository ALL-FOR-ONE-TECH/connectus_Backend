const mongoose = require('mongoose');
const connectDB = require('../config/db');
const sessionSchema = new mongoose.Schema({
  _id: {
    type: String, // This is the session ID (`req.sessionID`)
  },
  session: {
    type: Object, // Contains the actual session data (user info, etc.)
    required: true
  },
  expires: {
    type: Date,
    required: true
  }
}, {
  collection: 'sessions', // optional but recommended
  timestamps: true
});

module.exports = mongoose.model('Session', sessionSchema);
