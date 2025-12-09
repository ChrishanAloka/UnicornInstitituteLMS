// src/components/ComponentDetails.jsx
import React, { useState, useEffect } from "react";
import axios from "axios";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const ComponentDetails = () => {
  const [components, setComponents] = useState([]);
  const [newComponent, setNewComponent] = useState({
    code: "",
    componentName: "",
    componentDescription: "",
    estimatedAmount: ""
  });

  const [editingComponent, setEditingComponent] = useState(null);
  const [editData, setEditData] = useState({ ...newComponent });
  const [loading, setLoading] = useState(false); // ✅ Global loading state

  // Load all components on mount
  useEffect(() => {
    fetchComponents();
  }, []);

  const fetchComponents = async () => {
    const token = localStorage.getItem("token");
    setLoading(true);
    try {
      const res = await axios.get("https://unicorninstititutelms.onrender.com/api/auth/level1component", {
        headers: { Authorization: `Bearer ${token}` }
      });
      setComponents(res.data);
    } catch (err) {
      console.error("Failed to load components:", err.message);
      toast.error("Failed to load component records");
    } finally {
      setLoading(false); // ✅ Stop loading
    }
  };

  const handleChange = (e) =>
    setNewComponent({ ...newComponent, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();

    const { code, componentName } = newComponent;
    if (!code || !componentName) {
      toast.error("Component Code and Name are required");
      return;
    }

    setLoading(true); // ✅ Start loading
    try {
      const token = localStorage.getItem("token");
      const res = await axios.post(
        "https://unicorninstititutelms.onrender.com/api/auth/level1component",
        {
          ...newComponent,
          estimatedAmount: newComponent.estimatedAmount ? Number(newComponent.estimatedAmount) : 0
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      setComponents([res.data, ...components]);
      setNewComponent({ code: "", componentName: "", componentDescription: "", estimatedAmount: "" });
      toast.success("Component added successfully!");
    } catch (err) {
      console.error("Add failed:", err.response?.data || err.message);
      toast.error("Failed to add component");
    } finally {
      setLoading(false); // ✅ Stop loading
    }
  };

  const openEditModal = (component) => {
    setEditingComponent(component._id);
    setEditData({
      code: component.code,
      componentName: component.componentName,
      componentDescription: component.componentDescription || "",
      estimatedAmount: component.estimatedAmount || ""
    });
  };

  const handleEditChange = (e) =>
    setEditData({ ...editData, [e.target.name]: e.target.value });

  const handleUpdate = async (e) => {
    e.preventDefault();

    const { code, componentName } = editData;
    if (!code || !componentName) {
      toast.error("Component Code and Name are required");
      return;
    }

    setLoading(true); // ✅ Start loading
    try {
      const token = localStorage.getItem("token");
      const res = await axios.put(
        `https://unicorninstititutelms.onrender.com/api/auth/level1component/${editingComponent}`,
        {
          ...editData,
          estimatedAmount: editData.estimatedAmount ? Number(editData.estimatedAmount) : 0
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      setComponents(
        components.map((c) => (c._id === editingComponent ? res.data : c))
      );
      setEditingComponent(null);
      toast.success("Component updated!");
    } catch (err) {
      console.error("Update failed:", err.response?.data || err.message);
      toast.error("Failed to update component");
    } finally {
      setLoading(false); // ✅ Stop loading
    }
  };

  const handleDelete = async (id) => {
    const confirmDelete = window.confirm("Are you sure you want to delete this component?");
    if (!confirmDelete) return;

    setLoading(true); // ✅ Start loading
    try {
      const token = localStorage.getItem("token");
      await axios.delete(`https://unicorninstititutelms.onrender.com/api/auth/level1component/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setComponents(components.filter((c) => c._id !== id));
      setEditingComponent(null); // In case modal is open
      toast.success("Component deleted");
    } catch (err) {
      console.error("Delete failed:", err.response?.data || err.message);
      toast.error("Failed to delete component");
    } finally {
      setLoading(false); // ✅ Stop loading
    }
  };

  // Helper: format currency
  // const formatAmount = (amount) => {
  //   return amount ? `$${Number(amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "$0.00";
  // };

  // Helper to format numbers as K, M, B
  const formatNumber = (num) => {
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
      <h2 className="mb-4 fw-bold text-primary border-bottom pb-2">
        Level 1 - Component Details
      </h2>

      {/* Add Component Form */}
      <form onSubmit={handleSubmit} className="p-4 bg-white border rounded shadow-sm mb-5">
        <div className="row g-3">
          <div className="col-md-4">
            <label className="form-label fw-semibold">Component Code</label>
            <input
              type="text"
              name="code"
              value={newComponent.code}
              onChange={handleChange}
              placeholder="e.g., C1"
              className="form-control"
              required
            />
          </div>
          <div className="col-md-8">
            <label className="form-label fw-semibold">Component Name</label>
            <input
              type="text"
              name="componentName"
              value={newComponent.componentName}
              onChange={handleChange}
              placeholder="e.g., Foundation Slab"
              className="form-control"
              required
            />
          </div>
          <div className="col-md-4">
            <label className="form-label fw-semibold">Estimated Amount ($)</label>
            <input
              type="number"
              name="estimatedAmount"
              value={newComponent.estimatedAmount}
              onChange={handleChange}
              placeholder="e.g., 5000"
              className="form-control"
              min="0"
              step="any"
            />
          </div>
          <div className="col-12 mt-3">
            <label className="form-label fw-semibold">Description</label>
            <textarea
              name="componentDescription"
              value={newComponent.componentDescription}
              onChange={handleChange}
              rows="2"
              placeholder="Brief description of the component..."
              className="form-control"
            />
          </div>
          <div className="col-12 mt-3">
            <button
              type="submit"
              className="btn btn-primary w-100 py-2 fs-5"
              disabled={loading} // ✅ Disable when loading
            >
              {loading ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                  Loading Wait...
                </>
              ) : (
                "+ Add Component"
              )}
            </button>
          </div>
        </div>
      </form>

      {/* Edit Modal */}
      {editingComponent && (
        <div
          className="modal fade show d-block"
          tabIndex="-1"
          style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
        >
          <div className="modal-dialog">
            <div className="modal-content rounded shadow">
              <div className="modal-header bg-primary text-white">
                <h5 className="modal-title">Edit Component</h5>
                <button
                  type="button"
                  className="btn-close btn-close-white"
                  onClick={() => setEditingComponent(null)}
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
                    <label className="form-label fw-semibold">Estimated Amount ($)</label>
                    <input
                      type="number"
                      name="estimatedAmount"
                      value={editData.estimatedAmount}
                      onChange={handleEditChange}
                      className="form-control"
                      min="0"
                      step="any"
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
                      className="btn btn-primary w-100"
                      disabled={loading}
                    >
                      {loading ? (
                        <>
                          <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                          Loading Wait...
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

      {/* Components Table */}
      <div className="mt-4">
        <h4 className="mb-3 text-secondary">🧩 Component Registry</h4>
        <div className="table-responsive shadow-sm rounded border">
          <table className="table table-bordered table-striped align-middle mb-0">
            <thead className="table-dark">
              <tr>
                <th>Code</th>
                <th>Component Name</th>
                <th>Description</th>
                <th>Est. Amount ($)</th>
                <th className="text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="5" className="text-center text-muted py-4">
                    Loading Wait...
                  </td>
                </tr>
              ) : components.length === 0 ? (
                <tr>
                  <td colSpan="5" className="text-center text-muted py-4">
                    No components defined yet
                  </td>
                </tr>
              ) : (
                components.map((comp) => (
                  <tr key={comp._id}>
                    <td><code>{comp.code}</code></td>
                    <td>{comp.componentName}</td>
                    <td>{comp.componentDescription || "—"}</td>
                    <td>{formatNumber(comp.estimatedAmount)}</td>
                    <td className="text-center">
                      <div className="d-flex gap-1">
                        <button
                          className="btn btn-sm btn-primary me-2"
                          onClick={() => openEditModal(comp)}
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

export default ComponentDetails;