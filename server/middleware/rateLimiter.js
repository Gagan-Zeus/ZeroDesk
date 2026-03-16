const rateLimit = require('express-rate-limit');

// Rate limiter for OTP endpoints — max 5 requests per 15 minutes per IP
const otpRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { message: 'Too many OTP requests. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiter for auth endpoints
const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: { message: 'Too many authentication requests. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = { otpRateLimiter, authRateLimiter };
