// src/components/MarkActivityItemProgress.jsx
import React, { useState, useEffect } from "react";
import axios from "axios";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const MarkActivityItemProgress = () => {
  const [level3Components, setLevel3Components] = useState([]);
  const [level4Activities, setLevel4Activities] = useState([]);
  const [level5Items, setLevel5Items] = useState([]);

  const [selectedLevel3, setSelectedLevel3] = useState("");
  const [selectedLevel4, setSelectedLevel4] = useState("");
  const [selectedLevel5, setSelectedLevel5] = useState("");

  const [progressEntries, setProgressEntries] = useState([]);
  const [progressSummary, setProgressSummary] = useState({
    totalPhysicalProgress: 0,
    totalFinancialProgress: 0,
    completed: false
  });

  const [financialSummary, setFinancialSummary] = useState({
    estimatedAmount: 0,
    totalSpent: 0,
    balance: 0
  });

  const [newProgress, setNewProgress] = useState({
    fromDate: "",
    toDate: "",
    physicalProgressDescription: "",
    physicalProgressPercentage: "",
    financialProgressAmount: "",
    financialProgressPercentage: ""
  });

  const [loading, setLoading] = useState(false);
  const [fetchingEntries, setFetchingEntries] = useState(false);

  const token = localStorage.getItem("token");

  // Fetch progress entries AND item budget when Level 5 is selected
  useEffect(() => {
    if (!selectedLevel5) return;

    const fetchItemAndProgress = async () => {
      setFetchingEntries(true);
      try {
        // Get item details (estimatedAmount)
        const itemRes = await axios.get(
          `http://localhost:5000/api/auth/level5activityitem/${selectedLevel5}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const estimatedAmount = Number(itemRes.data.estimatedAmount) || 0;

        // Get progress
        const progressRes = await axios.get(
          `http://localhost:5000/api/auth/activityitemsmarkprogress/by-item/${selectedLevel5}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );

        const entries = progressRes.data.entries;
        const totalSpent = entries.reduce((sum, e) => sum + (Number(e.financialProgressAmount) || 0), 0);
        const balance = Math.max(0, estimatedAmount - totalSpent);

        setProgressEntries(entries);
        setProgressSummary(progressRes.data.summary);
        setFinancialSummary({ estimatedAmount, totalSpent, balance });
      } catch (err) {
        toast.error("Failed to load item or progress data");
        // No need to reset states — resetDependents already cleared them
      } finally {
        setFetchingEntries(false);
      }
    };

    fetchItemAndProgress();
  }, [selectedLevel5, token]);

  // Fetch Level 3 (top-level)
  useEffect(() => {
    const fetchLevel3 = async () => {
      try {
        const res = await axios.get("http://localhost:5000/api/auth/level3component", {
          headers: { Authorization: `Bearer ${token}` }
        });
        setLevel3Components(res.data);
      } catch (err) {
        toast.error("Failed to load Level 3 components");
      }
    };
    fetchLevel3();
  }, [token]);

  // Fetch Level 4 when Level 3 is selected
  useEffect(() => {
    if (!selectedLevel3) {
      setLevel4Activities([]);
      return;
    }
    const fetchLevel4 = async () => {
      try {
        const res = await axios.get(
          `http://localhost:5000/api/auth/level4activity`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const filtered = res.data.filter(l4 => l4.parentActivity?._id === selectedLevel3);
        setLevel4Activities(filtered);
      } catch (err) {
        toast.error("Failed to load Level 4 activities");
      }
    };
    fetchLevel4();
  }, [selectedLevel3, token]);

  // Fetch Level 5 when Level 4 is selected
  useEffect(() => {
    if (!selectedLevel4) {
      setLevel5Items([]);
      return;
    }
    const fetchLevel5 = async () => {
      try {
        const res = await axios.get(
          `http://localhost:5000/api/auth/level5activityitem`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const filtered = res.data.filter(l5 => l5.parentItem?._id === selectedLevel4);
        setLevel5Items(filtered);
      } catch (err) {
        toast.error("Failed to load Level 5 items");
      }
    };
    fetchLevel5();
  }, [selectedLevel4, token]);


  const handleChange = (e) => {
    const { name, value } = e.target;
    setNewProgress({ ...newProgress, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const {
      fromDate,
      toDate,
      physicalProgressPercentage,
      financialProgressAmount,
      financialProgressPercentage
    } = newProgress;

    if (!selectedLevel5) {
      toast.error("Please select a Level 5 item");
      return;
    }

    if (!fromDate || !toDate) {
      toast.error("From and To dates are required");
      return;
    }

    const physicalPct = Number(physicalProgressPercentage);
    const financialPct = Number(financialProgressPercentage);
    const financialAmt = Number(financialProgressAmount);

    if (isNaN(physicalPct) || physicalPct <= 0 || physicalPct > 100) {
      toast.error("Physical progress must be 1–100");
      return;
    }
    if (isNaN(financialPct) || financialPct <= 0 || financialPct > 100) {
      toast.error("Financial progress % must be 1–100");
      return;
    }
    if (isNaN(financialAmt) || financialAmt < 0) {
      toast.error("Valid financial amount is required");
      return;
    }

    // Prevent exceeding 100% total
    if (progressSummary.totalPhysicalProgress + physicalPct > 100) {
      toast.error(`Physical progress would exceed 100% (current: ${progressSummary.totalPhysicalProgress}%)`);
      return;
    }
    if (progressSummary.totalFinancialProgress + financialPct > 100) {
      toast.error(`Financial progress would exceed 100% (current: ${progressSummary.totalFinancialProgress}%)`);
      return;
    }

    setLoading(true);
    try {
      const payload = {
        activityItem: selectedLevel5,
        level4Activity: selectedLevel4,   // 👈 Add this
        level3Component: selectedLevel3,  // 👈 Add this
        fromDate,
        toDate,
        physicalProgressDescription: newProgress.physicalProgressDescription,
        physicalProgressPercentage: physicalPct,
        financialProgressAmount: financialAmt,
        financialProgressPercentage: financialPct
      };

      await axios.post(
        "http://localhost:5000/api/auth/activityitemsmarkprogress",
        payload,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      toast.success("Progress recorded!");
      setNewProgress({
        fromDate: "",
        toDate: "",
        physicalProgressDescription: "",
        physicalProgressPercentage: "",
        financialProgressAmount: "",
        financialProgressPercentage: ""
      });

      // Refetch progress
      const res = await axios.get(
        `http://localhost:5000/api/auth/activityitemsmarkprogress/by-item/${selectedLevel5}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setProgressEntries(res.data.entries);
      setProgressSummary(res.data.summary);
    } catch (err) {
      const msg = err.response?.data?.error || "Failed to record progress";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  // Helper: Reset all dependent states
  const resetDependents = (level) => {
    if (level <= 3) {
      setSelectedLevel4("");
      setLevel4Activities([]);
    }
    if (level <= 4) {
      setSelectedLevel5("");
      setLevel5Items([]);
    }
    if (level <= 5) {
      setProgressEntries([]);
      setProgressSummary({ totalPhysicalProgress: 0, totalFinancialProgress: 0, completed: false });
      setFinancialSummary({ estimatedAmount: 0, totalSpent: 0, balance: 0 });
      setNewProgress({
        fromDate: "",
        toDate: "",
        physicalProgressDescription: "",
        physicalProgressPercentage: "",
        financialProgressAmount: "",
        financialProgressPercentage: ""
      });
    }
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

  // Get labels
  const getLevel3Label = () => {
    const l3 = level3Components.find(l => l._id === selectedLevel3);
    return l3 ? `${l3.code} - ${l3.componentName}` : "";
  };
  const getLevel4Label = () => {
    const l4 = level4Activities.find(l => l._id === selectedLevel4);
    return l4 ? `${l4.code} - ${l4.activityName}` : "";
  };
  const getLevel5Label = () => {
    const l5 = level5Items.find(l => l._id === selectedLevel5);
    return l5 ? `${l5.code} - ${l5.itemName}` : "";
  };

  return (
    <div className="container py-4">
      <h2 className="mb-4 fw-bold text-success border-bottom pb-2">
        📈 Mark Activity Item Progress
      </h2>

      {/* Hierarchy Selector */}
      <div className="row mb-4 g-3">
        <div className="col-md-4">
          <label className="form-label fw-semibold">Level 3 Component</label>
          <select
            className="form-select"
            value={selectedLevel3}
            onChange={(e) => {
              setSelectedLevel3(e.target.value);
              resetDependents(3); // 👈 Reset L4, L5, and below
            }}
          >
            <option value="">-- Select Level 3 --</option>
            {level3Components.map(l3 => (
              <option key={l3._id} value={l3._id}>
                {l3.code} - {l3.componentName}
              </option>
            ))}
          </select>
        </div>
        <div className="col-md-4">
          <label className="form-label fw-semibold">Level 4 Activity</label>
          <select
            className="form-select"
            value={selectedLevel4}
            onChange={(e) => {
              setSelectedLevel4(e.target.value);
              resetDependents(4); // 👈 Reset L5 and below
            }}
            disabled={!selectedLevel3}
          >
            <option value="">-- Select Level 4 --</option>
            {level4Activities.map(l4 => (
              <option key={l4._id} value={l4._id}>
                {l4.code} - {l4.activityName}
              </option>
            ))}
          </select>
        </div>
        <div className="col-md-4">
          <label className="form-label fw-semibold">Level 5 Item</label>
          <select
            className="form-select"
            value={selectedLevel5}
            onChange={(e) => {
              setSelectedLevel5(e.target.value);
              resetDependents(5); // 👈 Reset progress form (but not L5 itself)
            }}
            disabled={!selectedLevel4}
          >
            <option value="">-- Select Level 5 Item --</option>
            {level5Items.map(l5 => (
              <option key={l5._id} value={l5._id}>
                {l5.code} - {l5.itemName}
              </option>
            ))}
          </select>
        </div>
      </div>

      {selectedLevel5 && (
        <>
          {/* Breadcrumb */}
          <div className="alert alert-light mb-4">
            <strong>Selected:</strong> {getLevel3Label()} → {getLevel4Label()} → {getLevel5Label()}
          </div>

          {/* Progress Summary */}
          <div className="row mb-4">
            <div className="col-md-6">
              <div className="card bg-body">
                <div className="card-body">
                  <h6>Physical Progress</h6>
                  <div className="progress" style={{ height: "20px" }}>
                    <div
                      className="progress-bar bg-info"
                      role="progressbar"
                      style={{ width: `${progressSummary.totalPhysicalProgress}%` }}
                    >
                      {progressSummary.totalPhysicalProgress.toFixed(1)}%
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="col-md-6">
              <div className="card bg-body">
                <div className="card-body">
                  <h6>Financial Progress</h6>
                  <div className="progress" style={{ height: "20px" }}>
                    <div
                      className="progress-bar bg-success"
                      role="progressbar"
                      style={{ width: `${progressSummary.totalFinancialProgress}%` }}
                    >
                      {progressSummary.totalFinancialProgress.toFixed(1)}%
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Spending Progress Bar */}
          <div className="row mb-4">
            <div className="col-md-12">
              <div className="card bg-body">
                <div className="card-body">
                  <div className="mb-4">
                    <h6>Budget Utilization</h6>
                    <div className="progress" style={{ height: "20px" }}>
                      <div
                        className="progress-bar bg-warning"
                        role="progressbar"
                        style={{ 
                          width: `${financialSummary.estimatedAmount > 0 ? (financialSummary.totalSpent / financialSummary.estimatedAmount) * 100 : 0}%` 
                        }}
                      >
                        {financialSummary.estimatedAmount > 0 
                          ? `${((financialSummary.totalSpent / financialSummary.estimatedAmount) * 100).toFixed(1)}%` 
                          : "0%"}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Financial Summary */}
          <div className="row mb-4">
            <div className="col-md-4">
              <div className="card bg-body">
                <div className="card-body text-center">
                  <h6 className="text-muted mb-1">Estimated Amount</h6>
                  <h5 className="text-primary fw-bold">{formatCurrency(financialSummary.estimatedAmount)}</h5>
                </div>
              </div>
            </div>
            <div className="col-md-4">
              <div className="card bg-body">
                <div className="card-body text-center">
                  <h6 className="text-muted mb-1">Total Spent</h6>
                  <h5 className="text-danger fw-bold">{formatCurrency(financialSummary.totalSpent)}</h5>
                </div>
              </div>
            </div>
            <div className="col-md-4">
              <div className="card bg-body">
                <div className="card-body text-center">
                  <h6 className="text-muted mb-1">Balance</h6>
                  <h5 className="text-success fw-bold">{formatCurrency(financialSummary.balance)}</h5>
                </div>
              </div>
            </div>
          </div>

          {/* Progress Form */}
          <div className="card p-4 mb-5 shadow-sm">
            <h5 className="mb-4 text-primary">➕ Add New Progress Entry</h5>
            <form onSubmit={handleSubmit}>
              <div className="row g-3">
                <div className="col-md-6">
                  <label className="form-label fw-semibold">From Date</label>
                  <input
                    type="date"
                    className="form-control"
                    name="fromDate"
                    value={newProgress.fromDate}
                    onChange={handleChange}
                    required
                  />
                </div>
                <div className="col-md-6">
                  <label className="form-label fw-semibold">To Date</label>
                  <input
                    type="date"
                    className="form-control"
                    name="toDate"
                    value={newProgress.toDate}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="col-md-6">
                  <label className="form-label fw-semibold">Physical Progress (%)</label>
                  <input
                    type="number"
                    className="form-control"
                    name="physicalProgressPercentage"
                    value={newProgress.physicalProgressPercentage}
                    onChange={handleChange}
                    min="0.1"
                    max="100"
                    step="0.1"
                    placeholder="e.g., 10.5"
                    required
                  />
                </div>
                <div className="col-md-6">
                  <label className="form-label fw-semibold">Physical Description</label>
                  <input
                    type="text"
                    className="form-control"
                    name="physicalProgressDescription"
                    value={newProgress.physicalProgressDescription}
                    onChange={handleChange}
                    placeholder="e.g., Completed foundation work"
                  />
                </div>

                <div className="col-md-6">
                  <label className="form-label fw-semibold">Financial Progress (%)</label>
                  <input
                    type="number"
                    className="form-control"
                    name="financialProgressPercentage"
                    value={newProgress.financialProgressPercentage}
                    onChange={handleChange}
                    min="0.1"
                    max="100"
                    step="0.1"
                    placeholder="e.g., 15.0"
                    required
                  />
                </div>
                <div className="col-md-6">
                  <label className="form-label fw-semibold">Financial Amount ($)</label>
                  <input
                    type="number"
                    className="form-control"
                    name="financialProgressAmount"
                    value={newProgress.financialProgressAmount}
                    onChange={handleChange}
                    min="0"
                    step="any"
                    placeholder="e.g., 5000"
                    required
                  />
                </div>

                <div className="col-12 mt-3">
                  <button
                    type="submit"
                    className="btn btn-success w-100 py-2 fs-5"
                    disabled={loading || progressSummary.completed}
                  >
                    {loading ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                        Saving...
                      </>
                    ) : progressSummary.completed ? (
                      "✅ Completed — No more progress allowed"
                    ) : (
                      "📌 Record Progress"
                    )}
                  </button>
                </div>
              </div>
            </form>
          </div>

          {/* Progress History */}
          <div className="mt-5">
            <h5 className="mb-3 text-secondary">📜 Progress History</h5>
            {fetchingEntries ? (
              <div className="text-center py-3 text-muted">Loading history...</div>
            ) : progressEntries.length === 0 ? (
              <div className="alert alert-info">No progress entries yet.</div>
            ) : (
              <div className="table-responsive">
                <table className="table table-bordered table-striped">
                  <thead className="table-dark">
                    <tr>
                      <th>Date Range</th>
                      <th>Physical (%)</th>
                      <th>Description</th>
                      <th>Financial ($)</th>
                      <th>Financial (%)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {progressEntries.map((entry, idx) => (
                      <tr key={entry._id}>
                        <td>
                          {new Date(entry.fromDate).toLocaleDateString()} –{" "}
                          {new Date(entry.toDate).toLocaleDateString()}
                        </td>
                        <td className="text-info fw-bold">{entry.physicalProgressPercentage}%</td>
                        <td>{entry.physicalProgressDescription || "—"}</td>
                        <td>{formatCurrency(entry.financialProgressAmount)}</td>
                        <td className="text-success fw-bold">{entry.financialProgressPercentage}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      <ToastContainer />
    </div>
  );
};

export default MarkActivityItemProgress;