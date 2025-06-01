const express = require('express');
const session = require('express-session');
const mongoose = require('mongoose');
const MongoStore = require('connect-mongo');
const cors = require('cors');
require('dotenv').config();
const connectDB = require('./config/db');
const Authadmin = require('./Routes/Authadmin');
const NormalAdmin = require('./Routes/Admin');

connectDB();
const app = express();

app.use(express.json());

app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true
}));

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

// Correct ✅
app.use('/connectus-api/adminauth', Authadmin);
app.use('/connectus-api/nomi-admin', NormalAdmin);


app.get('/', (req, res) => {
  res.send('Server is running.............');
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});