import express from "express";
import mongoose from "mongoose";
import cloudinary from "./cloudinary.js";
import dotenv from "dotenv";

dotenv.config();

const router = express.Router();

// ✅ Define Order Schema
const Order = mongoose.models.Order || mongoose.model("Order", new mongoose.Schema({
    fullname: { type: String, required: true },
    gcash: { type: String, required: true },
    address: { type: String, required: true },
    items: [{ name: String, quantity: Number, price: Number }],
    total: { type: Number, required: true },
    paymentProof: { type: String, required: true }, // ✅ Single Image URL
    status: { type: String, default: "Pending" },
    createdAt: { type: Date, default: Date.now }
}));

// ✅ API to Submit an Order (With Single Image Upload)
router.post("/", async (req, res) => {
    try {
        const { fullname, gcash, address, items, total, paymentProof } = req.body;

        if (!fullname || !gcash || !address || !items || !total || !paymentProof) {
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
        const cloudinaryResponse = await cloudinary.uploader.upload(paymentProof, {
            folder: "payment_proofs"
        });

        // ✅ Save order in MongoDB
        const newOrder = new Order({
            fullname,
            gcash,
            address,
            items: parsedItems,
            total,
            paymentProof: cloudinaryResponse.secure_url, // ✅ Single image URL
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

// ✅ Fetch a single order by ID
router.get("/:id", async (req, res) => {
    try {
        const order = await Order.findById(req.params.id);
        if (!order) {
            return res.status(404).json({ error: "❌ Order not found." });
        }
        res.json(order);
    } catch (error) {
        console.error("❌ Error fetching order:", error);
        res.status(500).json({ error: "❌ Server error while fetching order." });
    }
});

// ✅ Delete an order by ID and remove image from Cloudinary
router.delete("/:id", async (req, res) => {
    try {
        const order = await Order.findById(req.params.id);
        if (!order) {
            return res.status(404).json({ error: "❌ Order not found." });
        }

        // ✅ Remove image from Cloudinary
        const publicId = extractPublicId(order.paymentProof);
        if (publicId) {
            await cloudinary.uploader.destroy(publicId);
        }

        // ✅ Delete order from database
        await Order.findByIdAndDelete(req.params.id);

        console.log(`🗑️ Deleted Order: ${req.params.id}`);
        res.json({ message: "✅ Order deleted successfully!" });
    } catch (error) {
        console.error("❌ Error deleting order:", error);
        res.status(500).json({ error: "❌ Server error while deleting order." });
    }
});

// ✅ Extract public_id from Cloudinary URL
function extractPublicId(url) {
    const regex = /\/v\d+\/(.+)\.\w+$/;
    const match = url.match(regex);
    return match ? match[1] : null;
}

export default router;

