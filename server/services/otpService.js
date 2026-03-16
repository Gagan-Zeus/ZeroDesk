const crypto = require('crypto');
const OTP = require('../models/OTP');
const { sendOtpEmail } = require('./emailService');

const OTP_EXPIRY_MINUTES = parseInt(process.env.OTP_EXPIRY_MINUTES, 10) || 5;
const OTP_MAX_ATTEMPTS = parseInt(process.env.OTP_MAX_ATTEMPTS, 10) || 5;

// Generate a 6-digit OTP
const generateOtp = () => {
  return crypto.randomInt(100000, 999999).toString();
};

// Create and send OTP
const createAndSendOtp = async (email, userId = null, purpose = 'email_verification') => {
  // Invalidate any existing OTPs for this email
  await OTP.deleteMany({ email });

  const otp = generateOtp();
  const otpHash = OTP.hashOtp(otp);
  const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

  await OTP.create({
    userId,
    email,
    otpHash,
    purpose,
    expiresAt,
    maxAttempts: OTP_MAX_ATTEMPTS,
  });

  await sendOtpEmail(email, otp);

  return { message: 'OTP sent successfully', expiresInMinutes: OTP_EXPIRY_MINUTES };
};

// Verify OTP
const verifyOtp = async (email, otpInput) => {
  const otpRecord = await OTP.findOne({ email }).sort({ createdAt: -1 });

  if (!otpRecord) {
    return { success: false, message: 'No OTP found. Please request a new one.' };
  }

  if (otpRecord.expiresAt < new Date()) {
    await OTP.deleteMany({ email });
    return { success: false, message: 'OTP has expired. Please request a new one.' };
  }

  if (otpRecord.attempts >= otpRecord.maxAttempts) {
    await OTP.deleteMany({ email });
    return { success: false, message: 'Maximum attempts exceeded. Please request a new OTP.' };
  }

  const inputHash = OTP.hashOtp(otpInput);
  if (inputHash !== otpRecord.otpHash) {
    otpRecord.attempts += 1;
    await otpRecord.save();
    const remaining = otpRecord.maxAttempts - otpRecord.attempts;
    return { success: false, message: `Invalid OTP. ${remaining} attempt(s) remaining.` };
  }

  // OTP is valid — clean up
  await OTP.deleteMany({ email });
  return { success: true, message: 'OTP verified successfully.' };
};

module.exports = { createAndSendOtp, verifyOtp };
