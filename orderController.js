import cloudinary from "./cloudinary.js";
import Order from "./order.js";
import Product from "./product.js"; // ✅ Import Product Model

// ✅ Create a New Order
export const createOrder = async (req, res) => {
  try {
    const { fullname, gcash, address, items, total, paymentProof } = req.body;

    if (!fullname || !gcash || !address || !items || !total || !paymentProof) {
      return res.status(400).json({ error: "❌ Please fill in all fields and upload a payment proof." });
    }

    // ✅ Parse `items` if it's sent as a JSON string
    let parsedItems;
    try {
      parsedItems = typeof items === "string" ? JSON.parse(items) : items;
    } catch (err) {
      return res.status(400).json({ error: "❌ Invalid items format." });
    }

    // ✅ Check stock availability for each product
    for (const item of parsedItems) {
      const product = await Product.findById(item.productId);
      if (!product) {
        return res.status(404).json({ error: `❌ Product not found: ${item.productId}` });
      }
      if (product.stock < item.quantity) {
        return res.status(400).json({
          error: `❌ Not enough stock for ${product.name}. Available: ${product.stock}, Ordered: ${item.quantity}`,
        });
      }
    }

    // ✅ Upload payment proof to Cloudinary
    const cloudinaryResponse = await cloudinary.uploader.upload(paymentProof, {
      folder: "payment_proofs",
    });

    // ✅ Create new order
    const newOrder = new Order({
      fullname,
      gcash,
      address,
      items: parsedItems,
      total,
      paymentProof: cloudinaryResponse.secure_url, // Store image URL from Cloudinary
      status: "Pending",
    });

    await newOrder.save();

    // ✅ Deduct stock AFTER order is successfully saved
    for (const item of parsedItems) {
      const updatedProduct = await Product.findByIdAndUpdate(
        item.productId,
        { $inc: { stock: -item.quantity } },
        { new: true } // ✅ Ensures the updated stock is returned
      );
      console.log(`🔄 Updated Stock: ${updatedProduct.name} - New Stock: ${updatedProduct.stock}`);
    }

    res.status(201).json({ message: "✅ Order placed successfully!", order: newOrder });
  } catch (error) {
    console.error("❌ Order Submission Error:", error);
    res.status(500).json({ error: "❌ Internal Server Error" });
  }
};


// ✅ Fetch a Single Order by ID
export const getOrderById = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ error: "❌ Order not found" });
    }
    res.json(order);
  } catch (error) {
    console.error("❌ Error fetching order:", error);
    res.status(500).json({ error: "❌ Internal Server Error" });
  }
};

// ✅ Update Order Status
export const updateOrder = async (req, res) => {
  try {
    const updatedOrder = await Order.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!updatedOrder) {
      return res.status(404).json({ error: "❌ Order not found" });
    }
    res.json(updatedOrder);
  } catch (error) {
    console.error("❌ Error updating order:", error);
    res.status(400).json({ error: "❌ Failed to update order" });
  }
};

// ✅ Delete Order and Restore Stock
export const deleteOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ error: "❌ Order not found." });
    }

    // ✅ Restore stock before deleting order
    for (const item of order.items) {
      await Product.findByIdAndUpdate(item.productId, {
        $inc: { stock: item.quantity },
      });
    }

    // ✅ Remove image from Cloudinary
    const publicId = extractPublicId(order.paymentProof);
    if (publicId) {
      await cloudinary.uploader.destroy(publicId);
    }

    // ✅ Delete order from database
    await Order.findByIdAndDelete(req.params.id);
    res.json({ message: "✅ Order deleted successfully, stock restored!" });
  } catch (error) {
    console.error("❌ Error deleting order:", error);
    res.status(500).json({ error: "❌ Internal Server Error" });
  }
};

// ✅ Extract Cloudinary Public ID from URL
function extractPublicId(url) {
  const regex = /\/v\d+\/(.+)\.\w+$/;
  const match = url.match(regex);
  return match ? match[1] : null;
}

