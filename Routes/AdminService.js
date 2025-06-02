const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const speakeasy = require('speakeasy');

const user = require('../models/UserRole');
const ServiceType = require('../models/serviceType');

const router = express.Router();



// Middleware to check if user is admin
function ensureadmin(req, res, next) {
  console.log('Session:', req.session);
  if (req.session?.user?.role !== 'admin') {
    return res.status(403).json({ message: 'Access denied: Only admins can perform this action.' });
  }
  console.log('✅ Admin authenticated');
  next();
}

// TOTP verification middleware
async function verifyTotp(req, res, next) {
  const totp = req.body?.totp || req.query?.totp;
  if (!totp) return res.status(400).json({ message: 'TOTP code is required' });

  const userId = req.session?.user?.id;
  try {
    const currentUser = await user.findById(userId);
    if (!currentUser || !currentUser.isTotpEnabled) {
      return res.status(403).json({ message: 'TOTP not enabled for this user' });
    }

    const verified = speakeasy.totp.verify({
      secret: currentUser.totpSecret,
      encoding: 'base32',
      token: totp,
      window: 1,
    });

    if (!verified) return res.status(401).json({ message: 'Invalid TOTP code' });

    next();
  } catch (err) {
    res.status(500).json({ message: 'TOTP verification failed', error: err.message });
  }
}

// -------------------- Service Types --------------------

router.post('/service-types', ensureadmin, async (req, res) => {
  try {
    const service = await ServiceType.create({ name: req.body.name });
    res.status(201).json(service);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/service-types', ensureadmin, async (req, res) => {
  const services = await ServiceType.find();
  res.json(services);
});

router.delete('/service-types/:id', ensureadmin, verifyTotp, async (req, res) => {
  await ServiceType.findByIdAndDelete(req.params.id);
  res.json({ message: 'Deleted' });
});

module.exports = router;
