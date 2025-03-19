import cloudinary from "./cloudinary.js";
import Order from "./order.js";
import Product from "./product.js"; // ✅ Import Product Model

// ✅ Create a New Order (Matches checkout.html)
export const createOrder = async (req, res) => {
  try {
    const {
      firstname,
      lastname,
      address,
      city,
      state,
      postcode,
      phone,
      email,
      items,
      total,
      paymentMethod,
      orderNotes,
    } = req.body;

    if (!firstname || !lastname || !address || !city || !state || !postcode || !phone || !email || !items || !total || !paymentMethod) {
      return res.status(400).json({ error: "❌ Please fill in all required fields." });
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

    // ✅ Upload payment proof if provided
    let paymentProofUrl = "";
    if (req.file) {
      const cloudinaryResponse = await cloudinary.uploader.upload(req.file.path, {
        folder: "payment_proofs",
      });
      paymentProofUrl = cloudinaryResponse.secure_url;
    }

    // ✅ Create new order
    const newOrder = new Order({
      firstname,
      lastname,
      address,
      city,
      state,
      postcode,
      phone,
      email,
      items: parsedItems,
      total,
      paymentMethod,
      paymentProof: paymentProofUrl, // Store image URL from Cloudinary
      orderNotes,
      status: "Pending",
    });

    await newOrder.save();

    // ✅ Deduct stock AFTER order is successfully saved
    for (const item of parsedItems) {
      try {
        // ✅ Fetch the product before updating stock
        const product = await Product.findById(item.productId);

        if (!product) {
          console.error(`❌ Product not found in DB: ${item.productId}`);
          continue; // Skip if the product doesn't exist
        }

        console.log(`🔍 Before Update: ${product.name} - Stock: ${product.stock}`);

        // ✅ Perform the stock deduction
        const updateResult = await Product.updateOne(
          { _id: item.productId },
          { $inc: { stock: -item.quantity } }
        );

        console.log(`🛠️ MongoDB Update Result:`, updateResult);

        // ✅ Fetch product again to verify stock update
        const updatedProduct = await Product.findById(item.productId);
        console.log(`✅ After Update: ${updatedProduct.name} - New Stock: ${updatedProduct.stock}`);

      } catch (err) {
        console.error(`❌ Error updating stock for Product ID: ${item.productId}`, err);
      }
    }

    res.status(201).json({ message: "✅ Order placed successfully!", order: newOrder });

  } catch (error) {
    console.error("❌ Error creating order:", error);
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

