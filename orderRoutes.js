import express from "express";
import mongoose from "mongoose";
import { Readable } from "stream"; // ✅ Fix Cloudinary upload issue
import cloudinary from "./cloudinary.js";
import multer from "multer";
import dotenv from "dotenv";

dotenv.config();
const router = express.Router();

// ✅ Multer: Store file in memory buffer
const storage = multer.memoryStorage();
const upload = multer({ storage });

// ✅ Order Schema
const Order = mongoose.models.Order || mongoose.model("Order", new mongoose.Schema({
    fullname: { type: String, required: true },
    gcash: { type: String, required: true },
    address: { type: String, required: true },
    items: [{ name: String, quantity: Number, price: Number }],
    total: { type: Number, required: true },
    paymentProof: { type: String, required: true }, // ✅ Cloudinary URL
    status: { type: String, default: "Pending" },
    createdAt: { type: Date, default: Date.now }
}));

// ✅ Get All Orders
router.get("/", async (req, res) => {
    try {
        const orders = await Order.find();
        res.json(orders);
    } catch (error) {
        console.error("❌ Error fetching orders:", error);
        res.status(500).json({ error: "❌ Server error" });
    }
});

// ✅ Submit Order with Image Upload
router.post("/", upload.single("paymentProof"), async (req, res) => {
    try {
        const { fullname, gcash, address, items, total } = req.body;

        if (!fullname || !gcash || !address || !items || !total || !req.file) {
            return res.status(400).json({ error: "❌ All fields and payment proof are required." });
        }

        // ✅ Parse items if sent as a string
        let parsedItems;
        try {
            parsedItems = typeof items === "string" ? JSON.parse(items) : items;
        } catch (err) {
            return res.status(400).json({ error: "❌ Invalid items format." });
        }

        // ✅ Upload Image to Cloudinary
        const uploadStream = cloudinary.uploader.upload_stream(
            { folder: "payment_proofs" },
            async (error, result) => {
                if (error) {
                    console.error("❌ Cloudinary Upload Error:", error);
                    return res.status(500).json({ error: "❌ Image upload failed." });
                }

                // ✅ Save order to MongoDB
                const newOrder = new Order({
                    fullname,
                    gcash,
                    address,
                    items: parsedItems,
                    total,
                    paymentProof: result.secure_url,
                    status: "Pending"
                });

                await newOrder.save();
                console.log("✅ Order Saved:", newOrder);
                res.status(201).json({ message: "✅ Order placed successfully!", order: newOrder });
            }
        );

        // ✅ Fix Cloudinary Streaming Issue
        Readable.from(req.file.buffer).pipe(uploadStream);

    } catch (error) {
        console.error("❌ Order Submission Error:", error);
        res.status(500).json({ error: "❌ Server error", details: error.message });
    }
});

// ✅ Delete Order
router.delete("/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const order = await Order.findById(id);
        if (!order) return res.status(404).json({ error: "❌ Order not found." });

        await Order.findByIdAndDelete(id);
        res.json({ message: "✅ Order deleted successfully." });
    } catch (error) {
        console.error("❌ Error deleting order:", error);
        res.status(500).json({ error: "❌ Server error" });
    }
});

export default router;


