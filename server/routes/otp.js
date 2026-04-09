const router = require('express').Router();
const { authenticate, requirePreAuthToken } = require('../middleware/auth');
const { otpRateLimiter } = require('../middleware/rateLimiter');
const { validate } = require('../middleware/validate');
const { sendOtp, verifyOtpHandler, resendOtp, verifyOtpValidation } = require('../controllers/otpController');

// All OTP routes require at least pre-auth token
router.use(authenticate, requirePreAuthToken);

router.post('/send', otpRateLimiter, sendOtp);
router.post('/verify', otpRateLimiter, verifyOtpValidation, validate, verifyOtpHandler);
router.post('/resend', otpRateLimiter, resendOtp);

module.exports = router;
