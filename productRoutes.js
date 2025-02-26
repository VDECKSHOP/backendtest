import express from "express";
import multer from "multer";
import cloudinary from "./cloudinary.js";
import Product from "./product.js";

const router = express.Router();
const upload = multer({ dest: "uploads/" });

// ✅ Add a Product
router.post("/", upload.array("images", 6), async (req, res) => {
  try {
    const { name, price, category, description } = req.body;
    if (!name || !price || !category || req.files.length === 0) {
      return res.status(400).json({ error: "Please fill in all fields and upload at least one image." });
    }

    // Upload images to Cloudinary
    const imageUrls = await Promise.all(
      req.files.map(async (file) => {
        const result = await cloudinary.uploader.upload(file.path, {
          folder: process.env.CLOUDINARY_FOLDER,
        });
        return result.secure_url;
      })
    );

    const newProduct = new Product({ name, price, category, description, images: imageUrls });
    await newProduct.save();

    res.status(201).json({ message: "Product added successfully!", product: newProduct });
  } catch (error) {
    console.error("Error uploading product:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// ✅ Get All Products
router.get("/", async (req, res) => {
  try {
    const products = await Product.find();
    res.json(products);
  } catch (error) {
    res.status(500).json({ error: "❌ Failed to fetch products" });
  }
});

// ✅ DELETE a Product by ID
router.delete("/:id", async (req, res) => {
  try {
    const deletedProduct = await Product.findByIdAndDelete(req.params.id);
    if (!deletedProduct) {
      return res.status(404).json({ error: "❌ Product not found." });
    }
    res.json({ message: "✅ Product deleted successfully!" });
  } catch (error) {
    res.status(500).json({ error: "❌ Server error", details: error.message });
  }
});

// ✅ Export router as default
export default router;
