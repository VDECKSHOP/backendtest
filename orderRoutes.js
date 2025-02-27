import express from "express";
import mongoose from "mongoose";
import cloudinary from "./cloudinary.js";
import multer from "multer";
import dotenv from "dotenv";

dotenv.config();

const router = express.Router();

// ✅ Set up Multer for file uploads
const storage = multer.memoryStorage(); // Stores file in memory as a buffer
const upload = multer({ storage });

// ✅ Define Order Schema
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

// ✅ API to Submit an Order (With Image Upload)
router.post("/", upload.single("paymentProof"), async (req, res) => {
    try {
        const { fullname, gcash, address, items, total } = req.body;

        if (!fullname || !gcash || !address || !items || !total || !req.file) {
            return res.status(400).json({ error: "❌ Please fill in all fields and upload a payment proof." });
        }

        // ✅ Parse items if sent as a string
        let parsedItems;
        try {
            parsedItems = typeof items === "string" ? JSON.parse(items) : items;
        } catch (err) {
            return res.status(400).json({ error: "❌ Invalid items format. Please try again." });
        }

        // ✅ Upload payment proof to Cloudinary
        const cloudinaryResponse = await cloudinary.uploader.upload_stream(
            { folder: "payment_proofs" },
            async (error, result) => {
                if (error) {
                    console.error("❌ Cloudinary Upload Error:", error);
                    return res.status(500).json({ error: "❌ Failed to upload image." });
                }

                // ✅ Save order in MongoDB
                const newOrder = new Order({
                    fullname,
                    gcash,
                    address,
                    items: parsedItems,
                    total,
                    paymentProof: result.secure_url, // ✅ Cloudinary image URL
                    status: "Pending"
                });

                await newOrder.save();
                console.log("✅ Order Saved:", newOrder);
                res.status(201).json({ message: "✅ Order placed successfully!", order: newOrder });
            }
        );

        cloudinaryResponse.end(req.file.buffer); // ✅ Upload the file buffer

    } catch (error) {
        console.error("❌ Order Submission Error:", error);
        res.status(500).json({ error: "❌ Server error", details: error.message });
    }
});

export default router;

