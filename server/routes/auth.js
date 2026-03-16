const router = require('express').Router();
const passport = require('passport');
const { validate } = require('../middleware/validate');
const { authenticate } = require('../middleware/auth');
const { authRateLimiter } = require('../middleware/rateLimiter');
const {
  checkEmail,
  register,
  login,
  oauthCallback,
  githubCompleteEmail,
  getMe,
  checkEmailValidation,
  registerValidation,
  loginValidation,
  githubEmailValidation,
} = require('../controllers/authController');

// Email flow
router.post('/check-email', authRateLimiter, checkEmailValidation, validate, checkEmail);
router.post('/register', authRateLimiter, registerValidation, validate, register);
router.post('/login', authRateLimiter, loginValidation, validate, login);

// Google OAuth
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'], session: false }));
router.get(
  '/google/callback',
  passport.authenticate('google', { session: false, failureRedirect: `${process.env.CLIENT_URL}/login?error=google_failed` }),
  oauthCallback
);

// GitHub OAuth
router.get('/github', passport.authenticate('github', { scope: ['user:email'], session: false }));
router.get(
  '/github/callback',
  passport.authenticate('github', { session: false, failureRedirect: `${process.env.CLIENT_URL}/login?error=github_failed` }),
  oauthCallback
);

// GitHub private email fallback
router.post('/github/complete-email', authRateLimiter, githubEmailValidation, validate, githubCompleteEmail);

// Get current user (requires auth)
router.get('/me', authenticate, getMe);

module.exports = router;
