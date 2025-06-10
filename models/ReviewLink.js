const mongoose = require('mongoose');

const ReviewLinkSchema = new mongoose.Schema({
  business: { type: mongoose.Schema.Types.ObjectId, ref: 'Business', required: true },
  code: { type: String, required: true, unique: true },
  fullLink: { type: String }, // ADD THIS FIELD
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('ReviewLink', ReviewLinkSchema);
