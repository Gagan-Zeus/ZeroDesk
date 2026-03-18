const { body } = require('express-validator');
const User = require('../models/User');
const { signToken, signPreAuthToken } = require('../services/jwtService');
const { createAndSendOtp } = require('../services/otpService');

// POST /api/auth/check-email — Check if email exists
const checkEmail = async (req, res, next) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email }).select('+password');
    const exists = !!user;
    // User exists AND has a password → show login screen; otherwise → show register screen
    const hasPassword = exists && !!user.password;
    return res.json({ exists: hasPassword, authProvider: user?.authProvider || null });
  } catch (err) {
    next(err);
  }
};

// POST /api/auth/register — Register with email + password
const register = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    const existing = await User.findOne({ email });
    if (existing) {
      // If OAuth user exists without a password, let them set one
      if (!existing.password || existing.authProvider !== 'local') {
        existing.password = password;
        if (!existing.name || existing.name === existing.email) existing.name = name;
        await existing.save();

        const preAuthToken = signPreAuthToken({ userId: existing._id, email: existing.email });
        await createAndSendOtp(email, existing._id, 'email_verification');

        return res.status(200).json({
          message: 'Password set. OTP sent to email.',
          preAuthToken,
          user: { id: existing._id, name: existing.name, email: existing.email },
        });
      }
      return res.status(409).json({ message: 'Email already registered. Please sign in.' });
    }

    const user = await User.create({ name, email, password, authProvider: 'local' });

    // Issue pre-auth token and send OTP
    const preAuthToken = signPreAuthToken({ userId: user._id, email: user.email });
    await createAndSendOtp(email, user._id, 'email_verification');

    return res.status(201).json({
      message: 'Account created. OTP sent to email.',
      preAuthToken,
      user: { id: user._id, name: user.name, email: user.email },
    });
  } catch (err) {
    next(err);
  }
};

// POST /api/auth/login — Login with email + password
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    // OAuth user who never set a password
    if (!user.password) {
      return res.status(400).json({
        message: 'No password set for this account. Please use "Continue with Email" to create a password, or sign in with ' + user.authProvider + '.',
      });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    // Reset OTP verification for new session
    user.isOtpVerified = false;
    await user.save();

    const preAuthToken = signPreAuthToken({ userId: user._id, email: user.email });
    await createAndSendOtp(email, user._id, 'login');

    return res.json({
      message: 'Login successful. OTP sent to email.',
      preAuthToken,
      user: { id: user._id, name: user.name, email: user.email },
    });
  } catch (err) {
    next(err);
  }
};

// OAuth callback handler (used by both Google and GitHub)
const oauthCallback = async (req, res, next) => {
  try {
    const user = req.user;

    // GitHub private email fallback
    if (user._needsEmail) {
      const encodedData = encodeURIComponent(
        JSON.stringify({
          githubId: user.githubId,
          name: user.name,
          avatar: user.avatar,
        })
      );
      return res.redirect(`${process.env.CLIENT_URL}/auth?data=${encodedData}`);
    }

    // Reset OTP verification for new session
    user.isOtpVerified = false;
    await user.save();

    const preAuthToken = signPreAuthToken({ userId: user._id, email: user.email });
    await createAndSendOtp(user.email, user._id, 'login');

    return res.redirect(
      `${process.env.CLIENT_URL}/auth?token=${preAuthToken}&email=${encodeURIComponent(user.email)}`
    );
  } catch (err) {
    next(err);
  }
};

// POST /api/auth/github/complete-email — Handle GitHub private email fallback
const githubCompleteEmail = async (req, res, next) => {
  try {
    const { email, githubId, name, avatar } = req.body;

    let user = await User.findOne({ email });
    if (!user) {
      user = await User.create({
        name,
        email,
        avatar,
        authProvider: 'github',
        oauthId: githubId,
      });
    }

    user.isOtpVerified = false;
    await user.save();

    const preAuthToken = signPreAuthToken({ userId: user._id, email: user.email });
    await createAndSendOtp(email, user._id, 'email_verification');

    return res.json({
      message: 'OTP sent to email.',
      preAuthToken,
      user: { id: user._id, name: user.name, email: user.email },
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/auth/me — Get current user
const getMe = async (req, res) => {
  const user = await User.findById(req.user._id).select('+password');
  return res.json({
    user: {
      ...req.user.toObject(),
      hasPassword: !!user.password,
    },
  });
};

// POST /api/auth/set-password — Set password for OAuth users
const setPassword = async (req, res, next) => {
  try {
    const { password } = req.body;
    const user = await User.findById(req.user._id).select('+password');

    if (user.password) {
      return res.status(400).json({ message: 'Password already set.' });
    }

    user.password = password;
    await user.save();

    return res.json({ message: 'Password set successfully.' });
  } catch (err) {
    next(err);
  }
};

const setPasswordValidation = [
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters.')
    .matches(/[A-Z]/)
    .withMessage('Password must contain an uppercase letter.')
    .matches(/[0-9]/)
    .withMessage('Password must contain a number.'),
];

// Validation rules
const checkEmailValidation = [body('email').isEmail().withMessage('Valid email is required.')];

const registerValidation = [
  body('name').trim().notEmpty().withMessage('Name is required.'),
  body('email').isEmail().withMessage('Valid email is required.'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters.')
    .matches(/[A-Z]/)
    .withMessage('Password must contain an uppercase letter.')
    .matches(/[0-9]/)
    .withMessage('Password must contain a number.'),
];

const loginValidation = [
  body('email').isEmail().withMessage('Valid email is required.'),
  body('password').notEmpty().withMessage('Password is required.'),
];

const githubEmailValidation = [
  body('email').isEmail().withMessage('Valid email is required.'),
  body('githubId').notEmpty().withMessage('GitHub ID is required.'),
  body('name').notEmpty().withMessage('Name is required.'),
];

module.exports = {
  checkEmail,
  register,
  login,
  oauthCallback,
  githubCompleteEmail,
  getMe,
  setPassword,
  checkEmailValidation,
  registerValidation,
  loginValidation,
  githubEmailValidation,
  setPasswordValidation,
};
