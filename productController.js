const cloudinary = require("./cloudinary");
const Product = require("./Product");

exports.uploadProduct = async (req, res) => {
  try {
    const { name, price, category, description, stock } = req.body; // ✅ Include stock
    if (!name || !price || !category || stock === undefined || req.files.length === 0) {
      return res.status(400).json({ error: "Please fill all fields including stock and upload at least one image." });
    }

    // Upload each image to Cloudinary
    const imageUrls = await Promise.all(
      req.files.map(async (file) => {
        const result = await cloudinary.uploader.upload(file.path, { folder: process.env.CLOUDINARY_FOLDER });
        return result.secure_url;
      })
    );

    // ✅ Ensure stock is saved in MongoDB
    const newProduct = new Product({ 
      name, 
      price, 
      category, 
      description, 
      stock: Number(stock), // ✅ Convert stock to a number
      images: imageUrls 
    });

    await newProduct.save();
    res.status(201).json({ message: "Product added successfully!", product: newProduct });

  } catch (error) {
    console.error("Error uploading product:", error);
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