const mongoose = require('mongoose');

const userRoleSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { 
    type: String, 
    enum: ['developer-admin', 'admin'], 
    default: 'admin' 
  },
  totpSecret: String, // TOTP secret for 2FA
  isTotpEnabled: { type: Boolean, default: false }
});

module.exports = mongoose.model('UserRole', userRoleSchema);
