import express from "express";
import multer from "multer";
import cloudinary from "./cloudinary.js";
import Product from "./product.js";

const router = express.Router();
const upload = multer({ dest: "uploads/" });

/**
 * ✅ Add a Product (Includes Stock, BestSeller & New Arrival Option)
 */
router.post("/", upload.array("images", 6), async (req, res) => {
  try {
    const { name, price, category, description, stock, bestSeller, newArrival } = req.body;

    if (!name || !price || !category || stock === undefined || req.files.length === 0) {
      return res.status(400).json({ error: "❌ Please fill in all fields including stock and upload at least one image." });
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

    // ✅ Save the product with stock, bestSeller, and newArrival flag
    const newProduct = new Product({
      name,
      price,
      category,
      description,
      stock: Math.max(0, Number(stock)), // ✅ Ensure stock is a non-negative number
      images: imageUrls,
      bestSeller: bestSeller === "true", // Convert to Boolean
      newArrival: newArrival === "true" // Convert to Boolean
    });

    await newProduct.save();
    res.status(201).json({ message: "✅ Product added successfully!", product: newProduct });
  } catch (error) {
    console.error("❌ Error uploading product:", error);
    res.status(500).json({ error: "❌ Internal Server Error" });
  }
});

/**
 * ✅ Get All Products (Includes Stock)
 */
router.get("/", async (req, res) => {
  try {
    const products = await Product.find({}, "name price category description stock images bestSeller newArrival");
    res.json(products);
  } catch (error) {
    res.status(500).json({ error: "❌ Failed to fetch products" });
  }
});

/**
 * ✅ Get Best Sellers Only
 */
router.get("/best-sellers", async (req, res) => {
  try {
    const bestSellers = await Product.find({ bestSeller: true });
    res.json(bestSellers);
  } catch (error) {
    res.status(500).json({ error: "❌ Failed to fetch best sellers." });
  }
});

/**
 * ✅ Get New Arrivals Only
 */
router.get("/new-arrivals", async (req, res) => {
  try {
    const newArrivals = await Product.find({ newArrival: true })
      .sort({ createdAt: -1 }) // Newest first
      .limit(10); // Limit to latest 10 products

    res.json(newArrivals);
  } catch (error) {
    console.error("❌ Error fetching new arrivals:", error);
    res.status(500).json({ error: "❌ Failed to fetch new arrivals." });
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
 * ✅ Update Product Stock (PATCH /:id/update-stock)
 */
router.patch("/:id/update-stock", async (req, res) => {
  try {
    const { quantity } = req.body;

    if (!quantity || quantity <= 0) {
      return res.status(400).json({ error: "❌ Invalid quantity" });
    }

    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ error: "❌ Product not found" });
    }

    if (product.stock < quantity) {
      return res.status(400).json({ error: "❌ Not enough stock available" });
    }

    product.stock -= quantity;
    await product.save();

    res.json({ message: "✅ Stock updated successfully!", stock: product.stock });
  } catch (error) {
    console.error("❌ Error updating stock:", error);
    res.status(500).json({ error: "❌ Internal Server Error" });
  }
});

/**
 * ✅ Update Product Details (PUT /:id)
 */
router.put("/:id", upload.single("image"), async (req, res) => {
  try {
    const { name, price, stock, category, description, bestSeller, newArrival } = req.body;

    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ error: "❌ Product not found" });
    }

    product.name = name || product.name;
    product.price = price || product.price;
    product.stock = stock || product.stock;
    product.category = category || product.category;
    product.description = description || product.description;
    product.bestSeller = bestSeller === "true" ? true : product.bestSeller;
    product.newArrival = newArrival === "true" ? true : product.newArrival; // ✅ Update New Arrival

    if (req.file) {
      const result = await cloudinary.uploader.upload(req.file.path, {
        folder: process.env.CLOUDINARY_FOLDER,
      });
      product.images = [result.secure_url];
    }

    await product.save();
    res.json({ message: "✅ Product updated successfully!", product });
  } catch (error) {
    console.error("❌ Error updating product:", error);
    res.status(500).json({ error: "❌ Internal Server Error" });
  }
});

/**
 * ✅ DELETE a Product by ID (Deletes Images from Cloudinary)
 */
router.delete("/:id", async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ error: "❌ Product not found." });
    }

    await Promise.all(
      product.images.map(async (imageUrl) => {
        try {
          const publicId = extractPublicId(imageUrl);
          if (publicId) {
            await cloudinary.uploader.destroy(publicId);
          }
        } catch (error) {
          console.error("❌ Error deleting image from Cloudinary:", error);
        }
      })
    );

    await Product.findByIdAndDelete(req.params.id);

    res.json({ message: "✅ Product and images deleted successfully!" });
  } catch (error) {
    console.error("❌ Error deleting product:", error);
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

