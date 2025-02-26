import "dotenv/config";
import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import multer from "multer";
import path from "path";
import fs from "fs";
import productRoutes from "./productRoutes.js";
import orderRoutes from "./orderRoutes.js";
import Product from "./product.js"; // Make sure product.js uses ES module syntax

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

// Serve Static Files if needed
app.use("/uploads", express.static("uploads"));
app.use(express.static("public"));

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


