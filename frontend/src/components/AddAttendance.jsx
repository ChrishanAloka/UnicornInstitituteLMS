import React, { useState, useEffect } from "react";
import axios from "axios";
import Select from "react-select";
import { ToastContainer, toast } from "react-toastify";

const AttendancePage = () => {
  const [employees, setEmployees] = useState([]);
  const [selectedEmp, setSelectedEmp] = useState(null);
  const [punches, setPunches] = useState([]);
  const [loading, setLoading] = useState(false);

  // Load employees on mount
  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get("https://projectnuckels.onrender.com/api/auth/employees", {
        headers: { Authorization: `Bearer ${token}` }
      });
      setEmployees(res.data);
    } catch (err) {
      console.error("Failed to load employees:", err.message);
      toast.error("Failed to load employees");
    }
  };

  // Format options for react-select
  const employeeOptions = employees.map(emp => ({
    value: emp._id,
    label: `${emp.name} (${emp.id})`
  }));

  // Fetch daily punches
  const fetchPunches = async (empId) => {
    setLoading(true);
    try {
      const today = new Date();
      const month = today.getMonth() + 1;
      const year = today.getFullYear();

      const token = localStorage.getItem("token");
      const res = await axios.get(
        "https://projectnuckels.onrender.com/api/auth/attendance/summary",
        {
          params: { _id: empId, month, year },
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      setPunches(res.data.daily || []);
    } catch (err) {
      console.error("Failed to load punches:", err.response?.data || err.message);
      toast.error("Failed to load punch history");
      setPunches([]);
    } finally {
      setLoading(false);
    }
  };

  // Handle employee change
  const handleEmployeeChange = (selectedOption) => {
    if (!selectedOption) {
      setSelectedEmp(null);
      setPunches([]);
      return;
    }

    setSelectedEmp(selectedOption);
    fetchPunches(selectedOption.value);
  };

  // Record punch time
  const recordPunch = async (type) => {
    if (!selectedEmp) return;

    try {
      const token = localStorage.getItem("token");
      const punchTime = new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit"
      });

      const payload = {
        employeeId: selectedEmp.value,
        punchType: type
      };

      const res = await axios.post(
        "https://projectnuckels.onrender.com/api/auth/attendance/punch",
        payload,
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
          }
        }
      );

      toast.success(`${selectedEmp.label} - ${type} at ${punchTime}`);
      fetchPunches(selectedEmp.value);
    } catch (err) {
      console.error("Failed to record punch:", err.response?.data || err.message);
      toast.error(`Failed to record ${type}`);
    }
  };

  // Determine which buttons can be shown
  const canPunch = (type) => {
    if (!punches.length) {
      // First punch must be Clock In
      return type === "In";
    }

    const latestDay = punches[punches.length - 1];
    const lastPunches = latestDay?.punches || [];
    const lastPunch = lastPunches[lastPunches.length - 1];

    switch (type) {
      case "In":
        // Only show if no punches or last was "Out"
        return !lastPunch || lastPunch?.type === "Out";;

      case "Break In":
        // Show if last punch was "In" and Break In hasn't been pressed yet
        return lastPunch?.type === "In";

      case "Break Out":
        // Show only after Break In is pressed
        return lastPunch?.type === "Break In";

      case "Out":
        // Show only after Break Out is pressed
        return lastPunch?.type === "Break Out";

      default:
        return false;
    }
  };

  return (
    <div className="container mt-4">
      <h2 className="mb-4 fw-bold text-primary border-bottom pb-2">Employee Time Punch</h2>

      {/* Employee Selection */}
      <div className="mb-4">
        <label>Select Employee</label>
        <Select
          options={employeeOptions}
          value={selectedEmp}
          onChange={handleEmployeeChange}
          placeholder="Search or select..."
          isClearable
          isSearchable
        />
      </div>

      {/* Punch Buttons */}
      {selectedEmp && (
        <div className="text-center mb-4">
          {canPunch("In") && (
            <button
              className="btn btn-success fs-5 px-4 py-2 me-2"
              onClick={() => recordPunch("In")}
            >
              🔹 Clock In
            </button>
          )}

          {canPunch("Break In") && (
            <button
              className="btn btn-warning fs-5 px-4 py-2 me-2"
              onClick={() => recordPunch("Break In")}
            >
              ⏸ Break In
            </button>
          )}

          {canPunch("Break Out") && (
            <button
              className="btn btn-primary fs-5 px-4 py-2 me-2"
              onClick={() => recordPunch("Break Out")}
            >
              ▶️ Break Out
            </button>
          )}

          {canPunch("Out") && (
            <button
              className="btn btn-danger fs-5 px-4 py-2"
              onClick={() => recordPunch("Out")}
            >
              🔚 Clock Out
            </button>
          )}
        </div>
      )}

      {/* Daily Punch Table */}
      {selectedEmp && (
        <div>
          <h4>Daily Punch Log</h4>
          {loading ? (
            <p>Loading...</p>
          ) : punches.length === 0 ? (
            <p>No punches recorded yet.</p>
          ) : (
            <table className="table table-bordered align-middle">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>In</th>
                  <th>Break In</th>
                  <th>Break Out</th>
                  <th>Out</th>
                  <th>Total Hours</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {punches.map((day, idx) => {
                  const punchesMap = {};
                  day.punches.forEach(p => {
                    punchesMap[p.type] = p.time;
                  });

                  const totalHours = parseFloat(day.totalHours || 0);
                  let status = "On Time";
                  if (totalHours > 8) status = "Overtime";
                  else if (totalHours < 8) status = "Undertime";

                  return (
                    <tr key={idx}>
                      <td>{new Date(day.date).toLocaleDateString()}</td>
                      <td>{punchesMap["In"] || "-"}</td>
                      <td>{punchesMap["Break In"] || "-"}</td>
                      <td>{punchesMap["Break Out"] || "-"}</td>
                      <td>{punchesMap["Out"] || "-"}</td>
                      <td>{totalHours.toFixed(2)}</td>
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
          )}
        </div>
      )}

      <ToastContainer />
    </div>
  );
};

export default AttendancePage;