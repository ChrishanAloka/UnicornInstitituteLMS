// src/components/Level3ComponentDetails.jsx
import React, { useState, useEffect } from "react";
import axios from "axios";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const Level3ComponentDetails = () => {
  const [components, setComponents] = useState([]);
  const [parentComponents, setParentComponents] = useState([]); // Level 2
  const [newComp, setNewComp] = useState({
    code: "",
    componentName: "",
    componentDescription: "",
    parentComponent: "",
    estimatedAmount: ""
  });

  const [editingId, setEditingId] = useState(null);
  const [editData, setEditData] = useState({ ...newComp });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchComponents();
    fetchParentComponents();
  }, []);

  const fetchComponents = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get("https://unicorninstititutelms.onrender.com/api/auth/level3component", {
        headers: { Authorization: `Bearer ${token}` }
      });
      setComponents(res.data);
    } catch (err) {
      console.error("Failed to load Level 3 components:", err.message);
      toast.error("Failed to load Level 3 components");
    } finally {
      setLoading(false);
    }
  };

  const fetchParentComponents = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get("https://unicorninstititutelms.onrender.com/api/auth/level3component/parents", {
        headers: { Authorization: `Bearer ${token}` }
      });
      setParentComponents(res.data);
    } catch (err) {
      console.error("Failed to load Level 2 components:", err.message);
      toast.error("Failed to load Level 2 components");
    }
  };

  const getUsedAmount = (level2Id) => {
    return components
      .filter(comp => comp.parentComponent?._id === level2Id)
      .reduce((sum, comp) => sum + (Number(comp.estimatedAmount) || 0), 0);
  };

  const getRemainingAmount = (level2Id) => {
    const parent = parentComponents.find(p => p._id === level2Id);
    if (!parent) return 0;
    const used = getUsedAmount(level2Id);
    return Math.max(0, (Number(parent.estimatedAmount) || 0) - used);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setNewComp({ ...newComp, [name]: value });
    if (name === "parentComponent") {
      setNewComp(prev => ({ ...prev, estimatedAmount: "", [name]: value }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const { code, componentName, parentComponent, estimatedAmount } = newComp;

    if (!code || !componentName || !parentComponent) {
      toast.error("Component Code, Name, and Level 2 Component are required");
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
      const payload = { ...newComp, estimatedAmount: amount };
      const res = await axios.post(
        "https://unicorninstititutelms.onrender.com/api/auth/level3component",
        payload,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setComponents([res.data, ...components]);
      setNewComp({ code: "", componentName: "", componentDescription: "", parentComponent: "", estimatedAmount: "" });
      toast.success("Level 3 component added!");
    } catch (err) {
      console.error("Add failed:", err.response?.data || err.message);
      toast.error(err.response?.data?.error || "Failed to add component");
    } finally {
      setLoading(false);
    }
  };

  const openEdit = (comp) => {
    setEditingId(comp._id);
    setEditData({
      code: comp.code,
      componentName: comp.componentName,
      componentDescription: comp.componentDescription || "",
      parentComponent: comp.parentComponent?._id || "",
      estimatedAmount: comp.estimatedAmount || ""
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
      toast.error("All required fields must be filled");
      return;
    }

    const amount = Number(estimatedAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error("Valid Estimated Amount is required");
      return;
    }

    const currentComp = components.find(c => c._id === editingId);
    const currentAmount = currentComp ? Number(currentComp.estimatedAmount) : 0;
    const adjustedRemaining = getRemainingAmount(parentComponent) + currentAmount;

    if (amount > adjustedRemaining) {
      toast.error(`Amount exceeds available balance of $${adjustedRemaining.toFixed(2)}`);
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const payload = { ...editData, estimatedAmount: amount };
      const res = await axios.put(
        `https://unicorninstititutelms.onrender.com/api/auth/level3component/${editingId}`,
        payload,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setComponents(components.map(c => c._id === editingId ? res.data : c));
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
    if (!window.confirm("Delete this Level 3 component?")) return;
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      await axios.delete(`https://unicorninstititutelms.onrender.com/api/auth/level3component/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setComponents(components.filter(c => c._id !== id));
      if (editingId === id) setEditingId(null);
      toast.success("Deleted");
    } catch (err) {
      console.error("Delete failed:", err.response?.data || err.message);
      toast.error("Delete failed");
    } finally {
      setLoading(false);
    }
  };

  const getParentLabel = (parent) => {
    if (!parent) return "—";
    return `${parent.code} - ${parent.componentName}`;
  };

  const formatCurrency = (num) => {
    if (num == null || isNaN(num)) return "$0";
    const number = Math.abs(Number(num));
    const sign = num < 0 ? "-" : "";
    if (number >= 1_000_000_000) return `${sign}$${(number / 1_000_000_000).toFixed(2)}B`;
    if (number >= 1_000_000) return `${sign}$${(number / 1_000_000).toFixed(2)}M`;
    if (number >= 1_000) return `${sign}$${(number / 1_000).toFixed(2)}K`;
    return `${sign}$${number.toFixed(2)}`;
  };

  return (
    <div className="container py-4">
      <h2 className="mb-4 fw-bold text-warning border-bottom pb-2">
        Level 3 - Activity Details
      </h2>

      {/* Add Form */}
      <form onSubmit={handleSubmit} className="p-4 bg-white border rounded shadow-sm mb-5">
        <div className="row g-3">
          <div className="col-md-4">
            <label className="form-label fw-semibold">Component Code</label>
            <input
              type="text"
              name="code"
              value={newComp.code}
              onChange={handleChange}
              className="form-control"
              placeholder="e.g., C1.1.1 / C1.1.2"
              required
            />
          </div>
          <div className="col-md-8">
            <label className="form-label fw-semibold">Component Name</label>
            <input
              type="text"
              name="componentName"
              value={newComp.componentName}
              onChange={handleChange}
              className="form-control"
              required
            />
          </div>
          <div className="col-12">
            <label className="form-label fw-semibold">Parent Component (Level 2)</label>
            <select
              name="parentComponent"
              value={newComp.parentComponent}
              onChange={handleChange}
              className="form-select"
              required
            >
              <option value="">-- Select Level 2 Component --</option>
              {parentComponents.map((p) => (
                <option key={p._id} value={p._id}>
                  {p.code} - {p.componentName} ({formatCurrency(p.estimatedAmount)})
                </option>
              ))}
            </select>
          </div>
          {newComp.parentComponent && (
            <div className="col-12">
              <div className="alert alert-info small">
                <strong>Available Balance:</strong> {formatCurrency(getRemainingAmount(newComp.parentComponent))}
              </div>
            </div>
          )}
          <div className="col-md-4">
            <label className="form-label fw-semibold">Estimated Amount ($)</label>
            <input
              type="number"
              name="estimatedAmount"
              value={newComp.estimatedAmount}
              onChange={handleChange}
              className="form-control"
              min="0"
              step="any"
              required
            />
          </div>
          <div className="col-12 mt-3">
            <label className="form-label fw-semibold">Description</label>
            <textarea
              name="componentDescription"
              value={newComp.componentDescription}
              onChange={handleChange}
              rows="2"
              className="form-control"
            />
          </div>
          <div className="col-12 mt-3">
            <button
              type="submit"
              className="btn btn-warning w-100 py-2 fs-5"
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                  Loading Wait...
                </>
              ) : (
                "+ Add Activity"
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
              <div className="modal-header bg-warning text-white">
                <h5 className="modal-title">Edit Activity</h5>
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
                    <label className="form-label fw-semibold">Activity Name</label>
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
                    <label className="form-label fw-semibold">Level 2 Component</label>
                    <select
                      name="parentComponent"
                      value={editData.parentComponent}
                      onChange={handleEditChange}
                      className="form-select"
                      required
                    >
                      <option value="">-- Select Level 2 Component --</option>
                      {parentComponents.map((p) => (
                        <option key={p._id} value={p._id}>
                          {p.code} - {p.componentName} ({formatCurrency(p.estimatedAmount)})
                        </option>
                      ))}
                    </select>
                  </div>
                  {editData.parentComponent && (
                    <div className="mb-3">
                      <div className="alert alert-info small">
                        <strong>Available Balance:</strong>{" "}
                        {formatCurrency(
                          getRemainingAmount(editData.parentComponent) +
                          (components.find(c => c._id === editingId)?.estimatedAmount || 0)
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
                      className="btn btn-warning flex-grow-1"
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
        <h4 className="mb-3 text-secondary">🧩 Level 3 Activities</h4>
        <div className="table-responsive shadow-sm rounded border">
          <table className="table table-bordered table-striped align-middle mb-0">
            <thead className="table-dark">
              <tr>
                <th>Code</th>
                <th>Activity Name</th>
                <th>Level 2 Sub Component</th>
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
              ) : components.length === 0 ? (
                <tr>
                  <td colSpan="6" className="text-center py-4 text-muted">
                    No Level 3 components yet
                  </td>
                </tr>
              ) : (
                components.map((comp) => (
                  <tr key={comp._id}>
                    <td><code>{comp.code}</code></td>
                    <td>{comp.componentName}</td>
                    <td>{getParentLabel(comp.parentComponent)}</td>
                    <td>{comp.componentDescription || "—"}</td>
                    <td>{formatCurrency(comp.estimatedAmount)}</td>
                    <td className="text-center">
                      <div className="d-flex gap-1">
                        <button
                          className="btn btn-sm btn-warning me-2"
                          onClick={() => openEdit(comp)}
                          title="Edit Component"
                          disabled={loading}
                        >
                          ✏️ Edit
                        </button>
                        <button
                          className="btn btn-sm btn-danger"
                          onClick={() => handleDelete(comp._id)}
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

export default Level3ComponentDetails;