const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const speakeasy = require('speakeasy');
const axios = require('axios');

const User = require('../models/UserRole');
const ServiceType = require('../models/serviceType');

const router = express.Router();

// -------------------- Middleware --------------------

function ensureadmin(req, res, next) {
  if (req.session?.user?.role !== 'admin') {
    return res.status(403).json({ message: 'Access denied: Only admins can perform this action.' });
  }
  next();
}

async function verifyTotp(req, res, next) {
  const totp = req.body?.totp || req.query?.totp;
  if (!totp) return res.status(400).json({ message: 'TOTP code is required' });

  const userId = req.session?.user?.id;
  try {
    const currentUser = await User.findById(userId);
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

// -------------------- Routes --------------------

// Create a new service type
router.post('/service-types', ensureadmin, async (req, res) => {
  const { name, icon } = req.body;

  if (!name || !icon) {
    return res.status(400).json({ message: 'Both name and icon are required' });
  }

  try {
    const service = await ServiceType.create({ name, icon });
    res.status(201).json(service);
  } catch (err) {
    console.error('Error while creating service:', err); // log full error
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});



// Get all service types
router.get('/service-types', ensureadmin, async (req, res) => {
  try {
    const services = await ServiceType.find();
    res.json(services);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete a service type
router.delete('/service-types/:id', ensureadmin, verifyTotp, async (req, res) => {
  try {
    await ServiceType.findByIdAndDelete(req.params.id);
    res.json({ message: 'Deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
