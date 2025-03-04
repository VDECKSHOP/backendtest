import mongoose from "mongoose";

const productSchema = new mongoose.Schema({
  name: String,
  price: Number,
  category: String,
  description: String,
  images: [String],
  stock: { type: Number, required: true, default: 0 }, // ✅ Add stock field
});

const Product = mongoose.model("Product", productSchema);

export default Product;


