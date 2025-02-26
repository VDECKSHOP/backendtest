import mongoose from "mongoose";

const productSchema = new mongoose.Schema({
  name: String,
  price: Number,
  category: String,
  description: String,
  images: [String],
});

const Product = mongoose.model("Product", productSchema);

export default Product;


