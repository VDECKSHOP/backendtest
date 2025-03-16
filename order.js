import mongoose from "mongoose";

const orderSchema = new mongoose.Schema({
    fullname: { type: String, required: true },
    gcash: { type: String, required: true },
    address: { type: String, required: true },
    items: [{ 
        id: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true }, // ✅ Use ObjectId for product reference
        name: String, 
        quantity: Number, 
        price: Number 
    }],
    total: { type: Number, required: true },
    paymentProof: { type: String, required: true },
    status: { type: String, default: "Pending" },
}, { timestamps: true });

// ✅ Prevent OverwriteModelError
const Order = mongoose.models.Order || mongoose.model("Order", orderSchema);

export default Order;
