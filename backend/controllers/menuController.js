// backend/controllers/menuController.js
const Menu = require("../models/Menu");
const { Storage } = require("@google-cloud/storage");
const path = require("path");

const storage = new Storage({
  projectId: "restaurant-manegement-sys",
  keyFilename: path.join(__dirname, "../serviceAccountKey.json")
});

const BUCKET_NAME = "rmsstorage";


// Helper function to safely parse numbers
function parseNumber(value) {
  const num = parseFloat(value);
  return isNaN(num) ? undefined : num;
}

// GET /menus - Get all menus
exports.getMenus = async (req, res) => {
  try {
    const menus = await Menu.find({}).sort({ createdAt: -1 });
    res.json(menus);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch menus" });
  }
};

// POST /api/auth/menu
exports.createMenu = async (req, res) => {
  const formData = req.body;
  const file = req.file;
  const providedImageUrl = formData.imageUrl?.trim();

  if (file) {
    // return res.status(400).json({ error: "Image is required" });

    console.log("✅ Upload started for file:", file.originalname);
    console.log("📁 File size:", (file.size / 1024).toFixed(2), "KB");

    try {
      const bucket = storage.bucket(BUCKET_NAME);
      const blob = bucket.file(file.originalname);

      const blobStream = blob.createWriteStream();

      // Log when upload starts
      blobStream.on("error", (err) => {
        console.error("❌ Upload failed:", err);
        res.status(500).json({ error: "Image upload failed" });
      });

      // Log upload progress (chunk-based)
      let uploadedBytes = 0;
      blobStream.on("data", (chunk) => {
        uploadedBytes += chunk.length;
        const progress = ((uploadedBytes / file.size) * 100).toFixed(1);
        console.log(`📤 Uploading... ${progress}% (${uploadedBytes} / ${file.size} bytes)`);
      });

      blobStream.on("finish", async () => {
        // Make the file public
        // await blob.makePublic();

        console.log("✅ Upload completed:", file.originalname);

        const imageUrl = `https://storage.googleapis.com/${BUCKET_NAME}/${file.originalname}`;

        const newMenu = new Menu({
          ...formData,
          imageUrl
        });

        await newMenu.save();
        console.log("💾 Menu item saved to database:", newMenu.name);
        console.log("Success");
        res.json(newMenu);
      });

      blobStream.end(file.buffer);
    } catch (err) {
      console.error("Upload failed:", err.message);
      res.status(500).json({ error: "Internal server error" });
    }
  }

  else if (!file && providedImageUrl) {
    // Optional: validate URL format
    try {
      new URL(providedImageUrl);
    } catch (e) {
      return res.status(400).json({ error: "Invalid image URL" });
    }

    try {
      const newMenu = new Menu({
        ...formData,
        imageUrl: providedImageUrl // use directly
      });

      await newMenu.save();
      console.log("💾 Menu saved with external image:", newMenu.name);
      return res.json(newMenu);
    } catch (err) {
      console.error("Creation failed:", err.message);
      return res.status(500).json({ error: "Internal server error" });
    }
  }

  else {

    try {
      const newMenu = new Menu({
        ...formData
      });

      await newMenu.save();
      console.log("💾 Menu item saved to database:", newMenu.name);
      console.log("Success");
      res.json(newMenu);
    }
    catch (err) {
      console.error("Creation failed:", err.message);
      res.status(500).json({ error: "Internal server error" });
    }
  }

};

// PUT /menu/:id - Update menu
exports.updateMenu = async (req, res) => {
  const { id } = req.params;
  const updates = req.body;
  const file = req.file;
  const providedImageUrl = updates.imageUrl?.trim();

  const name = (updates.name);
  const description = (updates.description);
  const price = parseNumber(updates.price);
  const cost = parseNumber(updates.cost);
  const minimumQty = updates.minimumQty ? parseInt(updates.minimumQty) : undefined;
  const currentQty = updates.currentQty ? parseInt(updates.currentQty) : undefined;

  console.log(name, description, price, cost, minimumQty, currentQty);

  if (
    (updates.price && isNaN(price)) ||
    (updates.cost && isNaN(cost)) ||
    (updates.minimumQty && isNaN(minimumQty)) ||
    (updates.currentQty && isNaN(currentQty)) 
  ) {
    return res.status(400).json({ error: "Price, Cost, and Quantity must be valid numbers" });
  }

  const updateFields = {};
  if (name !== undefined) updateFields.name = name;
  if (description !== undefined) updateFields.description = description;
  if (price !== undefined) updateFields.price = price;
  if (cost !== undefined) updateFields.cost = cost;
  if (minimumQty !== undefined) updateFields.minimumQty = minimumQty;
  if (currentQty !== undefined) updateFields.currentQty = currentQty;
  if (updates.category) updateFields.category = updates.category;
  if (updates.description) updateFields.description = updates.description;
  if ((updates.price && updates.cost)) updateFields.netProfit = price - cost;

  if (file) {
    try {
      console.log("✅ Upload started for file:", file.originalname);
      console.log("📁 File size:", (file.size / 1024).toFixed(2), "KB");
      
      const bucket = storage.bucket(BUCKET_NAME);
      const blob = bucket.file(file.originalname);

      const blobStream = blob.createWriteStream();

      // Log when upload starts
      blobStream.on("error", (err) => {
        console.error("❌ Upload failed:", err);
        res.status(500).json({ error: "Image upload failed" });
      });

      // Log upload progress (chunk-based)
      let uploadedBytes = 0;
      blobStream.on("data", (chunk) => {
        uploadedBytes += chunk.length;
        const progress = ((uploadedBytes / file.size) * 100).toFixed(1);
        console.log(`📤 Uploading... ${progress}% (${uploadedBytes} / ${file.size} bytes)`);
      });

      blobStream.on("finish", async () => {
        // Make the file public
        // await blob.makePublic();

        console.log("✅ Upload completed:", file.originalname);

        const imageUrl = `https://storage.googleapis.com/${BUCKET_NAME}/${file.originalname}`;

        updateFields.imageUrl = imageUrl;

        console.log("💾 Menu item saved to database:", updateFields.name);
        console.log("💾 Menu item saved to database:", updateFields.imageUrl);

        try {
          const updated = await Menu.findByIdAndUpdate(id, { $set: updateFields }, {
            new: true,
            runValidators: true
          });

          if (!updated) {
            return res.status(404).json({ error: "Menu not found" });
          }

          res.json(updated);
        } catch (err) {
          console.error("Update failed:", err.message);
          res.status(500).json({ error: "Failed to update menu" });
        }
      });

      blobStream.end(file.buffer);

    } catch (err) {
      return res.status(500).json({ error: "Failed to upload image to Google Drive" });
    }
  } 
  else if (!file && providedImageUrl) {
    try {
      new URL(providedImageUrl); // basic validation
      updateFields.imageUrl = providedImageUrl;
    } catch (e) {
      return res.status(400).json({ error: "Invalid image URL" });
    }

    try {
      const updated = await Menu.findByIdAndUpdate(id, { $set: updateFields }, { new: true, runValidators: true });
      if (!updated) return res.status(404).json({ error: "Menu not found" });
      return res.json(updated);
    } catch (err) {
      console.error("Update failed:", err.message);
      return res.status(500).json({ error: "Failed to update menu" });
    }
  }
  else {
    try {
      const updated = await Menu.findByIdAndUpdate(id, { $set: updateFields }, {
        new: true,
        runValidators: true
      });

      if (!updated) {
        return res.status(404).json({ error: "Menu not found" });
      }

      res.json(updated);
    } catch (err) {
      console.error("Update failed:", err.message);
      res.status(500).json({ error: "Failed to update menu" });
    }
  }
};

// POST /api/auth/menu/restock-all
exports.restockAllMenus = async (req, res) => {
  const { amount } = req.body;

  if (!amount || isNaN(amount) || amount <= 0) {
    return res.status(400).json({ error: "Valid restock amount is required" });
  }

  const addQty = parseInt(amount, 10);

  try {
    // Update all menus: increase both currentQty and minimumQty by `amount`
    const result = await Menu.updateMany(
      {},
      [
        {
          $set: {
            currentQty: { $add: ["$currentQty", addQty] },
            minimumQty: { $add: ["$minimumQty", addQty] }
          }
        }
      ]
    );

    if (result.modifiedCount === 0) {
      return res.status(404).json({ error: "No menus found to restock" });
    }

    // Return updated menus
    const updatedMenus = await Menu.find();
    res.json(updatedMenus);
  } catch (err) {
    console.error("Bulk restock failed:", err);
    res.status(500).json({ error: "Failed to restock all items" });
  }
};

// DELETE /menu/:id - Delete menu
exports.deleteMenu = async (req, res) => {
  const { id } = req.params;

  try {
    const deleted = await Menu.findByIdAndDelete(id);
    if (!deleted) {
      return res.status(404).json({ error: "Menu not found" });
    }
    res.json({ message: "Menu deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete menu" });
  }
};