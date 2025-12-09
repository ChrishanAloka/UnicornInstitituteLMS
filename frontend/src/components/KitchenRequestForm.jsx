import React, { useState, useEffect } from "react";
import axios from "axios";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const KitchenRequestForm = () => {
  const [formData, setFormData] = useState({
    item: "",
    quantity: "",
    unit: "",
    reason: ""
  });
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMyRequests = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await axios.get(
          "https://unicorninstititutelms.onrender.com/api/auth/kitchen/my-requests",
          {
            headers: { Authorization: `Bearer ${token}` }
          }
        );
        setRequests(res.data);
      } catch (err) {
        console.error("Failed to load your requests:", err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchMyRequests();
  }, []);

  const handleChange = (e) =>
    setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.item || !formData.quantity || !formData.unit) {
      toast.warn("Please fill all required fields.");
      return;
    }

    try {
      const token = localStorage.getItem("token");
      const res = await axios.post(
        "https://unicorninstititutelms.onrender.com/api/auth/kitchen/request",
        formData,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      setRequests([res.data, ...requests]);
      toast.success("Request submitted successfully!");
      setFormData({ item: "", quantity: "", unit: "", reason: "" });
    } catch (err) {
      console.error("Failed to submit request:", err.message);
      toast.error("Failed to submit request");
    }
  };

  return (
    <div className="container py-4">
      <h2 className="text-primary mb-4 border-bottom pb-2">
         Request Kitchen Supplies
      </h2>
      <ToastContainer />

      {/* Form */}
      <form
        onSubmit={handleSubmit}
        className="bg-white p-4 shadow-sm border rounded mb-5"
      >
        <div className="row g-4">
          <div className="col-md-6">
            <label className="form-label fw-semibold">Item *</label>
            <input
              type="text"
              name="item"
              value={formData.item}
              onChange={handleChange}
              className="form-control shadow-sm"
              placeholder="e.g., Rice, Oil"
              required
            />
          </div>

          <div className="col-md-3">
            <label className="form-label fw-semibold">Quantity *</label>
            <input
              type="number"
              name="quantity"
              value={formData.quantity}
              onChange={handleChange}
              className="form-control shadow-sm"
              min="1"
              placeholder="e.g., 10"
              required
            />
          </div>

          <div className="col-md-3">
            <label className="form-label fw-semibold">Unit *</label>
            <select
              name="unit"
              value={formData.unit}
              onChange={handleChange}
              className="form-select shadow-sm"
              required
            >
              <option value="">-- Select --</option>
              <option value="kg">Kilograms (kg)</option>
              <option value="liters">Liters</option>
              <option value="pcs">Pieces</option>
              <option value="grams">Grams</option>
              <option value="ml">Milliliters</option>
              <option value="packs">Packs</option>
            </select>
          </div>

          <div className="col-md-12">
            <label className="form-label fw-semibold">Reason (Optional)</label>
            <textarea
              name="reason"
              value={formData.reason}
              onChange={handleChange}
              rows="2"
              className="form-control shadow-sm"
              placeholder="Describe the reason for this request"
            />
          </div>

          <div className="col-12 pt-2">
            <button type="submit" className="btn btn-success w-100 py-2 fs-5">
              ✅ Submit Request
            </button>
          </div>
        </div>
      </form>

      {/* Requests Table */}
      <h4 className="text-secondary mb-3">📋 Your Recent Requests</h4>

      {loading ? (
        <p className="text-info">Loading...</p>
      ) : requests.length === 0 ? (
        <p className="text-muted">No requests found.</p>
      ) : (
        <div className="table-responsive shadow-sm rounded border">
          <table className="table table-hover table-bordered align-middle mb-0">
            <thead className="table-light">
              <tr>
                <th>Date</th>
                <th>Item</th>
                <th>Quantity</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((req, idx) => (
                <tr key={idx}>
                  <td>{new Date(req.date).toLocaleDateString()}</td>
                  <td>{req.item}</td>
                  <td>
                    {req.quantity} {req.unit}
                  </td>
                  <td>
                    <span
                      className={`badge rounded-pill px-3 py-2 ${
                        req.status === "Approved"
                          ? "bg-success"
                          : req.status === "Rejected"
                          ? "bg-danger"
                          : "bg-warning text-dark"
                      }`}
                    >
                      {req.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default KitchenRequestForm;
