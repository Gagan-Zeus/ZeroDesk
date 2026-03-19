require('dotenv').config();
const dns = require('dns');
dns.setDefaultResultOrder('ipv4first');

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const connectDB = require('../server/config/db');
const passport = require('../server/config/passport');
const errorHandler = require('../server/middleware/errorHandler');

const app = express();

// Connect to MongoDB
connectDB();

// Security & parsing middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(passport.initialize());

// Routes
app.use('/api/auth', require('../server/routes/auth'));
app.use('/api/otp', require('../server/routes/otp'));
app.use('/api/org', require('../server/routes/org'));
app.use('/api/tasks', require('../server/routes/tasks'));

// Health check
app.get('/api/health', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

// Error handler
app.use(errorHandler);

module.exports = app;
