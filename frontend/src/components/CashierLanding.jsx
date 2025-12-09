import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { ToastContainer, toast } from "react-toastify";
import PaymentModal from "./PaymentModal";
import ReceiptModal from "./ReceiptModal";
import 'react-toastify/dist/ReactToastify.css'; 
import AsyncSelect from 'react-select/async';
import makeAnimated from 'react-select/animated';
import Select from 'react-select';
import { createFilter } from 'react-select';
import CreatableSelect from 'react-select/creatable';

const CashierLanding = () => {
  const [menus, setMenus] = useState([]);
  const [cart, setCart] = useState([]);
  const [customer, setCustomer] = useState({
    phone: "",
    name: "",
    orderType: "takeaway",
    tableNo: "",
    deliveryType: "Customer Pickup", // e.g., "Customer Pickup" or "Delivery Service"
    deliveryPlaceId: "", // ✅ NEW: store selected place ID
    deliveryNote: ""
  });
  const [receiptOrder, setReceiptOrder] = useState(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [orderData, setOrderData] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [serviceChargeSettings, setServiceChargeSettings] = useState({
    dineInCharge: 0,
    isActive: false
  });
  // const [deliveryChargeSettings, setDeliveryChargeSettings] = useState({
  //   amount: 0,
  //   isActive: false
  // });
  const [deliveryPlaces, setDeliveryPlaces] = useState([]); // ✅ new state
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [sizeFilter, setSizeFilter] = useState(""); // "", "M", or "L"
  const [menuPopularity, setMenuPopularity] = useState({}); // e.g., { "Pepperoni Pizza": 42, ... }
  
  const [numberPadTarget, setNumberPadTarget] = useState(null); // 'phone' or 'tableNo'
  const [showNumberPad, setShowNumberPad] = useState(false);
  const [customerSearchResults, setCustomerSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [waiters, setWaiters] = useState([]);
  const [selectedWaiterId, setSelectedWaiterId] = useState("");

  const [selectedMenuItem, setSelectedMenuItem] = useState(null);
  const [itemQuantity, setItemQuantity] = useState(0);
  const [tempStock, setTempStock] = useState({}); // e.g., { "menuId1": 5, "menuId2": 10 }

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitLock, setSubmitLock] = useState(false);

  // Load menus and service charge
  useEffect(() => {
    fetchMenus();
    fetchServiceCharge();
    // fetchDeliveryCharge();
    fetchDeliveryPlaces();
    fetchOrdersAndComputePopularity();
    fetchWaiters();
  }, []);

  // Auto-fill customer name when phone changes
  useEffect(() => {
    if (!customer.phone) return;

    const timer = setTimeout(async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await axios.get("https://unicorninstititutelms.onrender.com/api/auth/customer", {
          params: { phone: customer.phone },
          headers: { Authorization: `Bearer ${token}` }
        });

        if (res.data?.name && !customer.name) {
          setCustomer((prev) => ({ ...prev, name: res.data.name }));
        }
      } catch (err) {
        console.error("Auto-fill failed:", err.message);
      }
    }, 800);

    return () => clearTimeout(timer);
  }, [customer.phone]);

  useEffect(() => {
    if (customer.phone.length >= 10) {
      // Trigger auto-fill as before
      const timer = setTimeout(async () => {
        try {
          const token = localStorage.getItem("token");
          const res = await axios.get("https://unicorninstititutelms.onrender.com/api/auth/customer", {
            params: { phone: customer.phone },
            headers: { Authorization: `Bearer ${token}` }
          });
          if (res.data?.name && !customer.name) {
            setCustomer((prev) => ({ ...prev, name: res.data.name }));
          }
        } catch (err) {
          console.error("Auto-fill failed:", err.message);
        }
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [customer.phone]);

  const fetchWaiters = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get("https://unicorninstititutelms.onrender.com/api/auth/employees", {
        headers: { Authorization: `Bearer ${token}` }
      });

      // Filter employees with role "waiter" (adjust field name if needed, e.g., "role" or "position")
      const waiterList = res.data.filter(emp => 
        emp.role?.toLowerCase() === "waiter" || emp.position?.toLowerCase() === "waiter"
      );

      setWaiters(waiterList);
    } catch (err) {
      console.error("Failed to load waiters:", err.message);
      toast.error("Could not load waiters");
    }
  };

  const handleOrderTypeChange = (e) => {
    const newType = e.target.value;

    setCustomer((prev) => {
      // Start with the current customer state
      const updated = { ...prev, orderType: newType };

      if (newType === "table") {
        // Reset all takeaway-related fields
        updated.deliveryType = "";
        updated.deliveryPlaceId = "";
        updated.deliveryNote = "";
        // Keep tableNo? You might want to clear it too for a fresh start
        // updated.tableNo = ""; // optional — uncomment if you want to clear tableNo too
      } else if (newType === "takeaway") {
        // Reset table-specific fields
        updated.tableNo = "";
        // Waiter is only for "table", so clear it
        // (you already do this via setSelectedWaiterId below)
      }

      return updated;
    });

    // Always clear waiter when not "table"
    if (newType !== "table") {
      setSelectedWaiterId("");
    }
  };

  const handlePhoneChange = async (value) => {
    const digits = value.replace(/\D/g, '');
    setCustomer(prev => ({ ...prev, phone: digits, name: '' }));
    setCustomerSearchResults([]);

    if (digits.length >= 2) {
      setIsSearching(true);
      try {
        const token = localStorage.getItem("token");
        const res = await axios.get(
          "https://unicorninstititutelms.onrender.com/api/auth/customers-search",
          {
            params: { q: digits },
            headers: { Authorization: `Bearer ${token}` }
          }
        );
        setCustomerSearchResults(res.data || []);
      } catch (err) {
        console.error("Customer search failed:", err);
        toast.error("Search failed");
      } finally {
        setIsSearching(false);
      }
    }
  };

  const handleNumberPadInput = (value) => {
    if (!numberPadTarget) return;

    if (numberPadTarget === 'phone') {
      // Reuse the same logic that handles search
      const newPhone = (customer.phone || '') + value;
      handlePhoneChange(newPhone); // 👈 this triggers search
    } else if (numberPadTarget === 'tableNo') {
      setCustomer(prev => ({
        ...prev,
        tableNo: (prev.tableNo || '') + value
      }));
    } else if (numberPadTarget === 'quantity') {
      // Update itemQuantity via number pad
      setItemQuantity(prev => {
        const newQty = parseInt((prev.toString() + value)) || 0;
        const max = selectedMenuItem ? (tempStock[selectedMenuItem._id] || 0) : 0;

        if (newQty > max) {
          toast.warn(`Only ${max} available for "${selectedMenuItem.name}"!`);
          return prev; // keep previous value
        }
        return Math.min(newQty, max);
      });
    }
  };

  const handleBackspace = () => {
    if (!numberPadTarget) return;

    if (numberPadTarget === 'phone') {
      const newPhone = (customer.phone || '').slice(0, -1);
      handlePhoneChange(newPhone); // 👈 triggers search (or clears results if <2 digits)
    } else if (numberPadTarget === 'tableNo') {
      setCustomer(prev => ({
        ...prev,
        tableNo: (prev.tableNo || '').slice(0, -1)
      }));
    } else if (numberPadTarget === 'quantity') {
      setItemQuantity(prev => {
        const str = prev.toString();
        if (str.length <= 1) return 0;
        const newQty = parseInt(str.slice(0, -1)) || 0;
        return newQty;
      });
    }
  };

  const fetchMenus = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get("https://unicorninstititutelms.onrender.com/api/auth/menus", {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMenus(res.data);
      const uniqueCategories = [...new Set(res.data.map(menu => menu.category).filter(Boolean))];
      setCategories(uniqueCategories);
      
      // ✅ Initialize tempStock from currentQty
      const initialTempStock = {};
      res.data.forEach(menu => {
        initialTempStock[menu._id] = menu.currentQty;
      });
      setTempStock(initialTempStock);

      setLoadingCategories(false);
    } catch (err) {
      console.error("Failed to load menus:", err.message);
      setLoadingCategories(false); // Ensure loading stops even on error
    }
  };

  const loadCustomerOptions = async (inputValue) => {
    if (!inputValue.trim()) return [];

    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(
        "https://unicorninstititutelms.onrender.com/api/auth/customers-search",
        {
          params: { q: inputValue },
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      return res.data.map(cust => ({
        value: cust.phone,
        label: `${cust.name || 'Unnamed'} (${cust.phone})`,
        name: cust.name || ''
      }));
    } catch (err) {
      console.error("Customer search failed:", err);
      toast.error("Search failed");
      return [];
    }
  };

  const fetchOrdersAndComputePopularity = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get("https://unicorninstititutelms.onrender.com/api/auth/orders", {
        headers: { Authorization: `Bearer ${token}` }
      });

      const orders = res.data; // assume this is an array of orders

      // Count occurrences of each menu item name
      const popularityMap = {};
      orders.forEach(order => {
        if (order.items && Array.isArray(order.items)) {
          order.items.forEach(item => {
            const name = item.name;
            if (name) {
              popularityMap[name] = (popularityMap[name] || 0) + item.quantity;
            }
          });
        }
      });

      setMenuPopularity(popularityMap);
    } catch (err) {
      console.error("Failed to load order history for sorting:", err.message);
      // Optional: toast.warning("Could not sort by popularity");
    }
  };

  const fetchServiceCharge = async () => {
  try {
    const token = localStorage.getItem("token");
    const res = await axios.get(
      "https://unicorninstititutelms.onrender.com/api/auth/admin/service-charge",
      {
        headers: { Authorization: `Bearer ${token}` }
      }
    );

    const { dineInCharge, isActive } = res.data;

    setServiceChargeSettings({
      dineInCharge,
      isActive: isActive === true || isActive === "true" // ✅ ensures boolean
    });
  } catch (err) {
    console.error("Failed to load service charge:", err.message);
    console.error("Failed to load service charge:", err.response?.data || err.message);

  }
  };

  // const fetchDeliveryCharge = async () => {
  //   try {
  //     const token = localStorage.getItem("token");
  //     const res = await axios.get("https://unicorninstititutelms.onrender.com/api/auth/admin/delivery-charge", {
  //       headers: { Authorization: `Bearer ${token}` }
  //     });
  //     setDeliveryChargeSettings(res.data);
  //   } catch (err) {
  //     console.error("Failed to load delivery charge:", err.message);
  //   }
  // };

  const fetchDeliveryPlaces = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get("https://unicorninstititutelms.onrender.com/api/auth/delivery-charges", { // ✅ updated endpoint
        headers: { Authorization: `Bearer ${token}` }
      });
      setDeliveryPlaces(res.data); // ✅ store array of places
    } catch (err) {
      console.error("Failed to load delivery places:", err.message);
      toast.error("Failed to load delivery zones");
    }
  };

  const cleanMenuName = (name) => {
    const match = name.match(/^[^a-zA-Z]*([a-zA-Z].*)/);
    return match ? match[1] : name; // fallback to original if no letter found
  };

  // Add item to cart
  const addToCart = (menu) => {
    const { _id, quantity = 1 } = menu;

    // ✅ Check against tempStock, not original stock
    const available = tempStock[_id] || 0;
    if (quantity > available) {
      toast.warn(`Only ${available} of "${menu.name}" available!`);
      return;
    }

    const cleanedName = cleanMenuName(menu.name);
    
    const existing = cart.find((item) => item._id === menu._id);

    if (existing) {
      setCart(
        cart.map((item) =>
          item._id === _id ? { ...item, quantity: item.quantity + quantity } : item
        )
      );
    } else {
      setCart([...cart, { ...menu, name: cleanedName, quantity }]);
    }

    // ✅ Deduct from tempStock
    setTempStock(prev => ({
      ...prev,
      [_id]: (prev[_id] || 0) - quantity
    }));
  };

  // Remove item from cart
  const removeFromCart = (menu) => {
    const existing = cart.find(item => item._id === menu._id);
    if (!existing) return;

    let newCart;
    if (existing.quantity <= 1) {
      newCart = cart.filter(item => item._id !== menu._id);
    } else {
      newCart = cart.map(item =>
        item._id === menu._id ? { ...item, quantity: item.quantity - 1 } : item
      ).filter(item => item.quantity > 0);
    }

    setCart(newCart);

    // ✅ Return 1 unit to tempStock
    setTempStock(prev => ({
      ...prev,
      [menu._id]: (prev[menu._id] || 0) + 1
    }));
  };

  const loadMenuOptions = (inputValue) => {
    if (!inputValue?.trim()) {
      // Return all in-stock (temp) items when no search
      return menus
        .filter(menu => (tempStock[menu._id] || 0) > 0)
        .map(menu => ({
          ...menu,
          label: `${menu.name} (${symbol}${menu.price.toFixed(2)}) — Stock: ${tempStock[menu._id] || 0}`,
          value: menu._id
        }));
    }

    return menus
      .filter(menu =>
        menu.name.toLowerCase().includes(inputValue.toLowerCase()) &&
        (tempStock[menu._id] || 0) > 0
      )
      .map(menu => ({
        ...menu,
        label: `${menu.name} (${symbol}${menu.price.toFixed(2)}) — Stock: ${tempStock[menu._id] || 0}`,
        value: menu._id
      }));
  };

  const filterMenuOptions = (inputValue) => {
    const filtered = menus.filter(menu => {
      const available = tempStock[menu._id] || 0;
      const matchesSearch = !inputValue || menu.name.toLowerCase().includes(inputValue.toLowerCase());
      return matchesSearch && available > 0;
    });

    return filtered.map(menu => ({
      ...menu,
      value: menu._id,
      label: `${menu.name} (${symbol}${menu.price.toFixed(2)}) — Stock: ${tempStock[menu._id] || 0}`
    }));
  };

  // Proceed to payment
  const goToPayment = () => {
    const { phone, name, orderType, tableNo, deliveryType, deliveryPlaceId } = customer;

    // Always required
    if (!phone.trim()) {
      toast.warn("Phone number is required");
      return;
    }
    if (!name.trim()) {
      toast.warn("Customer name is required");
      return;
    }
    if (cart.length === 0) {
      toast.warn("Please add at least one item to the order");
      return;
    }

    // Dine-in specific
    if (orderType === "table") {
      if (!tableNo.trim()) {
        toast.warn("Table number is required for Dine-In orders");
        return;
      }
      if (!selectedWaiterId) {
        toast.warn("Please assign a waiter for Dine-In orders");
        return;
      }
    }

    // Takeaway specific
    if (orderType === "takeaway") {
      if (!deliveryType) {
        toast.warn("Please select a Delivery Type");
        return;
      }

      if (deliveryType === "Delivery Service" && !deliveryPlaceId) {
        toast.warn("Please select a Delivery Place");
        return;
      }
    }

    const subtotal = cart.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );

    let serviceCharge = 0;
    let deliveryCharge = 0;
    let finalTotal = subtotal;

    // Apply service charge
    if (customer.orderType === "table" && serviceChargeSettings.isActive) {
      serviceCharge = subtotal * (serviceChargeSettings.dineInCharge / 100);
      finalTotal += serviceCharge;
    }

    // Apply delivery charge
    if (customer.orderType === "takeaway" && customer.deliveryType === "Delivery Service") {
      deliveryCharge = selectedDeliveryPlace.charge;
      finalTotal += deliveryCharge;
    }
    

    setOrderData({
      customerName: name,
      customerPhone: phone,
      tableNo: customer.orderType === "takeaway" ? "Takeaway" : customer.tableNo,
      items: cart.map((item) => ({
        menuId: item._id,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        imageUrl: item.imageUrl
      })),
      subtotal,
      serviceCharge,
      deliveryType: customer.orderType === "takeaway" ? customer.deliveryType : null,
      deliveryCharge,
      totalPrice: finalTotal
    });

    setShowPaymentModal(true);
  };

  // Confirm order and send to backend

  const submitConfirmedOrder = async (paymentData) => {
    if (submitLock) return;
    setSubmitLock(true);
    setIsSubmitting(true); // ✅ Start loading
    try {
      const token = localStorage.getItem("token");
      // const invoiceNo = `INV-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

      // Get last invoice number from localStorage, default to 99 so next is 100

      // let lastInvoiceNo = parseInt(localStorage.getItem("lastInvoiceNo")) || 99;
      // lastInvoiceNo += 1;
      // localStorage.setItem("lastInvoiceNo", lastInvoiceNo.toString());
      // const invoiceNo = `INV-${lastInvoiceNo}`;

      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0'); // Months are 0-indexed
      const day = String(now.getDate()).padStart(2, '0');
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      const seconds = String(now.getSeconds()).padStart(2, '0');

      const timestamp = `${year}${month}${day}${hours}${minutes}${seconds}`;
      const invoiceNo = `INV-${timestamp}`;

      const payload = {
        ...customer,
        waiterId: customer.orderType === "table" ? selectedWaiterId : null,
        deliveryPlaceId: selectedDeliveryPlace?._id,
        deliveryPlaceName: selectedDeliveryPlace?.placeName || null,
        deliveryCharge: deliveryCharge,
        ...orderData,
        payment: {
          cash: paymentData.cash,
          card: paymentData.card,
          bankTransfer: paymentData.bankTransfer,
          totalPaid: paymentData.totalPaid,
          changeDue: paymentData.changeDue,
          notes: paymentData.notes
        },
      };

      const res = await axios.post(
        "https://unicorninstititutelms.onrender.com/api/auth/order",
        payload,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      setReceiptOrder(res.data);
      setCustomer({
        phone: "",
        name: "",
        orderType: "table",
        tableNo: "",
        deliveryType: "Customer Pickup"
      });
      setCart([]);
      fetchMenus();
      setShowPaymentModal(false);
      toast.success("Order placed successfully!");

      // navigate("/cashier-summery");
    } catch (err) {
      console.error("Order failed:", err.response?.data || err.message);
      const errorMsg = err.response?.data?.error || "Failed to place order";
      
      if (err.response?.status === 409) {
        toast.error("⚠️ " + errorMsg); // e.g., "This order has already been processed..."
      } else {
        toast.error("❌ " + errorMsg);
      }
      // alert("Failed to place order");
    } finally {
      setIsSubmitting(false); // ✅ Stop loading
      setSubmitLock(false); // 🔓 unlock after success OR error
    }

  };

  const filteredMenus = menus
    .filter((menu) => {
      const matchesSearch = menu.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = !selectedCategory || menu.category === selectedCategory;

      let matchesSize = true;
      if (sizeFilter) {
        const parts = menu.name?.split('-');
        const suffix = parts?.[parts.length - 1];
        matchesSize = suffix === sizeFilter;
      }

      return matchesSearch && matchesCategory && matchesSize;
    })
    .sort((a, b) => {
      const countA = menuPopularity[a.name] || 0;
      const countB = menuPopularity[b.name] || 0;
      return countB - countA; // most ordered first
    });

  // ✅ LIVE subtotal calculation
  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const serviceCharge = customer.orderType === "table" && serviceChargeSettings.isActive
    ? subtotal * (serviceChargeSettings.dineInCharge / 100)
    : 0;
  // const deliveryCharge = customer.orderType === "takeaway" && deliveryChargeSettings.isActive && customer.deliveryType === "Delivery Service"
  //     ? deliveryChargeSettings.amount
  //     : 0;
  const selectedDeliveryPlace = deliveryPlaces.find(
    (place) => place._id === customer.deliveryPlaceId
  );

  const deliveryCharge = customer.orderType === "takeaway" &&
                        customer.deliveryType === "Delivery Service" &&
                        selectedDeliveryPlace
    ? selectedDeliveryPlace.charge
    : 0;

  const finalTotal = subtotal + serviceCharge + deliveryCharge;

  const symbol = localStorage.getItem("currencySymbol") || "$";

  return (
    <div className="container-fluid px-4">
      <h2 className="mb-4 text-primary border-bottom pb-2 fw-bold">Order Management</h2>

      <div className="row g-3 position-relative">
        <div className="col-md-9">
          {/* Customer Info */}
          <div className="mb-4 bg-white p-4 rounded shadow-sm" style={{ minHeight: '245px' }}>
            <h4>Customer Details</h4>
            <div className="row g-3 position-relative">
              <div className="col-md-3">
                <label>Phone *</label>
                {/* <AsyncSelect
                  cacheOptions
                  defaultOptions
                  loadOptions={loadCustomerOptions}
                  value={customer.phone ? { value: customer.phone, label: `${customer.name || 'Unknown'} (${customer.phone})` } : null}
                  onChange={(opt) => {
                    if (opt) {
                      setCustomer({ ...customer, phone: opt.value, name: opt.name });
                    } else {
                      setCustomer({ ...customer, phone: '', name: '' });
                    }
                  }}
                  placeholder="Type phone or name..."
                  noOptionsMessage={() => "No matching customers"}
                  classNamePrefix="select"
                  components={makeAnimated()}
                /> */}
                
                <input
                  type="text"
                  value={customer.phone}
                  onChange={(e) => handlePhoneChange(e.target.value)}
                  onFocus={() => {
                    setNumberPadTarget('phone');
                    setShowNumberPad(true);
                  }}
                  className="form-control"
                  placeholder="Type phone..."
                />

                {/* Search Results Dropdown */}
                {customerSearchResults.length > 0 && (
                  <div className="text-muted small mt-1">
                    <ul className="list-group position-absolute z-3 w-100 shadow" style={{ maxHeight: '200px', overflowY: 'auto' }}>
                      {customerSearchResults.map((cust) => (
                        <li
                          key={cust._id || cust.phone}
                          className="list-group-item list-group-item-action"
                          onClick={() => {
                            setCustomer({
                              ...customer,
                              phone: cust.phone,
                              name: cust.name || ''
                            });
                            setCustomerSearchResults([]);
                          }}
                          style={{ cursor: 'pointer' }}
                        >
                          {cust.name ? `${cust.name} (${cust.phone})` : cust.phone}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {isSearching && (
                  <div className="text-muted small mt-1">Searching...</div>
                )}
              </div>

              <div className="col-md-3">
                <label>Name *</label>
                <input
                  name="name"
                  value={customer.name}
                  onChange={(e) =>
                    setCustomer({
                      ...customer,
                      name: e.target.value
                    })
                  }
                  className="form-control"
                  placeholder="John Doe"
                />
              </div>
              <div className="col-md-3">
                <label>Order Type</label>
                <select
                  name="orderType"
                  value={customer.orderType}
                  onChange={handleOrderTypeChange} 
                  className="form-select"
                >
                  <option value="table">Dine In</option>
                  <option value="takeaway">Takeaway</option>
                </select>
              </div>
              
              {/* {customer.orderType === "table" && (
                <>
                  <div className="col-md-3">
                    <label>Table No</label>
                    <input
                      name="tableNo"
                      value={customer.tableNo}
                      onChange={(e) =>
                        setCustomer({
                          ...customer,
                          tableNo: e.target.value
                        })
                      }
                      className="form-control"
                      placeholder="-"
                    />
                  </div>
                </>
              )} */}

              {customer.orderType === "table" && (
                <> 
                  <div className="col-md-3">
                    <label>Table No</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={customer.tableNo}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, '');
                        setCustomer({ ...customer, tableNo: val });
                      }}
                      onFocus={() => {
                        setNumberPadTarget('tableNo');
                        setShowNumberPad(true);
                      }}
                      className="form-control"
                      placeholder="-"
                      required
                    />
                  </div>

                  <div className="col-md-3">
                    <label>Assign Waiter *</label>
                    <select
                      value={selectedWaiterId}
                      onChange={(e) => setSelectedWaiterId(e.target.value)}
                      className="form-select"
                      required
                    >
                      <option value="">Select a waiter</option>
                      {waiters.map((waiter) => (
                        <option key={waiter._id} value={waiter._id}>
                          {waiter.name || waiter.fullName || waiter._id}
                        </option>
                      ))}
                    </select>
                  </div>
                </>
              )}

              {/* Delivery Type (only for Takeaway) */}
              {customer.orderType === "takeaway" && (
                <div className="col-md-3">
                  <label>Delivery Type</label>
                  <select
                    name="deliveryType"
                    value={customer.deliveryType}
                    onChange={(e) =>
                          setCustomer({
                            ...customer,
                            deliveryType: e.target.value
                          })
                        }
                    className="form-select"
                  >
                    <option value="">Select an option</option>
                    <option value="Customer Pickup">Customer Pickup</option>
                    <option value="Delivery Service">Delivery Service</option>
                  </select>
                </div>
              )}

            </div>
            <div className="row g-3 position-relative mt-3">

              {/* Delivery Note (only for Delivery Service) */}
              {customer.orderType === "takeaway" && customer.deliveryType === "Delivery Service" && (
                <div className="mt-3">
                  <label>Delivery Address or Note</label>
                  <textarea
                    name="deliveryNote"
                    value={customer.deliveryNote || ""}
                    onChange={(e) =>
                      setCustomer({
                        ...customer,
                        deliveryNote: e.target.value
                      })
                    }
                    rows="2"
                    className="form-control"
                    placeholder="Enter delivery address or instructions"
                    required
                  ></textarea>
                </div>
              )}

              {/* Delivery Place Selector (only for Delivery Service) */}
              {customer.orderType === "takeaway" && customer.deliveryType === "Delivery Service" && (
                <div className="col-md-4">
                  <label>Delivery Place *</label>
                  {/* <select
                    name="deliveryPlaceId"
                    value={customer.deliveryPlaceId}
                    onChange={(e) =>
                      setCustomer({
                        ...customer,
                        deliveryPlaceId: e.target.value
                      })
                    }
                    className="form-select"
                    required
                  >
                    <option value="">Select a delivery zone</option>
                    {deliveryPlaces.map((place) => (
                      <option key={place._id} value={place._id}>
                        {place.placeName} ({symbol}{place.charge.toFixed(2)})
                      </option>
                    ))}
                  </select> */}

                  {/* <Select
                    name="deliveryPlaceId"
                    value={
                      customer.deliveryPlaceId
                        ? deliveryPlaces.find(place => place._id === customer.deliveryPlaceId)
                          ? {
                              value: customer.deliveryPlaceId,
                              label: `${deliveryPlaces.find(p => p._id === customer.deliveryPlaceId).placeName} (${symbol}${deliveryPlaces.find(p => p._id === customer.deliveryPlaceId).charge.toFixed(2)})`
                            }
                          : null
                        : null
                    }
                    onChange={(selectedOption) => {
                      setCustomer({
                        ...customer,
                        deliveryPlaceId: selectedOption ? selectedOption.value : ""
                      });
                    }}
                    options={deliveryPlaces.map(place => ({
                      value: place._id,
                      label: `${place.placeName} (${symbol}${place.charge.toFixed(2)})`
                    }))}
                    placeholder="Select a delivery zone..."
                    isClearable
                    isSearchable
                    classNamePrefix="select"
                    styles={{ menuPortal: base => ({ ...base, zIndex: 9999 }) }}
                    menuPortalTarget={document.body}
                  /> */}

                  <Select
                    name="deliveryPlaceId"
                    value={
                      customer.deliveryPlaceId
                        ? deliveryPlaces.find(place => place._id === customer.deliveryPlaceId)
                          ? {
                              value: customer.deliveryPlaceId,
                              label: `${deliveryPlaces.find(p => p._id === customer.deliveryPlaceId).placeName} (${symbol}${deliveryPlaces.find(p => p._id === customer.deliveryPlaceId).charge.toFixed(2)})`
                            }
                          : null
                        : null
                    }
                    onChange={async (selectedOption) => {
                      if (selectedOption && selectedOption.value === "__CREATE_NEW__") {
                        // Step 1: Get place name
                        const placeName = prompt("Enter new delivery place name:");
                        if (!placeName || !placeName.trim()) return;

                        // Step 2: Get delivery charge
                        const chargeStr = prompt(`Enter delivery charge for "${placeName}" (e.g., 5.99):`);
                        const charge = parseFloat(chargeStr);

                        if (isNaN(charge) || charge < 0) {
                          toast.error("Invalid delivery charge. Must be a number ≥ 0.");
                          return;
                        }

                        try {
                          const token = localStorage.getItem("token");
                          const res = await axios.post(
                            "https://unicorninstititutelms.onrender.com/api/auth/delivery-charges",
                            { placeName: placeName.trim(), charge },
                            { headers: { Authorization: `Bearer ${token}` } }
                          );
                          const newPlace = res.data;

                          // Add to local state
                          setDeliveryPlaces(prev => [...prev, newPlace]);

                          // Select the newly created place
                          setCustomer(prev => ({
                            ...prev,
                            deliveryPlaceId: newPlace._id
                          }));

                          toast.success(`✅ "${placeName}" added with charge ${symbol}${charge.toFixed(2)}`);
                        } catch (err) {
                          console.error("Failed to create delivery place:", err);
                          toast.error("Failed to save new delivery place");
                        }
                      } else {
                        // Regular selection
                        setCustomer(prev => ({
                          ...prev,
                          deliveryPlaceId: selectedOption ? selectedOption.value : ""
                        }));
                      }
                    }}
                    options={[
                      // ➕ Create option FIRST
                      {
                        value: "__CREATE_NEW__",
                        label: "➕ Create New Delivery Place...",
                        isDisabled: false
                      },
                      // Then existing places
                      ...deliveryPlaces.map(place => ({
                        value: place._id,
                        label: `${place.placeName} (${symbol}${place.charge.toFixed(2)})`
                      }))
                    ]}
                    placeholder="Select a delivery zone..."
                    isClearable
                    isSearchable
                    classNamePrefix="select"
                    styles={{ menuPortal: base => ({ ...base, zIndex: 9999 }) }}
                    menuPortalTarget={document.body}
                  />
                </div>
              )}

            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="row g-0 mb-4">
            <div className="card shadow-sm">
              <div className="card-header bg-light d-flex justify-content-between align-items-center">
                <span>Enter {numberPadTarget === 'phone' ? 'Phone' : numberPadTarget === 'quantity' ? 'Quantity' : 'Table No'}</span>
                <button
                  className="btn btn-sm btn-outline-secondary"
                  onClick={() => setShowNumberPad(false)}
                >
                  ✕
                </button>
              </div>
              <div className="card-body p-2">
                <div className="row g-1">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                    <div key={num} className="col-4">
                      <button
                        className="btn btn-light w-100 py-2 border"
                        onClick={() => handleNumberPadInput(num.toString())}
                      >
                        {num}
                      </button>
                    </div>
                  ))}
                  <div className="col-4">
                    <button
                      className="btn btn-light w-100 py-2 border"
                      onClick={() => handleNumberPadInput('0')}
                    >
                      0
                    </button>
                  </div>
                  <div className="col-4">
                    <button
                      className="btn btn-light w-100 py-2 border"
                      onClick={handleBackspace}
                    >
                      ⌫
                    </button>
                  </div>
                  <div className="col-4">
                    <button
                      className="btn btn-success w-100 py-2"
                      onClick={() => setShowNumberPad(false)}
                    >
                      Done
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="row g-3">
        <div className="col-md-4">
          {/* Right Side - Cart & Receipt */}
          <div className="row g-0 mb-4">
            <div className="card shadow-sm">
              <div className="card-header bg-success text-white">
                <h5 className="mb-0">🛒 Current Order</h5>
              </div>
              <div className="card-body">
                <ul className="list-group mb-3">
                  {cart.length === 0 ? (
                    <li className="list-group-item">No items added</li>
                  ) : (
                    cart.map((item, idx) => (
                      <li key={idx} className="list-group-item d-flex justify-content-between align-items-center">
                        <span>{item.name}</span>
                        <span>{symbol}{(item.price * item.quantity).toFixed(2)}</span>
                        <span className="badge bg-secondary">{item.quantity}</span>
                        <button
                          className="btn btn-sm btn-outline-danger"
                          onClick={() => removeFromCart(item)}
                        >
                          -
                        </button>
                      </li>
                    ))
                  )}
                </ul>

                <hr />

                {/* Order Summary */}
                <div className="d-flex justify-content-between mb-2">
                  <strong>Subtotal</strong>
                  <span>{symbol}{subtotal.toFixed(2)}</span> {/* ✅ UPDATED */}
                </div>

                {serviceCharge > 0 && (
                  <div className="d-flex justify-content-between mb-2">
                    <strong>Service Charge ({serviceChargeSettings.dineInCharge}%)</strong>
                    <span>{symbol}{serviceCharge.toFixed(2)}</span> {/* ✅ UPDATED */}
                  </div>
                )}

                {deliveryCharge > 0 && (
                  <div className="d-flex justify-content-between mb-2">
                    <strong>Delivery Fee</strong>
                    <span>{symbol}{deliveryCharge.toFixed(2)}</span>
                  </div>
                )}

                <div className="d-flex justify-content-between fw-bold fs-5">
                  <strong>Total</strong>
                  <span>{symbol}{finalTotal.toFixed(2)}</span> {/* ✅ UPDATED */}
                </div>

                <button
                  className="btn btn-success w-100 py-2 mt-3"
                  onClick={goToPayment}
                  disabled={cart.length === 0}
                >
                  Proceed to Payment
                </button>
              </div>
            </div>
          </div>
        </div>
        
        <div className="col-md-8">
          <div className="bg-white p-3 mb-3 rounded shadow-sm">
            <div className="row g-3">
              <div className="col-md-6">
                <label>Select Menu Item</label>
                <Select
                  options={menus
                    .filter(menu => (tempStock[menu._id] || 0) > 0)
                    .map(menu => ({
                      ...menu,
                      value: menu._id,
                      label: `${menu.name} (${symbol}${menu.price.toFixed(2)}) — Stock: ${tempStock[menu._id]}`
                    }))
                  }
                  value={selectedMenuItem}
                  onChange={setSelectedMenuItem}
                  placeholder="Search menu items..."
                  isClearable
                  isSearchable
                  noOptionsMessage={() => "No in-stock items"}
                  classNamePrefix="select"
                  components={makeAnimated()}
                />
              </div>

              <div className="col-md-2">
                <label>Quantity</label>
                <input
                  type="number"
                  min="0"
                  max={selectedMenuItem ? tempStock[selectedMenuItem._id] || 1 : 1}
                  className="form-control"
                  value={itemQuantity}
                  // onFocus={(e) => e.target.select()}
                  onFocus={(e) => {
                    if (selectedMenuItem) {
                      setNumberPadTarget('quantity');
                      setShowNumberPad(true);
                    }
                  }}
                  onWheel={(e) => e.target.blur()}
                  onChange={(e) => {
                    const val = parseInt(e.target.value) || 1;
                    const max = selectedMenuItem ? tempStock[selectedMenuItem._id] || 1 : 1;
                    if (val > max) {
                      toast.warn(`Only ${max} available for "${selectedMenuItem.name}"!`);
                    }
                    setItemQuantity(Math.max(1, Math.min(val, max)));
                  }}
                  disabled={!selectedMenuItem}
                />
                {selectedMenuItem && selectedMenuItem.currentQty <= selectedMenuItem.minimumQty && (
                  <small className="text-warning">⚠️ Low stock!</small>
                )}
              </div>
              
              <div className="col-md-4">
                <button
                  className="btn btn-success w-100 mt-4"
                  onClick={() => {
                    if (!selectedMenuItem) return;
                    addToCart({ ...selectedMenuItem, quantity: itemQuantity });
                    setSelectedMenuItem(null);
                    setItemQuantity(1);
                  }}
                  disabled={!selectedMenuItem}
                >
                  Add to Order
                </button>
              </div>
            </div>
          </div>

          <div className="bg-white p-3 mb-3 rounded shadow-sm">
            <div className="row g-3">
              <div className="col-md-4">
                <select
                  className="form-select"
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                >
                  <option value="">All Categories</option>
                  {loadingCategories ? (
                    <option disabled>Loading categories...</option>
                  ) : (
                    categories.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))
                  )}
                </select>
              </div>

              <div className="col-md-4">
                <input
                  type="text"
                  className="form-control"
                  placeholder="Search items..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              <div className="col-md-4">
                <select
                  className="form-select"
                  value={sizeFilter}
                  onChange={(e) => setSizeFilter(e.target.value)}
                >
                  <option value="">All Sizes</option>
                  <option value="M">Medium</option>
                  <option value="L">Large</option>
                </select>
              </div>
            </div>
          </div>

          <div className="row g-3">
            {filteredMenus.map((menu) => {
              
              const inStock = menu.currentQty > 0;
              const lowStock = menu.currentQty <= menu.minimumQty;

              return(
              <div key={menu._id} className="col-12 col-md-4 col-lg-4 col-xl-3">
                <div className="card shadow-sm h-100 border-0">
                  {/* <img
                    src={
                    menu.imageUrl.startsWith("https")
                      ? menu.imageUrl
                      : `https://unicorninstititutelms.onrender.com${menu.imageUrl}`
                    }
                    alt={menu.name}
                    style={{ height: "50px", width:"100%" ,objectFit: "contain" }}
                    onError={(e) => {
                      e.target.src = "https://via.placeholder.com/300x200?text=No+Image";
                    }}
                    className="card-img-top"
                  /> */}
                  <div className="card-body text-center">
                    <h6>{menu.name} <p>({menu.category})</p></h6>
                    <p className="m-0">{symbol}{menu.price.toFixed(2)} </p>
                    <p className="m-0">
                      Stock:{" "}
                    <span className={`badge ${lowStock ? "bg-warning text-dark" : "bg-success"}`}>
                      {/* {menu.currentQty} */}
                      {tempStock[menu._id]}
                    </span>
                    </p>
                    {inStock ? (
                    <button
                      className="btn btn-success w-100 mt-2"
                      onClick={() => addToCart(menu)}
                    >
                      Add to Order
                    </button>
                    ) : (
                      <div className="text-danger mt-auto">❌ Out of Stock</div>
                    )}
                  </div>
                </div>
              </div>
            );
            })}
          </div>
        </div>
      </div>

      {/* Modals */}
      {showPaymentModal && (
        <PaymentModal
          totalAmount={orderData.totalPrice}
          subtotal={orderData.subtotal}
          serviceCharge={orderData.serviceCharge}
          deliveryCharge={orderData.deliveryCharge}
          onConfirm={submitConfirmedOrder}
          onClose={() => setShowPaymentModal(false)}
          loading={isSubmitting}
        />
      )}

      {receiptOrder && (
        <ReceiptModal
          order={receiptOrder}
          onClose={() => {
            setReceiptOrder(null);
          }}
        />
      )}
      <ToastContainer />
    </div>
  );
};

export default CashierLanding;