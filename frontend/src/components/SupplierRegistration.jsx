import React, { useState, useEffect } from "react";
import axios from "axios";
import { ToastContainer, toast } from "react-toastify";

const SupplierRegistration = () => {
  const [suppliers, setSuppliers] = useState([]);
  const [newSupplier, setNewSupplier] = useState({
    name: "",
    companyName: "", // ✅ Added company name
    contact: "",
    email: "",
    address: ""
  });
  const [editingSupplier, setEditingSupplier] = useState(null);
  const [editData, setEditData] = useState({ ...newSupplier });

  // Load suppliers on mount
  useEffect(() => {
    fetchSuppliers();
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

  const handleChange = (e) =>
    setNewSupplier({ ...newSupplier, [e.target.name]: e.target.value });

  const handleCreate = async (e) => {
    e.preventDefault();

    if (!newSupplier.companyName || !newSupplier.name || !newSupplier.contact) {
      alert("Please fill all required fields");
      return;
    }

    try {
      const token = localStorage.getItem("token");
      const res = await axios.post(
        "https://unicorninstititutelms.onrender.com/api/auth/supplier/register",
        newSupplier,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      setSuppliers([...suppliers, res.data]);
      setNewSupplier({
        name: "",
        companyName: "",
        contact: "",
        email: "",
        address: ""
      });
      toast.success("Supplier registered successfully!");
    } catch (err) {
      console.error("Register failed:", err.response?.data || err.message);
      // alert("Failed to register supplier");

      // ✅ Extract and display the backend error message
      const errorMessage = err.response?.data?.error || "Failed to register supplier";
      toast.error(errorMessage);
    }
  };

  const openEditModal = (supplier) => {
    setEditingSupplier(supplier._id);
    setEditData({
      name: supplier.name,
      companyName: supplier.companyName || "",
      contact: supplier.contact,
      email: supplier.email || "",
      address: supplier.address || ""
    });
  };

  const handleEditChange = (e) =>
    setEditData({ ...editData, [e.target.name]: e.target.value });

  const handleUpdate = async (e) => {
    e.preventDefault();

    if (!editData.companyName || !editData.name || !editData.contact) {
      alert("Please fill all required fields");
      return;
    }

    try {
      const token = localStorage.getItem("token");
      const res = await axios.put(
        `https://unicorninstititutelms.onrender.com/api/auth/supplier/${editingSupplier}`,
        editData,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      setSuppliers(suppliers.map((s) => (s._id === editingSupplier ? res.data : s)));
      setEditingSupplier(null);
      toast.success("Supplier updated successfully!");
    } catch (err) {
      console.error("Failed to update supplier:", err.message);
      alert("Failed to update supplier");
    }
  };

  const handleDelete = (id) => {
    if (!window.confirm("Are you sure you want to delete this supplier?")) return;

    axios
      .delete(`https://unicorninstititutelms.onrender.com/api/auth/supplier/${id}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
      })
      .then(() => {
        setSuppliers(suppliers.filter((s) => s._id !== id));
        toast.success("Supplier deleted successfully!");
      })
      .catch((err) => {
        toast.error("Failed to delete supplier");
      });
  };

  return (
    <div className="container py-4">
  <h2 className="mb-4 text-primary fw-bold border-bottom pb-2">Register New Supplier</h2>

  {/* Form */}
  <form
    onSubmit={handleCreate}
    className="p-4 bg-white shadow-sm rounded border mb-5"
  >
    <div className="row g-4">
      <div className="col-md-6">
        <label className="form-label fw-semibold">Contact Person *</label>
        <input
          type="text"
          name="name"
          value={newSupplier.name}
          onChange={handleChange}
          className="form-control shadow-sm"
          placeholder="e.g. John Doe"
          required
        />
      </div>
      <div className="col-md-6">
        <label className="form-label fw-semibold">Company Name *</label>
        <input
          type="text"
          name="companyName"
          value={newSupplier.companyName}
          onChange={handleChange}
          className="form-control shadow-sm"
          placeholder="e.g. ABC Distributors"
          required
        />
      </div>
      <div className="col-md-6">
        <label className="form-label fw-semibold">Contact *</label>
        <input
          type="text"
          name="contact"
          value={newSupplier.contact}
          onChange={handleChange}
          className="form-control shadow-sm"
          placeholder="Phone / WhatsApp"
          required
        />
      </div>
      <div className="col-md-6">
        <label className="form-label fw-semibold">Email</label>
        <input
          type="email"
          name="email"
          value={newSupplier.email}
          onChange={handleChange}
          className="form-control shadow-sm"
          placeholder="example@domain.com"
        />
      </div>
      <div className="col-md-12">
        <label className="form-label fw-semibold">Address</label>
        <input
          type="text"
          name="address"
          value={newSupplier.address}
          onChange={handleChange}
          className="form-control shadow-sm"
          placeholder="Enter supplier address"
        />
      </div>

      <div className="col-12 pt-2">
        <button type="submit" className="btn btn-success w-100 py-2 fs-5">
          ✅ Register Supplier
        </button>
      </div>
    </div>
  </form>

      {/* Edit Modal */}
      {editingSupplier && (
  <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: "rgba(0,0,0,0.5)" }}>
    <div className="modal-dialog">
      <div className="modal-content border-0 shadow-lg">
        <div className="modal-header bg-primary text-white">
          <h5 className="modal-title">✏️ Edit Supplier</h5>
          <button className="btn-close btn-close-white" onClick={() => setEditingSupplier(null)} />
        </div>
        <div className="modal-body">
          <form onSubmit={handleUpdate}>
            {["name", "companyName", "contact", "email", "address"].map((field, index) => (
              <div className="mb-3" key={index}>
                <label className="form-label fw-semibold text-capitalize">{field.replace(/([A-Z])/g, ' $1')}</label>
                <input
                  type="text"
                  name={field}
                  value={editData[field]}
                  onChange={handleEditChange}
                  className="form-control shadow-sm"
                  required={["name", "companyName", "contact"].includes(field)}
                />
              </div>
            ))}

            <div className="d-flex justify-content-between mt-4">
              <button type="button" className="btn btn-outline-secondary" onClick={() => setEditingSupplier(null)}>
                Cancel
              </button>
              <button type="submit" className="btn btn-success">💾 Save Changes</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  </div>
)}


      {/* Suppliers Table */}
      <h4 className="text-secondary mb-3">📋 Registered Suppliers</h4>

<div className="table-responsive shadow-sm rounded border">
  <table className="table table-hover align-middle mb-0">
    <thead className="table-light">
      <tr>
        <th>Contact Person</th>
        <th>Company</th>
        <th>Contact</th>
        <th>Email</th>
        <th>Address</th>
        <th className="text-center">Actions</th>
      </tr>
    </thead>
    <tbody>
      {suppliers.length === 0 ? (
        <tr>
          <td colSpan="6" className="text-center text-muted py-4">
            No suppliers found
          </td>
        </tr>
      ) : (
        suppliers.map((s, idx) => (
          <tr key={idx}>
            <td>{s.name}</td>
            <td><span >{s.companyName}</span></td>
            <td>{s.contact}</td>
            <td>{s.email || "-"}</td>
            <td>{s.address || "-"}</td>
            <td className="text-center">
              <button className="btn btn-sm btn-primary me-2" onClick={() => openEditModal(s)}>
                ✏️ Edit
              </button>
              <button className="btn btn-sm btn-danger" onClick={() => handleDelete(s._id)}>
                🗑️ Delete
              </button>
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

export default SupplierRegistration;