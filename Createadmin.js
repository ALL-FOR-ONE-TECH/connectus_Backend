const bcrypt = require('bcryptjs');
const speakeasy = require('speakeasy');
const qrcode = require('qrcode-terminal');
require('dotenv').config();

// ✅ Import DB and User model
const connectDB = require('./config/db');
const UserRole = require('./models/UserRole');

// Main function
async function createAdminUser() {
  await connectDB();

  const name = 'Super Admin';
  const email = 'admin@example.com';
  const password = '123';
  const role = 'developer-admin';

  try {
    const existing = await UserRole.findOne({ email });
    if (existing) {
      console.log('⚠️ Admin already exists');
      process.exit(0);
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const secret = speakeasy.generateSecret({
      name: `Connectus-Admin:${email}`,
      issuer: 'Connectus_System',
    });

    const newUser = new UserRole({
      name,
      email,
      password: hashedPassword,
      role,
      totpSecret: secret.base32,
      isTotpEnabled: true,
    });

    await newUser.save();
    console.log('✅ Admin user registered successfully!');

    const totpURL = secret.otpauth_url;
    console.log('🔐 TOTP QR URL (scan with Google Authenticator):');
    console.log(totpURL);
    qrcode.generate(totpURL, { small: true });

  } catch (error) {
    console.error('❌ Error registering admin:', error.message);
  } finally {
    process.exit(0); // Exit cleanly
  }
}

// Run
createAdminUser();
