import React, { useState, useEffect } from "react";
import axios from "axios";
import { ToastContainer, toast } from "react-toastify";

const AttendanceDashboard = () => {
  const [summary, setSummary] = useState([]);
  const [loading, setLoading] = useState(false);
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());

  // Load summary on mount or when filters change
  useEffect(() => {
    fetchMonthlySummary();
  }, [month, year]);

  const fetchMonthlySummary = async () => {
  setLoading(true);
  try {
    const token = localStorage.getItem("token");
    const res = await axios.get(
      "https://projectnuckels.onrender.com/api/auth/admin/attendance/monthly-summary",
      {
        params: { month, year }, // Ensure these are numbers like 7 and 2025
        headers: { Authorization: `Bearer ${token}` }
      }
    );

    console.log("Backend returned:", res.data); // 👀 Check here
    setSummary(res.data);
  } catch (err) {
    console.error("Failed to load summary:", err.response?.data || err.message);
    toast.error("Failed to load attendance summary");
    setSummary([]);
  } finally {
    setLoading(false);
  }
};

  const handleMonthChange = (e) => {
    setMonth(parseInt(e.target.value));
  };

  const handleFilterChange = (e) => {
  setMonth(parseInt(e.target.value));
};

const handleYearChange = (e) => {
  setYear(parseInt(e.target.value));
};

  

  return (
    <div className="container my-4">
      <h2 className="mb-2 fw-bold text-primary">Monthly Attendance Summary</h2>
      <p className="mb-4 text-muted border-bottom pb-2">View total working hours per employee</p>

      {/* Filters */}
      <div className="mb-4 d-flex flex-wrap gap-3 align-items-center">
        <div>
          <label className="form-label mb-0">Select Month</label>
          <select value={month} onChange={handleFilterChange} className="form-select w-auto me-3">
          {[...Array(12)].map((_, i) => (
            <option key={i + 1} value={i + 1}>
              {new Date(2025, i).toLocaleString("default", { month: "long" })}
            </option>
          ))}
        </select>
        </div>

        <div>
          <label className="form-label mb-0">Select Year</label>
          <input
            type="number"
            value={year}
            onChange={handleYearChange}
            className="form-control w-auto"
            min="2020"
            max="2030"
          />
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <p>Loading...</p>
      ) : summary.length === 0 ? (
        <p className="text-muted">No attendance records found.</p>
      ) : (
        <div className="table-responsive">
          <table className="table table-hover align-middle">
            <thead className="table-light">
              <tr>
                <th>Employee</th>
                <th>First Day</th>
                <th>Last Day</th>
                <th>Total Days</th>
                <th>Total Hours</th>
                <th>OT Hours</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {summary.map((emp, idx) => {
                const totalHours = parseFloat(emp.totalHours);
                const totalDays = parseInt(emp.totalDays);
                const otHours = parseInt(emp.otHours)
                const expectedHours = totalDays * 8;

                let status = "On Time";
                if (totalHours > expectedHours) status = "Overtime";
                else if (totalHours < expectedHours) status = "Undertime";

                return (
                  <tr key={idx}>
                    <td>{emp.name}</td>
                    <td>{emp.firstPunch !== "-" ? new Date(emp.firstPunch).toLocaleDateString() : "-"}</td>
                    <td>{emp.lastPunch !== "-" ? new Date(emp.lastPunch).toLocaleDateString() : "-"}</td>
                    <td>{totalDays}</td>
                    <td>{totalHours.toFixed(2)}</td>
                    <td>{otHours.toFixed(2)}</td>
                    <td>
                      <span
                        className={`badge ${
                          status === "Overtime"
                            ? "bg-success text-white"
                            : status === "Undertime"
                            ? "bg-warning text-dark"
                            : "bg-secondary"
                        }`}
                      >
                        {status}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <ToastContainer />
    </div>
  );
};

export default AttendanceDashboard;