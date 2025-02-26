import express from "express";
import multer from "multer";
import cloudinary from "./cloudinary.js";
import Product from "./product.js";

const router = express.Router();
const upload = multer({ dest: "uploads/" }); // Temporary storage before Cloudinary

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

router.get("/:id", async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ error: "Product not found" });
    res.json(product);
  } catch (error) {
    console.error("Error fetching product:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;


