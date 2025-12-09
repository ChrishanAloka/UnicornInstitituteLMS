// backend/controllers/authController.js
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const SignupKey = require("../models/SignupKey");

// STEP 1: Verify Reset Key
exports.verifyResetKey = async (req, res) => {
  const { key } = req.body;
  try {
    const validKey = await SignupKey.findOne({ key });
    if (!validKey) return res.status(400).json({ message: "Invalid or expired key" });

    res.status(200).json({ message: "Key is valid" });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// STEP 2: Reset Password
exports.resetPassword = async (req, res) => {
  const { email, key, newPassword } = req.body;

  try {
    const validKey = await SignupKey.findOne({ key });
    if (!validKey) return res.status(400).json({ message: "Invalid or expired key" });

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found" });

    user.password = newPassword;
    await user.save();

    // Remove the used key
    await SignupKey.deleteOne({ key });

    res.status(200).json({ message: "Password has been reset" });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// controllers/authController.js
exports.signup = async (req, res) => {
  const { name, email, password, role , signupKey } = req.body;

  console.log("Received body:", req.body); // ✅ Log this

  if (["cashier", "kitchen"].includes(role)) {
    if (!signupKey) {
      return res.status(400).json({ error: "Signup key is required" });
    }

    const validKey = await SignupKey.findOne({ key: signupKey });

    if (!validKey) {
      return res.status(400).json({ error: "Invalid signup key" });
    }
  }

  try {
    const user = new User({ name, email, password, role });
    await user.save();
    res.status(201).json({ message: `${role} user created` });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// controllers/authController.js
// backend/controllers/authController.js

exports.login = async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email });

  if (!user || !(await user.comparePassword(password))) {
    return res.status(400).json({ error: "Invalid credentials" });
  }

  // ❌ Block login if not active
  if (!user.isActive) {
    return res.status(403).json({ error: "Account is inactive" });
  }

  const token = jwt.sign(
    { id: user._id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: "1d" }
  );

  res.json({ token, role: user.role });
};


// controllers/authController.js

// Get all keys
exports.getSignupKeys = async (req, res) => {
  try {
    const keys = await SignupKey.find();
    res.json(keys);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
};

// Generate a new key
exports.generateSignupKey = async (req, res) => {
  const key = Math.random().toString(36).substring(2, 15); // simple random key
  const newKey = new SignupKey({ key });
  await newKey.save();
  res.json(newKey);
};

// Delete a key
exports.deleteSignupKey = async (req, res) => {
  const { id } = req.params;
  await SignupKey.findByIdAndDelete(id);
  res.json({ message: "Key deleted" });
};

// backend/controllers/authController.js

// Get all users
exports.getUsers = async (req, res) => {
  try {
    const users = await User.find({}, "name email role isActive"); // exclude password
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
};

// Update user role
exports.updateUserRole = async (req, res) => {
  const { id } = req.params;
  const { role } = req.body;

  if (!["admin", "cashier", "kitchen"].includes(role)) {
    return res.status(400).json({ error: "Invalid role" });
  }

  try {
    const updated = await User.findByIdAndUpdate(
      id,
      { role },
      { new: true }
    );
    res.json({ role: updated.role });
  } catch (err) {
    res.status(500).json({ error: "Failed to update role" });
  }
};

// Deactivate user
exports.deactivateUser = async (req, res) => {
  const { id } = req.params;

  try {
    const updated = await User.findByIdAndUpdate(
      id,
      { isActive: false },
      { new: true }
    );

    if (!updated) return res.status(404).json({ error: "User not found" });

    res.json(updated);
  } catch (err) {
    console.error("Deactivation failed:", err.message);
    res.status(500).json({ error: "Failed to deactivate user" });
  }
};

// Reactivate a user
exports.reactivateUser = async (req, res) => {
  const { id } = req.params;

  try {
    const updated = await User.findByIdAndUpdate(
      id,
      { isActive: true },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json(updated);
  } catch (err) {
    console.error("Reactivate failed:", err.message);
    res.status(500).json({ error: "Failed to reactivate user" });
  }
};