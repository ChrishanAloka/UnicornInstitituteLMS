// src/components/TodaySummary.jsx
import React, { useState, useEffect } from "react";
import axios from "axios";
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from "chart.js";
import { Doughnut } from "react-chartjs-2";

ChartJS.register(ArcElement, Tooltip, Legend);

const TodaySummary = () => {
  const [summary, setSummary] = useState({
    totalIncome: 0,
    totalOtherIncome: 0, // ✅ NEW
    totalSupplierExpenses: 0,
    totalBills: 0,
    totalSalaries: 0,
    totalOtherExpenses: 0, // ✅ NEW
    totalCost: 0,
    netProfit: 0,
    totalOrders: 0,
    totalOrdersIncome: 0,
    statusCounts: {},
    paymentBreakdown: { cash: 0, cashdue: 0, card: 0, bank: 0 },
    topMenus: []
  });

  const [loading, setLoading] = useState(true);

  // Load today’s summary on mount
  useEffect(() => {
    fetchTodaySummary();
  }, []);

  const fetchTodaySummary = async () => {
    try {
      const token = localStorage.getItem("token");

      // Set today’s start and end
      const today = new Date();
      const startDate = new Date(today.setHours(0, 0, 0, 0)).toISOString();
      const endDate = new Date(today.setHours(23, 59, 59, 999)).toISOString();

      const res = await axios.get("https://unicorninstititutelms.onrender.com/api/auth/admin/summary", {
        headers: { Authorization: `Bearer ${token}` },
        params: { startDate, endDate }
      });

      setSummary(res.data);
    } catch (err) {
      console.error("Failed to load today’s summary:", err.message);
      alert("Failed to load today’s summary");
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value) => {
    const num = parseFloat(value);
    return isNaN(num) ? "0.00" : num.toFixed(2);
  };

  const symbol = localStorage.getItem("currencySymbol") || "$";

  // ✅ Cost Breakdown Chart Data
  const costChartData = {
    labels: [ "Other Expenses"], // ✅ UPDATED
    datasets: [{
      label: "Expenses",
      data: [
        // summary.totalSupplierExpenses,
        // summary.totalBills,
        // summary.totalSalaries,
        summary.totalOtherExpenses // ✅ NEW
      ],
      backgroundColor: [ "#FF9F40"] // ✅ ADDED Orange for Other Expenses
    }]
  };

  // ✅ Order Status Pie Chart
  const statusChartData = {
    labels: Object.keys(summary.statusCounts),
    datasets: [{
      label: "Order Status",
      data: Object.values(summary.statusCounts),
      backgroundColor: ["#FF6384", "#36A2EB", "#FFCE56", "#4BC0C0", "#9966FF"],
      hoverOffset: 4
    }]
  };

  // ✅ Payment Method Doughnut Chart
  const paymentChartData = {
    labels: ["Cash", "Card", "Bank Transfer"],
    datasets: [{
      label: "Payment Methods",
      data: [
        (summary.paymentBreakdown.cash - summary.paymentBreakdown.cashdue),
        summary.paymentBreakdown.card,
        summary.paymentBreakdown.bank
      ],
      backgroundColor: ["#4CAF50", "#2196F3", "#FF9800"]
    }]
  };

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center min-vh-100">
        <div className="text-center">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="mt-3">Loading Today’s Summary...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container my-4">
      <h2 className="mb-4 text-primary fw-bold">📊 Today’s Summary</h2>

      {/* Summary Cards */}
      <div className="row g-3 mb-4">
        {[
          { label: "Total Orders", value: summary.totalOrders, color: "primary", icon: "🛒" },
          { label: "Orders Income", value: `${symbol}${formatCurrency(summary.totalOrdersIncome)}`, color: "success", icon: "💰" },
          { label: "Other Income", value: `${symbol}${formatCurrency(summary.totalOtherIncome)}`, color: "success", icon: "🎁"}, // ✅ NEW
          { label: "Other Expenses", value: `${symbol}${formatCurrency(summary.totalOtherExpenses)}`, color: "danger", icon: "🔧"} // ✅ NEW
          // { label: "Total Cost", value: `${symbol}${formatCurrency(summary.totalCost)}`, color: "danger", icon: "📉" },
          // {
          //   label: "Net Profit",
          //   value: `${summary.netProfit >= 0 ? "+" : "-"}${symbol}${formatCurrency(Math.abs(summary.netProfit))}`,
          //   color: summary.netProfit >= 0 ? "info" : "warning",
          //   icon: summary.netProfit >= 0 ? "📈" : "⚠️",
          // },
        ].map((card, idx) => (
          <div className="col-md-3" key={idx}>
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

      {/* Chart Section */}
      <div className="row g-4 mb-4">
        <div className="col-md-4">
          <div className="card shadow-sm h-100">
            <div className="card-body">
              <h6 className="fw-bold text-center mb-3">📦 Order Status</h6>
              <Doughnut data={statusChartData} />
            </div>
          </div>
        </div>
        <div className="col-md-4">
          <div className="card shadow-sm h-100">
            <div className="card-body">
              <h6 className="fw-bold text-center mb-3">💳 Payment Methods</h6>
              <Doughnut data={paymentChartData} />
            </div>
          </div>
        </div>
        <div className="col-md-4">
          <div className="card shadow-sm h-100">
            <div className="card-body">
              <h6 className="fw-bold text-center mb-3">📊 Cost Breakdown</h6>
              <Doughnut data={costChartData} options={{ plugins: { legend: { position: "bottom" } } }} />
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Tables Section */}
      <div className="row g-4">
        <div className="col-md-4">
          <div className="card shadow-sm h-100">
            <div className="card-body">
              <h6 className="fw-bold mb-3">🍽️ Top Ordered Menu Items</h6>
              <ul className="list-group">
                {summary.topMenus.length === 0 && (
                  <li className="list-group-item text-muted">No data for today</li>
                )}
                {summary.topMenus.slice(0, 10).map((item, idx) => (
                  <li
                    key={idx}
                    className="list-group-item d-flex justify-content-between align-items-center"
                  >
                    {item.name}
                    <span className="badge bg-dark">{item.count}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        <div className="col-md-4">
          <div className="card shadow-sm h-100">
            <div className="card-body">
              <h6 className="fw-bold mb-3">📌 Order Summary</h6>
              <table className="table table-sm table-hover table-striped">
                <thead>
                  <tr>
                    <th>Status</th>
                    <th>Count</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(summary.statusCounts).length === 0 && (
                    <tr><td colSpan="2" className="text-muted">No orders today</td></tr>
                  )}
                  {Object.entries(summary.statusCounts).map(([status, count], idx) => (
                    <tr key={idx}>
                      <td>{status}</td>
                      <td>{count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="col-md-4">
          <div className="card shadow-sm h-100">
            <div className="card-body">
              <h6 className="fw-bold mb-3">💸 Payment Summary</h6>
              <table className="table table-sm table-hover table-striped">
                <thead>
                  <tr>
                    <th>Method</th>
                    <th>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ["Cash", (summary.paymentBreakdown.cash - summary.paymentBreakdown.cashdue)],
                    ["Card", summary.paymentBreakdown.card],
                    ["Bank Transfer", summary.paymentBreakdown.bank],
                  ].map(([label, val], idx) => (
                    <tr key={idx}>
                      <td>{label}</td>
                      <td>{symbol}{formatCurrency(val)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TodaySummary;