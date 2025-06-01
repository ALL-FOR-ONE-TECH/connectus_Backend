// models/ServiceType.js
const connectDB = require('../config/db');
const mongoose = require('mongoose');

const ServiceTypeSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true }
});

module.exports = mongoose.model('ServiceType', ServiceTypeSchema);
