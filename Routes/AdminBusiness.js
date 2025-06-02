const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const speakeasy = require('speakeasy');

const user = require('../models/UserRole');
const Business = require('../models/businessInfo');

const router = express.Router();

// File upload configuration
const uploadDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname),
});

const upload = multer({ storage });

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

// -------------------- Businesses --------------------

// Get all businesses (ADD THIS MISSING ROUTE)
router.get('/businesses', ensureadmin, async (req, res) => {
  try {
    const businesses = await Business.find().populate('serviceTypes');
    res.json(businesses);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get single business by ID (OPTIONAL - good to have)
router.get('/businesses/:id', ensureadmin, async (req, res) => {
  try {
    const business = await Business.findById(req.params.id).populate('serviceTypes');
    if (!business) {
      return res.status(404).json({ message: 'Business not found' });
    }
    res.json(business);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create Business with image upload
router.post('/businesses', ensureadmin, upload.array('images'), async (req, res) => {
  try {
    const imagePaths = req.files.map(f => `/uploads/${f.filename}`);
    let serviceTypes = req.body.serviceTypes;
    if (typeof serviceTypes === 'string') {
      try {
        serviceTypes = JSON.parse(serviceTypes);
      } catch {
        serviceTypes = [];
      }
    }

    const business = await Business.create({
      ...req.body,
      image: imagePaths,
      serviceTypes,
    });
    res.status(201).json(business);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Update Business with optional image upload
router.put('/businesses/:id', ensureadmin, upload.array('images'), async (req, res) => {
  try {
    const imagePaths = req.files.map(f => `/uploads/${f.filename}`);
    let serviceTypes = req.body.serviceTypes;
    if (typeof serviceTypes === 'string') {
      try {
        serviceTypes = JSON.parse(serviceTypes);
      } catch {
        serviceTypes = [];
      }
    }

    const updateData = {
      ...req.body,
      serviceTypes,
    };
    if (imagePaths.length > 0) {
      updateData.image = imagePaths;
    }

    const updated = await Business.findByIdAndUpdate(req.params.id, updateData, { new: true });
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Delete Business with TOTP
router.delete('/businesses/:id', ensureadmin, verifyTotp, async (req, res) => {
  try {
    const business = await Business.findById(req.params.id);
    if (!business) {
      return res.status(404).json({ message: 'Business not found' });
    }

    // Delete image files from filesystem
    if (business.image && Array.isArray(business.image)) {
      business.image.forEach((imgPath) => {
        // Construct absolute path on server
        const filePath = path.join(__dirname, '..', imgPath);
        // Check if file exists and delete it
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
          console.log(`Deleted file: ${filePath}`);
        }
      });
    } else if (typeof business.image === 'string') {
      // If image is a single string path (optional check)
      const filePath = path.join(__dirname, '..', business.image);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        console.log(`Deleted file: ${filePath}`);
      }
    }

    // Delete business from DB
    await Business.findByIdAndDelete(req.params.id);

    res.json({ message: 'Deleted business and images' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;