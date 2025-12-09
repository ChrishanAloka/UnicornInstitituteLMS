// src/components/Level2ComponentDetails.jsx
import React, { useState, useEffect } from "react";
import axios from "axios";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const Level2ComponentDetails = () => {
  const [subComponents, setSubComponents] = useState([]);
  const [parentComponents, setParentComponents] = useState([]);
  const [newSub, setNewSub] = useState({
    code: "",
    componentName: "",
    componentDescription: "",
    parentComponent: "",
    estimatedAmount: ""
  });

  const [editingId, setEditingId] = useState(null);
  const [editData, setEditData] = useState({ ...newSub });
  const [loading, setLoading] = useState(false);

  // Load data
  useEffect(() => {
    fetchSubComponents();
    fetchParentComponents();
  }, []);

  const fetchSubComponents = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get("https://unicorninstititutelms.onrender.com/api/auth/level2component",
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );                                    
      setSubComponents(res.data);
    } catch (err) {
      console.error("Failed to load Level 2 components:", err.message);
      toast.error("Failed to load Level 2 components");
    } finally {
      setLoading(false);
    }
  };

  const fetchParentComponents = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get("https://unicorninstititutelms.onrender.com/api/auth/level2component/parents",
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      setParentComponents(res.data);
    } catch (err) {
      console.error("Failed to load Level 1 components:", err.message);
      toast.error("Failed to load Level 1 components");
    }
  };

  // Helper: Calculate used amount for a Level1 component
  const getUsedAmount = (level1Id) => {
    return subComponents
      .filter(sub => sub.parentComponent?._id === level1Id)
      .reduce((sum, sub) => sum + (Number(sub.estimatedAmount) || 0), 0);
  };

  // Helper: Get remaining balance for a Level1 component
  const getRemainingAmount = (level1Id) => {
    const parent = parentComponents.find(p => p._id === level1Id);
    if (!parent) return 0;
    const used = getUsedAmount(level1Id);
    return Math.max(0, (Number(parent.estimatedAmount) || 0) - used);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setNewSub({ ...newSub, [name]: value });

    // If parent changes, reset estimatedAmount to avoid invalid value
    if (name === "parentComponent") {
      setNewSub(prev => ({ ...prev, estimatedAmount: "", [name]: value }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const { code, componentName, parentComponent, estimatedAmount } = newSub;

    if (!code || !componentName || !parentComponent) {
      toast.error("Component Code, Name, and Level 1 Component are required");
      return;
    }

    const amount = Number(estimatedAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error("Valid Estimated Amount is required");
      return;
    }

    const remaining = getRemainingAmount(parentComponent);
    if (amount > remaining) {
      toast.error(`Amount exceeds remaining balance of $${remaining.toFixed(2)}`);
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const payload = {
        ...newSub,
        estimatedAmount: amount
      };
      const res = await axios.post(
        "https://unicorninstititutelms.onrender.com/api/auth/level2component",
        payload,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setSubComponents([res.data, ...subComponents]);
      setNewSub({ code: "", componentName: "", componentDescription: "", parentComponent: "", estimatedAmount: "" });
      toast.success("Level 2 component added!");
    } catch (err) {
      console.error("Add failed:", err.response?.data || err.message);
      toast.error(err.response?.data?.error || "Failed to add component");
    } finally {
      setLoading(false);
    }
  };

  const openEdit = (sub) => {
    setEditingId(sub._id);
    setEditData({
      code: sub.code,
      componentName: sub.componentName,
      componentDescription: sub.componentDescription || "",
      parentComponent: sub.parentComponent?._id || "",
      estimatedAmount: sub.estimatedAmount || ""
    });
  };

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditData({ ...editData, [name]: value });

    if (name === "parentComponent") {
      setEditData(prev => ({ ...prev, estimatedAmount: "", [name]: value }));
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    const { code, componentName, parentComponent, estimatedAmount } = editData;

    if (!code || !componentName || !parentComponent) {
      toast.error("Component Code, Name, and Level 1 Component are required");
      return;
    }

    const amount = Number(estimatedAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error("Valid Estimated Amount is required");
      return;
    }

    const remaining = getRemainingAmount(parentComponent);
    // If editing, subtract the current amount from used total
    const currentSub = subComponents.find(s => s._id === editingId);
    const currentAmount = currentSub ? Number(currentSub.estimatedAmount) : 0;
    const adjustedRemaining = remaining + currentAmount; // Add back current allocation

    if (amount > adjustedRemaining) {
      toast.error(`Amount exceeds remaining balance of $${adjustedRemaining.toFixed(2)}`);
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const payload = {
        ...editData,
        estimatedAmount: amount
      };
      const res = await axios.put(
        `https://unicorninstititutelms.onrender.com/api/auth/level2component/${editingId}`,
        payload,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setSubComponents(subComponents.map(s => s._id === editingId ? res.data : s));
      setEditingId(null);
      toast.success("Updated!");
    } catch (err) {
      console.error("Update failed:", err.response?.data || err.message);
      toast.error(err.response?.data?.error || "Update failed");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this Level 2 component?")) return;

    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      await axios.delete(`https://unicorninstititutelms.onrender.com/api/auth/level2component/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSubComponents(subComponents.filter(s => s._id !== id));
      if (editingId === id) setEditingId(null);
      toast.success("Deleted");
    } catch (err) {
      console.error("Delete failed:", err.response?.data || err.message);
      toast.error("Delete failed");
    } finally {
      setLoading(false);
    }
  };

  const getLevel1Label = (parent) => {
    if (!parent) return "—";
    return `${parent.code} - ${parent.componentName}`;
  };

  // Format currency helper
  // const formatCurrency = (num) => {
  //   if (num == null || isNaN(num)) return "$0.00";
  //   return `$${Number(num).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  // };

  const formatCurrency = (num) => {
    if (num == null || isNaN(num)) return "$0";

    const number = Math.abs(Number(num));
    const sign = num < 0 ? "-" : "";

    if (number >= 1_000_000_000) {
      return `${sign}$${(number / 1_000_000_000).toFixed(2)}B`;
    }
    if (number >= 1_000_000) {
      return `${sign}$${(number / 1_000_000).toFixed(2)}M`;
    }
    if (number >= 1_000) {
      return `${sign}$${(number / 1_000).toFixed(2)}K`;
    }
    return `${sign}$${number.toFixed(2)}`;
  };

  return (
    <div className="container py-4">
      <h2 className="mb-4 fw-bold text-info border-bottom pb-2">
        Level 2 - Sub Component Details
      </h2>

      {/* Add Form */}
      <form onSubmit={handleSubmit} className="p-4 bg-white border rounded shadow-sm mb-5">
        <div className="row g-3">
          <div className="col-md-4">
            <label className="form-label fw-semibold">Component Code</label>
            <input
              type="text"
              name="code"
              value={newSub.code}
              onChange={handleChange}
              className="form-control"
              placeholder="e.g., C1.1"
              required
            />
          </div>
          <div className="col-md-8">
            <label className="form-label fw-semibold">Component Name</label>
            <input
              type="text"
              name="componentName"
              value={newSub.componentName}
              onChange={handleChange}
              className="form-control"
              placeholder="e.g., Concrete Slab"
              required
            />
          </div>
          <div className="col-12">
            <label className="form-label fw-semibold">Level 1 Component</label>
            <select
              name="parentComponent"
              value={newSub.parentComponent}
              onChange={handleChange}
              className="form-select"
              required
            >
              <option value="">-- Select Level 1 Component --</option>
              {parentComponents.map((p) => (
                <option key={p._id} value={p._id}>
                  {p.code} - {p.componentName} ({formatCurrency(p.estimatedAmount)})
                </option>
              ))}
            </select>
          </div>
          {/* Display Remaining Balance */}
          {newSub.parentComponent && (
            <div className="col-12">
              <div className="alert alert-info small">
                <strong>Available Balance:</strong> {formatCurrency(getRemainingAmount(newSub.parentComponent))}
              </div>
            </div>
          )}
          <div className="col-md-6">
            <label className="form-label fw-semibold">Estimated Amount ($)</label>
            <input
              type="number"
              name="estimatedAmount"
              value={newSub.estimatedAmount}
              onChange={handleChange}
              className="form-control"
              min="0"
              step="any"
              placeholder="e.g., 2500.50"
              required
            />
          </div>
          <div className="col-12 mt-3">
            <label className="form-label fw-semibold">Description</label>
            <textarea
              name="componentDescription"
              value={newSub.componentDescription}
              onChange={handleChange}
              rows="2"
              placeholder="Brief description..."
              className="form-control"
            />
          </div>
          <div className="col-12 mt-3">
            <button
              type="submit"
              className="btn btn-info w-100 py-2 fs-5"
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                  Loading Wait...
                </>
              ) : (
                "+ Add Sub Component"
              )}
            </button>
          </div>
        </div>
      </form>

      {/* Edit Modal */}
      {editingId && (
        <div
          className="modal fade show d-block"
          tabIndex="-1"
          style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
        >
          <div className="modal-dialog">
            <div className="modal-content rounded shadow">
              <div className="modal-header bg-info text-white">
                <h5 className="modal-title">Edit Level 2 Sub-Component</h5>
                <button
                  type="button"
                  className="btn-close btn-close-white"
                  onClick={() => setEditingId(null)}
                  disabled={loading}
                />
              </div>
              <div className="modal-body">
                <form onSubmit={handleUpdate}>
                  <div className="mb-3">
                    <label className="form-label fw-semibold">Component Code</label>
                    <input
                      type="text"
                      name="code"
                      value={editData.code}
                      onChange={handleEditChange}
                      className="form-control"
                      required
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label fw-semibold">Component Name</label>
                    <input
                      type="text"
                      name="componentName"
                      value={editData.componentName}
                      onChange={handleEditChange}
                      className="form-control"
                      required
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label fw-semibold">Level 1 Component</label>
                    <select
                      name="parentComponent"
                      value={editData.parentComponent}
                      onChange={handleEditChange}
                      className="form-select"
                      required
                    >
                      <option value="">-- Select Level 1 Component --</option>
                      {parentComponents.map((p) => (
                        <option key={p._id} value={p._id}>
                          {p.code} - {p.componentName} ({formatCurrency(p.estimatedAmount)})
                        </option>
                      ))}
                    </select>
                  </div>
                  {/* Remaining Balance in Modal */}
                  {editData.parentComponent && (
                    <div className="mb-3">
                      <div className="alert alert-info small">
                        <strong>Available Balance:</strong>{" "}
                        {formatCurrency(
                          getRemainingAmount(editData.parentComponent) +
                            (subComponents.find(s => s._id === editingId)?.estimatedAmount || 0)
                        )}
                      </div>
                    </div>
                  )}
                  <div className="mb-3">
                    <label className="form-label fw-semibold">Estimated Amount ($)</label>
                    <input
                      type="number"
                      name="estimatedAmount"
                      value={editData.estimatedAmount}
                      onChange={handleEditChange}
                      className="form-control"
                      min="0"
                      step="any"
                      required
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label fw-semibold">Description</label>
                    <textarea
                      name="componentDescription"
                      value={editData.componentDescription}
                      onChange={handleEditChange}
                      rows="2"
                      className="form-control"
                    />
                  </div>
                  <div className="d-flex gap-2">
                    <button
                      type="submit"
                      className="btn btn-info flex-grow-1"
                      disabled={loading}
                    >
                      {loading ? (
                        <>
                          <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                          Saving...
                        </>
                      ) : (
                        "Save Changes"
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="mt-4">
        <h4 className="mb-3 text-secondary">🧩 Level 2 Sub-Components</h4>
        <div className="table-responsive shadow-sm rounded border">
          <table className="table table-bordered table-striped align-middle mb-0">
            <thead className="table-dark">
              <tr>
                <th>Code</th>
                <th>Sub-Component Name</th>
                <th>Level 1 Component</th>
                <th>Description</th>
                <th>Est. Amount ($)</th>
                <th className="text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="6" className="text-center py-4 text-muted">
                    Loading Wait...
                  </td>
                </tr>
              ) : subComponents.length === 0 ? (
                <tr>
                  <td colSpan="6" className="text-center py-4 text-muted">
                    No Level 2 components yet
                  </td>
                </tr>
              ) : (
                subComponents.map((sub) => (
                  <tr key={sub._id}>
                    <td><code>{sub.code}</code></td>
                    <td>{sub.componentName}</td>
                    <td>{getLevel1Label(sub.parentComponent)}</td>
                    <td>{sub.componentDescription || "—"}</td>
                    <td>{formatCurrency(sub.estimatedAmount)}</td>
                    <td className="text-center">
                      <div className="d-flex gap-1">
                        <button
                          className="btn btn-sm btn-info me-2"
                          onClick={() => openEdit(sub)}
                          title="Edit Component"
                          disabled={loading}
                        >
                          ✏️ Edit
                        </button>
                        <button
                          className="btn btn-sm btn-danger"
                          onClick={() => handleDelete(sub._id)}
                          title="Delete Component"
                          disabled={loading}
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
      </div>

      <ToastContainer />
    </div>
  );
};

export default Level2ComponentDetails;