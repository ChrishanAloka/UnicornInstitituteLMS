import React, { useEffect, useState } from "react";
import axios from "axios";

const ReceiptView = () => {
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Get order ID from URL
  const params = new URLSearchParams(window.location.search);
  const orderId = window.location.pathname.split("/").pop(); // e.g., /receipt/abc123 → abc123

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await axios.get(`https://unicorninstititutelms.onrender.com/api/auth/order/${orderId}`, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });

        setOrder(res.data);
        window.print(); // Auto-print after data loads
      } catch (err) {
        console.error("Failed to load order:", err.response?.data || err.message);
        setError(err.response?.data?.error || "Failed to load order");
      } finally {
        setLoading(false);
      }
    };

    fetchOrder();
  }, []);

  if (loading) return <div>Loading...</div>;
  if (error)
    return (
      <div className="alert alert-danger">{error}</div>
    );

  if (!order) return null;

  return (
    <div style={{ maxWidth: "400px", margin: "auto", padding: "20px", fontFamily: "monospace" }}>
      <h3 className="text-center">RMS Restaurant</h3>
      <p><strong>Date:</strong> {new Date(order.date).toLocaleString()}</p>
      <p><strong>Customer:</strong> {order.customerName}</p>
      <p><strong>Phone:</strong> {order.customerPhone}</p>
      <p><strong>Table No:</strong> {order.tableNo || "Takeaway"}</p>

      <hr />

      <ul style={{ listStyle: "none", paddingLeft: 0 }}>
        {order.items.map((item, idx) => (
          <li key={idx}>
            {item.name} x{item.quantity} @ ${item.price?.toFixed(2)}
          </li>
        ))}
      </ul>

      <hr />
      <h5 className="text-end">Total: ${order.totalPrice?.toFixed(2)}</h5>
      <p className="text-center mt-4">Thank you for your visit!</p>
    </div>
  );
};

export default ReceiptView;