// src/components/CashierSummary.jsx
import React, { useState, useEffect } from "react";
import axios from "axios";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const CashierSummary = () => {
  // State for UI
  const [orders, setOrders] = useState([]);
  const [otherIncomes, setOtherIncomes] = useState([]); // ✅ Replaces cashIns
  const [otherExpenses, setOtherExpenses] = useState([]);
  const [cashIns, setCashIns] = useState([]);
  const [cashOuts, setCashOuts] = useState([]);
  const [startingCash, setStartingCash] = useState("");
  const [startingCashLocked, setStartingCashLocked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState(new Date().toISOString().split("T")[0]);
  const [submittedSummary, setSubmittedSummary] = useState(null); // 👈 Track if already submitted
  const [isReadOnly, setIsReadOnly] = useState(false); // 👈 Lock UI if submitted

  const [forwardBalance, setForwardBalance] = useState(null); // { expectedClosingCash, date, submittedAt }

  const token = localStorage.getItem("token");
  const cashierId = localStorage.getItem("userId");
  const symbol = localStorage.getItem("currencySymbol") || "$";

  // Fetch data when date changes
  useEffect(() => {
    fetchCashOrders();
    fetchOtherIncomes();
    fetchOtherExpenses();
    checkExistingSummary();
    fetchForwardBalance(dateFilter);
  }, [dateFilter]);

  // Fetch cash orders for selected date
  const fetchCashOrders = async () => {
    setLoading(true);
    try {
      const startDate = new Date(dateFilter);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(dateFilter);
      endDate.setHours(23, 59, 59, 999);

      const params = new URLSearchParams({
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      });

      const res = await axios.get(
        `https://projectnuckels.onrender.com/api/auth/orders?${params.toString()}`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      const cashOrders = res.data.filter(order =>
        (order.payment?.cash || 0) - (order.payment?.changeDue || 0) > 0
      );

      setOrders(cashOrders);
    } catch (err) {
      console.error("Failed to load cash orders:", err);
      alert("Failed to load cash orders");
    } finally {
      setLoading(false);
    }
  };
  
  const fetchOtherIncomes = async () => {
    try {
      const res = await axios.get(
        `https://projectnuckels.onrender.com/api/auth/income/other/by-date?date=${dateFilter}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setOtherIncomes(res.data);
    } catch (err) {
      if (err.response?.status !== 404) {
        console.error("Failed to load other income:", err);
        toast.error("Failed to load income records");
      }
      setOtherIncomes([]);
    }
  };

  const fetchOtherExpenses = async () => {
    try {
      const res = await axios.get(
        `https://projectnuckels.onrender.com/api/auth/expense/other/by-date?date=${dateFilter}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setOtherExpenses(res.data);
    } catch (err) {
      if (err.response?.status !== 404) {
        console.error("Failed to load other expenses:", err);
        toast.error("Failed to load expense records");
      }
      setOtherExpenses([]);
    }
  };

  // Fetch previous day's summary for "Forward Balance"
  const fetchForwardBalance = async (currentDate) => {
    try {
      const today = new Date(currentDate);
      const yesterday = new Date(today);
      yesterday.setDate(today.getDate() - 1);

      const yyyy = yesterday.getFullYear();
      const mm = String(yesterday.getMonth() + 1).padStart(2, '0');
      const dd = String(yesterday.getDate()).padStart(2, '0');
      const yesterdayStr = `${yyyy}-${mm}-${dd}`;

      const res = await axios.get(
        `https://projectnuckels.onrender.com/api/auth/cashier/shift-summary/${yesterdayStr}`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      if (res.data) {
        setForwardBalance({
          expectedClosingCash: res.data.expectedClosingCash,
          date: yesterdayStr,
          submittedAt: res.data.submittedAt
        });
      } else {
        setForwardBalance(null);
      }
    } catch (err) {
      if (err.response?.status !== 404) {
        console.error("Error fetching forward balance:", err.message);
      }
      setForwardBalance(null);
    }
  };

  // 🔍 Check if shift summary already exists for this date
  const checkExistingSummary = async () => {
    try {
      const res = await axios.get(
        `https://projectnuckels.onrender.com/api/auth/cashier/shift-summary/${dateFilter}`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      if (res.data) {
        const summary = res.data;
        setSubmittedSummary(summary);
        setIsReadOnly(true);

        // 💡 Prefill form with submitted data (optional — for review)
        setStartingCash(summary.startingCash);
        setStartingCashLocked(true);
        setCashIns(summary.cashIns || []);
        setCashOuts(summary.cashOuts || []);
      } else {
        // Reset form for new entry
        resetForm();
      }
    } catch (err) {
      if (err.response?.status === 404) {
        // No summary found — enable editing
        resetForm();
      } else {
        console.error("Error checking existing summary:", err.message);
      }
    }
  };

  // Reset form for new date or after submission
  const resetForm = () => {
    setSubmittedSummary(null);
    setIsReadOnly(false);
    setStartingCash("");
    setStartingCashLocked(false);
    setCashIns([]);
    setCashOuts([]);
  };

  // Calculate totals
  const totalCashFromOrders = orders.reduce((sum, order) => {
    const cashReceived = (order.payment?.cash || 0) - (order.payment?.changeDue || 0);
    return sum + cashReceived;
  }, 0);

  const totalCashIn = cashIns.reduce((sum, entry) => sum + parseFloat(entry.amount), 0);
  const totalCashOut = cashOuts.reduce((sum, entry) => sum + parseFloat(entry.amount), 0);
  const startingCashNum = parseFloat(startingCash) || 0;
  const expectedClosingCash = startingCashNum + totalCashFromOrders + totalCashIn - totalCashOut;

  // Handlers for Cash In/Out (disabled if readOnly)
  const [cashInDesc, setCashInDesc] = useState("");
  const [cashInAmount, setCashInAmount] = useState("");
  const [cashOutDesc, setCashOutDesc] = useState("");
  const [cashOutAmount, setCashOutAmount] = useState("");

  const addCashIn = () => {
    if (isReadOnly) return;
    if (!cashInDesc.trim() || !cashInAmount || parseFloat(cashInAmount) <= 0) return;
    const newEntry = {
      description: cashInDesc,
      amount: parseFloat(cashInAmount),
      timestamp: new Date().toISOString(),
      cashierId: cashierId
    };
    setCashIns([...cashIns, newEntry]);
    setCashInDesc("");
    setCashInAmount("");
  };

  const addCashOut = () => {
    if (isReadOnly) return;
    if (!cashOutDesc.trim() || !cashOutAmount || parseFloat(cashOutAmount) <= 0) return;
    const newEntry = {
      description: cashOutDesc,
      amount: parseFloat(cashOutAmount),
      timestamp: new Date().toISOString(),
      cashierId: cashierId
    };
    setCashOuts([...cashOuts, newEntry]);
    setCashOutDesc("");
    setCashOutAmount("");
  };

  const removeCashIn = (index) => {
    if (isReadOnly) return;
    setCashIns(cashIns.filter((_, i) => i !== index));
  };

  const removeCashOut = (index) => {
    if (isReadOnly) return;
    setCashOuts(cashOuts.filter((_, i) => i !== index));
  };

  const handleStartingCashSubmit = () => {
    if (isReadOnly) return;
    if (!startingCash || parseFloat(startingCash) < 0) return;
    setStartingCashLocked(true);
  };

  const formatCurrency = (value) => {
    const num = parseFloat(value);
    return isNaN(num) ? "0.00" : num.toFixed(2);
  };

  const formatDate = (isoString) => {
    return new Date(isoString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Submit Handler
  const handleSubmit = async () => {
    if (isReadOnly) {
      alert("This shift summary has already been submitted.");
      return;
    }
    if (!startingCashLocked) {
      alert("Please set starting cash before submitting.");
      return;
    }

    try {
      const payload = {
        date: dateFilter,
        startingCash: parseFloat(startingCash),
        cashIns: cashIns,
        cashOuts: cashOuts,
        totalCashFromOrders: totalCashFromOrders,
        expectedClosingCash: expectedClosingCash
      };

      const res = await axios.post(
        "https://projectnuckels.onrender.com/api/auth/cashier/shift-summary/submitshift",
        payload,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      alert("✅ Shift summary submitted successfully!");
      setSubmittedSummary(res.data);
      setIsReadOnly(true); // Lock after successful submit

      // ✅ Auto-advance to tomorrow
      const today = new Date(dateFilter);
      const tomorrow = new Date(today);
      tomorrow.setDate(today.getDate() + 1);
      const yyyy = tomorrow.getFullYear();
      const mm = String(tomorrow.getMonth() + 1).padStart(2, '0'); // Months 0-indexed
      const dd = String(tomorrow.getDate()).padStart(2, '0');
      const tomorrowStr = `${yyyy}-${mm}-${dd}`;

      setDateFilter(tomorrowStr);

    } catch (err) {
      console.error("Submission failed:", err.response?.data || err.message);
      const errorMsg = err.response?.data?.error || "Unknown error occurred";
      alert(`❌ Failed to submit: ${errorMsg}`);
    }
  };

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center min-vh-100">
        <div className="text-center">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="mt-3">Loading cash orders and shift data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container my-4">
      <h2 className="mb-4 text-success fw-bold">💰 Cashier Shift Summary</h2>

      {/* Date Filter */}
      <div className="card shadow-sm p-3 mb-4">
        <div className="row g-3 align-items-end">
          <div className="col-md-4">
            <label className="form-label fw-semibold">Select Date</label>
            <input
              type="date"
              className="form-control"
              value={dateFilter}
              onChange={(e) => {
                const newDate = e.target.value;
                setDateFilter(newDate);
                // Will trigger useEffect to fetch data + check submission
              }}
            />
          </div>

          <div className="col-md-4">
            <label className="form-label fw-semibold">Starting Cash Float</label>
            <div className="input-group">
              <span className="input-group-text">{symbol}</span>
              <input
                type="number"
                step="0.01"
                className="form-control"
                placeholder="e.g. 500.00"
                value={startingCash}
                onChange={(e) => setStartingCash(e.target.value)}
                disabled={startingCashLocked || isReadOnly}
              />
              {!startingCashLocked && !isReadOnly && (
                <button
                  className="btn btn-outline-success"
                  onClick={handleStartingCashSubmit}
                  disabled={!startingCash || parseFloat(startingCash) < 0}
                >
                  Set
                </button>
              )}
            </div>
            
          </div>
          <div className="col-md-4">
            {startingCashLocked && (
              <div className="form-text text-success">
                ✅ Starting cash locked for this date.
              </div>
            )}
            {isReadOnly && submittedSummary && (
              <div className="form-text text-info">
                📌 Shift summary submitted on {new Date(submittedSummary.submittedAt).toLocaleString()}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Warning Banner if Already Submitted */}
      {isReadOnly && submittedSummary && (
        <div className="alert alert-info d-flex align-items-center mb-4">
          <i className="bi bi-info-circle me-2"></i>
          <div>
            <strong>This shift was already submitted.</strong> You can view but not edit or resubmit.
          </div>
        </div>
      )}

      {/* Forward Balance Card */}
      {forwardBalance && (
        <div className="card shadow-sm mb-4 border-start border-4 border-info">
          <div className="card-body">
            <div className="d-flex justify-content-between align-items-start">
              <div>
                <h6 className="mb-1 text-info">
                  <i className="bi bi-arrow-right-circle me-2"></i>
                  Forward Balance from {forwardBalance.date}
                </h6>
                <p className="text-muted small mb-2">
                  Closing balance from previous shift (submitted {new Date(forwardBalance.submittedAt).toLocaleString()})
                </p>
                <h3 className="fw-bold text-info mb-0">
                  {symbol}{formatCurrency(forwardBalance.expectedClosingCash)}
                </h3>
              </div>
              {!isReadOnly && !startingCashLocked && (
                <button
                  className="btn btn-outline-info btn-sm"
                  onClick={() => {
                    setStartingCash(forwardBalance.expectedClosingCash);
                    setStartingCashLocked(true);
                    alert("✅ Starting Cash Float set from yesterday’s closing balance.");
                  }}
                >
                  Use as Starting Cash
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Cash In Section */}
      <div className="card shadow-sm mb-4">
        <div className="card-header bg-primary text-white d-flex justify-content-between align-items-center">
          <h6 className="mb-0">➕ Add Cash In (Tips, Float Top-Up, etc.)</h6>
          {isReadOnly && <span className="badge bg-light text-dark">Locked</span>}
        </div>
        <div className="card-body">
          {!isReadOnly && (
            <>
            <div className="row g-2">
              <div className="col-md-5">
                <input
                  type="text"
                  className="form-control"
                  placeholder="Description (e.g., 'Tip from Table 3')"
                  value={cashInDesc}
                  onChange={(e) => setCashInDesc(e.target.value)}
                  disabled={isReadOnly}
                />
              </div>
              <div className="col-md-5">
                <div className="input-group">
                  <span className="input-group-text">{symbol}</span>
                  <input
                    type="number"
                    step="0.01"
                    className="form-control"
                    placeholder="Amount"
                    value={cashInAmount}
                    onChange={(e) => setCashInAmount(e.target.value)}
                    disabled={isReadOnly}
                  />
                </div>
              </div>
              <div className="col-md-2">
                <button
                  className="btn btn-outline-primary w-100"
                  onClick={addCashIn}
                  disabled={isReadOnly || !cashInDesc.trim() || !cashInAmount || parseFloat(cashInAmount) <= 0}
                >
                  Add
                </button>
              </div>
            </div>
            </>
          )}
          
          {cashIns.length > 0 && (
            <ul className="list-group mt-3">
              {cashIns.map((entry, idx) => (
                <li key={idx} className="list-group-item d-flex justify-content-between align-items-center">
                  <div>
                    <strong>{entry.description}</strong>
                    <br />
                    <small className="text-muted">{formatDate(entry.timestamp)}</small>
                  </div>
                  <div>
                    <span className="me-3 fw-bold">{symbol}{formatCurrency(entry.amount)}</span>
                    {!isReadOnly && (
                      <button
                        className="btn btn-sm btn-outline-danger"
                        onClick={() => removeCashIn(idx)}
                      >
                        ❌
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Cash Out Section */}
      <div className="card shadow-sm mb-4">
        <div className="card-header bg-warning text-dark d-flex justify-content-between align-items-center">
          <h6 className="mb-0">➖ Add Cash Out (Petty Cash, Refunds, etc.)</h6>
          {isReadOnly && <span className="badge bg-light text-dark">Locked</span>}
        </div>
        <div className="card-body">
          {!isReadOnly && (
            <div className="row g-2">
              <div className="col-md-5">
                <input
                  type="text"
                  className="form-control"
                  placeholder="Description (e.g., 'Refund to Customer')"
                  value={cashOutDesc}
                  onChange={(e) => setCashOutDesc(e.target.value)}
                  disabled={isReadOnly}
                />
              </div>
              <div className="col-md-5">
                <div className="input-group">
                  <span className="input-group-text">{symbol}</span>
                  <input
                    type="number"
                    step="0.01"
                    className="form-control"
                    placeholder="Amount"
                    value={cashOutAmount}
                    onChange={(e) => setCashOutAmount(e.target.value)}
                    disabled={isReadOnly}
                  />
                </div>
              </div>
              <div className="col-md-2">
                <button
                  className="btn btn-outline-warning w-100"
                  onClick={addCashOut}
                  disabled={isReadOnly || !cashOutDesc.trim() || !cashOutAmount || parseFloat(cashOutAmount) <= 0}
                >
                  Add
                </button>
              </div>
            </div>
          )}
          {cashOuts.length > 0 && (
            <ul className="list-group mt-3">
              {cashOuts.map((entry, idx) => (
                <li key={idx} className="list-group-item d-flex justify-content-between align-items-center">
                  <div>
                    <strong>{entry.description}</strong>
                    <br />
                    <small className="text-muted">{formatDate(entry.timestamp)}</small>
                  </div>
                  <div>
                    <span className="me-3 fw-bold">{symbol}{formatCurrency(entry.amount)}</span>
                    {!isReadOnly && (
                      <button
                        className="btn btn-sm btn-outline-danger"
                        onClick={() => removeCashOut(idx)}
                      >
                        ❌
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="row g-3 mb-4">
        {[
          {
            label: "Starting Cash Float",
            value: `${symbol}${formatCurrency(startingCashNum)}`,
            color: "secondary",
            icon: "💵"
          },
          {
            label: submittedSummary ? submittedSummary.totalCashFromOrders === totalCashFromOrders ?
              "Cash Received (After Change)" : 
              (
                <>
                  Submitted Order Cash {symbol}{formatCurrency(submittedSummary.totalCashFromOrders)}
                  <br />
                  Total Order Cash
                </>
              ) :  
              "Cash Received (After Change)",
            value: `${symbol}${formatCurrency(totalCashFromOrders)}`,
            color: "success",
            icon: "🛒"
          },
          {
            label: "Total Cash In",
            value: `${symbol}${formatCurrency(totalCashIn)}`,
            color: "primary",
            icon: "📥"
          },
          {
            label: "Total Cash Out",
            value: `${symbol}${formatCurrency(totalCashOut)}`,
            color: "danger",
            icon: "📤"
          },
          {
            label: "Expected Closing Cash",
            value: `${symbol}${formatCurrency(expectedClosingCash)}`,
            color: "info",
            icon: "✅"
          }
        ].map((card, idx) => (
          <div className="col-md-6 col-lg-4" key={idx}>
            <div className={`card bg-${card.color} text-white shadow-sm h-100`}>
              <div className="card-body text-center">
                <div className="fs-3">{card.icon}</div>
                <h6 className="mt-2 fw-bold">{card.label}</h6>
                <h4 className="fw-bold">{card.value}</h4>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Orders Table */}
      <div className="card shadow-sm">
        <div className="card-header">
          <h6 className="mb-0">
             Cash Received Orders ({orders.length})
          </h6>
        </div>
        <div className="card-body">
          {orders.length === 0 ? (
            <p className="text-muted">No cash-received orders found for this date.</p>
          ) : (
            <div className="table-responsive">
              <table className="table table-striped table-hover">
                <thead>
                  <tr>
                    <th>Order ID</th>
                    <th>Customer</th>
                    <th>Cash Paid</th>
                    <th>Change Given</th>
                    <th>Net Cash Received</th>
                    <th>Status</th>
                    <th>Time</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order) => {
                    const cashPaid = order.payment?.cash || 0;
                    const changeDue = order.payment?.changeDue || 0;
                    const netCash = cashPaid - changeDue;
                    return (
                      <tr key={order._id}>
                        <td>#{order.invoiceNo || order._id.slice(-6)}</td>
                        <td>{order.customerName || "Walk-in"}</td>
                        <td>{symbol}{formatCurrency(cashPaid)}</td>
                        <td className="text-danger">-{symbol}{formatCurrency(changeDue)}</td>
                        <td className="fw-bold text-success">{symbol}{formatCurrency(netCash)}</td>
                        <td>
                          <span className={`badge bg-${
                            order.status === "completed" ? "success" :
                            order.status === "pending" ? "warning" : "secondary"
                          }`}>
                            {order.status}
                          </span>
                        </td>
                        <td>{new Date(order.createdAt).toLocaleTimeString()}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="d-flex justify-content-between mt-4 gap-2 flex-wrap">
        <button
          className="btn btn-outline-secondary"
          onClick={() => window.print()}
        >
          🖨️ Print Summary
        </button>
        <button
          className={`btn ${isReadOnly ? "btn-outline-secondary" : "btn-success"}`}
          onClick={handleSubmit}
          disabled={isReadOnly || !startingCashLocked}
        >
          {isReadOnly ? "✅ Already Submitted" : "✅ Submit Shift Summary"}
        </button>
      </div>
    </div>
  );
};

export default CashierSummary;