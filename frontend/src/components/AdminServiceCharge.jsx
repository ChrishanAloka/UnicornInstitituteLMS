import React, { useState, useEffect } from "react";
import axios from "axios";
import { ToastContainer, toast } from "react-toastify";

const AdminServiceCharge = () => {
  const [serviceCharge, setServiceCharge] = useState({
    dineInCharge: 0,
    isActive: false
  });

  // Load current charge on mount
  useEffect(() => {
    fetchServiceCharge();
  }, []);

  const fetchServiceCharge = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(
        "https://unicorninstititutelms.onrender.com/api/auth/admin/service-charge",
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      setServiceCharge(res.data);
    } catch (err) {
      toast.error("Failed to load service charge");
    }
  };

  const handleChange = (e) => {
    const { name, value, checked, type } = e.target;
    setServiceCharge((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : parseFloat(value)
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const token = localStorage.getItem("token");
      const res = await axios.put(
        "https://unicorninstititutelms.onrender.com/api/auth/admin/service-charge",
        serviceCharge,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      setServiceCharge(res.data);
      toast.success("Service charge updated successfully!");
    } catch (err) {
      console.error("Update failed:", err.response?.data || err.message);
      toast.error("Failed to update service charge");
    }
  };

  return (
    <div className="container my-4">
      <h2>Service Charge Settings</h2>
      <p className="text-muted">Set percentage-based service charge for Dine-In orders</p>

      {/* Form */}
      <form onSubmit={handleSubmit} className="bg-light p-4 rounded shadow-sm mb-4">
        <div className="row g-3 align-items-center">
          <div className="col-md-6">
            <label className="form-label">Dine-In Service Charge (%)</label>
            <input
              type="number"
              name="dineInCharge"
              value={serviceCharge.dineInCharge}
              onChange={handleChange}
              step="0.01"
              min="0"
              placeholder="e.g., 15"
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
                checked={serviceCharge.isActive}
                onChange={handleChange}
                className="form-check-input"
              />
              <label htmlFor="isActive" className="form-check-label ms-2">
                <strong>Enable Service Charge</strong>
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

      {/* Summary Card */}
      <div className="card bg-white shadow-sm border">
        <div className="card-body">
          <h5 className="card-title">Current Settings</h5>
          <ul className="list-group list-group-flush">
            <li className="list-group-item d-flex justify-content-between">
              <span>Dine-In Charge:</span>
              <span>{serviceCharge.dineInCharge}%</span>
            </li>
            <li className="list-group-item d-flex justify-content-between">
              <span>Status:</span>
              <span
                className={`badge rounded-pill px-3 py-2 ${
                  serviceCharge.isActive ? "bg-success text-white" : "bg-danger text-white"
                }`}
              >
                {serviceCharge.isActive ? "Enabled" : "Disabled"}
              </span>
            </li>
          </ul>
        </div>
      </div>

      <ToastContainer />
    </div>
  );
};

export default AdminServiceCharge;