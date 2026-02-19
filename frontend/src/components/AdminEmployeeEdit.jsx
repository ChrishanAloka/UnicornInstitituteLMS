import React, { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate, useParams } from "react-router-dom";

const AdminEmployeeEdit = () => {
  const [formData, setFormData] = useState({
    id: "",
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
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { id } = useParams();

  // Load employee by ID
  useEffect(() => {
    const fetchEmployee = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await axios.get(`http://localhost:5000/api/auth/employee/${id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setFormData(res.data);
        setLoading(false);
      } catch (err) {
        alert("Failed to load employee data");
        navigate("/admin/employees");
      }
    };
    fetchEmployee();
  }, [id]);

  const handleChange = (e) =>
    setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleUpdate = async (e) => {
    e.preventDefault();

    try {
      const token = localStorage.getItem("token");
      const res = await axios.put(
        `http://localhost:5000/api/auth/employee/${id}`,
        formData,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      alert("Employee updated successfully!");
      navigate("/admin/employees");
    } catch (err) {
      alert("Failed to update employee");
      console.error("Update failed:", err.response?.data || err.message);
    }
  };

  if (loading) return <p>Loading...</p>;

  return (
    <div>
      <h3>Edit Employee</h3>
      <form onSubmit={handleUpdate} className="mt-3">
        <div className="row g-3">
          <div className="col-md-6">
            <label className="form-label">Employee ID</label>
            <input
              type="text"
              name="id"
              value={formData.id}
              onChange={handleChange}
              disabled
              className="form-control"
            />
          </div>
          <div className="col-md-6">
            <label className="form-label">Name</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="John Doe"
              className="form-control"
              required
            />
          </div>
          <div className="col-md-6">
            <label className="form-label">NIC</label>
            <input
              type="text"
              name="nic"
              value={formData.nic}
              onChange={handleChange}
              placeholder="901234567V"
              className="form-control"
              required
            />
          </div>
          <div className="col-md-6">
            <label className="form-label">Phone</label>
            <input
              type="text"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              placeholder="0771234567"
              className="form-control"
              required
            />
          </div>
          <div className="col-md-6">
            <label className="form-label">Basic Salary</label>
            <input
              type="number"
              step="0.01"
              name="basicSalary"
              value={formData.basicSalary}
              onChange={handleChange}
              placeholder="e.g., 50000"
              className="form-control"
              required
            />
          </div>
          <div className="col-md-6">
            <label className="form-label">Role</label>
            <select
              name="role"
              value={formData.role}
              onChange={handleChange}
              className="form-select"
              required
            >
              <option value="">Select Role</option>
              <option value="cashier">Cashier</option>
              <option value="kitchen">Kitchen</option>
              <option value="waiter">Waiter</option>
              <option value="cleaner">Cleaner</option>
            </select>
          </div>
          <div className="col-md-6">
            <label className="form-label">Working Hours (Daily)</label>
            <input
              type="number"
              name="workingHours"
              value={formData.workingHours}
              onChange={handleChange}
              min="0"
              max="24"
              className="form-control"
            />
          </div>
          <div className="col-md-6">
            <label className="form-label">OT Hour Rate (Optional)</label>
            <input
              type="number"
              step="0.01"
              name="otHourRate"
              value={formData.otHourRate}
              onChange={handleChange}
              className="form-control"
            />
          </div>
          <div className="col-md-6">
            <label className="form-label">Bank Account No (Optional)</label>
            <input
              type="text"
              name="bankAccountNo"
              value={formData.bankAccountNo}
              onChange={handleChange}
              className="form-control"
            />
          </div>
          <div className="col-md-6 mt-3">
            <label className="form-label">Address</label>
            <textarea
              name="address"
              value={formData.address}
              onChange={handleChange}
              rows="2"
              className="form-control"
            ></textarea>
          </div>
          <div className="col-12 mt-4">
            <button type="submit" className="btn btn-primary w-100">
              Save Changes
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default AdminEmployeeEdit;