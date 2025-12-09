import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

const AdminEmployeeRegister = () => {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: "",
    nic: "",
    address: "",
    phone: "",
    basicSalary: "",
    workingHours: 8,
    otHourRate: "",
    bankAccountNo: "",
    role: "cashier"
  });

  const [generatedId, setGeneratedId] = useState("Loading...");
  const [loading, setLoading] = useState(false);

  // Load next employee ID on mount
  useEffect(() => {
    const fetchNextId = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await axios.get("https://projectnuckels.onrender.com/api/auth/employees/next-id", {
          headers: { Authorization: `Bearer ${token}` }
        });
        setGeneratedId(res.data.nextId);
      } catch (err) {
        setGeneratedId("EMP-001"); // Fallback
      }
    };

    fetchNextId();
  }, []);

  const handleChange = (e) =>
    setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const payload = {
      ...formData,
      employeeId: generatedId // ✅ Send generated ID
    };

    try {
      const token = localStorage.getItem("token");
      const res = await axios.post(
        "https://projectnuckels.onrender.com/api/auth/employee/register",
        payload,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      alert("Employee registered successfully!");
      navigate("/admin/employees");
    } catch (err) {
      console.error("Registration failed:", err.response?.data || err.message);
      alert("Failed to register employee");
    } finally {
      setLoading(false);
    }
  };

  const symbol = localStorage.getItem("currencySymbol") || "$";

  return (
    <div className="container py-4">
  <h3 className="mb-4 text-primary border-bottom pb-2">🧾 Register New Employee</h3>

  <form onSubmit={handleSubmit} className="bg-white p-4 shadow rounded-3">
    <div className="row g-4">
      {/* Auto-generated Employee ID (hidden) */}
      <input type="text" value={generatedId} readOnly hidden />

      {/* Name */}
      <div className="col-md-6">
        <label className="form-label fw-semibold">Name *</label>
        <input
          type="text"
          name="name"
          value={formData.name}
          onChange={handleChange}
          placeholder="John Doe"
          className="form-control shadow-sm"
          required
        />
      </div>

      {/* NIC */}
      <div className="col-md-6">
        <label className="form-label fw-semibold">NIC *</label>
        <input
          type="text"
          name="nic"
          value={formData.nic}
          onChange={handleChange}
          placeholder="901234567V"
          className="form-control shadow-sm"
          required
        />
      </div>

      {/* Phone */}
      <div className="col-md-6">
        <label className="form-label fw-semibold">Phone *</label>
        <input
          type="text"
          name="phone"
          value={formData.phone}
          onChange={handleChange}
          placeholder="0771234567"
          className="form-control shadow-sm"
          required
        />
      </div>

      {/* Basic Salary */}
      <div className="col-md-6">
        <label className="form-label fw-semibold">Basic Salary *</label>
        <input
          type="number"
          name="basicSalary"
          value={formData.basicSalary}
          onChange={handleChange}
          step="0.01"
          min="0"
          placeholder="e.g., 50000"
          className="form-control shadow-sm"
          required
        />
      </div>

      {/* Role */}
      <div className="col-md-6">
        <label className="form-label fw-semibold">Role *</label>
        <select
          name="role"
          value={formData.role}
          onChange={handleChange}
          className="form-select shadow-sm"
          required
        >
          <option value="">Select Role</option>
          <option value="cashier">Cashier</option>
          <option value="kitchen">Kitchen</option>
          <option value="waiter">Waiter</option>
          <option value="cleaner">Cleaner</option>
        </select>
      </div>

      {/* Working Hours */}
      <div className="col-md-6">
        <label className="form-label fw-semibold">Working Hours (Daily)</label>
        <input
          type="number"
          name="workingHours"
          value={formData.workingHours}
          onChange={handleChange}
          min="0"
          max="24"
          className="form-control shadow-sm"
        />
      </div>

      {/* OT Rate */}
      <div className="col-md-6">
        <label className="form-label fw-semibold">OT Hour Rate ({symbol})</label>
        <input
          type="number"
          name="otHourRate"
          value={formData.otHourRate}
          onChange={handleChange}
          step="0.01"
          className="form-control shadow-sm"
        />
      </div>

      {/* Bank Account No */}
      <div className="col-md-6">
        <label className="form-label fw-semibold">Bank Account No (Optional)</label>
        <input
          type="text"
          name="bankAccountNo"
          value={formData.bankAccountNo}
          onChange={handleChange}
          className="form-control shadow-sm"
        />
      </div>

      {/* Address */}
      <div className="col-md-6">
        <label className="form-label fw-semibold">Address</label>
        <textarea
          name="address"
          value={formData.address}
          onChange={handleChange}
          rows="2"
          className="form-control shadow-sm"
        ></textarea>
      </div>

      {/* Submit */}
      <div className="col-12 pt-3">
        <button
          type="submit"
          className="btn btn-success w-100 py-2 fs-5 shadow-sm"
          disabled={loading}
        >
          {loading ? "Registering..." : "✅ Register Employee"}
        </button>
      </div>
    </div>
  </form>
</div>

  );
};

export default AdminEmployeeRegister;