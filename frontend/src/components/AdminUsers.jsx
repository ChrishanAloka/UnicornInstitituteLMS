// src/components/AdminUsers.jsx
import React, { useEffect, useState } from "react";
import axios from "axios";
import * as XLSX from "xlsx";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const AdminUsers = () => {
  const [users, setUsers] = useState([]);

  // Load users on mount
  useEffect(() => {
    const fetchUsers = async () => {
      const token = localStorage.getItem("token");
      try {
        const res = await axios.get("https://projectnuckels.onrender.com/api/auth/users",  {
          headers: { Authorization: `Bearer ${token}` }
        });
        setUsers(res.data);
      } catch (err) {
        console.error("Failed to load users:", err.message);
      }
    };

    fetchUsers();
  }, []);

  // Export to Excel using xlsx
  const exportToExcel = () => {
    const filteredUsers = users.map((user) => ({
      Name: user.name,
      Email: user.email,
      Role: user.role,
      Status: user.isActive ? "Active" : "Inactive"
    }));

    const worksheet = XLSX.utils.json_to_sheet(filteredUsers);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Users");
    XLSX.writeFile(workbook, "users_report.xlsx");
  };

  // Export to PDF using html2canvas + jsPDF
  const exportToPDF = () => {
    const input = document.getElementById("user-table");

    if (!input) {
      alert("Table not found!");
      return;
    }

    html2canvas(input).then((canvas) => {
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "pt", "a4");
      const width = pdf.internal.pageSize.getWidth();
      const height = (canvas.height * width) / canvas.width;

      pdf.addImage(imgData, "PNG", 0, 0, width, height);
      pdf.save("users_report.pdf");
    });
  };

  // Update user role
  const handleRoleChange = async (id, newRole) => {
    const token = localStorage.getItem("token");
    try {
      const res = await axios.put(
        `https://projectnuckels.onrender.com/api/auth/user/${id}/role`, 
        { role: newRole },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      setUsers((prev) =>
        prev.map((user) => (user._id === id ? { ...user, role: res.data.role } : user)
      ));
    } catch (err) {
      console.error("Failed to update role:", err.message);
    }
  };

  // Deactivate user
  const handleDeactivate = async (id) => {
  const confirmDelete = window.confirm("Are you sure you want to deactivate this user?");
  if (!confirmDelete) return;

  try {
    const token = localStorage.getItem("token");
    const res = await axios.put(
      `https://projectnuckels.onrender.com/api/auth/user/${id}/deactivate`,
      {},
      {
        headers: { Authorization: `Bearer ${token}` }
      }
    );

    // ✅ Update user status locally instead of removing
    setUsers(users.map(u => 
      u._id === id ? res.data : u
    ));

    toast.success("User deactivated successfully!");

  } catch (err) {
    console.error("Deactivation failed:", err.message);
    toast.error("Failed to deactivate user");
  }
};

  const handleReactivate = async (id) => {
  if (!window.confirm("Are you sure you want to reactivate this user?")) return;

  try {
    const token = localStorage.getItem("token");
    const res = await axios.put(`https://projectnuckels.onrender.com/api/auth/user/reactivate/${id}`, {}, {
      headers: { Authorization: `Bearer ${token}` }
    });

    // ✅ Update users list with new data from server
    setUsers(users.map(u => 
      u._id === id ? res.data : u
    ));

    toast.success("User reactivated successfully!");
  } catch (err) {
    console.error("Reactivate failed:", err.response?.data || err.message);
    toast.error("Failed to reactivate user");
  }
};

  return (
  <div className="container my-4">
    <h2 className="mb-4 fw-bold text-primary"> User Management</h2>

    {/* Export Actions */}
    <div className="d-flex flex-wrap gap-3 mb-3 justify-content-between align-items-center">
      <div>
        <button className="btn btn-outline-success me-2" onClick={exportToExcel}>
          📤 Export to Excel
        </button>
        <button className="btn btn-outline-danger" onClick={exportToPDF}>
          📄 Export to PDF
        </button>
      </div>
      <span className="text-muted small">
        Total Users: <strong>{users.length}</strong>
      </span>
    </div>

    {/* User Table */}
    <div className="table-responsive">
      <table id="user-table" className="table table-hover table-bordered align-middle shadow-sm">
        <thead className="table-light">
          <tr className="text-center">
            <th>Name</th>
            <th>Email</th>
            <th>Role</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>

        <tbody>
          {users.length === 0 ? (
            <tr>
              <td colSpan="5" className="text-center text-muted py-4">
                🚫 No users found.
              </td>
            </tr>
          ) : (
            users.map((user) => (
              <tr key={user._id}>
                <td>{user.name}</td>
                <td>{user.email}</td>
                <td className="text-center">
                  <select
                    value={user.role}
                    onChange={(e) => handleRoleChange(user._id, e.target.value)}
                    className="form-select form-select-sm"
                    disabled={!user.isActive}
                  >
                    <option value="admin">Admin</option>
                    <option value="cashier">Cashier</option>
                    <option value="kitchen">Kitchen</option>
                  </select>
                </td>
                <td className="text-center">
                  <span
                    className={`badge rounded-pill px-3 py-2 fw-semibold ${
                      user.isActive ? "bg-success" : "bg-secondary"
                    }`}
                  >
                    {user.isActive ? "Active" : "Inactive"}
                  </span>
                </td>
                <td className="text-center">
                  {!user.isActive ? (
                    <button
                      className="btn btn-sm btn-success"
                      onClick={() => handleReactivate(user._id)}
                    >
                      🔓 Reactivate
                    </button>
                  ) : (
                    <button
                      className="btn btn-sm btn-danger"
                      onClick={() => handleDeactivate(user._id)}
                    >
                      🔒 Deactivate
                    </button>
                  )}
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

export default AdminUsers;