// src/components/Level5ActivityItemsDetails.jsx
import React, { useState, useEffect } from "react";
import axios from "axios";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const Level5ActivityItemsDetails = () => {
  const [items, setItems] = useState([]);
  const [parentItems, setParentItems] = useState([]); // Level 4
  const [newItem, setNewItem] = useState({
    code: "",
    itemName: "",
    itemDescription: "",
    parentItem: "",
    estimatedAmount: "",
    unit: "",
    parameter: "",
    institute: ""
  });

  const [editingId, setEditingId] = useState(null);
  const [editData, setEditData] = useState({ ...newItem });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchItems();
    fetchParentItems();
  }, []);

  const fetchItems = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get("https://unicorninstititutelms.onrender.com/api/auth/level5activityitem", {
        headers: { Authorization: `Bearer ${token}` }
      });
      setItems(res.data);
    } catch (err) {
      console.error("Failed to load Level 5 items:", err.message);
      toast.error("Failed to load Level 5 items");
    } finally {
      setLoading(false);
    }
  };

  const fetchParentItems = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get("https://unicorninstititutelms.onrender.com/api/auth/level5activityitem/parents", {
        headers: { Authorization: `Bearer ${token}` }
      });
      setParentItems(res.data);
    } catch (err) {
      console.error("Failed to load Level 4 parent items:", err.message);
      toast.error("Failed to load Level 4 activities");
    }
  };

  const getUsedAmount = (level4Id) => {
    return items
      .filter(item => item.parentItem?._id === level4Id)
      .reduce((sum, item) => sum + (Number(item.estimatedAmount) || 0), 0);
  };

  const getRemainingAmount = (level4Id) => {
    const parent = parentItems.find(p => p._id === level4Id);
    if (!parent) return 0;
    const used = getUsedAmount(level4Id);
    return Math.max(0, (Number(parent.estimatedAmount) || 0) - used);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setNewItem({ ...newItem, [name]: value });
    if (name === "parentItem") {
      setNewItem(prev => ({ ...prev, estimatedAmount: "", [name]: value }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const { code, itemName, parentItem, estimatedAmount } = newItem;

    if (!code || !itemName || !parentItem) {
      toast.error("Item Code, Name, and Level 4 Activity are required");
      return;
    }

    const amount = Number(estimatedAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error("Valid Estimated Amount is required");
      return;
    }

    const remaining = getRemainingAmount(parentItem);
    if (amount > remaining) {
      toast.error(`Amount exceeds remaining balance of $${remaining.toFixed(2)}`);
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const payload = { ...newItem, estimatedAmount: amount };
      const res = await axios.post(
        "https://unicorninstititutelms.onrender.com/api/auth/level5activityitem",
        payload,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setItems([res.data, ...items]);
      setNewItem({
        code: "",
        itemName: "",
        itemDescription: "",
        parentItem: "",
        estimatedAmount: "",
        unit: "",
        parameter: "",
        institute: ""
      });
      toast.success("Level 5 item added!");
    } catch (err) {
      console.error("Add failed:", err.response?.data || err.message);
      toast.error(err.response?.data?.error || "Failed to add item");
    } finally {
      setLoading(false);
    }
  };

  const openEdit = (item) => {
    setEditingId(item._id);
    setEditData({
      code: item.code,
      itemName: item.itemName,
      itemDescription: item.itemDescription || "",
      parentItem: item.parentItem?._id || "",
      estimatedAmount: item.estimatedAmount || "",
      unit: item.unit || "",
      parameter: item.parameter || "",
      institute: item.institute || ""
    });
  };

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditData({ ...editData, [name]: value });
    if (name === "parentItem") {
      setEditData(prev => ({ ...prev, estimatedAmount: "", [name]: value }));
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    const { code, itemName, parentItem, estimatedAmount } = editData;

    if (!code || !itemName || !parentItem) {
      toast.error("All required fields must be filled");
      return;
    }

    const amount = Number(estimatedAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error("Valid Estimated Amount is required");
      return;
    }

    const currentItem = items.find(i => i._id === editingId);
    const currentAmount = currentItem ? Number(currentItem.estimatedAmount) : 0;
    const adjustedRemaining = getRemainingAmount(parentItem) + currentAmount;

    if (amount > adjustedRemaining) {
      toast.error(`Amount exceeds available balance of $${adjustedRemaining.toFixed(2)}`);
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const payload = { ...editData, estimatedAmount: amount };
      const res = await axios.put(
        `https://unicorninstititutelms.onrender.com/api/auth/level5activityitem/${editingId}`,
        payload,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setItems(items.map(i => i._id === editingId ? res.data : i));
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
    if (!window.confirm("Delete this Level 5 item?")) return;
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      await axios.delete(`https://unicorninstititutelms.onrender.com/api/auth/level5activityitem/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setItems(items.filter(i => i._id !== id));
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
    return `${parent.code} - ${parent.activityName}`;
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
        Level 5 - Activity Items
      </h2>

      {/* Add Form */}
      <form onSubmit={handleSubmit} className="p-4 bg-white border rounded shadow-sm mb-5">
        <div className="row g-3">
          <div className="col-md-4">
            <label className="form-label fw-semibold">Item Code</label>
            <input
              type="text"
              name="code"
              value={newItem.code}
              onChange={handleChange}
              className="form-control"
              placeholder="e.g., C1.1.1.1.1"
              required
            />
          </div>
          <div className="col-md-8">
            <label className="form-label fw-semibold">Item Name</label>
            <input
              type="text"
              name="itemName"
              value={newItem.itemName}
              onChange={handleChange}
              className="form-control"
              required
            />
          </div>

          {/* New Fields */}
          <div className="col-md-4">
            <label className="form-label fw-semibold">Unit</label>
            <input
              type="text"
              name="unit"
              value={newItem.unit}
              onChange={handleChange}
              className="form-control"
              placeholder="e.g., kg, hour, unit"
            />
          </div>
          <div className="col-md-4">
            <label className="form-label fw-semibold">Parameter</label>
            <input
              type="text"
              name="parameter"
              value={newItem.parameter}
              onChange={handleChange}
              className="form-control"
              placeholder="e.g., Quantity, Volume"
            />
          </div>
          <div className="col-md-4">
            <label className="form-label fw-semibold">Institute</label>
            <input
              type="text"
              name="institute"
              value={newItem.institute}
              onChange={handleChange}
              className="form-control"
              placeholder="e.g., Ministry of Health"
            />
          </div>

          <div className="col-12">
            <label className="form-label fw-semibold">Parent Activity (Level 4)</label>
            <select
              name="parentItem"
              value={newItem.parentItem}
              onChange={handleChange}
              className="form-select"
              required
            >
              <option value="">-- Select Level 4 Activity --</option>
              {parentItems.map((p) => (
                <option key={p._id} value={p._id}>
                  {p.code} - {p.activityName} ({formatCurrency(p.estimatedAmount)})
                </option>
              ))}
            </select>
          </div>
          {newItem.parentItem && (
            <div className="col-12">
              <div className="alert alert-info small">
                <strong>Available Balance:</strong> {formatCurrency(getRemainingAmount(newItem.parentItem))}
              </div>
            </div>
          )}
          <div className="col-md-4">
            <label className="form-label fw-semibold">Estimated Amount ($)</label>
            <input
              type="number"
              name="estimatedAmount"
              value={newItem.estimatedAmount}
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
              name="itemDescription"
              value={newItem.itemDescription}
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
                "+ Add Item"
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
                <h5 className="modal-title">Edit Item</h5>
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
                    <label className="form-label fw-semibold">Item Code</label>
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
                    <label className="form-label fw-semibold">Item Name</label>
                    <input
                      type="text"
                      name="itemName"
                      value={editData.itemName}
                      onChange={handleEditChange}
                      className="form-control"
                      required
                    />
                  </div>

                  {/* New Fields in Edit */}
                  <div className="mb-3">
                    <label className="form-label fw-semibold">Unit</label>
                    <input
                      type="text"
                      name="unit"
                      value={editData.unit}
                      onChange={handleEditChange}
                      className="form-control"
                      placeholder="e.g., kg, hour"
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label fw-semibold">Parameter</label>
                    <input
                      type="text"
                      name="parameter"
                      value={editData.parameter}
                      onChange={handleEditChange}
                      className="form-control"
                      placeholder="e.g., Quantity"
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label fw-semibold">Institute</label>
                    <input
                      type="text"
                      name="institute"
                      value={editData.institute}
                      onChange={handleEditChange}
                      className="form-control"
                      placeholder="e.g., UNICEF"
                    />
                  </div>

                  <div className="mb-3">
                    <label className="form-label fw-semibold">Level 4 Activity</label>
                    <select
                      name="parentItem"
                      value={editData.parentItem}
                      onChange={handleEditChange}
                      className="form-select"
                      required
                    >
                      <option value="">-- Select Level 4 Activity --</option>
                      {parentItems.map((p) => (
                        <option key={p._id} value={p._id}>
                          {p.code} - {p.activityName} ({formatCurrency(p.estimatedAmount)})
                        </option>
                      ))}
                    </select>
                  </div>
                  {editData.parentItem && (
                    <div className="mb-3">
                      <div className="alert alert-info small">
                        <strong>Available Balance:</strong>{" "}
                        {formatCurrency(
                          getRemainingAmount(editData.parentItem) +
                          (items.find(i => i._id === editingId)?.estimatedAmount || 0)
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
                      name="itemDescription"
                      value={editData.itemDescription}
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
        <h4 className="mb-3 text-secondary">🧩 Level 5 Activity Items</h4>
        <div className="table-responsive shadow-sm rounded border">
          <table className="table table-bordered table-striped align-middle mb-0">
            <thead className="table-dark">
              <tr>
                <th>Code</th>
                <th>Item Name</th>
                <th>Unit</th>
                <th>Parameter</th>
                <th>Institute</th>
                <th>Level 4 Activity</th>
                <th>Description</th>
                <th>Est. Amount ($)</th>
                <th className="text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="9" className="text-center py-4 text-muted">
                    Loading Wait...
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan="9" className="text-center py-4 text-muted">
                    No Level 5 items yet
                  </td>
                </tr>
              ) : (
                items.map((item) => (
                  <tr key={item._id}>
                    <td><code>{item.code}</code></td>
                    <td>{item.itemName}</td>
                    <td>{item.unit || "—"}</td>
                    <td>{item.parameter || "—"}</td>
                    <td>{item.institute || "—"}</td>
                    <td>{getParentLabel(item.parentItem)}</td>
                    <td>{item.itemDescription || "—"}</td>
                    <td>{formatCurrency(item.estimatedAmount)}</td>
                    <td className="text-center">
                      <div className="d-flex gap-1">
                        <button
                          className="btn btn-sm btn-warning"
                          onClick={() => openEdit(item)}
                          title="Edit Item"
                          disabled={loading}
                        >
                          ✏️ Edit
                        </button>
                        <button
                          className="btn btn-sm btn-danger"
                          onClick={() => handleDelete(item._id)}
                          title="Delete Item"
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

export default Level5ActivityItemsDetails;