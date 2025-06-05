// routes/location.js
const express = require('express');
const router = express.Router();
const UserLocation = require('../models/UserLocation');

router.post('/store-location', async (req, res) => {
  const { latitude, longitude, token } = req.body;

  if (!latitude || !longitude || !token) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    await UserLocation.findOneAndUpdate(
      { token },
      {
        token,
        location: {
          type: 'Point',
          coordinates: [longitude, latitude], // GeoJSON standard
        },
      },
      { upsert: true, new: true }
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Error saving location:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});


module.exports = router;
