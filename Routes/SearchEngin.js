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

// Route 2 → Get all unique places from placeParts
router.get('/businesses/places', async (req, res) => {
  try {
    const rawPlaces = await Business.distinct('placeParts');
    // Filter out empty values and flatten the array since placeParts is an array field
    const uniquePlaces = [...new Set(rawPlaces.flat().filter(Boolean))];
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
      const placeList = places.split(',').map(p => p.trim()).filter(Boolean);
      // Search in placeParts array
      filter.placeParts = {
        $elemMatch: {
          $in: placeList.map(place => new RegExp(place, 'i'))
        }
      };
    }

    if (q) {
      const regex = new RegExp(q, 'i');
      filter.$or = [
        { businessName: regex },
        { address: regex },
        { placeParts: regex }
      ];
    }

    const businesses = await Business.find(filter)
      .populate('serviceTypes', '_id name')
      .select('-__v')
      .lean();

    // Sort results to prioritize exact place matches
    if (places) {
      const placeList = places.split(',').map(p => p.trim().toLowerCase());
      businesses.sort((a, b) => {
        const aExactMatch = a.placeParts?.some(part => 
          placeList.includes(part.toLowerCase())
        ) || false;
        const bExactMatch = b.placeParts?.some(part => 
          placeList.includes(part.toLowerCase())
        ) || false;

        if (aExactMatch && !bExactMatch) return -1;
        if (!aExactMatch && bExactMatch) return 1;
        return 0;
      });
    }

    res.json(businesses);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get Business by ID → Full Details
router.get('/businesses/:businessId', async (req, res) => {
  try {
    const { businessId } = req.params;

    const business = await Business.findById(businessId)
      .populate('serviceTypes', '_id name')
      .lean();

    if (!business) {
      return res.status(404).json({ error: 'Business not found' });
    }

    res.json(business);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
