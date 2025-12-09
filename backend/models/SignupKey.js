// backend/models/SignupKey.js
const mongoose = require("mongoose");

const SignupKeySchema = new mongoose.Schema({
  key: {
    type: String,
    required: true,
    unique: true
  },
  createdAt: {
    type: Date,
    expires: "5m", // auto-delete after 5 minutes
    default: Date.now
  }
});

module.exports = mongoose.model("SignupKey", SignupKeySchema);