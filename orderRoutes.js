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

// ✅ Order Schema (Updated)
const Order = mongoose.models.Order || mongoose.model("Order", new mongoose.Schema({
    firstname: { type: String, required: true },
    lastname: { type: String, required: true },
    address: { type: String, required: true },
    city: { type: String, required: true },
    state: { type: String, required: true },
    postcode: { type: String, required: true },
    phone: { type: String, required: true },
    email: { type: String, required: true },
    items: [{ name: String, quantity: Number, price: Number }],
    total: { type: Number, required: true },
    paymentMethod: { type: String, required: true, enum: ["gcash", "cod"] }, // ✅ Store payment method
    paymentProof: { type: String }, // ✅ Optional for COD
    orderNotes: { type: String }, // ✅ Store order notes
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
        const {
            firstname, lastname, address, city, state, postcode, phone, email, items, total, paymentMethod, orderNotes
        } = req.body;

        if (!firstname || !lastname || !address || !city || !state || !postcode || !phone || !email || !items || !total || !paymentMethod) {
            return res.status(400).json({ error: "❌ All required fields must be filled." });
        }

        // ✅ Parse items if sent as a string
        let parsedItems;
        try {
            parsedItems = typeof items === "string" ? JSON.parse(items) : items;
        } catch (err) {
            return res.status(400).json({ error: "❌ Invalid items format." });
        }

        let paymentProofUrl = "";
        if (paymentMethod === "gcash" && req.file) {
            // ✅ Upload Image to Cloudinary
            const uploadStream = cloudinary.uploader.upload_stream(
                { folder: "payment_proofs" },
                async (error, result) => {
                    if (error) {
                        console.error("❌ Cloudinary Upload Error:", error);
                        return res.status(500).json({ error: "❌ Image upload failed." });
                    }

                    paymentProofUrl = result.secure_url;
                    await saveOrder();
                }
            );

            // ✅ Fix Cloudinary Streaming Issue
            Readable.from(req.file.buffer).pipe(uploadStream);
        } else {
            await saveOrder();
        }

        async function saveOrder() {
            // ✅ Save order to MongoDB
            const newOrder = new Order({
                firstname, lastname, address, city, state, postcode, phone, email,
                items: parsedItems,
                total,
                paymentMethod,
                paymentProof: paymentProofUrl,
                orderNotes,
                status: "Pending"
            });

            await newOrder.save();
            console.log("✅ Order Saved:", newOrder);
            res.status(201).json({ message: "✅ Order placed successfully!", order: newOrder });
        }

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

        if (order.paymentProof) {
            try {
                const publicId = extractPublicId(order.paymentProof);
                if (publicId) {
                    await cloudinary.uploader.destroy(publicId);
                }
            } catch (error) {
                console.error("❌ Error deleting payment proof from Cloudinary:", error);
            }
        }

        await Order.findByIdAndDelete(id);
        res.json({ message: "✅ Order deleted successfully." });
    } catch (error) {
        console.error("❌ Error deleting order:", error);
        res.status(500).json({ error: "❌ Server error" });
    }
});

// ✅ Extract Cloudinary Public ID from URL
function extractPublicId(url) {
    const regex = /\/upload\/v\d+\/([^/.]+)\.\w+$/;
    const match = url.match(regex);
    return match ? match[1] : null;
}

export default router;



