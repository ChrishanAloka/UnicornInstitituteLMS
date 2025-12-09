// src/components/Level4SubActivityDetails.jsx
import React, { useState, useEffect } from "react";
import axios from "axios";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const Level4SubActivityDetails = () => {
  const [activities, setActivities] = useState([]);
  const [parentActivities, setParentActivities] = useState([]); // Level 3
  const [newActivity, setNewActivity] = useState({
    code: "",
    activityName: "",
    activityDescription: "",
    parentActivity: "",
    estimatedAmount: ""
  });

  const [editingId, setEditingId] = useState(null);
  const [editData, setEditData] = useState({ ...newActivity });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchActivities();
    fetchParentActivities();
  }, []);

  const fetchActivities = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get("https://unicorninstititutelms.onrender.com/api/auth/level4activity", {
        headers: { Authorization: `Bearer ${token}` }
      });
      setActivities(res.data);
    } catch (err) {
      console.error("Failed to load Level 4 activities:", err.message);
      toast.error("Failed to load Level 4 activities");
    } finally {
      setLoading(false);
    }
  };

  const fetchParentActivities = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get("https://unicorninstititutelms.onrender.com/api/auth/level4activity/parents", {
        headers: { Authorization: `Bearer ${token}` }
      });
      setParentActivities(res.data);
    } catch (err) {
      console.error("Failed to load Level 3 parent activities:", err.message);
      toast.error("Failed to load Level 3 activities");
    }
  };

  const getUsedAmount = (level3Id) => {
    return activities
      .filter(act => act.parentActivity?._id === level3Id)
      .reduce((sum, act) => sum + (Number(act.estimatedAmount) || 0), 0);
  };

  const getRemainingAmount = (level3Id) => {
    const parent = parentActivities.find(p => p._id === level3Id);
    if (!parent) return 0;
    const used = getUsedAmount(level3Id);
    return Math.max(0, (Number(parent.estimatedAmount) || 0) - used);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setNewActivity({ ...newActivity, [name]: value });
    if (name === "parentActivity") {
      setNewActivity(prev => ({ ...prev, estimatedAmount: "", [name]: value }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const { code, activityName, parentActivity, estimatedAmount } = newActivity;

    if (!code || !activityName || !parentActivity) {
      toast.error("Activity Code, Name, and Level 3 Activity are required");
      return;
    }

    const amount = Number(estimatedAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error("Valid Estimated Amount is required");
      return;
    }

    const remaining = getRemainingAmount(parentActivity);
    if (amount > remaining) {
      toast.error(`Amount exceeds remaining balance of $${remaining.toFixed(2)}`);
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const payload = { ...newActivity, estimatedAmount: amount };
      const res = await axios.post(
        "https://unicorninstititutelms.onrender.com/api/auth/level4activity",
        payload,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setActivities([res.data, ...activities]);
      setNewActivity({
        code: "",
        activityName: "",
        activityDescription: "",
        parentActivity: "",
        estimatedAmount: ""
      });
      toast.success("Level 4 sub-activity added!");
    } catch (err) {
      console.error("Add failed:", err.response?.data || err.message);
      toast.error(err.response?.data?.error || "Failed to add sub-activity");
    } finally {
      setLoading(false);
    }
  };

  const openEdit = (act) => {
    setEditingId(act._id);
    setEditData({
      code: act.code,
      activityName: act.activityName,
      activityDescription: act.activityDescription || "",
      parentActivity: act.parentActivity?._id || "",
      estimatedAmount: act.estimatedAmount || ""
    });
  };

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditData({ ...editData, [name]: value });
    if (name === "parentActivity") {
      setEditData(prev => ({ ...prev, estimatedAmount: "", [name]: value }));
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    const { code, activityName, parentActivity, estimatedAmount } = editData;

    if (!code || !activityName || !parentActivity) {
      toast.error("All required fields must be filled");
      return;
    }

    const amount = Number(estimatedAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error("Valid Estimated Amount is required");
      return;
    }

    const currentAct = activities.find(a => a._id === editingId);
    const currentAmount = currentAct ? Number(currentAct.estimatedAmount) : 0;
    const adjustedRemaining = getRemainingAmount(parentActivity) + currentAmount;

    if (amount > adjustedRemaining) {
      toast.error(`Amount exceeds available balance of $${adjustedRemaining.toFixed(2)}`);
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const payload = { ...editData, estimatedAmount: amount };
      const res = await axios.put(
        `https://unicorninstititutelms.onrender.com/api/auth/level4activity/${editingId}`,
        payload,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setActivities(activities.map(a => a._id === editingId ? res.data : a));
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
    if (!window.confirm("Delete this Level 4 sub-activity?")) return;
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      await axios.delete(`https://unicorninstititutelms.onrender.com/api/auth/level4activity/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setActivities(activities.filter(a => a._id !== id));
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
        Level 4 - Sub-Activity Details
      </h2>

      {/* Add Form */}
      <form onSubmit={handleSubmit} className="p-4 bg-white border rounded shadow-sm mb-5">
        <div className="row g-3">
          <div className="col-md-4">
            <label className="form-label fw-semibold">Activity Code</label>
            <input
              type="text"
              name="code"
              value={newActivity.code}
              onChange={handleChange}
              className="form-control"
              placeholder="e.g., C1.1.1.1 / C1.1.1.2"
              required
            />
          </div>
          <div className="col-md-8">
            <label className="form-label fw-semibold">Sub-Activity Name</label>
            <input
              type="text"
              name="activityName"
              value={newActivity.activityName}
              onChange={handleChange}
              className="form-control"
              required
            />
          </div>
          <div className="col-12">
            <label className="form-label fw-semibold">Parent Activity (Level 3)</label>
            <select
              name="parentActivity"
              value={newActivity.parentActivity}
              onChange={handleChange}
              className="form-select"
              required
            >
              <option value="">-- Select Level 3 Activity --</option>
              {parentActivities.map((p) => (
                <option key={p._id} value={p._id}>
                  {p.code} - {p.componentName} ({formatCurrency(p.estimatedAmount)})
                </option>
              ))}
            </select>
          </div>
          {newActivity.parentActivity && (
            <div className="col-12">
              <div className="alert alert-info small">
                <strong>Available Balance:</strong> {formatCurrency(getRemainingAmount(newActivity.parentActivity))}
              </div>
            </div>
          )}
          <div className="col-md-4">
            <label className="form-label fw-semibold">Estimated Amount ($)</label>
            <input
              type="number"
              name="estimatedAmount"
              value={newActivity.estimatedAmount}
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
              name="activityDescription"
              value={newActivity.activityDescription}
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
                "+ Add Sub-Activity"
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
                <h5 className="modal-title">Edit Sub-Activity</h5>
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
                    <label className="form-label fw-semibold">Activity Code</label>
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
                    <label className="form-label fw-semibold">Sub-Activity Name</label>
                    <input
                      type="text"
                      name="activityName"
                      value={editData.activityName}
                      onChange={handleEditChange}
                      className="form-control"
                      required
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label fw-semibold">Level 3 Activity</label>
                    <select
                      name="parentActivity"
                      value={editData.parentActivity}
                      onChange={handleEditChange}
                      className="form-select"
                      required
                    >
                      <option value="">-- Select Level 3 Activity --</option>
                      {parentActivities.map((p) => (
                        <option key={p._id} value={p._id}>
                          {p.code} - {p.componentName} ({formatCurrency(p.estimatedAmount)})
                        </option>
                      ))}
                    </select>
                  </div>
                  {editData.parentActivity && (
                    <div className="mb-3">
                      <div className="alert alert-info small">
                        <strong>Available Balance:</strong>{" "}
                        {formatCurrency(
                          getRemainingAmount(editData.parentActivity) +
                          (activities.find(a => a._id === editingId)?.estimatedAmount || 0)
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
                      name="activityDescription"
                      value={editData.activityDescription}
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
        <h4 className="mb-3 text-secondary">🧩 Level 4 Sub-Activities</h4>
        <div className="table-responsive shadow-sm rounded border">
          <table className="table table-bordered table-striped align-middle mb-0">
            <thead className="table-dark">
              <tr>
                <th>Code</th>
                <th>Sub-Activity Name</th>
                <th>Level 3 Activity</th>
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
              ) : activities.length === 0 ? (
                <tr>
                  <td colSpan="6" className="text-center py-4 text-muted">
                    No Level 4 sub-activities yet
                  </td>
                </tr>
              ) : (
                activities.map((act) => (
                  <tr key={act._id}>
                    <td><code>{act.code}</code></td>
                    <td>{act.activityName}</td>
                    <td>{getParentLabel(act.parentActivity)}</td>
                    <td>{act.activityDescription || "—"}</td>
                    <td>{formatCurrency(act.estimatedAmount)}</td>
                    <td className="text-center">
                      <div className="d-flex gap-1">
                        <button
                          className="btn btn-sm btn-warning"
                          onClick={() => openEdit(act)}
                          title="Edit Sub-Activity"
                          disabled={loading}
                        >
                          ✏️ Edit
                        </button>
                        <button
                          className="btn btn-sm btn-danger"
                          onClick={() => handleDelete(act._id)}
                          title="Delete Sub-Activity"
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

export default Level4SubActivityDetails;