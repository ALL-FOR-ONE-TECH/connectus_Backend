 const mongoose = require('mongoose');

const BusinessSchema = new mongoose.Schema({
  businessName: { type: String, required: true },
  image: [{ type: String }],
  serviceTypes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'ServiceType' }],
  address: { type: String, required: true },
  mapUrl: { type: String, required: true },
  placeName: { type: String },  // ← Add this line
  contactNumber: { type: String, required: true },
  contactEmail: { type: String, required: true },
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      required: true
    }
  },
  createdAt: { type: Date, default: Date.now }
});

BusinessSchema.index({ location: '2dsphere' });

module.exports = mongoose.model('Business', BusinessSchema);
