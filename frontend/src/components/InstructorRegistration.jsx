// src/components/InstructorRegistration.jsx
import React, { useState, useEffect } from "react";
import axios from "axios";
import { ToastContainer, toast } from "react-toastify";

const InstructorRegistration = () => {
  const [instructors, setInstructors] = useState([]);
  const [newInstructor, setNewInstructor] = useState({
    name: "",
    phoneNo: "",
    address: ""
  });
  const [editingInstructor, setEditingInstructor] = useState(null);
  const [editData, setEditData] = useState({ ...newInstructor });

  useEffect(() => {
    fetchInstructors();
  }, []);

  const fetchInstructors = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get("http://localhost:5000/api/auth/instructor", {
        headers: { Authorization: `Bearer ${token}` }
      });
      setInstructors(res.data);
    } catch (err) {
      toast.error("Failed to load instructors");
    }
  };

  const handleChange = (e) =>
    setNewInstructor({ ...newInstructor, [e.target.name]: e.target.value });

  const handleCreate = async (e) => {
    e.preventDefault();
    const { name, phoneNo } = newInstructor;
    if (!name || !phoneNo) {
      toast.error("Name and Phone No are required");
      return;
    }

    try {
      const token = localStorage.getItem("token");
      const res = await axios.post(
        "http://localhost:5000/api/auth/instructor/register",
        newInstructor,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setInstructors([...instructors, res.data]);
      setNewInstructor({ name: "", phoneNo: "", address: "" });
      toast.success("Instructor registered!");
    } catch (err) {
      const msg = err.response?.data?.error || "Registration failed";
      toast.error(msg);
    }
  };

  const openEditModal = (ins) => {
    setEditingInstructor(ins._id);
    setEditData({
      name: ins.name,
      phoneNo: ins.phoneNo,
      address: ins.address || ""
    });
  };

  const handleEditChange = (e) =>
    setEditData({ ...editData, [e.target.name]: e.target.value });

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!editData.name || !editData.phoneNo) {
      toast.error("Name and Phone No are required");
      return;
    }

    try {
      const token = localStorage.getItem("token");
      const res = await axios.put(
        `http://localhost:5000/api/auth/instructor/${editingInstructor}`,
        editData,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setInstructors(instructors.map(i => i._id === editingInstructor ? res.data : i));
      setEditingInstructor(null);
      toast.success("Instructor updated!");
    } catch (err) {
      toast.error("Update failed");
    }
  };

  const handleDelete = (id) => {
    if (!window.confirm("Delete instructor?")) return;
    axios
      .delete(`http://localhost:5000/api/auth/instructor/${id}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
      })
      .then(() => {
        setInstructors(instructors.filter(i => i._id !== id));
        toast.success("Instructor deleted!");
      })
      .catch(() => toast.error("Delete failed"));
  };

  return (
    <div className="container py-4">
      <h2 className="mb-4 text-primary fw-bold border-bottom pb-2">Register Instructor</h2>

      <form onSubmit={handleCreate} className="p-4 bg-body shadow-sm rounded border mb-5">
        <div className="row g-4">
          <div className="col-md-6">
            <label className="form-label fw-semibold">Instructor Name *</label>
            <input
              type="text"
              name="name"
              value={newInstructor.name}
              onChange={handleChange}
              className="form-control shadow-sm"
              required
            />
          </div>
          <div className="col-md-6">
            <label className="form-label fw-semibold">Phone No *</label>
            <input
              type="text"
              name="phoneNo"
              value={newInstructor.phoneNo}
              onChange={handleChange}
              className="form-control shadow-sm"
              required
            />
          </div>
          <div className="col-md-12">
            <label className="form-label fw-semibold">Address</label>
            <input
              type="text"
              name="address"
              value={newInstructor.address}
              onChange={handleChange}
              className="form-control shadow-sm"
            />
          </div>
          <div className="col-12 pt-2">
            <button type="submit" className="btn btn-success w-100 py-2 fs-5">
              ✅ Register Instructor
            </button>
          </div>
        </div>
      </form>

      {/* Edit Modal */}
      {editingInstructor && (
        <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: "rgba(0,0,0,0.5)" }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header bg-primary text-white">
                <h5>Edit Instructor</h5>
                <button className="btn-close btn-close-white" onClick={() => setEditingInstructor(null)} />
              </div>
              <div className="modal-body">
                <form onSubmit={handleUpdate}>
                  {["name", "phoneNo", "address"].map(field => (
                    <div className="mb-3" key={field}>
                      <label className="form-label text-capitalize">{field} {field !== 'address' && '*'}</label>
                      <input
                        type="text"
                        name={field}
                        value={editData[field]}
                        onChange={handleEditChange}
                        className="form-control"
                        required={field !== 'address'}
                      />
                    </div>
                  ))}
                  <div className="d-flex justify-content-end gap-2">
                    <button type="button" className="btn btn-secondary" onClick={() => setEditingInstructor(null)}>
                      Cancel
                    </button>
                    <button type="submit" className="btn btn-success">Save</button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      <h4 className="text-secondary mb-3">Registered Instructors</h4>
      <div className="table-responsive shadow-sm rounded border">
        <table className="table table-hover">
          <thead>
            <tr>
              <th>Name</th>
              <th>Phone</th>
              <th>Address</th>
              <th className="text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {instructors.length === 0 ? (
              <tr><td colSpan="4" className="text-center text-muted">No instructors</td></tr>
            ) : (
              instructors.map(i => (
                <tr key={i._id}>
                  <td>{i.name}</td>
                  <td>{i.phoneNo}</td>
                  <td>{i.address || "-"}</td>
                  <td className="text-center">
                    <button className="btn btn-sm btn-primary me-2" onClick={() => openEditModal(i)}>Edit</button>
                    <button className="btn btn-sm btn-danger" onClick={() => handleDelete(i._id)}>Delete</button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <ToastContainer />
    </div>
  );
};

export default InstructorRegistration;