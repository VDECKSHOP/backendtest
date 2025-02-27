import mongoose from "mongoose";

const orderSchema = new mongoose.Schema({
    fullname: { type: String, required: true },
    gcash: { type: String, required: true },
    address: { type: String, required: true },
    items: [{ name: String, quantity: Number, price: Number }], // ✅ Fix here
    total: { type: Number, required: true }, // ✅ Should be a Number
    paymentProof: { type: String, required: true },
    status: { type: String, default: "Pending" },
}, { timestamps: true });

const Order = mongoose.model("Order", orderSchema);
export default Order;

