const express = require('express');
const router = express.Router();
const Business = require('../models/businessInfo');
const ServiceType = require('../models/serviceType');

//--------------------fetchiong all service types-------------------
// Get all service types (with SVG icons)
router.get('/Get-service-types', async (req, res) => {
  try {
    const services = await ServiceType.find({});
    res.json(services);
  } catch (err) {
    console.error('Error fetching services:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

//---------------------fetching all businesses-------------------
// Get businesses for a given service type

router.get('/businesses-by-service/:serviceId', async (req, res) => {
  try {
    const businesses = await Business.find({ serviceTypes: req.params.serviceId })
      .populate('serviceTypes')
      .lean(); // Convert Mongoose documents to plain JS objects

    // Attach imageUrl property for each business
    const enhanced = businesses.map(biz => ({
      ...biz,
      imageUrl: biz.image?.[0] || ''
    }));

    res.json(enhanced);
  } catch (err) {
    console.error('Error fetching businesses:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});



// --------------------------nearby services--------------------------
router.get('/nearby/:token', async (req, res) => {
  const { token } = req.params;

  try {
    const userLoc = await UserLocation.findOne({ token });
    if (!userLoc) return res.status(404).json({ error: 'Location not found or expired' });

    const nearbyBusinesses = await Business.find({
      location: {
        $near: {
          $geometry: userLoc.location,
          $maxDistance: 10000, // 10km radius
        },
      },
    });

    res.json(nearbyBusinesses);
  } catch (error) {
    console.error('Error fetching nearby services:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});


module.exports = router;