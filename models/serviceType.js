const mongoose = require('mongoose');

const ServiceTypeSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    icon: {
      type: String,
      required: true, // should be a valid SVG URL
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('ServiceType', ServiceTypeSchema);
