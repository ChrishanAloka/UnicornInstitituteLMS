// src/components/DeliveryCharges.jsx
import React, { useState, useEffect } from "react";
import axios from "axios";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const DeliveryCharges = () => {
  const [charges, setCharges] = useState([]);
  const [form, setForm] = useState({ placeName: "", charge: "" });
  const [editingId, setEditingId] = useState(null);

  const symbol = localStorage.getItem("currencySymbol") || "$";

  useEffect(() => {
    fetchCharges();
  }, []);

  const fetchCharges = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(
        "https://projectnuckels.onrender.com/api/auth/delivery-charges",
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setCharges(res.data);
    } catch (err) {
      toast.error("Failed to load delivery charges");
    }
  };

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const { placeName, charge } = form;

    if (!placeName.trim() || charge === "" || parseFloat(charge) < 0) {
      toast.error("Valid place name and charge required");
      return;
    }

    try {
      const token = localStorage.getItem("token");
      const payload = {
        ...(editingId && { id: editingId }),
        placeName: placeName.trim(),
        charge: parseFloat(charge)
      };

      await axios.post(
        "https://projectnuckels.onrender.com/api/auth/delivery-charges",
        payload,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      toast.success(editingId ? "Delivery charge updated!" : "Delivery charge added!");
      setForm({ placeName: "", charge: "" });
      setEditingId(null);
      fetchCharges();
    } catch (err) {
      const msg = err.response?.data?.error || "Operation failed";
      toast.error(msg);
    }
  };

  const startEdit = (charge) => {
    setForm({ placeName: charge.placeName, charge: charge.charge });
    setEditingId(charge._id);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this delivery charge?")) return;

    try {
      const token = localStorage.getItem("token");
      await axios.delete(
        `https://projectnuckels.onrender.com/api/auth/delivery-charges/${id}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success("Deleted successfully");
      fetchCharges();
    } catch (err) {
      toast.error("Failed to delete");
    }
  };

  return (
    <div className="container py-4">
      <h2 className="mb-4 fw-bold text-success border-bottom pb-2">
        🚚 Delivery Charges
      </h2>

      {/* Form */}
      <form onSubmit={handleSubmit} className="p-4 bg-white border rounded shadow-sm mb-5">
        <div className="row g-3">
          <div className="col-md-6">
            <label className="form-label fw-semibold">Delivery Place</label>
            <input
              type="text"
              name="placeName"
              value={form.placeName}
              onChange={handleChange}
              className="form-control"
              placeholder="e.g., Downtown, Airport, Suburb"
              required
            />
          </div>
          <div className="col-md-6">
            <label className="form-label fw-semibold">Charge ({symbol})</label>
            <input
              type="number"
              name="charge"
              value={form.charge}
              onChange={handleChange}
              step="0.01"
              min="0"
              className="form-control"
              placeholder="e.g., 5.99"
              required
            />
          </div>
          <div className="col-12 mt-3">
            <button
              type="submit"
              className={`btn ${editingId ? "btn-warning" : "btn-success"} w-100 py-2 fs-5`}
            >
              {editingId ? "✏️ Update Charge" : "➕ Add Delivery Charge"}
            </button>
            {editingId && (
              <button
                type="button"
                className="btn btn-outline-secondary mt-2 w-100"
                onClick={() => {
                  setForm({ placeName: "", charge: "" });
                  setEditingId(null);
                }}
              >
                Cancel Edit
              </button>
            )}
          </div>
        </div>
      </form>

      {/* Charges List */}
      <div className="mt-4">
        <h4 className="mb-3 text-secondary">📍 Configured Delivery Places ({charges.length})</h4>
        {charges.length === 0 ? (
          <div className="alert alert-info">No delivery charges configured yet.</div>
        ) : (
          <div className="table-responsive">
            <table className="table table-bordered table-striped align-middle">
              <thead className="table-success">
                <tr>
                  <th>Place Name</th>
                  <th>Charge</th>
                  <th className="text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {charges.map((dc) => (
                  <tr key={dc._id}>
                    <td>{dc.placeName}</td>
                    <td>{symbol}{dc.charge.toFixed(2)}</td>
                    <td className="text-center">
                      <button
                        className="btn btn-sm btn-warning me-2"
                        onClick={() => startEdit(dc)}
                      >
                        ✏️ Edit
                      </button>
                      <button
                        className="btn btn-sm btn-danger"
                        onClick={() => handleDelete(dc._id)}
                      >
                        🗑️ Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ToastContainer />
    </div>
  );
};

export default DeliveryCharges;