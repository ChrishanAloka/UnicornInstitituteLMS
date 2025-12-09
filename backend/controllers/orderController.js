// backend/controllers/orderController.js

const mongoose = require("mongoose");
const Order = require("../models/Order");
const Driver = require("../models/Driver");
const Employee = require("../models/Employee");
const Menu = require("../models/Menu");
const DeliveryCharge = require("../models/DeliveryChargeByPlace");
const ServiceCharge = require("../models/ServiceCharge");
const Customer = require('../models/Customer'); // adjust path as needed


// POST /api/auth/order
exports.createOrder = async (req, res) => {
  const {
    customerPhone,
    customerName,
    tableNo,
    items,
    deliveryType,
    deliveryPlaceId,
    deliveryNote,
    payment, // { cash, card, bankTransfer, notes }
    waiterId
  } = req.body;

  // const randomPart = String(Math.floor(Math.random() * 1000000)).padStart(6, '0');
  // const invoiceNo = `INV-${Date.now()}-${randomPart}`;
  const invoiceNo = `INV-${String(Math.floor(Math.random() * 1000000)).padStart(6, '0')}`;

  if (!items || items.length === 0) {
    return res.status(400).json({ error: "No items provided" });
  }

  try {
    let waiterName = null; // or "N/A", "", etc.
    
    // Auto-fill customer name from last order
    let finalCustomerName = customerName;
    if (!finalCustomerName && customerPhone) {
      const lastOrder = await Order.findOne({ customerPhone }).sort({ createdAt: -1 });
      finalCustomerName = lastOrder?.customerName || customerName;
    }

    // Upsert customer in Customer collection
    if (customerPhone) {
      await Customer.findOneAndUpdate(
        { phone: customerPhone },
        { 
          phone: customerPhone,
          name: finalCustomerName || undefined, // only update name if provided
          $setOnInsert: { createdAt: new Date() }
        },
        { 
          upsert: true, 
          new: true,
          setDefaultsOnInsert: true 
        }
      );
    }

    // Validate waiterId if it's a Dine-In order
    let validatedWaiterId = null;
    if (tableNo && tableNo !== "Takeaway") {
      if (!waiterId) {
        return res.status(400).json({ error: "Waiter is required for Dine-In orders" });
      }

      const employee = await Employee.findById(waiterId); // 👈 assumes you have an Employee model
      if (!employee) {
        return res.status(400).json({ error: "Invalid waiter selected" });
      }

      // Adjust field name if your employee role is stored as 'position', 'jobTitle', etc.
      if (employee.role?.toLowerCase() !== "waiter") {
        return res.status(400).json({ error: "Selected employee is not a waiter" });
      }

      validatedWaiterId = waiterId;
      waiterName = employee.name || employee.fullName || "Unknown Waiter"; // 👈 capture name
    }

    // Validate and enrich items
    let validItems = [];
    let subtotal = 0;

    for (let item of items) {
      const menuItem = await Menu.findById(item.menuId);
      if (!menuItem) {
        return res.status(400).json({ error: "Invalid menu item" });
      }

      if (item.quantity > menuItem.currentQty) {
        return res.status(400).json({
          error: `Only ${menuItem.currentQty} left in stock for ${menuItem.name}`
        });
      }

      const netProfitPerUnit = menuItem.price - (menuItem.cost || 0);

      subtotal += menuItem.price * item.quantity;

      validItems.push({
        menuId: menuItem._id,
        name: item.name,
        price: menuItem.price,
        netProfit: netProfitPerUnit,
        imageUrl: menuItem.imageUrl,
        quantity: item.quantity
      });
    }

    // Apply service charge only for Dine-In
    let serviceCharge = 0;
    let finalTotalPrice = subtotal;

    if (tableNo && tableNo !== "Takeaway") {
      const chargeSettings = await ServiceCharge.findOne({});
      if (chargeSettings?.dineInCharge > 0 && chargeSettings.isActive) {
        serviceCharge = subtotal * (chargeSettings.dineInCharge / 100);
        finalTotalPrice = subtotal + serviceCharge;
      }
    }

    // Apply delivery charge
    // let deliveryCharge = 0;
    // if (tableNo === "Takeaway" && deliveryType === "Delivery Service") {
    //   const deliverySettings = await DeliveryCharge.findOne({});
    //   if (deliverySettings?.isActive) {
    //     deliveryCharge = deliverySettings.amount;
    //     finalTotalPrice = subtotal + deliveryCharge;
    //   }
    // }

    let deliveryCharge = 0;
    let deliveryPlaceName = null;

    if (tableNo === "Takeaway" && deliveryType === "Delivery Service" && deliveryPlaceId) {
      const place = await DeliveryCharge.findById(deliveryPlaceId); // ✅ from your new model
      if (!place) {
        return res.status(400).json({ error: "Invalid delivery place selected" });
      }
      deliveryCharge = place.charge;
      deliveryPlaceName = place.placeName; // ✅ store name for receipt
      finalTotalPrice += deliveryCharge;
    }

    // const invoiceNo = `INV-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    const newOrder = new Order({
      invoiceNo,
      customerName: finalCustomerName,
      customerPhone,
      tableNo,
      waiterId: validatedWaiterId,
      waiterName: waiterName,
      items: validItems,
      subtotal,
      serviceCharge,
      deliveryType,
      deliveryCharge,        // ✅ computed value
      deliveryPlaceName, 
      deliveryNote: deliveryNote || "",
       deliveryStatus: deliveryType === "Customer Pickup"
        ? "Customer Pending"
        : "Driver Pending",
      totalPrice: finalTotalPrice,
      payment: {
        cash: payment?.cash || 0,
        card: payment?.card || 0,
        bankTransfer: payment?.bankTransfer || 0,
        totalPaid: (payment?.cash || 0) + (payment?.card || 0) + (payment?.bankTransfer || 0),
        changeDue:
          (payment?.totalPaid || 0) - finalTotalPrice,
        notes: payment?.notes || ""
      },
      cashierId: req.user.id,
      status: "Pending"
    });

    await newOrder.save();

    // Update menu stock
    for (let item of validItems) {
      await Menu.findByIdAndUpdate(item.menuId, {
        $inc: { currentQty: -item.quantity }
      });
    }

    res.json(newOrder);
  } catch (err) {
    if (err.code === 11000 && err.keyPattern?.invoiceNo) {
      // Likely a duplicate submission (e.g., double-click, retry)
      return res.status(409).json({
        error: "This order has already been processed. Please do not submit again."
      });
    }
    console.error("Order creation failed:", err.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

// GET /api/auth/orders/history
exports.getOrderHistory = async (req, res) => {
  const { startDate, endDate, status, orderType, deliveryType } = req.query;
  const query = {};

  // ✅ Handle date range properly
  if (startDate && endDate) {
    query.createdAt = {
      $gte: new Date(startDate),
      $lte: new Date(endDate)
    };
  }

  // ✅ If only one date is provided (e.g., daily report), use full day range
  if (startDate && !endDate) {
    const start = new Date(startDate);
    const end = new Date(start);
    end.setHours(23, 59, 59, 999); // ✅ End of the day

    query.createdAt = {
      $gte: start,
      $lte: end
    };
  }

  // ✅ Handle status filter
  if (status) {
    query.status = status;
  }

  // Order Type: "table" = Dine-In, "takeaway" = Takeaway
  if (orderType === "table") {
    query.tableNo = { $ne: "Takeaway" }; // Dine-In has real table numbers
  } else if (orderType === "takeaway") {
    query.tableNo = "Takeaway";
  }

  // Delivery Type (only applies to Takeaway)
  if (deliveryType) {
    query.deliveryType = deliveryType;
  }

  try {
    const orders = await Order.find(query).populate("cashierId", "name role").sort({ createdAt: -1 });
    res.json(orders);
  } catch (err) {
    console.error("Failed to load order history:", err.message);
    res.status(500).json({ error: "Failed to load orders" });
  }
};

// Update order status (used by both admin & kitchen)
exports.updateOrderStatus = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  try {
    const updated = await Order.findByIdAndUpdate(
      id,
      { 
        status,
        statusUpdatedAt: Date.now()
       },
      { new: true }
    );
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: "Failed to update status" });
  }
};

exports.exportOrdersToExcel = async (req, res) => {
  const orders = await Order.find({});
  const XLSX = require("xlsx");

  const flatOrders = orders.flatMap(order =>
    order.items.map(i => ({
      OrderID: order._id,
      Date: new Date(order.date).toLocaleString(),
      Customer: order.customerName,
      Table: order.tableNo,
      Item: i.name,
      Quantity: i.quantity,
      Price: i.price,
      TotalPrice: i.price * i.quantity,
      Status: order.status
    }))
  );

  const ws = XLSX.utils.json_to_sheet(flatOrders);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Orders");
  XLSX.writeFile(wb, "cashier_orders.xlsx");
  res.json({ message: "Exported" });
};

// backend/controllers/orderController.js

exports.getCustomerByPhone = async (req, res) => {
  const { phone } = req.query;

  if (!phone) return res.json(null);

  try {
    const lastOrder = await Order.findOne({ customerPhone: phone }).sort({ date: -1 });

    if (lastOrder) {
      return res.json({
        name: lastOrder.customerName,
        phone: lastOrder.customerPhone
      });
    }

    res.json(null);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch customer" });
  }
};

// GET /api/auth/customers-search?q=...
exports.searchCustomers = async (req, res) => {
  const { q = '' } = req.query;

  try {
    // Get all orders, group by phone, and pick the latest name per phone
    const pipeline = [
      { $match: { customerPhone: { $exists: true, $ne: null } } },
      { $sort: { date: -1 } },
      {
        $group: {
          _id: '$customerPhone',
          name: { $first: '$customerName' },
          phone: { $first: '$customerPhone' }
        }
      },
      {
        $match: {
          $or: [
            { phone: { $regex: q, $options: 'i' } },
            { name: { $regex: q, $options: 'i' } }
          ]
        }
      },
      { $limit: 20 }
    ];

    const customers = await Order.aggregate(pipeline);
    res.json(customers);
  } catch (err) {
    console.error('Search customers error:', err);
    res.status(500).json({ error: 'Failed to search customers' });
  }
};

// GET /api/auth/customers-list
exports.getAllCustomers = async (req, res) => {
  try {
    const pipeline = [
      { $match: { customerPhone: { $exists: true, $ne: null } } },
      { $sort: { date: -1 } },
      {
        $group: {
          _id: '$customerPhone',
          name: { $first: '$customerName' },
          phone: { $first: '$customerPhone' },
          lastOrderDate: { $first: '$date' }
        }
      },
      { $sort: { lastOrderDate: -1 } }
    ];

    const customers = await Order.aggregate(pipeline);
    res.json(customers);
  } catch (err) {
    console.error('Failed to fetch customers:', err);
    res.status(500).json({ error: 'Failed to load customers' });
  }
};

exports.getOrderById = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ error: "Order not found" });
    res.json(order);
  } catch (err) {
    res.status(500).json({ error: "Failed to load order" });
  }
};

// GET /api/auth/cashier/takeaway-orders?status=Pending
// GET /api/auth/cashier/takeaway-orders
exports.getCashierTakeawayOrders = async (req, res) => {
  const { status } = req.query;
  const userId = req.user.id;

  try {
    let query = {
      tableNo: "Takeaway"
    };

    if (status && ["Pending", "Processing", "Ready", "Completed"].includes(status)) {
      query.status = status;
    }

    // ✅ Add .populate("driverId")
    const orders = await Order.find(query)
      .populate("driverId", "name vehicle numberPlate")
      .sort({ createdAt: -1 });

    res.json(orders);
  } catch (err) {
    console.error("Failed to load takeaway orders:", err.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

// GET /api/auth/drivers
exports.getDrivers = async (req, res) => {
  try {
    const drivers = await Driver.find({}).select("name vehicle numberPlate");
    res.json(drivers);
  } catch (err) {
    console.error("Failed to load drivers:", err.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

// PUT /api/auth/order/:id/delivery-status
exports.updateDeliveryStatus = async (req, res) => {
  const { id } = req.params;
  const { deliveryStatus, driverId } = req.body;

  try {
    const updates = { deliveryStatus };
    if (deliveryStatus === "Driver Pending" && driverId) {
      updates.driverId = driverId;
    }

    const updatedOrder = await Order.findByIdAndUpdate(id, updates, { new: true })
      .populate("driverId", "name vehicle numberPlate");

    if (!updatedOrder) {
      return res.status(404).json({ error: "Order not found" });
    }

    res.json(updatedOrder);
  } catch (err) {
    console.error("Failed to update delivery status:", err.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

// DELETE /api/auth/order/:id
exports.deleteOrder = async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ error: "Invalid order ID" });
  }

  try {
    const order = await Order.findById(id);
    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    // Optional: Only allow deletion if status is "Pending"
    // if (order.status !== "Pending") {
    //   return res.status(403).json({ error: "Only pending orders can be deleted" });
    // }

    // Restore stock
    // for (const item of order.items) {
    //   await Menu.findByIdAndUpdate(item.menuId, {
    //     $inc: { currentQty: item.quantity }
    //   });
    // }

    // Delete the order
    await Order.findByIdAndDelete(id);

    res.json({ message: "Order deleted successfully" });
  } catch (err) {
    console.error("Failed to delete order:", err.message);
    res.status(500).json({ error: "Internal server error" });
  }
};