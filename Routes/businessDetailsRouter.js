const express = require('express');
const Business = require('../models/businessInfo');

const router = express.Router();

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
