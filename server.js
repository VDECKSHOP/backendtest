import "dotenv/config";
import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import multer from "multer";
import path from "path";
import fs from "fs";
import productRoutes from "./productRoutes.js";
import orderRoutes from "./orderRoutes.js";
import Product from "./product.js"; // Ensure product.js uses ES module syntax
import Order from "./order.js"; // Import Order model

const app = express();
const PORT = process.env.PORT || 4000;
const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/mydatabase";

// 🔥 MongoDB Connection
async function connectDB() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("✅ Connected to MongoDB");
  } catch (err) {
    console.error("❌ MongoDB Connection Error:", err);
    setTimeout(connectDB, 5000); // Retry in 5 seconds
  }
}
connectDB();

// 🛠 Middleware
app.use(cors());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true }));

// 📂 Multer Storage Setup (For Local File Uploads)
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(process.cwd(), "uploads");
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});
const upload = multer({ storage });

// ⬇️ Serve Static Files
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));
app.use(express.static(path.join(process.cwd(), "public")));

// 🚀 API Routes
app.use("/api/products", productRoutes);
app.use("/api/orders", orderRoutes);

// ✅ Default Route
app.get("/", (req, res) => res.send("🚀 VDECK API is running..."));

// 🔍 Get a Single Product by ID
app.get("/api/products/:id", async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ message: "❌ Product not found" });
    }
    res.json(product);
  } catch (err) {
    console.error("❌ Error fetching product:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// 🔥 Place Order and Deduct Stock
app.post("/api/orders", async (req, res) => {
  try {
    const { fullname, gcash, address, items, total, paymentProof } = req.body;

    if (!fullname || !gcash || !address || !items || !total || !paymentProof) {
      return res.status(400).json({ message: "❌ All fields are required." });
    }

    // 🔥 Parse items if sent as a JSON string
    const orderItems = typeof items === "string" ? JSON.parse(items) : items;

    console.log("📦 Received Order Items:", orderItems);

    // 🔍 Validate and attach product IDs
    const updatedItems = [];
    for (const item of orderItems) {
      const product = await Product.findOne({ name: item.name }); // ✅ Find product by name
      if (!product) {
        console.log(`❌ Product not found: ${item.name}`);
        return res.status(404).json({ message: `❌ Product not found: ${item.name}` });
      }

      console.log(`🛒 Before Order - ${item.name}: Stock = ${product.stock}`);
      if (product.stock < item.quantity) {
        return res.status(400).json({ message: `❌ Not enough stock for ${item.name}. Available: ${product.stock}` });
      }

      updatedItems.push({
        id: product._id, // ✅ Correctly assign product ID
        name: item.name,
        quantity: item.quantity,
        price: item.price
      });
    }

    // 🔥 Save Order with Correct Product IDs
    const newOrder = new Order({
      fullname,
      gcash,
      address,
      items: updatedItems, // ✅ Now items have IDs
      total,
      paymentProof,
    });

    const savedOrder = await newOrder.save();
    console.log("✅ Order Saved:", savedOrder);

    // 🔥 Deduct Stock
   for (const item of updatedItems) {
  const product = await Product.findOne({ name: item.name }); // 🔥 Find product by name
  if (product) {
    console.log(`🔻 Reducing stock for ${product.name} - Old Stock: ${product.stock}`);
    product.stock = Math.max(0, product.stock - item.quantity);
    await product.save();
    console.log(`📉 Updated Stock for ${product.name}: ${product.stock}`);
  } else {
    console.log(`❌ Product not found: ${item.name}`);
  }
}


    res.status(201).json({ message: "✅ Order placed successfully!", order: savedOrder });
  } catch (error) {
    console.error("❌ Order Placement Error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});


// 📸 Upload Image Route (For Local Storage)
app.post("/api/upload", upload.single("image"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded" });
  }
  res.json({ imageUrl: `/uploads/${req.file.filename}` });
});

// ❌ Handle Undefined Routes
app.use((req, res) => {
  res.status(404).json({ error: "❌ Route Not Found" });
});

// ❌ Global Error Handling
app.use((err, req, res, next) => {
  console.error("❌ Server Error:", err);
  res.status(err.statusCode || 500).json({ error: err.message || "Internal Server Error" });
});

// 🌍 Start Server
app.listen(PORT, () => console.log(`🚀 Server running at http://localhost:${PORT}`));