// models/Business.js
const connectDB = require('../config/db');
const mongoose = require('mongoose');

const BusinessSchema = new mongoose.Schema({
  businessName: { type: String, required: true },
  image: { type: String }, // logo or banner
  serviceTypes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'ServiceType' }], // <-- Ref to service types
  address: { type: String, required: true },
  mapUrl: { type: String, required: true }, // Google Maps URL
  contactNumber: { type: String, required: true },
  contactEmail: { type: String, required: true }
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Business', BusinessSchema);
