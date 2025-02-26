import "dotenv/config";
import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import multer from "multer";
import productRoutes from "./productRoutes.js";
import orderRoutes from "./orderRoutes.js";
import Product from "./product.js"; 
import cloudinary from "./cloudinary.js"; // Import Cloudinary setup

// Initialize Express App
const app = express();
const PORT = process.env.PORT || 4000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// MongoDB Connection
const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/mydatabase";
mongoose.connect(MONGO_URI)
  .then(() => console.log("✅ Connected to MongoDB"))
  .catch((err) => {
    console.error("❌ MongoDB Connection Error:", err);
    process.exit(1);
  });

// Serve Static Files
app.use("/uploads", express.static("uploads"));
app.use(express.static("public"));

// Configure Multer for Cloudinary Uploads
const storage = multer.memoryStorage();
const upload = multer({ storage });

// Image Upload Route (Optional if not inside orderRoutes)
app.post("/api/upload", upload.single("image"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No image uploaded" });

    const result = await cloudinary.uploader.upload_stream(
      { folder: "orders" }, // Cloudinary folder name
      (error, cloudinaryResult) => {
        if (error) return res.status(500).json({ error: "Cloudinary Upload Failed" });
        res.status(200).json({ imageUrl: cloudinaryResult.secure_url });
      }
    ).end(req.file.buffer);
  } catch (error) {
    res.status(500).json({ error: "Image upload error" });
  }
});

// Use Modular Routes
app.use("/api/products", productRoutes);
app.use("/api/orders", orderRoutes);

// Default Route
app.get("/", (req, res) => res.send("🚀 VDECK API is running..."));

// Get a Single Product
app.get("/api/products/:id", async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }
    res.json(product);
  } catch (err) {
    console.error("❌ Error fetching product:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Global Error Handling
app.use((err, req, res, next) => {
  console.error("❌ Server Error:", err);
  res.status(500).json({ error: "Internal Server Error" });
});

// Start Server
app.listen(PORT, () => console.log(`🚀 Server running at http://localhost:${PORT}`));

