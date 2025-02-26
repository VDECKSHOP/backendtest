import express from "express";
import multer from "multer";
import mongoose from "mongoose";
import cloudinary from "cloudinary";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import dotenv from "dotenv";

dotenv.config();

const router = express.Router();

// ✅ Cloudinary Configuration
cloudinary.v2.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

// ✅ Define Order Schema
const Order = mongoose.models.Order || mongoose.model("Order", new mongoose.Schema({
    fullname: { type: String, required: true },
    gcash: { type: String, required: true },
    address: { type: String, required: true },
    items: [{ name: String, quantity: Number, price: Number }],
    total: { type: Number, required: true },
    paymentProof: { type: String, required: true },
    status: { type: String, default: "Pending" },
    createdAt: { type: Date, default: Date.now }
}));

// ✅ Multer Setup for Cloudinary Upload
const storage = new CloudinaryStorage({
    cloudinary: cloudinary.v2,
    params: {
        folder: "payment_proofs",
        format: async (req, file) => "png",
        public_id: (req, file) => Date.now() + "-" + file.originalname
    }
});
const upload = multer({ storage });

// ✅ API to Submit an Order
router.post("/", upload.single("paymentProof"), async (req, res) => {
    try {
        const { fullname, gcash, address, items, total } = req.body;

        if (!fullname || !gcash || !address || !items || !total || !req.file) {
            return res.status(400).json({ error: "❌ Please fill in all fields and upload payment proof." });
        }

        let parsedItems;
        try {
            parsedItems = JSON.parse(items);
        } catch (err) {
            return res.status(400).json({ error: "❌ Invalid items format. Please try again." });
        }

        const newOrder = new Order({
            fullname,
            gcash,
            address,
            items: parsedItems,
            total,
            paymentProof: req.file.path, // ✅ Cloudinary file URL
            status: "Pending"
        });

        await newOrder.save();
        console.log("✅ Order Saved:", newOrder);

        res.status(201).json({ message: "✅ Order placed successfully!", order: newOrder });
    } catch (error) {
        console.error("❌ Order Submission Error:", error);
        res.status(500).json({ error: "❌ Server error", details: error.message });
    }
});

// ✅ Fetch all orders
router.get("/", async (req, res) => {
    try {
        const orders = await Order.find().sort({ createdAt: -1 });
        console.log("📦 Orders fetched:", orders.length);
        res.json(orders);
    } catch (error) {
        console.error("❌ Error fetching orders:", error);
        res.status(500).json({ error: "❌ Server error while fetching orders." });
    }
});

// ✅ Delete an order by ID
router.delete("/:id", async (req, res) => {
    try {
        const order = await Order.findByIdAndDelete(req.params.id);
        if (!order) {
            return res.status(404).json({ error: "❌ Order not found." });
        }

        console.log(`🗑️ Deleted Order: ${req.params.id}`);
        res.json({ message: "✅ Order deleted successfully!" });
    } catch (error) {
        console.error("❌ Error deleting order:", error);
        res.status(500).json({ error: "❌ Server error while deleting order." });
    }
});

export default router;

