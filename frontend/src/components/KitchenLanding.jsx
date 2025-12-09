import React, { useEffect, useState } from "react";
import axios from "axios";
import "./KitchenLanding.css";

const KitchenLanding = () => {
  const [orders, setOrders] = useState([]);

  // Helper: Check if date is today
  const isToday = (dateString) => {
    const orderDate = new Date(dateString);
    const today = new Date();
    return (
      orderDate.getDate() === today.getDate() &&
      orderDate.getMonth() === today.getMonth() &&
      orderDate.getFullYear() === today.getFullYear()
    );
  };

  // Helper: Format time remaining
  const formatTime = (ms) => {
    if (ms <= 0) return "00:00";
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  };

  // Returns percentage of time left (0% = expired, 100% = full)
  const getProgressPercentage = (timeRemaining, timeLimit) => {
    if (timeRemaining <= 0) return 0;
    return Math.max(0, Math.min(100, (timeRemaining / timeLimit) * 100));
  };

  // Returns dash offset for SVG circle (0 = full, 100 = empty)
  const getDashOffset = (timeRemaining, timeLimit) => {
    if (timeRemaining <= 0) return 100; // fully empty (overdue)
    const percentage = (timeRemaining / timeLimit) * 100;
    return Math.max(0, Math.min(100, 100 - percentage)); // invert: 100% time → 0 offset
  };

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await axios.get("https://unicorninstititutelms.onrender.com/api/auth/orders", {
          headers: { Authorization: `Bearer ${token}` },
        });
        setOrders(res.data);
      } catch (err) {
        console.error("Failed to fetch orders:", err);
      }
    };

    fetchOrders();
    const interval = setInterval(fetchOrders, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, []);

  // Live countdown logic
  const [currentTime, setCurrentTime] = useState(Date.now());
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const markAsReady = async (id) => {
    const token = localStorage.getItem("token");

    try {
      await axios.put(
        `https://unicorninstititutelms.onrender.com/api/auth/order/${id}/status`,
        { status: "Ready" },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      await axios.post(
        "https://unicorninstititutelms.onrender.com/api/auth/notifications/send",
        {
          userId: id,
          message: `Order #${id} is ready for pickup.`,
          type: "update",
          role: "kitchen",
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      setOrders((prev) => prev.filter((o) => o._id !== id));
    } catch (err) {
      alert("❌ Failed to update order status");
    }
  };

  const liveOrders = orders.filter(
    (order) => order.status === "Pending" || order.status === "Processing"
  );

  return (
    <div className="container py-4">
      <h2 className="mb-4 text-primary border-bottom pb-2 fw-bold">Live Kitchen Orders</h2>

      {liveOrders.length === 0 ? (
        <p className="text-muted">No live orders at the moment.</p>
      ) : (
        <div className="row g-4">
          {liveOrders.map((order) => {
            const createdAt = new Date(order.createdAt);
            const timeElapsed = currentTime - createdAt.getTime();
            const timeLimit = 20 * 60 * 1000; // 30 minutes in ms
            const timeRemaining = timeLimit - timeElapsed;
            const isOverdue = timeRemaining <= 0;
            const orderIsFromToday = isToday(order.createdAt);

            // Determine card border class
            const cardBorderClass = isOverdue
              ? "border-danger border-2"
              : "border-primary border-1";

            // Determine button color
            const buttonClass = orderIsFromToday
              ? "btn-success"
              : "btn-danger"; // Red if from past day

            return (
              <div key={order._id} className="col-md-6 col-lg-4">
                <div className={`card h-100 shadow-sm ${cardBorderClass}`}>
                  <div className="card-header bg-light d-flex justify-content-between align-items-center">
                    <span className="fw-semibold">Order #{order._id.slice(-5)}</span>
                    <span className="badge bg-warning fs-6 text-dark">{order.status}</span>
                    {/* ===== MINIMAL CIRCULAR COUNTDOWN RING ===== */}
                    <div className="d-flex justify-content-between my-0">
                      <div className="countdown-ring">
                        <svg viewBox="0 0 24 24">
                          {/* Background Circle */}
                          <circle
                            cx="12"
                            cy="12"
                            r="10"
                            className="ring-bg"
                          />
                          {/* Progress Arc */}
                          <circle
                            cx="12"
                            cy="12"
                            r="10"
                            className={`ring-progress ${isOverdue ? "overdue" : ""}`}
                            strokeDasharray="100"
                            strokeDashoffset={getDashOffset(timeRemaining, timeLimit)}
                          />
                        </svg>
                      </div>
                      {/* Optional: Show time next to it */}
                      <div className={`ms-2 align-self-center ${isOverdue ? "text-danger fw-bold" : ""}`}>
                        {formatTime(timeRemaining)}
                      </div>
                    </div>
                  </div>
                  <div className="card-body">
                    <p className="mb-2">
                      <strong>Customer:</strong> {order.customerName || "Walk-in"}
                    </p>
                    <p className="mb-2">
                      <strong>Table / Type:</strong>{" "}
                      {order.tableNo > 0 ? (
                        <span className="badge bg-primary fs-8">Table {order.tableNo} - {order.waiterName}</span>
                      ) : (
                        <span className="badge bg-info text-dark">Takeaway - ({order.deliveryType})</span>
                      )}
                    </p>

                    {/* Countdown Timer */}
                    {/* <div className="mb-3 text-center">
                      <small className={isOverdue ? "text-danger fw-bold" : "text-muted"}>
                        Time left: {formatTime(timeRemaining)}
                      </small>
                    </div> */}

                    {/* ===== CIRCULAR COUNTDOWN WIDGET ===== */}
                    {/* <div className="d-flex justify-content-center my-3">
                      <div className="circular-countdown">
                        <div
                          className={`ring ${isOverdue ? "overdue" : ""}`}
                          style={{
                            background: isOverdue
                              ? "conic-gradient(from 0deg, #dc3545 0%, #dc3545 100%)"
                              : `conic-gradient(
                                  from 0deg,
                                  #6f42c1 0%,
                                  #28a745 ${getProgressPercentage(timeRemaining, timeLimit)}%,
                                  #007bff 100%
                                )`,
                          }}
                        ></div>
                        <div className={`time-display ${isOverdue ? "overdue" : ""}`}>
                          {formatTime(timeRemaining)}
                        </div>
                      </div>
                    </div> */}

                    <ul className="list-group mb-3">
                      {order.items.map((item, idx) => (
                        <li
                          key={idx}
                          className="list-group-item d-flex justify-content-between align-items-center"
                        >
                          {item.name}
                          <span className="badge bg-secondary">{item.quantity}</span>
                        </li>
                      ))}
                    </ul>

                    <button
                      className={`btn ${buttonClass} w-100`}
                      onClick={() => markAsReady(order._id)}
                    >
                      {orderIsFromToday ? "✅ Mark as Ready" : "❗ Mark as Ready (Past Day)"}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default KitchenLanding;