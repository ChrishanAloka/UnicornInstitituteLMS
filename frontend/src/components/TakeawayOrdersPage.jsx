import React, { useState, useEffect } from "react";
import axios from "axios";
import { ToastContainer, toast } from "react-toastify";
import useNotifications from "../hooks/useNotification";
import ReceiptModal from "./ReceiptModal";

const TakeawayOrdersPage = () => {
  const { sendNotification } = useNotifications(); // ✅ Use the hook
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("");
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [editingOrderId, setEditingOrderId] = useState(null);
  const [editData, setEditData] = useState({
    deliveryStatus: "",
    driverId: ""
  });
  const [drivers, setDrivers] = useState([]);

  const UserId = localStorage.getItem("userId");
  const UserRole = localStorage.getItem("userRole");

  // Load orders
  useEffect(() => {
    fetchOrders();
    const interval = setInterval(fetchOrders, 30000); // Auto-refresh every 30s
    return () => clearInterval(interval);
  }, [filterStatus]);

  const fetchOrders = async () => {
    try {
      const token = localStorage.getItem("token");
      const params = {};
      if (filterStatus) params.status = filterStatus;

      const res = await axios.get("https://projectnuckels.onrender.com/api/auth/cashier/takeaway-orders", {
        headers: { Authorization: `Bearer ${token}` },
        params
      });

      setOrders(res.data);
      setLoading(false);
    } catch (err) {
      console.error("Failed to load takeaway orders:", err.message);
      toast.error("Failed to load takeaway orders");
      setLoading(false);
    }
  };

  // Load drivers
  useEffect(() => {
    fetchDrivers();
  }, []);

  const fetchDrivers = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get("https://projectnuckels.onrender.com/api/auth/drivers", {
        headers: { Authorization: `Bearer ${token}` }
      });
      setDrivers(res.data);
    } catch (err) {
      console.error("Failed to load drivers:", err.message);
    }
  };

  // Handle delivery status change
  const handleDeliveryStatusChange = (e) => {
    const { name, value } = e.target;
    setEditData((prev) => ({ ...prev, [name]: value }));
  };

  // Open edit modal
  const openEditModal = (order) => {
    setEditingOrderId(order._id);
    setEditData({
      deliveryStatus: order.deliveryStatus,
      driverId: order.driverId?._id || ""
    });
  };

  // Submit changes
  const submitDeliveryUpdate = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.put(
        `https://projectnuckels.onrender.com/api/auth/order/${editingOrderId}/delivery-status`,
        editData,
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
          }
        }
      );

      setOrders(orders.map(o => o._id === editingOrderId ? res.data : o));
      setEditingOrderId(null);
      toast.success("Delivery status updated successfully!");
      
      await sendNotification("Update", `Delivery Status Updated for order ${orders.customerName } as ${editData.deliveryStatus}`);  
      
    } catch (err) {
      console.error("Update failed:", err.response?.data || err.message);
      toast.error("Failed to update delivery status");
    }
  };

  // Get status options based on deliveryType
  const getStatusOptions = (deliveryType) => {
    if (deliveryType === "Customer Pickup") {
      return ["Customer Pending", "Customer Picked Up"];
    } else {
      return ["Driver Pending", "Driver On the Way", "Order Delivered"];
    }
  };

  // Get badge by status
  const getStatusBadge = (status) => {
    switch (status) {
      case "Customer Pending":
        return <span className="badge bg-warning text-dark">{status}</span>;
      case "Customer Picked Up":
        return <span className="badge bg-success">Picked Up</span>;
      case "Driver Pending":
        return <span className="badge bg-info text-white">{status}</span>;
      case "Driver On the Way":
        return <span className="badge bg-primary">{status}</span>;
      case "Order Delivered":
        return <span className="badge bg-success">{status}</span>;
      default:
        return <span className="badge bg-light text-dark">{status}</span>;
    }
  };

  const symbol = localStorage.getItem("currencySymbol") || "$";

  return (
    <div className="container my-4 mobile-scroll-container container-fluid px-3">
      <h2 className="mb-2 fw-bold text-primary">Takeaway Orders</h2>
      <p className="mb-4 text-muted border-bottom pb-2">View and manage your takeaway/delivery orders</p>

      {/* Filters */}
      <div className="mb-4 d-flex flex-wrap gap-3 align-items-center">
        <div>
          <label className="form-label mb-0">Filter by Status:</label>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="form-select w-auto"
          >
            <option value="">All</option>
            <option value="Pending">Pending</option>
            <option value="Processing">Processing</option>
            <option value="Ready">Ready</option>
            <option value="Completed">Completed</option>
          </select>
        </div>
      </div>

      {/* Orders Table */}
      {loading ? (
        <p>Loading orders...</p>
      ) : orders.length === 0 ? (
        <p className="text-muted">No takeaway orders found.</p>
      ) : (
        <div className="table-responsive rounded shadow-sm border">
          <table className="table table-hover align-middle table-bordered mb-0">
            <thead className="table-primary">
              <tr>
                <th>Invoice No</th>
                <th>Customer</th>
                <th>Total</th>
                <th>Status</th>
                <th>Delivery Type</th>
                <th>Delivery Status</th>
                <th>Driver</th>
                <th>Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => {
                const canEdit =
                  order.deliveryType === "Delivery Service"
                    ? ["Driver Pending", "Driver On the Way"].includes(order.deliveryStatus)
                    : ["Customer Pending"].includes(order.deliveryStatus);

                return (
                  <tr key={order._id}>
                    <td>{order.invoiceNo}</td>
                    <td>{order.customerName}</td>
                    <td>{symbol}{order.totalPrice.toFixed(2)}</td>
                    <td>
                      {order.status === "Pending" && (
                        <span className="badge bg-warning text-dark">{order.status}</span>
                      )}
                      {order.status === "Processing" && (
                        <span className="badge bg-primary">{order.status}</span>
                      )}
                      {order.status === "Ready" && (
                        <span className="badge bg-success">{order.status}</span>
                      )}
                      {order.status === "Completed" && (
                        <span className="badge bg-secondary">{order.status}</span>
                      )}
                    </td>
                    <td>
                      {order.deliveryType === "Customer Pickup" ? (
                        <span className="badge bg-secondary">{order.deliveryType}</span>
                      ) : (
                        <span className="badge bg-info text-white">{order.deliveryType}</span>
                      )}
                    </td>
                    <td>{getStatusBadge(order.deliveryStatus)}</td>
                    <td>
                      {order.driverId ? (
                        <>
                          <strong>{order.driverId.name}</strong>
                          <br />
                          <small>{order.driverId.vehicle} ({order.driverId.numberPlate})</small>
                        </>
                      ) : (
                        <span className="text-muted">Not Assigned</span>
                      )}
                    </td>
                    <td>{new Date(order.createdAt).toLocaleString()}</td>
                    <td>
                      <div className="d-flex gap-1">
                        <button
                          className="btn btn-sm btn-primary me-2"
                          onClick={() => setSelectedOrder(order)}
                        >
                          View
                        </button>
                        
                        {canEdit && (
                          <button
                            className="btn btn-sm btn-warning"
                            onClick={() => openEditModal(order)}
                          >
                            Edit
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Receipt Modal */}
      {selectedOrder && (
        <ReceiptModal
          order={selectedOrder}
          onClose={() => setSelectedOrder(null)}
        />
      )}

      {/* Edit Status Modal */}
      {editingOrderId && (
        <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: "rgba(0,0,0,0.5)" }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Update Delivery Status</h5>
                <button className="btn-close" onClick={() => setEditingOrderId(null)}></button>
              </div>
              <div className="modal-body">
                <div className="mb-3">
                  <label className="form-label">Select Delivery Status</label>
                  <select
                    name="deliveryStatus"
                    value={editData.deliveryStatus}
                    onChange={handleDeliveryStatusChange}
                    className="form-select"
                  >
                    {getStatusOptions(orders.find(o => o._id === editingOrderId)?.deliveryType).map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Driver Select - only for Delivery Service */}
                {editData.deliveryStatus === "Driver Pending"  ? (
                  <div className="mb-3">
                    <label className="form-label">Assign Driver</label>
                    <select
                      name="driverId"
                      value={editData.driverId || ""}
                      onChange={handleDeliveryStatusChange}
                      className="form-select"
                    >
                      <option value="">Select Driver</option>
                      {drivers.map((d) => (
                        <option key={d._id} value={d._id}>
                          {d.name} - {d.vehicle} ({d.numberPlate})
                        </option>
                      ))}
                    </select>
                  </div>
                ) : null}

                <button
                  className="btn btn-success w-100"
                  onClick={submitDeliveryUpdate}
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <ToastContainer />
    </div>
  );
};

export default TakeawayOrdersPage;