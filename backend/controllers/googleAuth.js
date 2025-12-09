const { google } = require("googleapis");
const fs = require("fs");
const path = require("path");
const { v4: uuidv4 } = require("uuid");

// Initialize Google Auth
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

oauth2Client.setCredentials({
  refresh_token: process.env.GOOGLE_REFRESH_TOKEN
});

const drive = google.drive({ version: "v3", auth: oauth2Client });

async function uploadToGoogleDrive(buffer, originalName) {
  const fileName = `${uuidv4()}-${originalName}`;
  const filePath = path.join(__dirname, "../temp", fileName);

  // Save buffer to temp file
  fs.writeFileSync(filePath, buffer);

  try {
    const fileMetadata = {
      name: fileName,
      parents: [process.env.GOOGLE_DRIVE_FOLDER_ID] // Folder ID from .env
    };

    const media = {
      mimeType: "image/jpeg",
      body: fs.createReadStream(filePath)
    };

    const res = await drive.files.create({
      resource: fileMetadata,
      media: media
    });

    // Make publicly accessible
    await drive.permissions.create({
      fileId: res.data.id,
      requestBody: {
        role: "reader",
        type: "anyone"
      }
    });

    const imageUrl = `https://drive.google.com/uc?export=view&id=${res.data.id}`;
    fs.unlinkSync(filePath); // Clean up temp file
    return imageUrl;
  } catch (err) {
    console.error("Upload failed:", err.message);
    throw err;
  }
}

module.exports = { uploadToGoogleDrive };