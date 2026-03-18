const { body } = require('express-validator');
const User = require('../models/User');
const { createAndSendOtp, verifyOtp } = require('../services/otpService');
const { signToken } = require('../services/jwtService');

// POST /api/otp/send — Send OTP to email
const sendOtp = async (req, res, next) => {
  try {
    const result = await createAndSendOtp(req.user.email, req.user._id, 'login');
    return res.json(result);
  } catch (err) {
    next(err);
  }
};

// POST /api/otp/verify — Verify OTP and issue full JWT
const verifyOtpHandler = async (req, res, next) => {
  try {
    const { otp } = req.body;
    const result = await verifyOtp(req.user.email, otp);

    if (!result.success) {
      return res.status(400).json({ message: result.message });
    }

    // Mark user as OTP verified
    const user = await User.findById(req.user._id).select('+password');
    user.isOtpVerified = true;
    await user.save();

    // Issue full session JWT
    const token = signToken({
      userId: user._id,
      email: user.email,
      scope: 'full',
    });

    return res.json({
      message: 'OTP verified successfully.',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        isOtpVerified: true,
        hasPassword: !!user.password,
        currentOrganizationId: user.currentOrganizationId,
        organizations: user.organizations,
      },
    });
  } catch (err) {
    next(err);
  }
};

// POST /api/otp/resend — Resend OTP
const resendOtp = async (req, res, next) => {
  try {
    const result = await createAndSendOtp(req.user.email, req.user._id, 'login');
    return res.json({ message: 'OTP resent successfully.', ...result });
  } catch (err) {
    next(err);
  }
};

const verifyOtpValidation = [
  body('otp')
    .isLength({ min: 6, max: 6 })
    .isNumeric()
    .withMessage('OTP must be a 6-digit number.'),
];

module.exports = { sendOtp, verifyOtpHandler, resendOtp, verifyOtpValidation };
