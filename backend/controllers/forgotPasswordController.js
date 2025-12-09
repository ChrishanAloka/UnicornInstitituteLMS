const User = require("../models/User");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");
const crypto = require("crypto");

const bcrypt = require("bcrypt");
const SignupKey = require("../models/SignupKey");

exports.findUserByEmail = async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: "Email is required" });
  }

  try {
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Generate key
    const key = Math.random().toString(36).substring(2, 8).toUpperCase(); // ABC123

    // Delete any existing key for this user
    await SignupKey.deleteMany({ });

    // Save new key
    const newKey = new SignupKey({ key });
    
    await newKey.save();

    // ✅ Send key back to frontend (you can print it on POS or show it)
    res.json({ message: "Key generated", key, userId: user._id });
  } catch (err) {
    console.error("Failed to find user:", err.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Step 2: Reset password using key
exports.resetPassword = async (req, res) => {
  const { key, newPassword, email } = req.body;

  if (!key || !newPassword) {
    return res.status(400).json({ error: "Missing fields" });
  }

  try {
    const validKey = await SignupKey.findOne({ key });

    if (!validKey || validKey.createdAt < new Date()) {
      return res.status(400).json({ error: "Invalid or expired key" });
    }

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password
    user.password = hashedPassword;
    await user.save();

    // Delete key after use
    await SignupKey.deleteOne({ key });

    res.json({ message: "Password reset successfully!" });
  } catch (err) {
    console.error("Reset failed:", err.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

exports.forgotPassword = async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: "Email is required" });
  }

  try {
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Generate token
    const resetToken = crypto.randomBytes(32).toString("hex");
    const hashedToken = crypto.createHash("sha256").update(resetToken).digest("hex");

    user.resetPasswordToken = hashedToken;
    user.resetPasswordExpires = Date.now() + 3600000; // 1 hour

    await user.save();

    // 🔗 Build reset link
    const resetUrl = `http://localhost:3000/reset-password/${resetToken}`;
    const message = `You are receiving this email because you (or someone else) have requested the reset of your password.\n\n
    Please click on the following link to reset your password:\n${resetUrl}\n\n
    If you did not request this, please ignore it.`;

    // ✉️ Send email with Nodemailer
    const transporter = nodemailer.createTransport({
      service: "Gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });

    await transporter.sendMail({
      to: user.email,
      from: "rms@support.com",
      subject: "RMS - Password Reset",
      text: message
    });

    res.json({ message: "Reset link sent to your email" });
  } catch (err) {
    console.error("Forgot password failed:", err.message);
    res.status(500).json({ error: "Failed to send reset link" });
  }
};

exports.resetPassword = async (req, res) => {
  const { token } = req.params;
  const { newPassword, confirmPassword } = req.body;

  if (newPassword !== confirmPassword) {
    return res.status(400).json({ error: "Passwords do not match" });
  }

  try {
    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");
    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ error: "Invalid or expired token" });
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const hashedPass = await bcrypt.hash(newPassword, salt);

    user.password = hashedPass;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;

    await user.save();

    res.json({ message: "Password reset successfully" });
  } catch (err) {
    console.error("Reset failed:", err.message);
    res.status(500).json({ error: "Failed to reset password" });
  }
};