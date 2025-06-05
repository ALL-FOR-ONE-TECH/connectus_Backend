
const mongoose = require('mongoose');

const UserProfileSchema = new mongoose.Schema({
  token: { type: String, unique: true },
  name: String,
  mobile: String,
  location: {
    address: String,
    latitude: Number,
    longitude: Number,
    googleMapsUrl: String,
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('UserProfile', UserProfileSchema);
