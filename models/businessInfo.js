const mongoose = require('mongoose');
const crypto = require('crypto');
const ReviewLink = require('./ReviewLink');

const BusinessSchema = new mongoose.Schema({
  businessName: { type: String, required: true },
  image: [{ type: String }],
  serviceTypes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'ServiceType' }],
  address: { type: String, required: true },
  mapUrl: { type: String, required: true },
  placeName: { type: String },
  placeParts: [{ type: String }],
  contactNumber: { type: String, required: true },
  contactEmail: { type: String, required: true },
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number],
      required: true
    }
  },
  averageRating: { type: Number, default: 0 },
  reviewCount: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now }
});

// Indexes
BusinessSchema.index({ location: '2dsphere' });

module.exports = mongoose.model('Business', BusinessSchema);

