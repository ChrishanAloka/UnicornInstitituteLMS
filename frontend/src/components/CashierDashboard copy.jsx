// src/components/CashierDashboard.jsx
import React, { useState, useEffect } from "react";
import axios from "axios";

const CashierDashboard = () => {
  const [orders, setOrders] = useState([]);
  const symbol = localStorage.getItem("currencySymbol") || "$";

  useEffect(() => {
    const fetchTodayOrders = async () => {
      const token = localStorage.getItem("token");
      const today = new Date();
      const startOfDay = new Date(today.setHours(0, 0, 0, 0));
      const endOfDay = new Date(today.setHours(23, 59, 59, 999));

      try {
        const res = await axios.get("https://projectnuckels.onrender.com/api/auth/orders", {
          params: {
            startDate: startOfDay.toISOString(),
            endDate: endOfDay.toISOString()
          },
          headers: { Authorization: `Bearer ${token}` }
        });

        setOrders(res.data);
      } catch (err) {
        console.error("Failed to fetch orders", err.message);
      }
    };

    fetchTodayOrders();
    const interval = setInterval(fetchTodayOrders, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="container mt-4">
      <h2 className="mb-4 text-primary border-bottom pb-2 fw-bold">Today's Orders</h2>

      {orders.length === 0 ? (
        <p className="text-muted">No orders today</p>
      ) : (
        <div className="row g-4">
          {orders.map((order) => (
            <div className="col-md-6 col-lg-4" key={order._id}>
              <div className="card shadow-sm border-0 h-100">
                <div className="card-body">
                  <h5 className="card-title mb-2">🧾 Order <code>{order._id.slice(-5)}</code></h5>

                  <p className="mb-1">
                    <strong>Customer:</strong> {order.customerName}
                  </p>
                  <p className="mb-1">
                    <strong>Total:</strong> {symbol}{order.totalPrice?.toFixed(2)}
                  </p>

                  <p className="mb-1">
                    <strong>Type:</strong>{" "}
                    {order.tableNo > 0 ? (
                      <span className="badge bg-primary">Table {order.tableNo}</span>
                    ) : (
                      <span className="badge bg-info text-dark">Takeaway</span>
                    )}
                  </p>

                  <p className="mb-1">
                    <strong>Status:</strong>{" "}
                    <span
                      className={`badge ${
                        order.status === "Completed"
                          ? "bg-secondary"
                          : order.status === "Ready"
                          ? "bg-success"
                          : order.status === "Processing"
                          ? "bg-primary"
                          : "bg-warning text-dark"
                      }`}
                    >
                      {order.status}
                    </span>
                  </p>

                  <hr />
                  <p className="mb-2"><strong>🍽️ Items:</strong></p>
                  <ul className="list-group list-group-flush small">
                    {order.items.map((item, idx) => (
                      <li
                        key={idx}
                        className="list-group-item d-flex justify-content-between align-items-center px-1 py-1"
                      >
                        {item.name}
                        <span className="badge bg-dark">{item.quantity}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default CashierDashboard;
