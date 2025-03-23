import mongoose from "mongoose";

const productSchema = new mongoose.Schema({
  name: String,
  price: Number,
  category: String,
  description: String,
  images: [String],
  stock: { type: Number, required: true, default: 0 }, // ✅ Stock field
  bestSeller: { type: Boolean, default: false }, // ✅ Best Seller field
  newArrival: { type: Boolean, default: false } // ✅ New Arrival field
});

const Product = mongoose.model("Product", productSchema);

export default Product;



