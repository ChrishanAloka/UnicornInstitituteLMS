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
    parentComponent: ""
  });

  const [editingId, setEditingId] = useState(null);
  const [editData, setEditData] = useState({ ...newComp });

  useEffect(() => {
    fetchComponents();
    fetchParentComponents();
  }, []);

  const fetchComponents = async () => {
    try {
      const res = await axios.get("https://unicorninstititutelms.onrender.com/api/project/level3");
      setComponents(res.data);
    } catch (err) {
      toast.error("Failed to load Level 3 components");
    }
  };

  const fetchParentComponents = async () => {
    try {
      const res = await axios.get("https://unicorninstititutelms.onrender.com/api/project/level3/parents");
      setParentComponents(res.data);
    } catch (err) {
      toast.error("Failed to load Level 2 components");
    }
  };

  const handleChange = (e) =>
    setNewComp({ ...newComp, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    const { code, componentName, parentComponent } = newComp;
    if (!code || !componentName || !parentComponent) {
      toast.error("Code, Name, and Parent (Level 2) are required");
      return;
    }

    try {
      const token = localStorage.getItem("token");
      const res = await axios.post(
        "https://unicorninstititutelms.onrender.com/api/project/level3",
        newComp,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setComponents([res.data, ...components]);
      setNewComp({ code: "", componentName: "", componentDescription: "", parentComponent: "" });
      toast.success("Level 3 component added!");
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to add component");
    }
  };

  const openEdit = (comp) => {
    setEditingId(comp._id);
    setEditData({
      code: comp.code,
      componentName: comp.componentName,
      componentDescription: comp.componentDescription || "",
      parentComponent: comp.parentComponent._id
    });
  };

  const handleEditChange = (e) =>
    setEditData({ ...editData, [e.target.name]: e.target.value });

  const handleUpdate = async (e) => {
    e.preventDefault();
    const { code, componentName, parentComponent } = editData;
    if (!code || !componentName || !parentComponent) {
      toast.error("All required fields must be filled");
      return;
    }

    try {
      const token = localStorage.getItem("token");
      const res = await axios.put(
        `https://unicorninstititutelms.onrender.com/api/project/level3/${editingId}`,
        editData,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setComponents(components.map(c => c._id === editingId ? res.data : c));
      setEditingId(null);
      toast.success("Updated successfully!");
    } catch (err) {
      toast.error(err.response?.data?.error || "Update failed");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this Level 3 component? This cannot be undone.")) return;
    try {
      const token = localStorage.getItem("token");
      await axios.delete(`https://unicorninstititutelms.onrender.com/api/project/level3/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setComponents(components.filter(c => c._id !== id));
      toast.success("Deleted");
    } catch (err) {
      toast.error("Delete failed");
    }
  };

  const getParentLabel = (parent) => {
    if (!parent) return "—";
    return `${parent.code} - ${parent.componentName}`;
  };

  return (
    <div className="container py-4">
      <h2 className="mb-4 fw-bold text-warning border-bottom pb-2">
        Level 3 - Component Details
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
                  {p.code} - {p.componentName}
                </option>
              ))}
            </select>
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
            <button type="submit" className="btn btn-warning w-100 py-2 fs-5">
              + Add Level 3 Component
            </button>
          </div>
        </div>
      </form>

      {/* Edit Modal */}
      {editingId && (
        <div className="modal fade show d-block" style={{ backgroundColor: "rgba(0,0,0,0.5)" }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header bg-warning">
                <h5 className="modal-title">Edit Level 3 Component</h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setEditingId(null)}
                />
              </div>
              <div className="modal-body">
                <form onSubmit={handleUpdate}>
                  <div className="mb-3">
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
                    <select
                      name="parentComponent"
                      value={editData.parentComponent}
                      onChange={handleEditChange}
                      className="form-select"
                      required
                    >
                      <option value="">-- Select Level 2 --</option>
                      {parentComponents.map((p) => (
                        <option key={p._id} value={p._id}>
                          {p.code} - {p.componentName}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="mb-3">
                    <textarea
                      name="componentDescription"
                      value={editData.componentDescription}
                      onChange={handleEditChange}
                      rows="2"
                      className="form-control"
                    />
                  </div>
                  <div className="d-flex gap-2">
                    <button type="submit" className="btn btn-warning flex-grow-1">
                      Save Changes
                    </button>
                    <button
                      type="button"
                      className="btn btn-danger"
                      onClick={() => handleDelete(editingId)}
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

      {/* Table */}
      <div className="mt-4">
        <h4 className="mb-3 text-secondary">🧩 Level 3 Components</h4>
        <div className="table-responsive shadow-sm rounded border">
          <table className="table table-bordered table-striped">
            <thead className="table-dark">
              <tr>
                <th>Code</th>
                <th>Name</th>
                <th>Parent (Level 2)</th>
                <th>Description</th>
                <th className="text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {components.length === 0 ? (
                <tr>
                  <td colSpan="5" className="text-center py-4 text-muted">
                    No Level 3 components defined yet
                  </td>
                </tr>
              ) : (
                components.map((comp) => (
                  <tr key={comp._id}>
                    <td><code>{comp.code}</code></td>
                    <td>{comp.componentName}</td>
                    <td>{getParentLabel(comp.parentComponent)}</td>
                    <td>{comp.componentDescription || "—"}</td>
                    <td className="text-center">
                      <button
                        className="btn btn-sm btn-warning me-2"
                        onClick={() => openEdit(comp)}
                      >
                        ✏️ Edit
                      </button>
                      <button
                        className="btn btn-sm btn-danger"
                        onClick={() => handleDelete(comp._id)}
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

export default Level3ComponentDetails;