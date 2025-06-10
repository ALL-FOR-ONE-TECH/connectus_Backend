// models/Review.js
const mongoose = require('mongoose');

const ReviewSchema = new mongoose.Schema({
  business: { type: mongoose.Schema.Types.ObjectId, ref: 'Business', required: true },
  reviewerName: { type: String, required: true },
  reviewerEmail: { type: String }, // optional
  rating: { type: Number, min: 1, max: 5, required: true },
  reviewText: { type: String },
  createdAt: { type: Date, default: Date.now }
});

ReviewSchema.index({ business: 1, createdAt: -1 });

module.exports = mongoose.model('Review', ReviewSchema);
