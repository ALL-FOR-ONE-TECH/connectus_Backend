const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const speakeasy = require('speakeasy');
const qrcode = require('qrcode'); // Don't forget this import
const User = require('../models/UserRole');

// Admin Login
router.post('/admin-login', async (req, res) => {
  const { email, password, totp } = req.body;

  try {
    console.log('✅ Incoming login request for:', email);

    const user = await User.findOne({ email });

    const isPasswordMatch = await bcrypt.compare(password, user.password);
    if (!isPasswordMatch) {
      console.log('❌ Password mismatch');
      return res.status(401).json({ message: 'Invalid password' });
    }

    if (user.isTotpEnabled) {
      if (!totp) {
        console.log('❌ Missing TOTP code');
        return res.status(400).json({ message: 'TOTP code required' });
      }

      const verified = speakeasy.totp.verify({
        secret: user.totpSecret,
        encoding: 'base32',
        token: totp,
        window: 1,
      });

      if (!verified) {
        console.log('❌ Invalid TOTP code');
        return res.status(401).json({ message: 'Invalid TOTP code' });
      }
    }

    // ✅ Set session
    req.session.user = {
      id: user._id,
      email: user.email,
      role: user.role,
    };

    console.log('✅ Session set:', req.session.user);

    // ✅ Save session and send response
    req.session.save((err) => {
      if (err) {
        console.error('❌ Session save error:', err);
        return res.status(500).json({ message: 'Session save failed' });
      }

      console.log('✅ Session saved successfully');
      return res.status(200).json({
        message: 'Login successful',
        user: {
          name: user.name,
          email: user.email,
          role: user.role,
        },
      });
    });

  } catch (err) {
    console.error('❌ Login error:', err.message);
    res.status(500).json({ message: 'Server error during login' });
  }
});


// Admin registers another user
router.post('/register-user', async (req, res) => {
  if (!req.session.user || req.session.user.role !== 'developer-admin') {
    console.log('❌ Unauthorized registration attempt');
    return res.status(403).json({ message: 'Only admin can register users' });
  }

  const { name, email, password, role } = req.body;

  try {
    console.log(`✅ Admin ${req.session.user.email} attempting to register user:`, email);

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      console.log('❌ User already exists');
      return res.status(400).json({ message: 'User already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const totpSecret = speakeasy.generateSecret({
      name: `ConnectUs-Admin(${email})`,
    });

    const qrCodeDataURL = await qrcode.toDataURL(totpSecret.otpauth_url);

    const newUser = new User({
      name,
      email,
      password: hashedPassword,
      role: role || 'staff',
      totpSecret: totpSecret.base32,
      isTotpEnabled: true
    });

    await newUser.save();
    console.log('✅ New user registered:', email);

    res.status(201).json({
      message: 'User registered successfully',
      totpSecret: totpSecret.base32,
      qrCodeURL: qrCodeDataURL
    });

  } catch (err) {
    console.error('❌ Register error:', err.message);
    res.status(500).json({ message: 'Server error during registration' });
  }
});



module.exports = router;
