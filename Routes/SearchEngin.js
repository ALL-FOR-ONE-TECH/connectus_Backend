const express = require('express');
const ServiceType = require('../models/serviceType');
const Business = require('../models/businessInfo');


const router = express.Router();


// Route 1 → List all service types
router.get('/service-types', async (req, res) => {
  try {
    const serviceTypes = await ServiceType.find().select('_id name');
    res.json(serviceTypes);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Route 2 → List all unique places → Split + Unique
router.get('/businesses/places', async (req, res) => {
  try {
    const rawPlaces = await Business.distinct('placeName', { placeName: { $ne: '' } });

    // Split each place by comma → make array
    let allPlaces = [];
    rawPlaces.forEach(place => {
      const parts = place.split(',').map(part => part.trim());
      allPlaces.push(...parts);
    });

    // Remove duplicates
    const uniquePlaces = [...new Set(allPlaces)].filter(p => p.length > 0);

    res.json(uniquePlaces);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// Route 3 → Business search
router.get('/businesses/search', async (req, res) => {
  try {
    const { services, places, q } = req.query;

    const filter = {};

    if (services) {
      const serviceIds = services.split(',');
      filter.serviceTypes = { $in: serviceIds };
    }

    if (places) {
      const placeList = places.split(',');
      filter.placeName = { $in: placeList };
    }

    if (q) {
      const regex = new RegExp(q, 'i');
      filter.$or = [
        { businessName: regex },
        { address: regex },
        { placeName: regex },
      ];
    }

    const businesses = await Business.find(filter).populate('serviceTypes');
    res.json(businesses);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
