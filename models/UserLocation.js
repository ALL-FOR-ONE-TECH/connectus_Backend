// models/UserLocation.js
const mongoose = require('mongoose');

const userLocationSchema = new mongoose.Schema({
  token: { type: String, required: true, unique: true },
  location: {
    type: {
      type: String,
      enum: ['Point'],
      required: true,
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      required: true,
    },
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 1800, // 30 minutes TTL (auto-remove)
  },
});

userLocationSchema.index({ location: '2dsphere' });

module.exports = mongoose.model('UserLocation', userLocationSchema);
