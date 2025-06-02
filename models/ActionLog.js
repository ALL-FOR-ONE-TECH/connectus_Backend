const mongoose = require('mongoose');

const actionLogSchema = new mongoose.Schema({
  actionType: {
    type: String,
    enum: ['CREATE', 'UPDATE', 'DELETE'],
    required: true,
  },
  collectionName: {
    type: String,
    required: true,
  },
  documentId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  userName: {
    type: String,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
  changes: {
    type: Object, // snapshot of deleted document
    required: true,
  },
});

module.exports = mongoose.model('ActionLog', actionLogSchema);
