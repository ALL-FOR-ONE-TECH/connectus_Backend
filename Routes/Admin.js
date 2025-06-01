const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const speakeasy = require('speakeasy');
const user = require('../models/UserRole');
const Business = require('../models/businessInfo');
const ServiceType = require('../models/serviceType');


const router = express.Router();

// Middleware to check if user is a admin
function ensureadmin(req, res, next) {
  console.log('Session:', req.session);
  if (req.session?.user?.role !== 'admin') {
    return res.status(403).json({ message: 'Access denied: Only managers can approve news.' });
  }
  console.log('✅ Manager Authenticated');
  next();
}

// Delect otp verifyer
async function verifyTotp(req, res, next) {
  const totp = req.body?.totp || req.query?.totp;

  if (!totp) {
    return res.status(400).json({ message: 'TOTP code is required' });
  }

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

    if (!verified) {
      return res.status(401).json({ message: 'Invalid TOTP code' });
    }

    next();
  } catch (err) {
    res.status(500).json({ message: 'TOTP verification failed', error: err.message });
  }
}


// Create Service Type
router.post('/service-types', ensureadmin, async (req, res) => {
  try {
    const service = await ServiceType.create({ name: req.body.name });
    res.status(201).json(service);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get All Service Types
router.get('/service-types', ensureadmin, async (req, res) => {
  const services = await ServiceType.find();
  res.json(services);
});

// Delete Service Type
router.delete('/service-types/:id', ensureadmin, verifyTotp, async (req, res) => {
  await ServiceType.findByIdAndDelete(req.params.id);
  res.json({ message: 'Deleted' });
});

// Create Business
router.post('/businesses', ensureadmin, async (req, res) => {
  try {
    const business = await Business.create(req.body);
    res.status(201).json(business);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Edit Business
router.put('/businesses/:id', ensureadmin, async (req, res) => {
  const updated = await Business.findByIdAndUpdate(req.params.id, req.body, { new: true });
  res.json(updated);
});

// Delete Business
router.delete('/businesses/:id', ensureadmin, verifyTotp,async (req, res) => {
  await Business.findByIdAndDelete(req.params.id);
  res.json({ message: 'Deleted' });
});

module.exports = router;
