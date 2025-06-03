const mongoose = require('mongoose');

const BusinessSchema = new mongoose.Schema({
  businessName: { type: String, required: true },
  image: [{ type: String }], // logo or banner
  serviceTypes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'ServiceType' }],
  address: { type: String, required: true },
  mapUrl: { type: String, required: true },
  contactNumber: { type: String, required: true },
  contactEmail: { type: String, required: true },
  latitude: { type: Number },  // ✅ Add this
  longitude: { type: Number }, // ✅ Add this
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Business', BusinessSchema);
