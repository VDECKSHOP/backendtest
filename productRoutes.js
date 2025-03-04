import express from "express";
import multer from "multer";
import cloudinary from "./cloudinary.js";
import Product from "./product.js";

const router = express.Router();
const upload = multer({ dest: "uploads/" });

/**
 * ✅ Add a Product (Includes Stock)
 */
router.post("/", upload.array("images", 6), async (req, res) => {
  try {
    const { name, price, category, description, stock } = req.body;
    
    if (!name || !price || !category || stock === undefined || req.files.length === 0) {
      return res.status(400).json({ error: "Please fill in all fields including stock and upload at least one image." });
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

    // ✅ Save the product with stock
    const newProduct = new Product({
      name,
      price,
      category,
      description,
      stock: Number(stock), // Ensure stock is stored as a number
      images: imageUrls,
    });

    await newProduct.save();
    res.status(201).json({ message: "Product added successfully!", product: newProduct });
  } catch (error) {
    console.error("Error uploading product:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

/**
 * ✅ Get All Products (Includes Stock)
 */
router.get("/", async (req, res) => {
  try {
    const products = await Product.find({}, "name price category description stock images"); // ✅ Added stock
    res.json(products);
  } catch (error) {
    res.status(500).json({ error: "❌ Failed to fetch products" });
  }
});

/**
 * ✅ Get Single Product by ID (Includes Stock)
 */
router.get("/:id", async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ error: "❌ Product not found" });
    }
    res.json(product);
  } catch (error) {
    res.status(500).json({ error: "❌ Server error" });
  }
});

/**
 * ✅ Update Product Stock
 */
router.put("/:id", async (req, res) => {
  try {
    const { stock } = req.body;
    if (stock === undefined) {
      return res.status(400).json({ error: "Stock value is required." });
    }

    const product = await Product.findByIdAndUpdate(req.params.id, { stock: Number(stock) }, { new: true });
    
    if (!product) {
      return res.status(404).json({ error: "❌ Product not found" });
    }

    res.json({ message: "✅ Stock updated successfully!", product });
  } catch (error) {
    res.status(500).json({ error: "❌ Server error" });
  }
});

/**
 * ✅ DELETE a Product by ID (Now Deletes Images from Cloudinary)
 */
router.delete("/:id", async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ error: "❌ Product not found." });
    }

    // Delete images from Cloudinary
    await Promise.all(
      product.images.map(async (imageUrl) => {
        try {
          const publicId = extractPublicId(imageUrl);
          if (publicId) {
            await cloudinary.uploader.destroy(publicId);
          }
        } catch (error) {
          console.error("Error deleting image from Cloudinary:", error);
        }
      })
    );

    // Delete product from database
    await Product.findByIdAndDelete(req.params.id);

    res.json({ message: "✅ Product and images deleted successfully!" });
  } catch (error) {
    res.status(500).json({ error: "❌ Server error", details: error.message });
  }
});

/**
 * ✅ Function to Extract Cloudinary Public ID
 */
function extractPublicId(url) {
  const regex = /\/v\d+\/(.+)\.\w+$/;
  const match = url.match(regex);
  return match ? match[1] : null;
}

// ✅ Export router as default
export default router;

