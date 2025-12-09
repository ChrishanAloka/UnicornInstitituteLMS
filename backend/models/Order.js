const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema({
  invoiceNo: {
    type: String,
    required: true,
    unique: true
  },
  customerName: {
    type: String,
    required: true
  },
  customerPhone: {
    type: String,
    required: true
  },
  tableNo: {
    type: String,
    required: true
  },
  items: [
    {
      menuId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Menu"
      },
      name: String,
      price: Number,
      netProfit: Number,
      quantity: Number,
      imageUrl: String
    }
  ],
  subtotal: { // ✅ Base price without charges
    type: Number,
    required: true
  },
  serviceCharge: { // ✅ New field
    type: Number,
    default: 0
  },
   deliveryType: { // ✅ New field
    type: String,
    enum: ["Customer Pickup", "Delivery Service"],
    default: "Customer Pickup"
  },
  // In your Order model (orderSchema)
  deliveryPlaceName: {
    type: String,
    default: null
  },
  deliveryCharge: { // ✅ New field
    type: Number,
    default: 0
  },
  deliveryNote: { 
    type: String 
  },
  // ✅ New deliveryStatus logic
  deliveryStatus: {
    type: String,
    enum: [
      "Customer Pending",
      "Customer Picked Up",
      "Driver Pending",
      "Driver On the Way",
      "Order Delivered"
    ],
    default: function () {
      return this.deliveryType === "Customer Pickup"
        ? "Customer Pending"
        : "Driver Pending";
    }
  },
  driverId: { // ✅ New Fields
    type: mongoose.Schema.Types.ObjectId,
    ref: "Driver",
    default: null
  },
  totalPrice: {
    type: Number,
    required: true
  },
  payment: {
    cash: { type: Number, default: 0 },
    card: { type: Number, default: 0 },
    bankTransfer: { type: Number, default: 0 },
    totalPaid: { type: Number, default: 0 },
    changeDue: { type: Number, default: 0 },
    notes: String
  },
  cashierId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  waiterId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Employee", // or whatever your employee/user model is named
    default: null
  },
  waiterName: {
    type: String,
    default: null
  },
  status: {
    type: String,
    default: "Pending"
  },
  statusUpdatedAt: {
    type: Date,
    default: Date.now // initially set to order creation time
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
},{ timestamps: true });

module.exports = mongoose.model("Order", orderSchema);