const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const speakeasy = require('speakeasy');
const axios = require('axios');

const User = require('../models/UserRole');
const Business = require('../models/businessInfo');
const ActionLog = require('../models/ActionLog');

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
function ensureAdmin(req, res, next) {
  if (req.session?.user?.role !== 'admin') {
    return res.status(403).json({ message: 'Access denied: Only admins can perform this action.' });
  }
  next();
}

// TOTP verification middleware
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

// Extract lat/lon from Google Maps link
function extractLatLonFromGoogleMapsPlaceLink(url) {
  let match = url.match(/@([-.\d]+),([-.\d]+)/);
  if (match) {
    return { lat: parseFloat(match[1]), lon: parseFloat(match[2]) };
  }
  match = url.match(/[?&](?:ll|q)=([-.\d]+),([-.\d]+)/);
  if (match) {
    return { lat: parseFloat(match[1]), lon: parseFloat(match[2]) };
  }
  return null;
}

// Reverse Geocoding using LocationIQ
async function reverseGeocode(lat, lon) {
  const apiKey = process.env.LOCATION_IQ_API_KEY;
  const url = `https://us1.locationiq.com/v1/reverse.php?key=${apiKey}&lat=${lat}&lon=${lon}&format=json&addressdetails=1`;

  try {
    const response = await axios.get(url);
    if (response.data?.address) {
      const address = response.data.address;
      console.log('LocationIQ Address:', address); // Debug log
      
      // Build complete street/area name
      let streetArea = '';
      if (address.neighbourhood) streetArea = address.neighbourhood;
      if (address.road) {
        streetArea = streetArea 
          ? `${streetArea} ${address.road}`
          : address.road;
      }
      
      // Priority order for place parts
      const relevantParts = [];
      
      // Add complete street/area name if available
      if (streetArea) relevantParts.push(streetArea);
      
      // Add wider areas
      if (address.suburb && !streetArea.includes(address.suburb)) relevantParts.push(address.suburb);
      if (address.city_district) relevantParts.push(address.city_district);
      if (address.city) relevantParts.push(address.city);
      
      // Clean and filter the parts
      const cleanParts = relevantParts
        .filter(part => part && part.trim()) // Remove empty/null values
        .map(part => part.trim()) // Trim whitespace
        .filter(part => 
          !/^(Chennai|Thiruvallur|Tamil Nadu|India|\d{6}|Division|Zone|CMWSSB)/.test(part) && // Filter out unwanted prefixes
          !/^[0-9\s-]+$/.test(part) && // Filter out pure numbers
          part.length > 1 // Filter out single characters
        );

      // Remove duplicates but keep complete names
      const uniqueParts = cleanParts.filter((part, index, array) => {
        // Keep this part if it's not a substring of any other part
        return !array.some((otherPart, otherIndex) => 
          index !== otherIndex && 
          otherPart !== part &&
          otherPart.toLowerCase().includes(part.toLowerCase())
        );
      });

      console.log('Processed Place Parts:', uniqueParts); // Debug log

      return {
        placeName: response.data.display_name,
        placeParts: uniqueParts,
      };
    }
  } catch (err) {
    console.error('Reverse geocoding failed:', err.message);
  }
  return {
    placeName: '',
    placeParts: [],
  };
}

// Process place name into parts
function processPlaceName(fullPlaceName) {
  try {
    // Clean up the place name first
    const cleaned = fullPlaceName
      .replace(/\+/g, ' ') // Replace + with spaces
      .replace(/,?\s*(Chennai|Thiruvallur|Tamil Nadu|India|\d{6}|Division|Zone|CMWSSB)([,\s]|$)/gi, '') // Remove unwanted parts
      .replace(/^[0-9\s-]+$/, ''); // Remove pure numbers

    // First split by commas
    let parts = cleaned.split(',')
      .map(part => part.trim())
      .filter(part => part.length > 0);

    // Then split any remaining parts by space if they're too long (likely multiple places)
    const finalParts = [];
    parts.forEach(part => {
      if (part.length > 30) { // If part is too long, might contain multiple places
        const subParts = part.split(/\s+(?=[A-Z])/) // Split on space followed by capital letter
          .filter(p => p.length > 1);
        finalParts.push(...subParts);
      } else {
        finalParts.push(part);
      }
    });

    // Clean and filter the parts
    const cleanedParts = finalParts
      .map(part => part.trim())
      .filter(part => 
        part.length > 1 && 
        !/^(Chennai|Thiruvallur|Tamil Nadu|India|\d{6}|Division|Zone|CMWSSB)/.test(part) &&
        !/^\d+$/.test(part) // Remove pure numeric strings
      );

    // Remove duplicates
    return [...new Set(cleanedParts)];
  } catch (error) {
    console.error('Error processing place name:', error);
    return [];
  }
}

// Process full address into clean parts
function processAddressParts(fullAddress) {
  try {
    // Common Indian address suffixes that should not be split
    const commonSuffixes = ['Nagar', 'Street', 'Road', 'Colony', 'Layout', 'Area', 'Main'];
    
    // Split by common delimiters
    const parts = fullAddress
      .split(/[,\-\/]/) // Split by comma, hyphen, or forward slash
      .map(part => part.trim())
      .filter(Boolean); // Remove empty strings

    let processedParts = [];
    
    parts.forEach(part => {
      // Don't split if it contains common suffixes
      if (commonSuffixes.some(suffix => part.toLowerCase().includes(suffix.toLowerCase()))) {
        processedParts.push(part);
      } else if (part.length > 30) {
        // Split very long parts by capital letters, but keep suffixes together
        const subParts = part.split(/\s+(?=[A-Z])/)
          .map(p => p.trim())
          .filter(p => p.length > 1);
        processedParts.push(...subParts);
      } else {
        processedParts.push(part);
      }
    });

    // Clean and filter parts
    const cleanParts = processedParts
      .map(part => part.trim())
      .filter(part => 
        part.length > 1 && 
        !/^(Chennai|Thiruvallur|Tamil Nadu|India|\d{6}|Division|Zone|CMWSSB|[0-9\s-]+$)/.test(part)
      );

    // Smart deduplication: Remove parts that are substrings of other parts
    const finalParts = cleanParts.filter((part, index, array) => {
      const isSubstring = array.some((otherPart, otherIndex) => {
        return index !== otherIndex && 
               otherPart.toLowerCase().includes(part.toLowerCase()) &&
               // Don't remove if it's a common suffix
               !commonSuffixes.some(suffix => 
                 part.toLowerCase() === suffix.toLowerCase()
               );
      });
      return !isSubstring;
    });

    return finalParts;
  } catch (error) {
    console.error('Error processing address parts:', error);
    return [];
  }
}

// -------------------- Routes --------------------

// GET /businesses?placePart=... (list all or filter by placePart)
router.get('/businesses', ensureAdmin, async (req, res) => {  try {
    let query = {};
    if (req.query.placePart) {
      query.placeParts = { $in: [req.query.placePart] };  // Check if placePart exists in the array
    }
    const businesses = await Business.find(query).populate('serviceTypes');
    res.json(businesses);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /businesses/:id (single business)
router.get('/businesses/:id', ensureAdmin, async (req, res) => {
  try {
    const business = await Business.findById(req.params.id).populate('serviceTypes');
    if (!business) return res.status(404).json({ message: 'Business not found' });
    res.json(business);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /businesses (create business)
// POST /businesses (create business)
router.post('/businesses', ensureAdmin, upload.array('images'), async (req, res) => {
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

    let lat = null, lon = null;
    let placeName = '';
    let placeParts = [];

    if (req.body.mapUrl) {
      const coords = extractLatLonFromGoogleMapsPlaceLink(req.body.mapUrl);
      if (coords) {
        lat = coords.lat;
        lon = coords.lon;        // First try reverse geocode
        const geoData = await reverseGeocode(lat, lon);
        if (geoData.placeName) {
          placeName = geoData.placeName;
          placeParts = geoData.placeParts;
        } else {
          // fallback
          placeName = extractPlaceName(req.body.mapUrl);
          placeParts = processPlaceName(placeName);
        }

        console.log('--- CREATE BUSINESS ---');
        console.log('mapUrl:', req.body.mapUrl);
        console.log('Extracted lat/lon:', { lat, lon });
        console.log('Final placeName (used in DB):', placeName);
        console.log('Final placeParts (used in DB):', placeParts);
      }
    }

    const business = await Business.create({
      businessName: req.body.businessName,
      address: req.body.address,
      contactNumber: req.body.contactNumber,
      contactEmail: req.body.contactEmail,
      mapUrl: req.body.mapUrl,
      placeName,
      placeParts,
      serviceTypes,
      image: imagePaths,
      location: lat && lon ? {
        type: 'Point',
        coordinates: [Number(lon), Number(lat)],
      } : undefined,
    });

    await ActionLog.create({
      actionType: 'CREATE',
      collectionName: 'Business',
      documentId: business._id,
      userId: req.session.user.id,
      userName: req.session.user.name,
      changes: business.toObject(),
    });

    res.status(201).json(business);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// PUT /businesses/:id (update business)
router.put('/businesses/:id', ensureAdmin, upload.array('images'), async (req, res) => {
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
      businessName: req.body.businessName,
      address: req.body.address,
      contactNumber: req.body.contactNumber,
      contactEmail: req.body.contactEmail,
      serviceTypes,
    };

    if (imagePaths.length > 0) {
      updateData.image = imagePaths;
    }

    if (req.body.mapUrl) {
      const coords = extractLatLonFromGoogleMapsPlaceLink(req.body.mapUrl);
      updateData.mapUrl = req.body.mapUrl;

      let placeName = '';
      let placeParts = [];      if (coords) {
        console.log('Coordinates found:', coords);
        
        // First try reverse geocode
        const geoData = await reverseGeocode(coords.lat, coords.lon);
        console.log('Geocoding response:', geoData);
          if (geoData.placeName) {
          placeName = geoData.placeName;
          // Get parts from both the geocoded data and the processed address
          const geoParts = geoData.placeParts;
          const addressParts = processAddressParts(geoData.placeName);
          placeParts = [...new Set([...geoParts, ...addressParts])];
          console.log('Using geocoded data:', { placeName, placeParts });
        } else {
          // fallback
          placeName = extractPlaceName(req.body.mapUrl);
          placeParts = processAddressParts(placeName);
          console.log('Using fallback data:', { placeName, placeParts });
        }

        // Make sure placeParts is always an array
        if (!Array.isArray(placeParts)) {
          placeParts = [];
        }

        // Update the data
        updateData.placeName = placeName;
        updateData.placeParts = placeParts;
        updateData.location = {
          type: 'Point',
          coordinates: [Number(coords.lon), Number(coords.lat)],
        };
        
        console.log('Final updateData:', updateData);

        console.log('--- UPDATE BUSINESS ---');
        console.log('mapUrl:', req.body.mapUrl);
        console.log('Extracted lat/lon:', coords);
        console.log('Final placeName (used in DB):', placeName);
        console.log('Final placeParts (used in DB):', placeParts);
      }
    }    const updated = await Business.findByIdAndUpdate(
      req.params.id,
      updateData,
      { 
        new: true, // Return the updated document
        runValidators: true // Run model validations
      }
    ).populate('serviceTypes');

    console.log('Updated document:', updated);

    await ActionLog.create({
      actionType: 'UPDATE',
      collectionName: 'Business',
      documentId: updated._id,
      userId: req.session.user.id,
      userName: req.session.user.name,
      changes: updated.toObject(),
    });

    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// GET /businesses/places (unique placeParts list)
router.get('/businesses/places', async (req, res) => {
  try {
    const allParts = await Business.distinct('placeParts');
    const uniquePlaces = Array.from(new Set(allParts));
    res.json(uniquePlaces);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete Business with TOTP
router.delete('/businesses/:businessId', ensureAdmin, verifyTotp, async (req, res) => {
  try {
    const business = await Business.findById(req.params.id);
    if (!business) {
      return res.status(404).json({ message: 'Business not found' });
    }

    // Log before deleting
    await ActionLog.create({
      actionType: 'DELETE',
      collectionName: 'Business',
      documentId: business._id,
      userId: req.session.user.id,
      userName: req.session.user.name,
      changes: business.toObject(),
    });

    // Delete image files from filesystem
    if (business.image && Array.isArray(business.image)) {
      business.image.forEach((imgPath) => {
        // Construct absolute path on server
        const filePath = path.join(__dirname, '..', imgPath);
        // Check if file exists and delete it safely
        if (fs.existsSync(filePath)) {
          try {                               // <<<< ADDED try-catch
            fs.unlinkSync(filePath);
            console.log(`Deleted file: ${filePath}`);
          } catch (e) {
            console.error(`Failed to delete file ${filePath}:`, e);
          }
        }
      });
    } else if (typeof business.image === 'string') {
      const filePath = path.join(__dirname, '..', business.image);
      if (fs.existsSync(filePath)) {
        try {                               // <<<< ADDED try-catch
          fs.unlinkSync(filePath);
          console.log(`Deleted file: ${filePath}`);
        } catch (e) {
          console.error(`Failed to delete file ${filePath}:`, e);
        }
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
