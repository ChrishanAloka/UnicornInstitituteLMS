import React, { useState, useEffect } from "react";
import axios from "axios";
import { ToastContainer, toast } from "react-toastify";

const AdminDeliveryCharge = () => {
  const [deliveryCharge, setDeliveryCharge] = useState({
    amount: 0,
    isActive: false
  });

  // Load current settings
  useEffect(() => {
    fetchDeliveryCharge();
  }, []);

  const fetchDeliveryCharge = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(
        "https://unicorninstititutelms.onrender.com/api/auth/admin/delivery-charge",
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      setDeliveryCharge(res.data);
    } catch (err) {
      console.error("Failed to load delivery charge:", err.message);
      toast.error("Failed to load delivery charge");
    }
  };

  const handleChange = (e) => {
    const { name, value, checked, type } = e.target;
    setDeliveryCharge((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : parseFloat(value)
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const token = localStorage.getItem("token");
      const res = await axios.put(
        "https://unicorninstititutelms.onrender.com/api/auth/admin/delivery-charge",
        deliveryCharge,
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
          }
        }
      );

      setDeliveryCharge(res.data);
      toast.success("Delivery charge updated successfully!");
    } catch (err) {
      console.error("Update failed:", err.response?.data || err.message);
      toast.error("Failed to update delivery charge");
    }
  };

  const symbol = localStorage.getItem("currencySymbol") || "$";

  return (
    <div className="container my-4">
      <h2>Delivery Charge Settings</h2>
      <p className="text-muted">Set delivery charge for takeaway orders</p>

      {/* Form */}
      <form onSubmit={handleSubmit} className="bg-light p-4 rounded shadow-sm mb-4">
        <div className="row g-3 align-items-center">
          <div className="col-md-6">
            <label className="form-label">Delivery Charge ($)</label>
            <input
              type="number"
              name="amount"
              value={deliveryCharge.amount}
              onChange={handleChange}
              min="0"
              step="0.01"
              placeholder="e.g., 5"
              className="form-control"
              required
            />
          </div>

          <div className="col-md-6">
            <div className="form-check mt-4">
              <input
                type="checkbox"
                id="isActive"
                name="isActive"
                checked={deliveryCharge.isActive}
                onChange={handleChange}
                className="form-check-input"
              />
              <label htmlFor="isActive" className="form-check-label ms-2">
                <strong>Enable Delivery Charges</strong>
              </label>
            </div>
          </div>

          <div className="col-12 mt-3">
            <button type="submit" className="btn btn-primary w-100 py-2 fs-5">
              Save Settings
            </button>
          </div>
        </div>
      </form>

      {/* Current Summary */}
      <div className="card bg-white shadow-sm border">
        <div className="card-body">
          <h5 className="card-title">Current Settings</h5>
          <ul className="list-group list-group-flush">
            <li className="list-group-item d-flex justify-content-between">
              <span>Delivery Charge</span>
              <span>{symbol}{deliveryCharge.amount.toFixed(2)}</span>
            </li>
            <li className="list-group-item d-flex justify-content-between">
              <span>Status</span>
              <span
                className={`badge ${
                  deliveryCharge.isActive ? "bg-success" : "bg-danger"
                } text-white`}
              >
                {deliveryCharge.isActive ? "Enabled" : "Disabled"}
              </span>
            </li>
          </ul>
        </div>
      </div>

      <ToastContainer />
    </div>
  );
};

export default AdminDeliveryCharge;