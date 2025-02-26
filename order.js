const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema({
    fullname: { type: String, required: true },
    gcash: { type: String, required: true },
    address: { type: String, required: true },
    items: { type: String, required: true },
    total: { type: String, required: true },
    paymentProof: { type: String, required: true },
    status: { type: String, default: "Pending" },
}, { timestamps: true });

module.exports = mongoose.model("Order", orderSchema);
