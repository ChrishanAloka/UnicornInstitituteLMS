// src/components/CashierSummary.jsx
import React, { useState, useEffect } from "react";
import axios from "axios";
import { FaMoneyBillWave, FaPlus, FaTrashAlt, FaSyncAlt } from "react-icons/fa";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const CashierSummary = () => {
  const [orders, setOrders] = useState([]);
  const [otherIncomes, setOtherIncomes] = useState([]); // ✅ Replaces cashIns
  const [otherExpenses, setOtherExpenses] = useState([]); // ✅ Replaces cashOuts

  const [cashIns, setCashIns] = useState([]);
  const [cashOuts, setCashOuts] = useState([]);

  const [startingCash, setStartingCash] = useState("");
  const [startingCashLocked, setStartingCashLocked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState(new Date().toISOString().split("T")[0]);
  const [submittedSummary, setSubmittedSummary] = useState(null);
  const [isReadOnly, setIsReadOnly] = useState(false);
  const [forwardBalance, setForwardBalance] = useState(null);

  // Form inputs for adding new entries
  const [incomeSource, setIncomeSource] = useState("");
  const [incomeDesc, setIncomeDesc] = useState("");
  const [incomeAmount, setIncomeAmount] = useState("");
  const [expenseSource, setExpenseSource] = useState("");
  const [expenseDesc, setExpenseDesc] = useState("");
  const [expenseAmount, setExpenseAmount] = useState("");

  const token = localStorage.getItem("token");
  const cashierId = localStorage.getItem("userId");
  const symbol = localStorage.getItem("currencySymbol") || "$";

  // Fetch data when date changes

  // Rehydrate on mount
  useEffect(() => {
    const savedLocked = localStorage.getItem('startingCashLocked');
    if (savedLocked === 'true') {
      setStartingCashLocked(true);
    }
    // else leave as false (default)
  }, []);


  useEffect(() => {
    fetchCashOrders();
    fetchOtherIncomes();
    fetchOtherExpenses();
    checkExistingSummary();
    fetchForwardBalance(dateFilter);
  }, [dateFilter]);

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
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const cashOrders = res.data.filter(
        (order) => (order.payment?.cash || 0) - (order.payment?.changeDue || 0) > 0
      );
      setOrders(cashOrders);
    } catch (err) {
      console.error("Failed to load cash orders:", err);
      toast.error("Failed to load cash orders");
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

  const fetchForwardBalance = async (currentDate) => {
    try {
      const today = new Date(currentDate);
      const yesterday = new Date(today);
      yesterday.setDate(today.getDate() - 1);

      const yyyy = yesterday.getFullYear();
      const mm = String(yesterday.getMonth() + 1).padStart(2, "0");
      const dd = String(yesterday.getDate()).padStart(2, "0");
      const yesterdayStr = `${yyyy}-${mm}-${dd}`;

      const res = await axios.get(
        `https://projectnuckels.onrender.com/api/auth/cashier/shift-summary/${yesterdayStr}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (res.data) {
        setForwardBalance({
          expectedClosingCash: res.data.expectedClosingCash,
          date: yesterdayStr,
          submittedAt: res.data.submittedAt,
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

  const checkExistingSummary = async () => {
    try {
      const res = await axios.get(
        `https://projectnuckels.onrender.com/api/auth/cashier/shift-summary/${dateFilter}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (res.data) {
        const summary = res.data;
        setSubmittedSummary(summary);
        setIsReadOnly(true);
        setStartingCash(summary.startingCash);
        setStartingCashLocked(true);

        setCashIns(summary.cashIns || []);
        setCashOuts(summary.cashOuts || []);
      } else {
        resetForm();
      }
    } catch (err) {
      if (err.response?.status === 404) {
        resetForm();
      } else {
        console.error("Error checking existing summary:", err.message);
      }
    }
  };

  const resetForm = () => {
    setSubmittedSummary(null);
    setIsReadOnly(false);
    setStartingCash("");
    setStartingCashLocked(false);

    setIncomeDesc("");
    setIncomeAmount("");
    setIncomeSource("");
    setExpenseSource("");
    setExpenseDesc("");
    setExpenseAmount("");
    // Note: otherIncomes/otherExpenses will be re-fetched via useEffect
    setCashIns([]);
    setCashOuts([]);
  };

  // ✅ Add Other Income (Cash In)
  const addOtherIncome = async () => {
    if (isReadOnly) return;
    if (incomeSource.trim() === "Other"){
      if (!incomeDesc.trim() || !incomeAmount || parseFloat(incomeAmount) <= 0) {
        toast.error("Please enter valid description and amount");
        return;
      }
    }
    else{
      if (!incomeSource || !incomeAmount || parseFloat(incomeAmount) <= 0) {
        toast.error("Please enter valid description and amount");
        return;
      }
    }
  
    try {
      const payload = {
        source: incomeSource,
        amount: parseFloat(incomeAmount),
        description: incomeDesc,
        date: dateFilter,
        paymentMethod: "Cash",
      };

      const res = await axios.post(
        "https://projectnuckels.onrender.com/api/auth/income/other",
        payload,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setOtherIncomes([...otherIncomes, res.data]);
      setIncomeDesc("");
      setIncomeAmount("");
      setIncomeSource("");
      toast.success("Cash In added!");
    } catch (err) {
      console.error("Add income failed:", err);
      toast.error("Failed to add cash in");
    }
  };

  // ✅ Add Other Expense (Cash Out)
  const addOtherExpense = async () => {
    if (isReadOnly) return;

    if (expenseSource.trim() === "Other"){
      if (!expenseDesc.trim() || !expenseAmount || parseFloat(expenseAmount) <= 0) {
        toast.error("Please enter valid description and amount");
        return;
      }
    }
    else{
      if (!expenseSource || !expenseAmount || parseFloat(expenseAmount) <= 0) {
        toast.error("Please enter valid description and amount");
        return;
      }
    }

    try {
      const payload = {
        category: expenseSource,
        amount: parseFloat(expenseAmount),
        description: expenseDesc,
        date: dateFilter,
        paymentMethod: "Cash",
      };

      const res = await axios.post(
        "https://projectnuckels.onrender.com/api/auth/expense/other",
        payload,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setOtherExpenses([...otherExpenses, res.data]);
      setExpenseDesc("");
      setExpenseAmount("");
      setExpenseSource("");
      toast.success(" Cash Out added!");
    } catch (err) {
      console.error("Add expense failed:", err);
      toast.error("Failed to add cash out");
    }
  };

  // ✅ Delete Other Income
  const deleteOtherIncome = async (id) => {
    if (isReadOnly) return;
    if (!window.confirm("Are you sure you want to delete this cash in record?")) return;

    try {
      await axios.delete(`https://projectnuckels.onrender.com/api/auth/income/other/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setOtherIncomes(otherIncomes.filter((inc) => inc._id !== id));
      toast.success("Cash in record deleted");
    } catch (err) {
      console.error("Delete failed:", err);
      toast.error("Failed to delete record");
    }
  };

  // ✅ Delete Other Expense
  const deleteOtherExpense = async (id) => {
    if (isReadOnly) return;
    if (!window.confirm("Are you sure you want to delete this cash out record?")) return;

    try {
      await axios.delete(`https://projectnuckels.onrender.com/api/auth/expense/other/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setOtherExpenses(otherExpenses.filter((exp) => exp._id !== id));
      toast.success("Cash out record deleted");
    } catch (err) {
      console.error("Delete failed:", err);
      toast.error("Failed to delete record");
    }
  };

  const totalCashFromOrders = orders.reduce((sum, order) => {
    const cashReceived = (order.payment?.cash || 0) - (order.payment?.changeDue || 0);
    return sum + cashReceived;
  }, 0);

  const CashierCashIn = cashIns.reduce((sum, entry) => sum + parseFloat(entry.amount), 0);
  const CashierCashOut = cashOuts.reduce((sum, entry) => sum + parseFloat(entry.amount), 0);

  const totalCashIn = CashierCashIn + otherIncomes.reduce((sum, inc) => sum + inc.amount, 0);
  const totalCashOut = CashierCashOut + otherExpenses.reduce((sum, exp) => sum + exp.amount, 0);
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
    if (!startingCash || parseFloat(startingCash) < 0) {
      toast.error("Please enter a valid starting cash amount");
      return;
    }
    setStartingCashLocked(true);
    localStorage.setItem('startingCashLocked', 'true'); 
  };

  const formatCurrency = (value) => {
    const num = parseFloat(value);
    return isNaN(num) ? "0.00" : num.toFixed(2);
  };

  const formatDate = (isoString) => {
    // return new Date(isoString).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
     const date = new Date(isoString);
    return date.toISOString().split('T')[0];
  };

  const handleSubmit = async () => {
    if (isReadOnly) {
      toast.info("This shift summary has already been submitted.");
      return;
    }
    if (!startingCashLocked) {
      toast.error("Please set starting cash before submitting.");
      return;
    }

    try {
      const payload = {
        date: dateFilter,
        startingCash: parseFloat(startingCash),
        cashIns: cashIns,
        cashOuts: cashOuts,
        totalCashFromOrders: totalCashFromOrders,
        expectedClosingCash: expectedClosingCash,
      };

      const res = await axios.post(
        "https://projectnuckels.onrender.com/api/auth/cashier/shift-summary/submitshift",
        payload,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      toast.success(" Shift summary submitted successfully!");
      setSubmittedSummary(res.data);
      setIsReadOnly(true);

      // Auto-advance to tomorrow
      const today = new Date(dateFilter);
      const tomorrow = new Date(today);
      tomorrow.setDate(today.getDate() + 1);
      const yyyy = tomorrow.getFullYear();
      const mm = String(tomorrow.getMonth() + 1).padStart(2, "0");
      const dd = String(tomorrow.getDate()).padStart(2, "0");
      const tomorrowStr = `${yyyy}-${mm}-${dd}`;
      setDateFilter(tomorrowStr);
      localStorage.removeItem('startingCashLocked');
    } catch (err) {
      console.error("Submission failed:", err.response?.data || err.message);
      toast.error(`❌ Failed to submit: ${err.response?.data?.error || "Unknown error"}`);
    }
  };

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center min-vh-100">
        <div className="text-center">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="mt-3">Loading cashier data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container my-4">
      <h2 className="mb-4 text-success fw-bold">
        <FaMoneyBillWave className="me-2" /> Cashier Shift Summary
      </h2>

      {/* Date & Starting Cash */}
      <div className="card shadow-sm p-3 mb-4">
        <div className="row g-3 align-items-end">
          <div className="col-md-4">
            <label className="form-label fw-semibold">Select Date</label>
            <input
              type="date"
              className="form-control"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
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
              <div className="form-text text-success">✅ Starting cash locked</div>
            )}
            {isReadOnly && submittedSummary && (
              <div className="form-text text-info">
                📌 Submitted on {new Date(submittedSummary.submittedAt).toLocaleString()}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Forward Balance */}
      {forwardBalance && (
        <div className="card shadow-sm mb-4 border-start border-4 border-info">
          <div className="card-body">
            <div className="d-flex justify-content-between align-items-start">
              <div>
                <h6 className="mb-1 text-info">
                  <FaSyncAlt className="me-2" /> Forward Balance from {forwardBalance.date}
                </h6>
                <p className="text-muted small mb-2">
                  Closing balance from previous shift (submitted{" "}
                  {new Date(forwardBalance.submittedAt).toLocaleString()})
                </p>
                <h3 className="fw-bold text-info mb-0">
                  {symbol}
                  {formatCurrency(forwardBalance.expectedClosingCash)}
                </h3>
              </div>
              {!isReadOnly && !startingCashLocked && (
                <button
                  className="btn btn-outline-info btn-sm"
                  onClick={() => {
                    setStartingCash(forwardBalance.expectedClosingCash);
                    setStartingCashLocked(true);
                    localStorage.setItem('startingCashLocked', 'true'); 
                    toast.success(" Starting Cash set from yesterday’s closing balance.");
                  }}
                >
                  Use as Starting Cash
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Cash In (Other Income) Section */}
      <div className="card shadow-sm mb-4">
        <div className="card-header bg-success text-white d-flex justify-content-between align-items-center">
          <h6 className="mb-0">
            <FaPlus className="me-2" /> Other Incomes (Tips, Float Top-Up, etc.)
          </h6>
          {isReadOnly && <span className="badge bg-light text-dark">Locked</span>}
        </div>
        <div className="card-body">
          {!isReadOnly && (
            <>
              <div className="row g-2 mb-3">
                <div className="col-md-6">
                  <div className="input-group">
                    <select
                      name="source"
                      placeholder="Income Source"
                      value={incomeSource}
                      onChange={(e) => setIncomeSource(e.target.value)}
                      className="form-select"
                      disabled={isReadOnly}
                    >
                      <option>Tips</option>
                      <option>Event Rental</option>
                      <option>Merchandise</option>
                      <option>Delivery Fee</option>
                      <option>Donations</option>
                      <option>Other</option>
                    </select>
                  </div>
                </div>
                <div className="col-md-6">
                  <div className="input-group">
                    <span className="input-group-text">{symbol}</span>
                    <input
                      type="number"
                      step="0.01"
                      className="form-control"
                      placeholder="Amount"
                      value={incomeAmount}
                      onChange={(e) => setIncomeAmount(e.target.value)}
                      disabled={isReadOnly}
                    />
                  </div>
                </div>
              </div>
              
              <div className="row g-2">
                <div className="col-md-10">
                  <div className="input-group">
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Description (e.g., 'Tip from Table 3')"
                      value={incomeDesc}
                      onChange={(e) => setIncomeDesc(e.target.value)}
                      disabled={isReadOnly}
                    />
                  </div>
                </div>
                <div className="col-md-2">
                  <button
                    className="btn btn-outline-success w-100"
                    onClick={addOtherIncome}
                    disabled={
                      isReadOnly ||
                      // !incomeDesc.trim() ||
                      !incomeAmount ||
                      parseFloat(incomeAmount) <= 0
                    }
                  >
                    Add
                  </button>
                </div>
              </div>

              {/* <div className="row g-2">
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
              </div> */}
              
            </>
          )}

          {otherIncomes.length > 0 && (
            <>
              <ul className="list-group mt-3">
                {otherIncomes.map((entry) => (
                  <li
                    key={entry._id}
                    className="list-group-item d-flex justify-content-between align-items-center"
                  >
                    <div>
                      <strong>{entry.description || entry.source}</strong>
                      <br />
                      <small className="text-muted">
                        {formatDate(entry.date)} • {entry.paymentMethod}
                      </small>
                    </div>
                    <div>
                      <span className="me-3 fw-bold text-success">
                        +{symbol}
                        {formatCurrency(entry.amount)}
                      </span>
                      {!isReadOnly && (
                        <button
                          className="btn btn-sm btn-outline-danger"
                          onClick={() => deleteOtherIncome(entry._id)}
                          title="Delete"
                        >
                          <FaTrashAlt />
                        </button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
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
            </>
          )}
        </div>
      </div>

      {/* Cash Out (Other Expense) Section */}
      <div className="card shadow-sm mb-4">
        <div className="card-header bg-danger text-white d-flex justify-content-between align-items-center">
          <h6 className="mb-0">
            <FaPlus className="me-2" /> Other Expences (Petty Cash, Refunds, etc.)
          </h6>
          {isReadOnly && <span className="badge bg-light text-dark">Locked</span>}
        </div>
        <div className="card-body">
          {!isReadOnly && (
            <>
              <div className="row g-2 mb-3">
                <div className="col-md-6">
                  <div className="input-group">
                    <select
                      name="category"                
                      placeholder="Expense Category"
                      value={expenseSource}
                      onChange={(e) => setExpenseSource(e.target.value)}
                      className="form-select"
                      disabled={isReadOnly}
                    >
                      <option>Marketing</option>
                      <option>Admin Supplies</option>
                      <option>Repairs & Maintenance</option>
                      <option>Software/Subscription</option>
                      <option>Training</option>
                      <option>Other</option>
                    </select>
                  </div>
                </div>
                <div className="col-md-6">
                  <div className="input-group">
                    <span className="input-group-text">{symbol}</span>
                    <input
                      type="number"
                      step="0.01"
                      className="form-control"
                      placeholder="Amount"
                      value={expenseAmount}
                      onChange={(e) => setExpenseAmount(e.target.value)}
                      disabled={isReadOnly}
                    />
                  </div>
                </div>
                
              </div>
              <div className="row g-2">
                <div className="col-md-10">
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Description (e.g., 'Office Supplies')"
                    value={expenseDesc}
                    onChange={(e) => setExpenseDesc(e.target.value)}
                    disabled={isReadOnly}
                  />
                </div>
                <div className="col-md-2">
                  <button
                    className="btn btn-outline-danger w-100"
                    onClick={addOtherExpense}
                    disabled={
                      isReadOnly ||
                      !expenseDesc.trim() ||
                      !expenseAmount ||
                      parseFloat(expenseAmount) <= 0
                    }
                  >
                    Add
                  </button>
                </div>
              </div>

              {/* <div className="row g-2">
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
              </div> */}
            </>
          )}

          {otherExpenses.length > 0 && (
            <>
              <ul className="list-group mt-3">
                {otherExpenses.map((entry) => (
                  <li
                    key={entry._id}
                    className="list-group-item d-flex justify-content-between align-items-center"
                  >
                    <div>
                      <strong>{entry.description || entry.category}</strong>
                      <br />
                      <small className="text-muted">
                        {formatDate(entry.date)} • {entry.paymentMethod}
                      </small>
                    </div>
                    <div>
                      <span className="me-3 fw-bold text-danger">
                        -{symbol}
                        {formatCurrency(entry.amount)}
                      </span>
                      {!isReadOnly && (
                        <button
                          className="btn btn-sm btn-outline-danger"
                          onClick={() => deleteOtherExpense(entry._id)}
                          title="Delete"
                        >
                          <FaTrashAlt />
                        </button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </div>

      {/* Cash Out Section */}
      <div className="card shadow-sm mb-4">
        <div className="card-header bg-warning text-dark d-flex justify-content-between align-items-center">
          <h6 className="mb-0">➖ Other Cash Out (Given to Boss, etc.)</h6>
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
            icon: "💵",
          },
          {
            label: "Cash from Orders",
            value: `${symbol}${formatCurrency(totalCashFromOrders)}`,
            color: "success",
            icon: "🛒",
          },
          {
            label: "Total Cash In",
            value: `${symbol}${formatCurrency(totalCashIn)}`,
            color: "primary",
            icon: "📥",
          },
          {
            label: "Total Cash Out",
            value: `${symbol}${formatCurrency(totalCashOut)}`,
            color: "danger",
            icon: "📤",
          },
          {
            label: "Expected Closing Cash",
            value: `${symbol}${formatCurrency(expectedClosingCash)}`,
            color: "info",
            icon: "✅",
          },
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
          <h6 className="mb-0">Cash Received Orders ({orders.length})</h6>
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
                          <span
                            className={`badge bg-${
                              order.status === "completed"
                                ? "success"
                                : order.status === "pending"
                                ? "warning"
                                : "secondary"
                            }`}
                          >
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
        <button className="btn btn-outline-secondary" onClick={() => window.print()}>
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

      <ToastContainer />
    </div>
  );
};

export default CashierSummary;