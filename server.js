import "dotenv/config";
import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import productRoutes from "./productRoutes.js";
import orderRoutes from "./orderRoutes.js";
import path from "path";

const app = express();
const PORT = process.env.PORT || 4000;
const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/mydatabase";

// 🔥 Connect to MongoDB
async function connectDB() {
    try {
        await mongoose.connect(MONGO_URI);
        console.log("✅ Connected to MongoDB");
    } catch (err) {
        console.error("❌ MongoDB Connection Error:", err);
        setTimeout(connectDB, 5000); // Retry connection every 5 seconds
    }
}
connectDB();

// 🔧 Middleware
app.use(cors()); // Configure specific origins if needed
app.use(express.json({ limit: "50mb" })); // Support large Base64 images
app.use(express.urlencoded({ extended: true }));

// 🔥 Serve Static Files
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));
app.use(express.static(path.join(process.cwd(), "public")));

// 🚀 API Routes
app.use("/api/products", productRoutes);
app.use("/api/orders", orderRoutes);

// ✅ Default Route
app.get("/", (req, res) => res.send("🚀 VDECK API is running..."));

// ❌ Global Error Handling
app.use((err, req, res, next) => {
    console.error("❌ Server Error:", err);
    res.status(err.statusCode || 500).json({ error: err.message || "Internal Server Error" });
});

// 🌍 Start Server
app.listen(PORT, () => console.log(`🚀 Server running at http://localhost:${PORT}`));
