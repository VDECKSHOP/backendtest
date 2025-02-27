import cloudinary from "./cloudinary.js";
import Order from "./Order.js";

// ✅ Upload Order with Image(s)
export const createOrder = async (req, res) => {
  try {
    const { productName, price, customerName, images } = req.body;

    if (!productName || !price || !customerName || !images || images.length === 0) {
      return res.status(400).json({ error: "All fields are required, including at least one image." });
    }

    // Upload images to Cloudinary
    const imageUrls = await Promise.all(
      images.map(async (imageBase64) => {
        const result = await cloudinary.uploader.upload(imageBase64, { folder: "orders" });
        return result.secure_url;
      })
    );

    // Save order in MongoDB
    const newOrder = new Order({
      productName,
      price,
      customerName,
      images: imageUrls, // Store multiple image URLs
    });

    await newOrder.save();

    res.status(201).json({ message: "Order created successfully!", order: newOrder });
  } catch (error) {
    console.error("Error creating order:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

// ✅ Get All Orders
export const getOrders = async (req, res) => {
  try {
    const orders = await Order.find();
    res.json(orders);
  } catch (error) {
    console.error("Error fetching orders:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

// ✅ Get Order by ID
export const getOrderById = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ error: "Order not found" });
    res.json(order);
  } catch (error) {
    console.error("Error fetching order:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

// ✅ Update Order
export const updateOrder = async (req, res) => {
  try {
    const updatedOrder = await Order.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!updatedOrder) return res.status(404).json({ error: "Order not found" });
    res.json(updatedOrder);
  } catch (error) {
    console.error("Error updating order:", error);
    res.status(400).json({ error: "Failed to update order" });
  }
};

// ✅ Delete Order and Remove Images from Cloudinary
export const deleteOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    // Delete all images from Cloudinary
    await Promise.all(
      order.images.map(async (imageUrl) => {
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

    // Delete order from database
    await Order.findByIdAndDelete(req.params.id);

    res.json({ message: "✅ Order and images deleted successfully!" });
  } catch (error) {
    console.error("❌ Error deleting order:", error);
    res.status(500).json({ error: "Failed to delete order" });
  }
};

// ✅ Extract public_id from Cloudinary URL
function extractPublicId(url) {
  const regex = /\/v\d+\/(.+)\.\w+$/;
  const match = url.match(regex);
  return match ? match[1] : null;
}
