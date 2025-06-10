const express = require('express');
const crypto = require('crypto');
const session = require('express-session');
const User = require('../models/UserRole');
const Review = require('../models/Review');
const ReviewLink = require('../models/ReviewLink');
const Business = require('../models/businessInfo');

const router = express.Router();

// Middleware to check if user is admin
function ensureAdmin(req, res, next) {
  if (req.session?.user?.role !== 'admin') {
    return res.status(403).json({ message: 'Access denied: Only admins can perform this action.' });
  }
  next();
}


// Helper function → Create review link for a business if missing
async function createReviewLink(businessId) {
  try {
    console.log(`🔗 Creating review link for business ID: ${businessId}`);

    // Check if link already exists
    const existingLink = await ReviewLink.findOne({ business: businessId });
    if (existingLink) {
      console.log(`ℹ️ Review link already exists: ${existingLink.fullLink}`);
      return existingLink;
    }

    // Generate unique code
    let code;
    let isUnique = false;
    let attempts = 0;

    while (!isUnique && attempts < 10) {
      code = crypto.randomBytes(6).toString('hex');
      const existing = await ReviewLink.findOne({ code });
      isUnique = !existing;
      attempts++;
    }

    if (!isUnique) {
      throw new Error('Could not generate unique code');
    }

    // Create review link
    const baseUrl = process.env.FRONTEND_URL || process.env.SERVER_HOST || 'http://localhost:3000';
    const fullLink = `${baseUrl}/review-link/${code}`;

    const reviewLink = new ReviewLink({
      business: businessId,
      code,
      fullLink
    });

    const savedLink = await reviewLink.save();
    console.log(`✅ Review link created successfully: ${fullLink}`);

    return savedLink;
  } catch (error) {
    console.error(`❌ Error creating review link:`, error);
    throw error;
  }
}

// API → Get all businesses with review links
router.get('/Review-businesses', ensureAdmin, async (req, res) => {
  try {
    const businesses = await Business.find().select('_id businessName');

    // For each business, get or create review link
    const businessesWithLinks = await Promise.all(
      businesses.map(async (business) => {
        let reviewLink = await ReviewLink.findOne({ business: business._id });

        // If link does not exist, create it
        if (!reviewLink) {
          reviewLink = await createReviewLink(business._id);
        }

        return {
          _id: business._id,
          businessName: business.businessName,
          reviewLink: reviewLink.fullLink
        };
      })
    );

    res.json(businessesWithLinks);
  } catch (err) {
    console.error(`❌ Error fetching businesses with review links:`, err);
    res.status(500).json({ error: err.message });
  }
});


// API → Fetch businessId from Review Link code
router.get('/review-link/:code/business', ensureAdmin, async (req, res) => {
  try {
    const code = req.params.code;

    const reviewLink = await ReviewLink.findOne({ code }).populate('business');

    if (!reviewLink) {
      return res.status(404).json({ error: 'Invalid review link' });
    }

    res.json({
      businessId: reviewLink.business._id,
      businessName: reviewLink.business.businessName
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// API → Submit review via Review Link
router.post('/review-link/:code/review', async (req, res) => {
  try {
    const code = req.params.code;
    const { reviewerName, reviewerEmail, rating, reviewText } = req.body;

    const reviewLink = await ReviewLink.findOne({ code });

    if (!reviewLink) {
      return res.status(404).json({ error: 'Invalid review link' });
    }

    const businessId = reviewLink.business;

    const review = new Review({
      business: businessId,
      reviewerName,
      reviewerEmail,
      rating,
      reviewText
    });

    await review.save();

    // Update Business averageRating and reviewCount
    const reviews = await Review.find({ business: businessId });
    const reviewCount = reviews.length;
    const averageRating = reviews.reduce((sum, r) => sum + r.rating, 0) / reviewCount;

    const business = await Business.findById(businessId);
    business.reviewCount = reviewCount;
    business.averageRating = averageRating.toFixed(1);
    await business.save();

    res.json({ message: 'Review added successfully', review });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// API → Admin trigger → generate links for ALL businesses
router.post('/review-link/generate-for-all', async (req, res) => {
  try {
    const businesses = await Business.find();

    let createdLinks = [];
    let skippedLinks = [];

    for (const business of businesses) {
      const existingLink = await ReviewLink.findOne({ business: business._id });

      if (existingLink) {
        console.log(`ℹ️ Skipping existing link for business: ${business.businessName}`);
        skippedLinks.push({
          businessId: business._id,
          businessName: business.businessName,
          link: existingLink.fullLink
        });
        continue;
      }

      const reviewLink = await createReviewLink(business._id);
      createdLinks.push({
        businessId: business._id,
        businessName: business.businessName,
        link: reviewLink.fullLink
      });
    }

    res.json({
      message: 'Review links generation completed',
      createdLinksCount: createdLinks.length,
      skippedLinksCount: skippedLinks.length,
      createdLinks,
      skippedLinks
    });

  } catch (err) {
    console.error(`❌ Error in /review-link/generate-for-all:`, err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
