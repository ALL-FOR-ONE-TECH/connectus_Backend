const express = require('express');
const Complaint = require('../models/complaint');

const router = express.Router();

// Middleware to check if user is admin
function ensureAdmin(req, res, next) {
  if (req.session?.user?.role !== 'admin') {
    return res.status(403).json({ message: 'Access denied: Only admins can perform this action.' });
  }
  next();
}

// POST → create complaint
router.post('/complaints', async (req, res) => {
  try {
    const { name, mobile, email, problemDescription } = req.body;

    // Check if this mobile/email submitted in last 24 hrs
    const existingComplaint = await Complaint.findOne({
      $or: [{ mobile }, { email }],
      createdAt: { $gt: new Date(Date.now() - 24 * 60 * 60 * 1000) } // last 24 hrs
    });

    if (existingComplaint) {
      return res.status(429).json({ error: 'You can only submit one complaint every 24 hours.' });
    }

    const complaint = new Complaint({
      name,
      mobile,
      email,
      problemDescription
    });

    await complaint.save();

    res.status(201).json({ message: 'Complaint submitted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// GET → list all complaints (optional for admin view)
router.get('/Get-allcomplaints', ensureAdmin,async (req, res) => {
  try {
    const complaints = await Complaint.find().sort({ createdAt: -1 });
    res.json(complaints);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
