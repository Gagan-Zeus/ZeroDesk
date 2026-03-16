const jwt = require('jsonwebtoken');

const signToken = (payload) => {
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '1h',
  });
};

const verifyToken = (token) => {
  return jwt.verify(token, process.env.JWT_SECRET);
};

// Generate a pre-auth token (before OTP verification) with limited scope
const signPreAuthToken = (payload) => {
  return jwt.sign({ ...payload, scope: 'pre_auth' }, process.env.JWT_SECRET, {
    expiresIn: '15m',
  });
};

module.exports = { signToken, verifyToken, signPreAuthToken };
