const cloudinary = require("./cloudinary");
const Product = require("./Product");

exports.uploadProduct = async (req, res) => {
  try {
    const { name, price, category, description, stock, bestSeller } = req.body; // ✅ Added bestSeller

    if (!name || !price || !category || stock === undefined || req.files.length === 0) {
      return res.status(400).json({ error: "Please fill all fields including stock and upload at least one image." });
    }

    // Upload images to Cloudinary
    const imageUrls = await Promise.all(
      req.files.map(async (file) => {
        const result = await cloudinary.uploader.upload(file.path, { folder: process.env.CLOUDINARY_FOLDER });
        return result.secure_url;
      })
    );

    // ✅ Ensure stock & bestSeller are saved in MongoDB
    const newProduct = new Product({ 
      name, 
      price, 
      category, 
      description, 
      stock: Number(stock), // ✅ Convert stock to a number
      bestSeller: bestSeller === "true", // ✅ Convert string to boolean
      images: imageUrls 
    });

    await newProduct.save();
    res.status(201).json({ message: "Product added successfully!", product: newProduct });

  } catch (error) {
    console.error("Error uploading product:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

exports.getProducts = async (req, res) => {
  try {
    const products = await Product.find({}, "name price category description stock images bestSeller");
    res.json(products);
  } catch (error) {
    console.error("Error fetching products:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

// ✅ Get Best Sellers
exports.getBestSellers = async (req, res) => {
  try {
    const bestSellers = await Product.find({ bestSeller: true });
    res.json(bestSellers);
  } catch (error) {
    console.error("Error fetching best sellers:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

exports.getProductById = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ error: "Product not found" });
    res.json(product);
  } catch (error) {
    console.error("Error fetching product:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

// ✅ Update Product (Includes Best Seller)
exports.updateProduct = async (req, res) => {
  try {
    const { name, price, stock, category, description, bestSeller } = req.body;
    const product = await Product.findById(req.params.id);

    if (!product) return res.status(404).json({ error: "Product not found" });

    product.name = name || product.name;
    product.price = price || product.price;
    product.stock = stock || product.stock;
    product.category = category || product.category;
    product.description = description || product.description;
    product.bestSeller = bestSeller === "true"; // ✅ Convert to boolean

    await product.save();
    res.json({ message: "✅ Product updated successfully!", product });
  } catch (error) {
    console.error("Error updating product:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

// ✅ Delete Product and Remove Images from Cloudinary
exports.deleteProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }

    // Delete all images from Cloudinary
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
    console.error("❌ Error deleting product:", error);
    res.status(500).json({ error: "Failed to delete product" });
  }
};

// ✅ Extract public_id from Cloudinary URL
function extractPublicId(url) {
  const regex = /\/v\d+\/(.+)\.\w+$/;
  const match = url.match(regex);
  return match ? match[1] : null;
}
