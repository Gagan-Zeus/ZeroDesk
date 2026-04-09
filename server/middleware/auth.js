const { verifyToken } = require('../services/jwtService');
const User = require('../models/User');

// Verify JWT and attach user to req
const authenticate = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1] || req.cookies?.token;
    if (!token) {
      return res.status(401).json({ message: 'Authentication required.' });
    }

    const decoded = verifyToken(token);
    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(401).json({ message: 'User not found.' });
    }

    req.user = user;
    req.tokenScope = decoded.scope || 'full';
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid or expired token.' });
  }
};

const requireTokenScope = (...allowedScopes) => (req, res, next) => {
  if (!allowedScopes.includes(req.tokenScope)) {
    return res.status(403).json({ message: 'This action is not allowed for the current session.' });
  }
  next();
};

const requireFullToken = requireTokenScope('full');
const requirePreAuthToken = requireTokenScope('pre_auth');

// Ensure OTP has been verified for the current session
const requireOtpVerified = (req, res, next) => {
  if (!req.user.isOtpVerified) {
    return res.status(403).json({
      message: 'OTP verification required.',
      code: 'OTP_REQUIRED',
    });
  }
  next();
};

// Ensure user has an active organization
const requireOrganization = (req, res, next) => {
  if (!req.user.currentOrganizationId) {
    return res.status(403).json({
      message: 'Organization selection required.',
      code: 'ORG_REQUIRED',
    });
  }
  req.organizationId = req.user.currentOrganizationId;
  next();
};

// Ensure user is an OWNER in their current organization
const requireOwner = (req, res, next) => {
  const orgEntry = req.user.organizations.find(
    (o) => o.orgId.toString() === req.user.currentOrganizationId?.toString()
  );
  if (!orgEntry || orgEntry.role !== 'OWNER') {
    return res.status(403).json({ message: 'Owner privileges required.' });
  }
  next();
};

module.exports = {
  authenticate,
  requireTokenScope,
  requireFullToken,
  requirePreAuthToken,
  requireOtpVerified,
  requireOrganization,
  requireOwner,
};
