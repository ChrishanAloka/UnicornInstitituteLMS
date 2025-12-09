import React, { useState, useEffect } from "react";
import axios from "axios";
import Select from "react-select";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const ExpensePage = () => {
  const [suppliers, setSuppliers] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [formData, setFormData] = useState({
    supplier: null,
    amount: "",
    description: "",
    date: new Date().toISOString().split("T")[0],
    billNo: "",
    paymentMethod: "Cash"
  });
  const [editingId, setEditingId] = useState(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [deleteId, setDeleteId] = useState(null);

  // Load suppliers and expenses
  useEffect(() => {
    fetchSuppliers();
    fetchExpenses();
  }, []);

  const fetchSuppliers = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get("https://unicorninstititutelms.onrender.com/api/auth/suppliers", {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSuppliers(res.data);
    } catch (err) {
      alert("Failed to load suppliers");
    }
  };

  const fetchExpenses = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get("https://unicorninstititutelms.onrender.com/api/auth/expenses", {
        headers: { Authorization: `Bearer ${token}` }
      });
      setExpenses(res.data);
    } catch (err) {
      alert("Failed to load expenses");
    }
  };

  const handleSupplierChange = (selectedOption) => {
    setFormData({ ...formData, supplier: selectedOption });
  };

  const handleChange = (e) =>
    setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.supplier || !formData.amount || !formData.billNo) {
      alert("Please select supplier, enter amount, and provide bill number");
      return;
    }

    const payload = {
      supplier: formData.supplier.value,
      amount: parseFloat(formData.amount),
      description: formData.description,
      date: formData.date,
      billNo: formData.billNo,
      paymentMethod: formData.paymentMethod
    };

    try {
      const token = localStorage.getItem("token");
      const url = editingId
        ? `https://unicorninstititutelms.onrender.com/api/auth/expense/${editingId}`
        : "https://unicorninstititutelms.onrender.com/api/auth/expense/add";

      const method = editingId ? "put" : "post";

      const res = await axios[method](url, payload, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        }
      });

      if (editingId) {
        const updatedList = expenses.map((exp) =>
          exp._id === editingId ? res.data : exp
        );
        setExpenses(updatedList);
        setEditingId(null);
        toast.success("Expense updated successfully!");
      } else {
        const supplierData = suppliers.find((s) => s._id === payload.supplier);
        const newExpense = {
          _id: res.data._id,
          supplier: supplierData,
          amount: payload.amount,
          description: payload.description,
          date: payload.date,
          billNo: payload.billNo
        };
        setExpenses([newExpense, ...expenses]);
        toast.success("Expense added successfully!");
      }

      setFormData({
        supplier: null,
        amount: "",
        description: "",
        date: new Date().toISOString().split("T")[0],
        billNo: ""
      });
    } catch (err) {
      console.error("Failed to submit expense:", err.response?.data || err.message);
      toast.error(editingId ? "Failed to update expense" : "Failed to add expense");
    }
  };

  const openEditModal = (exp) => {
    setFormData({
      supplier: {
        value: exp.supplier._id,
        label: `${exp.supplier.name} (${exp.supplier.contact})`
      },
      amount: exp.amount,
      description: exp.description,
      date: new Date(exp.date).toISOString().split("T")[0],
      billNo: exp.billNo,
      paymentMethod: exp.paymentMethod || "Cash"
    });
    setEditingId(exp._id);
  };

  const confirmDelete = (id) => {
    setDeleteId(id);
    setShowConfirmModal(true);
  };

  const handleDelete = async () => {
    try {
      const token = localStorage.getItem("token");
      await axios.delete(`https://unicorninstititutelms.onrender.com/api/auth/expense/${deleteId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setExpenses(expenses.filter((exp) => exp._id !== deleteId));
      toast.success("Expense deleted successfully!");
    } catch (err) {
      toast.error("Failed to delete expense");
    } finally {
      setShowConfirmModal(false);
      setDeleteId(null);
    }
  };

  const supplierOptions = suppliers.map((s) => ({
    value: s._id,
    label: `${s.name} (${s.contact})`
  }));

  const symbol = localStorage.getItem("currencySymbol") || "$";

  return (
    <div className="container py-4">
      <h2 className="mb-4 text-primary fw-bold border-bottom pb-2">Record Supplier Expense</h2>

      {/* Expense Form */}
      <form onSubmit={handleSubmit} className="p-4 bg-white shadow-sm rounded border mb-5">
        <div className="row g-4">
          
          <div className="col-md-4">
            <label className="form-label fw-semibold">Date</label>
            <input
              type="date"
              name="date"
              value={formData.date}
              onChange={handleChange}
              className="form-control shadow-sm"
            />
          </div>

          <div className="col-md-4">
            <label className="form-label fw-semibold">Select Supplier *</label>
            <Select
              options={supplierOptions}
              value={formData.supplier}
              onChange={handleSupplierChange}
              placeholder="Search supplier..."
              isClearable
              isSearchable
              required
            />
          </div>

          <div className="col-md-4">
            <label className="form-label fw-semibold">Bill No *</label>
            <input
              type="text"
              name="billNo"
              value={formData.billNo}
              onChange={handleChange}
              placeholder="Enter Bill Number"
              className="form-control shadow-sm"
              required
            />
          </div>

          <div className="col-md-6">
            <label className="form-label fw-semibold">Amount ({symbol}) *</label>
            <input
              type="number"
              name="amount"
              value={formData.amount}
              onChange={handleChange}
              step="0.01"
              min="0"
              placeholder="e.g., 100"
              className="form-control shadow-sm"
              required
            />
          </div>

          <div className="col-md-6">
            <label className="form-label fw-semibold">Payment Method</label>
            <select
              name="paymentMethod"
              value={formData.paymentMethod}
              onChange={handleChange}
              className="form-select shadow-sm"
            >
              <option value="Cash">Cash</option>
              <option value="Credit Card">Credit Card</option>
              <option value="Debit Card">Debit Card</option>
              <option value="Bank Transfer">Bank Transfer</option>
              <option value="Cheque">Cheque</option>
              <option value="Other">Other</option>
            </select>
          </div>
          
          <div className="col-md-12">
            <label className="form-label fw-semibold">Description</label>
            <input
              type="text"
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="e.g., Raw materials"
              className="form-control shadow-sm"
            />
          </div>

          <div className="col-12 mt-3">
            <button type="submit" className="btn btn-success w-100 py-2 fs-5">
              {editingId ? "✏️ Update Expense" : "+ Add New Expense"}
            </button>
          </div>
        </div>
      </form>

      {/* Expenses Table */}
      <h4 className="mb-3 text-secondary">📋 Recent Expenses</h4>
      <div className="table-responsive shadow-sm rounded border">
        <table className="table table-bordered table-striped align-middle mb-0">
          <thead className="table-dark">
            <tr>
              <th>Date</th>
              <th>Bill No</th>
              <th>Supplier</th>
              <th>Description</th>
              <th>Amount</th>
              <th>Payment Method</th> 
              <th className="text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {expenses.length === 0 ? (
              <tr>
                <td colSpan="6" className="text-center text-muted py-4">
                  No expenses found
                </td>
              </tr>
            ) : (
              expenses.map((exp, idx) => (
                <tr key={idx}>
                  <td>{new Date(exp.date).toLocaleDateString()}</td>
                  <td><strong>{exp.billNo}</strong></td>
                  <td>{exp.supplier?.name || "Unknown"} ({exp.supplier?.contact || "-"})</td>
                  <td>{exp.description || "-"}</td>
                  <td>{symbol}{parseFloat(exp.amount).toFixed(2)}</td>
                  <td>{exp.paymentMethod || "Cash"}</td>
                  <td className="text-center">
                    <div className="d-flex gap-2 justify-content-center">
                      <button
                        className="btn btn-primary btn-sm"
                        onClick={() => openEditModal(exp)}
                        title="Edit Expense"
                      >
                        ✏️ Edit
                      </button>
                      <button
                        className="btn btn-danger btn-sm"
                        onClick={() => confirmDelete(exp._id)}
                        title="Delete Expense"
                      >
                        🗑️ Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Delete Confirmation Modal */}
      {showConfirmModal && (
        <div
          className="modal fade show d-block"
          tabIndex="-1"
          style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
        >
          <div className="modal-dialog modal-sm">
            <div className="modal-content shadow-lg rounded">
              <div className="modal-header bg-danger text-white">
                <h5 className="modal-title">Confirm Delete</h5>
                <button
                  type="button"
                  className="btn-close btn-close-white"
                  onClick={() => setShowConfirmModal(false)}
                ></button>
              </div>
              <div className="modal-body">
                <p>Are you sure you want to delete this expense?</p>
              </div>
              <div className="modal-footer">
                <button
                  className="btn btn-secondary"
                  onClick={() => setShowConfirmModal(false)}
                >
                  Cancel
                </button>
                <button className="btn btn-danger" onClick={handleDelete}>
                  Delete
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

export default ExpensePage;