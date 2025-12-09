// src/components/OtherIncome.jsx
import React, { useState, useEffect } from "react";
import axios from "axios";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const OtherIncome = () => {
  const [incomes, setIncomes] = useState([]);
  const [newIncome, setNewIncome] = useState({
    source: "Tips",
    amount: "",
    description: "",
    date: new Date().toISOString().split("T")[0],
    paymentMethod: "Cash"
  });

  const [editingIncome, setEditingIncome] = useState(null);
  const [editData, setEditData] = useState({ ...newIncome });
  const [loading, setLoading] = useState(false);

  // Load all incomes on mount
  useEffect(() => {
    fetchIncomes();
  }, []);

  const fetchIncomes = async () => {
    const token = localStorage.getItem("token");

    try {
      const res = await axios.get("https://unicorninstititutelms.onrender.com/api/auth/income/other", {
        headers: { Authorization: `Bearer ${token}` }
      });

      setIncomes(res.data);
    } catch (err) {
      console.error("Failed to load incomes:", err.message);
      toast.error("Failed to load other income records");
    }
  };

  // Handle form input change
  const handleChange = (e) =>
    setNewIncome({ ...newIncome, [e.target.name]: e.target.value });

  // Submit new income
  const handleSubmit = async (e) => {
    e.preventDefault();

    const { source, amount, date } = newIncome;

    if (!source || !amount || !date) {
      alert("Source, Amount, and Date are required");
      return;
    }

    try {
      const token = localStorage.getItem("token");
      const res = await axios.post(
        "https://unicorninstititutelms.onrender.com/api/auth/income/other",
        newIncome,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      setIncomes([res.data, ...incomes]);
      setNewIncome({
        source: "Tips",
        amount: "",
        description: "",
        date: new Date().toISOString().split("T")[0],
        paymentMethod: "Cash"
      });

      toast.success("Income added successfully!");
    } catch (err) {
      console.error("Add failed:", err.response?.data || err.message);
      toast.error("Failed to add income");
    }
  };

  // Get currency from localStorage
  const symbol = localStorage.getItem("currencySymbol") || "$";

  // Open edit modal
  const openEditModal = (income) => {
    setEditingIncome(income._id);
    setEditData({
      source: income.source,
      amount: income.amount,
      description: income.description,
      date: new Date(income.date).toISOString().split("T")[0],
      paymentMethod: income.paymentMethod || "Cash"
    });
  };

  // Handle edit input change
  const handleEditChange = (e) =>
    setEditData({ ...editData, [e.target.name]: e.target.value });

  // Save updated income
  const handleUpdate = async (e) => {
    e.preventDefault();

    const { source, amount, date } = editData;

    if (!source || !amount || !date) {
      alert("All fields are required");
      return;
    }

    try {
      const token = localStorage.getItem("token");
      const res = await axios.put(
        `https://unicorninstititutelms.onrender.com/api/auth/income/other/${editingIncome}`,
        editData,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      setIncomes(incomes.map((i) => (i._id === editingIncome ? res.data : i)));
      setEditingIncome(null);
      toast.success("Income updated!");
    } catch (err) {
      console.error("Update failed:", err.response?.data || err.message);
      toast.error("Failed to update income");
    }
  };

  // Delete an income
  const handleDelete = async (id) => {
    const confirmDelete = window.confirm("Are you sure you want to delete this income record?");
    if (!confirmDelete) return;

    try {
      const token = localStorage.getItem("token");
      await axios.delete(`https://unicorninstititutelms.onrender.com/api/auth/income/other/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setIncomes(incomes.filter((income) => income._id !== id));
      toast.success("Income record deleted");
    } catch (err) {
      console.error("Delete failed:", err.response?.data || err.message);
      toast.error("Failed to delete income record");
    }
  };

  return (
    <div className="container py-4">
      <h2 className="mb-4 fw-bold text-success border-bottom pb-2">Other Income</h2>

      {/* Add Income Form */}
      <form onSubmit={handleSubmit} className="p-4 bg-white border rounded shadow-sm mb-5">
        <div className="row g-3">
          <div className="col-md-6">
            <label className="form-label fw-semibold">Income Source</label>
            <select
              name="source"
              value={newIncome.source}
              onChange={handleChange}
              className="form-select"
            >
              <option>Tips</option>
              <option>Event Rental</option>
              <option>Merchandise</option>
              <option>Delivery Fee</option>
              <option>Donations</option>
              <option>Other</option>
            </select>
          </div>
          <div className="col-md-6">
            <label className="form-label fw-semibold">Amount ({symbol})</label>
            <input
              type="number"
              name="amount"
              value={newIncome.amount}
              onChange={handleChange}
              step="0.01"
              placeholder="e.g., 150"
              className="form-control"
              required
            />
          </div>
          <div className="col-md-6">
            <label className="form-label fw-semibold">Payment Method</label>
            <select
              name="paymentMethod"
              value={newIncome.paymentMethod}
              onChange={handleChange}
              className="form-select"
            >
              <option value="Cash">Cash</option>
              <option value="Credit Card">Credit Card</option>
              <option value="Debit Card">Debit Card</option>
              <option value="Bank Transfer">Bank Transfer</option>
              <option value="Cheque">Cheque</option>
              <option value="Other">Other</option>
            </select>
          </div>
          <div className="col-md-6">
            <label className="form-label fw-semibold">Date</label>
            <input
              type="date"
              name="date"
              value={newIncome.date}
              onChange={handleChange}
              className="form-control"
              required
            />
          </div>
          <div className="col-12 mt-3">
            <label className="form-label fw-semibold">Description</label>
            <textarea
              name="description"
              value={newIncome.description}
              onChange={handleChange}
              rows="2"
              className="form-control"
            />
          </div>
          <div className="col-12 mt-3">
            <button type="submit" className="btn btn-success w-100 py-2 fs-5">
              + Add Income
            </button>
          </div>
        </div>
      </form>

      {/* Edit Modal */}
      {editingIncome && (
        <div
          className="modal fade show d-block"
          tabIndex="-1"
          style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
        >
          <div className="modal-dialog">
            <div className="modal-content rounded shadow">
              <div className="modal-header bg-success text-white">
                <h5 className="modal-title">Edit Income</h5>
                <button
                  type="button"
                  className="btn-close btn-close-white"
                  onClick={() => setEditingIncome(null)}
                />
              </div>
              <div className="modal-body">
                <form onSubmit={handleUpdate}>
                  <div className="mb-3">
                    <label className="form-label fw-semibold">Income Source</label>
                    <select
                      name="source"
                      value={editData.source}
                      onChange={handleEditChange}
                      className="form-select"
                    >
                      <option>Tips</option>
                      <option>Event Rental</option>
                      <option>Merchandise</option>
                      <option>Delivery Fee</option>
                      <option>Donations</option>
                      <option>Other</option>
                    </select>
                  </div>
                  <div className="mb-3">
                    <label className="form-label fw-semibold">Amount ({symbol})</label>
                    <input
                      type="number"
                      name="amount"
                      value={editData.amount}
                      onChange={handleEditChange}
                      step="0.01"
                      className="form-control"
                      required
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label fw-semibold">Payment Method</label>
                    <select
                      name="paymentMethod"
                      value={editData.paymentMethod}
                      onChange={handleEditChange}
                      className="form-select"
                    >
                      <option value="Cash">Cash</option>
                      <option value="Credit Card">Credit Card</option>
                      <option value="Debit Card">Debit Card</option>
                      <option value="Bank Transfer">Bank Transfer</option>
                      <option value="Cheque">Cheque</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div className="mb-3">
                    <label className="form-label fw-semibold">Date</label>
                    <input
                      type="date"
                      name="date"
                      value={editData.date.split("T")[0]}
                      onChange={handleEditChange}
                      className="form-control"
                      required
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label fw-semibold">Description</label>
                    <textarea
                      name="description"
                      value={editData.description}
                      onChange={handleEditChange}
                      rows="2"
                      className="form-control"
                    />
                  </div>
                  <div className="d-flex gap-2">
                    <button type="submit" className="btn btn-success w-100">
                      Save Changes
                    </button>
                    <button
                      type="button"
                      className="btn btn-danger"
                      onClick={() => handleDelete(editingIncome)}
                    >
                      Delete
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Incomes Table */}
      <div className="mt-4">
        <h4 className="mb-3 text-secondary">💰 Recent Income Records</h4>
        <div className="table-responsive shadow-sm rounded border">
          <table className="table table-bordered table-striped align-middle mb-0">
            <thead className="table-dark">
              <tr>
                <th>Date</th>
                <th>Source</th>
                <th>Amount</th>
                <th>Payment Method</th>
                <th>Description</th>
                <th className="text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {incomes.length === 0 ? (
                <tr>
                  <td colSpan="6" className="text-center text-muted py-4">
                    No income records found
                  </td>
                </tr>
              ) : (
                incomes.map(income => (
                  <tr key={income._id}>
                    <td>{new Date(income.date).toLocaleDateString()}</td>
                    <td>{income.source}</td>
                    <td>{symbol}{income.amount.toFixed(2)}</td>
                    <td>{income.paymentMethod || "Cash"}</td>
                    <td>{income.description || "-"}</td>
                    <td className="text-center">
                      <button
                        className="btn btn-sm btn-success me-2"
                        onClick={() => openEditModal(income)}
                        title="Edit Income"
                      >
                          ✏️ Edit
                      </button>
                      <button
                        className="btn btn-sm btn-danger"
                        onClick={() => handleDelete(income._id)}
                        title="Delete Income"
                      >
                        🗑️ Delete
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <ToastContainer />
    </div>
  );
};

export default OtherIncome;