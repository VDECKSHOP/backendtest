const express = require("express");
const multer = require("multer");
const mongoose = require("mongoose");

const router = express.Router();

// ✅ Define Order Schema
const Order = mongoose.models.Order || mongoose.model("Order", new mongoose.Schema({
    fullname: { type: String, required: true },
    gcash: { type: String, required: true },
    address: { type: String, required: true },
    items: [{ name: String, quantity: Number, price: Number }], // ✅ Stores ordered items
    total: { type: Number, required: true },
    paymentProof: { type: String, required: true }, // ✅ Store file path instead of Base64
    createdAt: { type: Date, default: Date.now }
}));

// ✅ Multer Setup for Order Payment Proof Upload
const storage = multer.diskStorage({
    destination: "uploads/",
    filename: (req, file, cb) => {
        cb(null, Date.now() + "-" + file.originalname);
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
            paymentProof: `${req.protocol}://${req.get("host")}/uploads/${req.file.filename}`

        });

        await newOrder.save();
        res.status(201).json({ message: "✅ Order placed successfully!", order: newOrder });
    } catch (error) {
        res.status(500).json({ error: "❌ Server error", details: error.message });
    }
});

// ✅ Fetch all orders
router.get("/", async (req, res) => {
    try {
        const orders = await Order.find().sort({ createdAt: -1 }); // Sort by latest orders
        res.json(orders);
    } catch (error) {
        res.status(500).json({ error: "❌ Server error while fetching orders." });
    }
});

// ✅ Delete an order by ID
router.delete("/:id", async (req, res) => {
    try {
        const order = await Order.findByIdAndDelete(req.params.id);
        if (!order) return res.status(404).json({ error: "❌ Order not found." });

        res.json({ message: "✅ Order deleted successfully!" });
    } catch (error) {
        res.status(500).json({ error: "❌ Server error while deleting order." });
    }
});

module.exports = router;

