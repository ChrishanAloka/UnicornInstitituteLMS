import React, { useState, useEffect } from "react";
import axios from "axios";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const RegisterDriverPage = () => {
  const [formData, setFormData] = useState({
    name: "",
    nic: "",
    vehicle: "",
    numberPlate: "",
    address: "",
    phone: ""
  });
  const [drivers, setDrivers] = useState([]);
  const [editingDriver, setEditingDriver] = useState(null);
  const [editData, setEditData] = useState({
    name: "",
    nic: "",
    vehicle: "",
    numberPlate: "",
    address: "",
    phone: ""
  });

  const [searchTerm, setSearchTerm] = useState("");

  // Load drivers on mount
  useEffect(() => {
    fetchDrivers();
  }, []);

  const fetchDrivers = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get("https://unicorninstititutelms.onrender.com/api/auth/drivers", {
        headers: { Authorization: `Bearer ${token}` }
      });
      setDrivers(res.data);
    } catch (err) {
      console.error("Failed to load drivers:", err.message);
      toast.error("Failed to load drivers");
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
    
    
      const token = localStorage.getItem("token");
      const res = await axios.post("https://unicorninstititutelms.onrender.com/api/auth/drivers", formData, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        }
      });

      toast.success("Driver registered successfully!");
      setFormData({
        name: "",
        nic: "",
        vehicle: "",
        numberPlate: "",
        address: "",
        phone: ""
      });
    } catch (err) {
      console.error("Registration failed:", err.response?.data || err.message);
      toast.error(err.response?.data?.error || "Failed to register driver");
    }
  };

  // Open edit modal
  const openEditModal = (driver) => {
    setEditingDriver(driver._id);
    setEditData({
      name: driver.name,
      nic: driver.nic,
      vehicle: driver.vehicle,
      numberPlate: driver.numberPlate,
      address: driver.address,
      phone: driver.phone
    });
  };

  // Submit update
  const handleUpdate = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.put(
        `https://unicorninstititutelms.onrender.com/api/auth/drivers/${editingDriver}`,
        editData,
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
          }
        }
      );

      setDrivers(drivers.map(d => d._id === editingDriver ? res.data : d));
      setEditingDriver(null);
      toast.success("Driver updated successfully!");
    } catch (err) {
      console.error("Update failed:", err.response?.data || err.message);
      toast.error("Failed to update driver");
    }
  };

  // Delete driver
  const handleDelete = async (id) => {
    const confirmDelete = window.confirm("Are you sure you want to delete this driver?");
    if (!confirmDelete) return;

    try {
      const token = localStorage.getItem("token");
      await axios.delete(`https://unicorninstititutelms.onrender.com/api/auth/drivers/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setDrivers(drivers.filter(d => d._id !== id));
      toast.success("Driver deleted successfully!");
    } catch (err) {
      console.error("Delete failed:", err.message);
      toast.error("Failed to delete driver");
    }
  };

  // Filter drivers
  const filteredDrivers = drivers.filter((d) => {
  if (!searchTerm.trim()) return true;

  const lowerSearch = searchTerm.toLowerCase();
  return (
    d.name?.toLowerCase().includes(lowerSearch) ||
    d.vehicle?.toLowerCase().includes(lowerSearch) ||
    d.nic?.toLowerCase().includes(lowerSearch) ||
    d.numberPlate?.toLowerCase().includes(lowerSearch) ||
    d.phone?.toLowerCase().includes(lowerSearch)
  );
});

  const symbol = localStorage.getItem("currencySymbol") || "$";

  return (
    <div className="container my-4">
      <h2 className="mb-2 fw-bold text-primary">Register Delivery Driver</h2>
      <p className="mb-4 text-muted border-bottom pb-2">Add new delivery driver for Takeaway Orders</p>

      <div className="card shadow-sm border p-4 mt-4">
        <form onSubmit={handleSubmit}>
          {/* Name */}
          <div className="row g-3 mb-3">
            <div className="col-md-6">
              <label className="form-label">Full Name *</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className="form-control"
                placeholder="John Doe"
                required
              />
            </div>

            {/* NIC */}
            <div className="col-md-6">
              <label className="form-label">NIC *</label>
              <input
                type="text"
                name="nic"
                value={formData.nic}
                onChange={handleChange}
                className="form-control"
                placeholder="e.g., 19901234567"
                required
              />
            </div>
          </div>

          {/* Vehicle & Number Plate */}
          <div className="row g-3 mb-3">
            <div className="col-md-6">
              <label className="form-label">Vehicle Type *</label>
              <input
                type="text"
                name="vehicle"
                value={formData.vehicle}
                onChange={handleChange}
                className="form-control"
                placeholder="e.g., Scooter, Bike, Car"
                required
              />
            </div>

            <div className="col-md-6">
              <label className="form-label">Number Plate *</label>
              <input
                type="text"
                name="numberPlate"
                value={formData.numberPlate}
                onChange={handleChange}
                className="form-control"
                placeholder="e.g., ABC-1234"
                required
              />
            </div>
          </div>

          {/* Address & Phone */}
          <div className="row g-3 mb-3">
            <div className="col-md-6">
              <label className="form-label">Address *</label>
              <input
                type="text"
                name="address"
                value={formData.address}
                onChange={handleChange}
                className="form-control"
                placeholder="Street, City"
                required
              />
            </div>

            <div className="col-md-6">
              <label className="form-label">Phone No *</label>
              <input
                type="text"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                className="form-control"
                placeholder="e.g., 0771234567"
                required
              />
            </div>
          </div>

          {/* Submit Button */}
          <button className="btn btn-success w-100 py-2 fs-5" type="submit">
            🚓 Register Driver
          </button>
        </form>
      </div>
      <div className="card shadow-sm border p-4 mt-4">

        {/* Search */}
        <div className="mb-4">
          <input
            type="text"
            className="form-control"
            placeholder="Search by name, NIC, or phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Driver Table */}
        {filteredDrivers.length === 0 && (
          <p className="text-muted">No drivers found</p>
        )}

        <div className="table-responsive">
          <table className="table table-hover align-middle">
            <thead className="table-light">
              <tr>
                <th>Name</th>
                <th>NIC</th>
                <th>Phone</th>
                <th>Vehicle</th>
                <th>Number Plate</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredDrivers.map((driver, idx) => (
                <tr key={idx}>
                  <td>{driver.name}</td>
                  <td>{driver.nic}</td>
                  <td>{driver.phone}</td>
                  <td>{driver.vehicle}</td>
                  <td>{driver.numberPlate}</td>
                  <td>
                    <button
                      className="btn btn-sm btn-primary me-2"
                      onClick={() => openEditModal(driver)}
                    >
                      Edit
                    </button>
                    <button
                      className="btn btn-sm btn-danger"
                      onClick={() => handleDelete(driver._id)}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Edit Modal */}
        {editingDriver && (
          <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: "rgba(0,0,0,0.5)" }}>
            <div className="modal-dialog">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title">Edit Driver</h5>
                  <button className="btn-close" onClick={() => setEditingDriver(null)}></button>
                </div>
                <div className="modal-body">
                  <div className="row g-3">
                    <div className="col-md-6">
                      <label className="form-label">Full Name</label>
                      <input
                        type="text"
                        name="name"
                        value={editData.name}
                        onChange={handleChange}
                        className="form-control"
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">NIC</label>
                      <input
                        type="text"
                        name="nic"
                        value={editData.nic}
                        onChange={handleChange}
                        className="form-control"
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">Phone No</label>
                      <input
                        type="text"
                        name="phone"
                        value={editData.phone}
                        onChange={handleChange}
                        className="form-control"
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">Vehicle Type</label>
                      <input
                        type="text"
                        name="vehicle"
                        value={editData.vehicle}
                        onChange={handleChange}
                        className="form-control"
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">Number Plate</label>
                      <input
                        type="text"
                        name="numberPlate"
                        value={editData.numberPlate}
                        onChange={handleChange}
                        className="form-control"
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">Address</label>
                      <input
                        type="text"
                        name="address"
                        value={editData.address}
                        onChange={handleChange}
                        className="form-control"
                      />
                    </div>
                  </div>
                </div>
                <div className="modal-footer">
                  <button className="btn btn-secondary" onClick={() => setEditingDriver(null)}>
                    Cancel
                  </button>
                  <button className="btn btn-success" onClick={handleUpdate}>
                    Save Changes
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}


      </div>

    

      <ToastContainer />
    </div>

    
  );
};

export default RegisterDriverPage;