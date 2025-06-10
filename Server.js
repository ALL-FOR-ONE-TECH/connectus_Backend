const express = require('express');
const session = require('express-session');
const mongoose = require('mongoose');
const MongoStore = require('connect-mongo');
const cors = require('cors');
const path = require('path');
require('dotenv').config();
const connectDB = require('./config/db');
const Authadmin = require('./Routes/Authadmin');
const adminservice = require('./Routes/AdminService');
const adminbusiness = require('./Routes/AdminBusiness');
const location = require('./Routes/location');
const UserProfile = require('./Routes/UserProfile'); 
const HomeDisplay = require('./Routes/HomeDisplay');
const businessesDetail  = require('./Routes/businessDetailsRouter'); // Assuming you have a businessDetails route
const SearchEngine = require('./Routes/SearchEngin'); // Assuming you have a SearchEngine route
const ReviewRout = require('./Routes/ReviewRout'); // Assuming you have a Review route
const ComplaintsRouter = require('./Routes/complaintsRouter'); // Assuming you have a complaints route

connectDB();
const app = express();

app.use(express.json());

app.use(cors({
  origin: 'http://localhost:3000',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true
}));

// Static folder for uploaded files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: process.env.MONGO_URI,
    dbName: process.env.MONGO_DB_NAME, // ensure it targets your intended DB
    collectionName: 'sessions'
  }),
  cookie: {
    maxAge: 1000 * 60 * 60 * 24, // 1 day
    sameSite: 'lax',
    secure: false
  }
}));

// Import routes
app.use('/connectus-api/adminauth', Authadmin);
app.use('/connectus-api/adminservice', adminservice);
app.use('/connectus-api/adminbusiness', adminbusiness);
app.use('/connectus-api/location', location);
app.use('/connectus-api/homeDisplay', HomeDisplay);
app.use('/connectus-api/userprofile', UserProfile);
app.use('/connectus-api/searchengine', SearchEngine); // Add SearchEngine route
app.use('/connectus-api/businessDetails', businessesDetail); // Add businessDetails route
app.use('/connectus-api/complaints', ComplaintsRouter); // Add complaints route
app.use('/connectus-api/reviews', ReviewRout); // Add Review route

app.get('/', (req, res) => {
  res.send('Server is running.............');
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});