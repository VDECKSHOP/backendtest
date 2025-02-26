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
    paymentProof: { type: String, required: true }, // ✅ Store file path
    status: { type: String, default: "Pending" }, // ✅ Added status field
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
            paymentProof: `${req.protocol}://${req.get("host")}/uploads/${req.file.filename}`,
            status: "Pending" // ✅ Default status
        });

        await newOrder.save();
        console.log("✅ Order Saved:", newOrder); // ✅ Log new order

        res.status(201).json({ message: "✅ Order placed successfully!", order: newOrder });
    } catch (error) {
        console.error("❌ Order Submission Error:", error); // ✅ Log server errors
        res.status(500).json({ error: "❌ Server error", details: error.message });
    }
});

// ✅ Fetch all orders
router.get("/", async (req, res) => {
    try {
        const orders = await Order.find().sort({ createdAt: -1 }); // Sort by latest orders
        console.log("📦 Orders fetched:", orders.length); // ✅ Log number of orders
        res.json(orders);
    } catch (error) {
        console.error("❌ Error fetching orders:", error); // ✅ Log error details
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

        console.log(`🗑️ Deleted Order: ${req.params.id}`); // ✅ Log deleted order ID
        res.json({ message: "✅ Order deleted successfully!" });
    } catch (error) {
        console.error("❌ Error deleting order:", error); // ✅ Log error details
        res.status(500).json({ error: "❌ Server error while deleting order." });
    }
});

module.exports = router;

