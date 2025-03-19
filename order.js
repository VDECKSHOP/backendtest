import mongoose from "mongoose";

const orderSchema = new mongoose.Schema({
    firstname: { type: String, required: true },
    lastname: { type: String, required: true },
    address: { type: String, required: true },
    city: { type: String, required: true },
    state: { type: String, required: true }, // ✅ Store province/state
    postcode: { type: String, required: true },
    phone: { type: String, required: true },
    email: { type: String, required: true },
    items: [{ 
        productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true }, // ✅ Store product ID
        name: String, 
        quantity: Number, 
        price: Number 
    }],
    total: { type: Number, required: true },
    paymentMethod: { type: String, required: true, enum: ["gcash", "cod"] }, // ✅ Store payment method
    paymentProof: { type: String }, // ✅ Make optional for COD
    orderNotes: { type: String }, // ✅ Store order notes
    status: { type: String, default: "Pending" },
}, { timestamps: true });

// ✅ Prevent OverwriteModelError
const Order = mongoose.models.Order || mongoose.model("Order", orderSchema);

export default Order;
