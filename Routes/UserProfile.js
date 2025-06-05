const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const Location = require('../models/UserLocation'); // Assuming you have a Location model
const UserProfile = require('../models/UserProfile'); // Assuming you have a UserProfile model



const router = express.Router();

// Helpers
function generateToken() {
  return crypto.randomBytes(16).toString('hex');
}



// Get location by token
router.get('/location/:token', async (req, res) => {
  try {
    const loc = await Location.findOne({ token: req.params.token });
    if (!loc) return res.status(404).json({ success: false, message: 'Location not found' });
    res.json({ success: true, data: loc });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Create or update profile
router.post('/profile', async (req, res) => {
  try {
    const { token, name, mobile, location } = req.body;
    if (!token || !name || !mobile || !location) return res.status(400).json({ success: false, message: 'Missing fields' });

    const googleMapsUrl = `https://www.google.com/maps/@${location.latitude},${location.longitude},17z?entry=ttu`;

    const profile = await UserProfile.findOneAndUpdate(
      { token },
      { name, mobile, location: { ...location, googleMapsUrl }, updatedAt: new Date() },
      { upsert: true, new: true }
    );

    res.json({ success: true, data: profile });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Get profile by token
router.get('/profile/:token', async (req, res) => {
  try {
    const profile = await UserProfile.findOne({ token: req.params.token });
    if (!profile) return res.status(404).json({ success: false, message: 'Profile not found' });
    res.json({ success: true, data: profile });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Update profile location
router.put('/profile/:token/location', async (req, res) => {
  try {
    const { address, latitude, longitude } = req.body;
    const googleMapsUrl = `https://www.google.com/maps/@${latitude},${longitude},17z?entry=ttu`;

    const profile = await UserProfile.findOneAndUpdate(
      { token: req.params.token },
      { location: { address, latitude, longitude, googleMapsUrl }, updatedAt: new Date() },
      { new: true }
    );
    if (!profile) return res.status(404).json({ success: false, message: 'Profile not found' });
    res.json({ success: true, data: profile });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Delete profile
router.delete('/profile/:token', async (req, res) => {
  try {
    await UserProfile.deleteOne({ token: req.params.token });
    res.json({ success: true, message: 'Profile deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});
 
module.exports = router;
