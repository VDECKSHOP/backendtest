import Order from "./Order.js";
import cloudinary from "./cloudinary.js";
import multer from "multer";

// Configure Multer for file upload
const storage = multer.memoryStorage();
const upload = multer({ storage });

// Get All Orders
export const getOrders = async (req, res) => {
  try {
    const orders = await Order.find();
    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: "Internal Server Error" });
  }
};

// Create Order with Image Upload
export const createOrder = async (req, res) => {
  upload.single("image")(req, res, async (err) => {
    if (err) return res.status(400).json({ error: "Image upload failed" });

    try {
      const { productName, price, customerName } = req.body;

      let imageUrl = "";
      if (req.file) {
        // Upload to Cloudinary
        const result = await cloudinary.uploader.upload_stream(
          { folder: "orders" }, // Store in "orders" folder
          async (error, cloudinaryResult) => {
            if (error) return res.status(500).json({ error: "Cloudinary Upload Failed" });

            imageUrl = cloudinaryResult.secure_url;

            // Save order in MongoDB
            const newOrder = new Order({
              productName,
              price,
              customerName,
              imageUrl,
            });

            await newOrder.save();
            res.status(201).json(newOrder);
          }
        );
        result.end(req.file.buffer); // Send file to Cloudinary
      } else {
        // If no image is uploaded, save without image
        const newOrder = new Order({
          productName,
          price,
          customerName,
        });

        await newOrder.save();
        res.status(201).json(newOrder);
      }
    } catch (err) {
      res.status(400).json({ error: "Failed to create order" });
    }
  });
};

// Get Order by ID
export const getOrderById = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: "Order not found" });
    res.json(order);
  } catch (err) {
    res.status(500).json({ error: "Internal Server Error" });
  }
};

// Update Order
export const updateOrder = async (req, res) => {
  try {
    const updatedOrder = await Order.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!updatedOrder) return res.status(404).json({ message: "Order not found" });
    res.json(updatedOrder);
  } catch (err) {
    res.status(400).json({ error: "Failed to update order" });
  }
};

// Delete Order
export const deleteOrder = async (req, res) => {
  try {
    const deletedOrder = await Order.findByIdAndDelete(req.params.id);
    if (!deletedOrder) return res.status(404).json({ message: "Order not found" });
    res.json({ message: "Order deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: "Internal Server Error" });
  }
};
