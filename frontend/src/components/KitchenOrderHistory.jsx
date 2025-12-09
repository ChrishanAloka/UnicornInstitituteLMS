import React, { useEffect, useState } from "react";
import axios from "axios";

const KitchenOrderHistory = () => {
  const [orders, setOrders] = useState([]);

  useEffect(() => {
    const fetchOrders = async () => {
      const token = localStorage.getItem("token");
      const res = await axios.get("https://projectnuckels.onrender.com/api/auth/orders", {
        headers: { Authorization: `Bearer ${token}` }
      });
      setOrders(res.data);
    };

    fetchOrders();

    const interval = setInterval(fetchOrders, 30000); // auto-refresh every 30s
    return () => clearInterval(interval);
  }, []);

  const completedOrders = orders.filter(
    (order) => order.status === "Ready" || order.status === "Completed"
  );

  return (
    <div className="container py-4">
      <h2 className="mb-4 text-primary border-bottom pb-2"> Kitchen - Order History</h2>

      <div className="table-responsive shadow-sm rounded border">
        <table className="table table-hover align-middle table-bordered mb-0">
          <thead className="table-light">
            <tr>
              <th>Date</th>
              <th>Status</th>
              <th>Customer</th>
              <th>Items</th>
              <th>Table No / Takeaway</th>
            </tr>
          </thead>
          <tbody>
            {completedOrders.length === 0 ? (
              <tr>
                <td colSpan="5" className="text-center text-muted py-3">
                  No completed orders yet.
                </td>
              </tr>
            ) : (
              completedOrders.map((order) => (
                <tr key={order._id}>
                  <td>{new Date(order.date).toLocaleString()}</td>
                  <td>
                    <span
                      className={`badge px-3 py-2 rounded-pill fw-semibold ${
                        order.status === "Ready"
                          ? "bg-success"
                          : "bg-primary"
                      }`}
                    >
                      {order.status}
                    </span>
                  </td>
                  <td>{order.customerName || "Walk-in"}</td>
                  <td>
                    <ul className="mb-0">
                      {order.items.map((item, idx) => (
                        <li key={idx}>
                          {item.name} <span className="text-muted">x{item.quantity}</span>
                        </li>
                      ))}
                    </ul>
                  </td>
                  <td>
                    {order.tableNo > 0
                      ? <span className="badge bg-primary">Table {order.tableNo} </span>
                      : <span className="badge bg-info text-dark">Takeaway</span>}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default KitchenOrderHistory;
