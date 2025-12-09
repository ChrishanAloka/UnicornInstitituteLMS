const express = require("express");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const cors = require("cors");
const connectDB = require("./config/db"); // Import db.js
const authRoute = require("./routes/authRoute");
const path = require("path");
const app = express();
// Serve static uploads folder
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

dotenv.config();


app.use(express.json());
app.use(cors());

// Connect to DB
connectDB();

app.use("/api/auth", authRoute);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));