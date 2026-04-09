const router = require('express').Router();
const passport = require('passport');
const { validate } = require('../middleware/validate');
const { authenticate, requireFullToken, requireOtpVerified } = require('../middleware/auth');
const { authRateLimiter } = require('../middleware/rateLimiter');
const {
  checkEmail,
  register,
  login,
  oauthCallback,
  githubCompleteEmail,
  getMe,
  setPassword,
  updateProfile,
  changePassword,
  checkEmailValidation,
  registerValidation,
  loginValidation,
  githubEmailValidation,
  setPasswordValidation,
  updateProfileValidation,
  changePasswordValidation,
} = require('../controllers/authController');

// Email flow
router.post('/check-email', authRateLimiter, checkEmailValidation, validate, checkEmail);
router.post('/register', authRateLimiter, registerValidation, validate, register);
router.post('/login', authRateLimiter, loginValidation, validate, login);

// Google OAuth
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'], session: false }));
router.get(
  '/google/callback',
  passport.authenticate('google', { session: false, failureRedirect: `${process.env.CLIENT_URL}/auth?error=google_failed` }),
  oauthCallback
);

// GitHub OAuth
router.get('/github', passport.authenticate('github', { scope: ['user:email'], session: false }));
router.get(
  '/github/callback',
  passport.authenticate('github', { session: false, failureRedirect: `${process.env.CLIENT_URL}/auth?error=github_failed` }),
  oauthCallback
);

// GitHub private email fallback
router.post('/github/complete-email', authRateLimiter, githubEmailValidation, validate, githubCompleteEmail);

// Get current user (requires auth)
router.get('/me', authenticate, getMe);

// Set password (for OAuth users)
router.post('/set-password', authenticate, requireFullToken, requireOtpVerified, setPasswordValidation, validate, setPassword);

// Update profile
router.put('/profile', authenticate, requireFullToken, requireOtpVerified, updateProfileValidation, validate, updateProfile);

// Change password
router.put('/password', authenticate, requireFullToken, requireOtpVerified, changePasswordValidation, validate, changePassword);

module.exports = router;
