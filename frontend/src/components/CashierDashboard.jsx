// src/components/DailyReport.jsx
import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from "chart.js";
import { Doughnut } from "react-chartjs-2";
// import "./DailyReport.css";

ChartJS.register(ArcElement, Tooltip, Legend);

const DailyReport = () => {
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split("T")[0];
  });

  const [summary, setSummary] = useState({
    totalOrders: 0,
    totalOrdersIncome: 0,
    totalOtherIncome: 0,
    totalOtherExpenses: 0,
    statusCounts: {},
    paymentBreakdown: { cash: 0, cashdue: 0, card: 0, bank: 0 },
    topMenus: []
  });

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isExportingPDF, setIsExportingPDF] = useState(false);
  const [pdfProgress, setPdfProgress] = useState(0);

  const page1Ref = useRef();
  const page2ContainerRef = useRef();

  const fetchData = async (dateStr) => {
    setLoading(true);
    const token = localStorage.getItem("token");
    const date = new Date(dateStr);
    const startDate = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0)).toISOString();
    const endDate = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999)).toISOString();

    try {
      const [summaryRes, ordersRes] = await Promise.all([
        axios.get("https://unicorninstititutelms.onrender.com/api/auth/admin/summary", {
          headers: { Authorization: `Bearer ${token}` },
          params: { startDate, endDate }
        }),
        axios.get("https://unicorninstititutelms.onrender.com/api/auth/orders", {
          headers: { Authorization: `Bearer ${token}` },
          params: { startDate, endDate }
        })
      ]);

      setSummary(summaryRes.data);
      setOrders(ordersRes.data);
    } catch (err) {
      console.error("Failed to load report:", err.message);
      alert("Failed to load report data");
      setSummary({
        totalOrders: 0,
        totalOrdersIncome: 0,
        totalOtherIncome: 0,
        totalOtherExpenses: 0,
        statusCounts: {},
        paymentBreakdown: { cash: 0, cashdue: 0, card: 0, bank: 0 },
        topMenus: []
      });
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(selectedDate);
  }, [selectedDate]);

  const handleDateChange = (e) => {
    setSelectedDate(e.target.value);
  };

  const formatCurrency = (value) => {
    const num = parseFloat(value);
    return isNaN(num) ? "0.00" : num.toFixed(2);
  };

  const symbol = localStorage.getItem("currencySymbol") || "$";

  // ===== CHART DATA =====
  const statusChartData = {
    labels: Object.keys(summary.statusCounts).length > 0 ? Object.keys(summary.statusCounts) : ["No Data"],
    datasets: [{
      label: "Order Status",
      data: Object.keys(summary.statusCounts).length > 0 ? Object.values(summary.statusCounts) : [1],
      backgroundColor: ["#FF6384", "#36A2EB", "#FFCE56", "#4BC0C0", "#9966FF"],
      hoverOffset: 4
    }]
  };

  const paymentChartData = {
    labels: ["Cash", "Card", "Bank Transfer"],
    datasets: [{
      label: "Payment Methods",
      data:[
        Math.max(0, summary.paymentBreakdown.cash - summary.paymentBreakdown.cashdue),
        summary.paymentBreakdown.card || 0,
        summary.paymentBreakdown.bank || 0
      ],
      backgroundColor: ["#4CAF50", "#2196F3", "#FF9800"]
    }]
  };

  const costChartData = {
    labels: ["Other Expenses"],
    datasets: [{
      label: "Expenses",
      data:[summary.totalOtherExpenses || 0],
      backgroundColor: ["#FF9F40"]
    }]
  };

  // ===== EXPORT WITH LOADING & PAGINATED TABLE (25 ROWS PER PAGE) =====
  const exportFullReport = async () => {
    if (loading || isExportingPDF) return;

    setIsExportingPDF(true);
    setPdfProgress(0);

    try {
      const pdf = new jsPDF("p", "mm", "a4");
      const pageWidth = pdf.internal.pageSize.width;
      const pageHeight = pdf.internal.pageSize.height;

      // === PAGE 1: Summary + Charts ===
      const canvas1 = await html2canvas(page1Ref.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#fff"
      });
      const imgData1 = canvas1.toDataURL("image/png");
      const imgHeight1 = (canvas1.height * pageWidth) / canvas1.width;
      pdf.addImage(imgData1, "PNG", 0, 0, pageWidth, imgHeight1);
      setPdfProgress(30);

      // === PAGE 2+: Order Table (25 rows per page, 20px font, custom column widths) ===
      const ROWS_PER_PAGE = 25;
      const totalPages = Math.ceil(orders.length / ROWS_PER_PAGE);

      for (let p = 0; p < totalPages; p++) {
        pdf.addPage();

        // Create table with inline styles for precise control
        const table = document.createElement("table");
        table.style.width = "100%";
        table.style.borderCollapse = "collapse";
        table.style.fontSize = "20px"; // ✅ 20px font size
        table.style.fontFamily = "Arial, sans-serif";

        // Define column widths as percentages (total = 100%)
        // Adjust based on typical content length
        const colWidths = ["15%", "12%", "15%", "10%", "30%", "18%"]; // Date, Customer, Table/Type, Status, Items, Total

        // Header
        const thead = document.createElement("thead");
        const headerRow = document.createElement("tr");
        ["Date", "Customer", "Table / Type", "Status", "Items", "Total"].forEach((text, idx) => {
          const th = document.createElement("th");
          th.textContent = text;
          th.style.border = "1px solid #000";
          th.style.padding = "8px";
          th.style.textAlign = "left";
          th.style.fontWeight = "bold";
          th.style.width = colWidths[idx]; // ✅ Custom width
          th.style.fontSize = "25px";
          headerRow.appendChild(th);
        });
        thead.appendChild(headerRow);
        table.appendChild(thead);

        // Rows
        const tbody = document.createElement("tbody");
        const start = p * ROWS_PER_PAGE;
        const end = Math.min(start + ROWS_PER_PAGE, orders.length);

        for (let i = start; i < end; i++) {
          const order = orders[i];
          const itemsText = (order.items || [])
            .map(item => `${item.name} x${item.quantity}`)
            .join(", ");

          const tableTakeaway = order.tableNo > 0
            ? `Table ${order.tableNo}`
            : order.deliveryType === "Customer Pickup"
            ? `Takeaway - ${order.deliveryType}`
            : `Takeaway - ${order.deliveryPlaceName || order.deliveryType || "—"}`;

          const row = document.createElement("tr");

          const cellData = [
            new Date(order.createdAt).toLocaleString(),
            order.customerName || "—",
            tableTakeaway,
            order.status || "—",
            itemsText,
            `${symbol}${(order.totalPrice || 0).toFixed(2)}`
          ];

          cellData.forEach((text, idx) => {
            const td = document.createElement("td");
            td.textContent = text;
            td.style.border = "1px solid #000";
            td.style.padding = "8px";
            td.style.fontSize = "25px";
            td.style.width = colWidths[idx]; // ✅ Match header width

            // Right-align Total column
            if (idx === 5) td.style.textAlign = "right";
            else td.style.textAlign = "left";

            row.appendChild(td);
          });

          tbody.appendChild(row);
        }
        table.appendChild(tbody);

        // Inject into DOM temporarily for html2canvas
        table.style.position = "absolute";
        table.style.left = "-10000px";
        table.style.backgroundColor = "#fff";
        document.body.appendChild(table);

        const canvas = await html2canvas(table, {
          scale: 2,
          useCORS: true,
          backgroundColor: "#fff",
          scrollX: 0,
          scrollY: -window.scrollY
        });

        const imgData = canvas.toDataURL("image/png");
        const pageWidth = pdf.internal.pageSize.width;
        const imgHeight = (canvas.height * pageWidth) / canvas.width;

        // Ensure content fits vertically (allow partial last page)
        pdf.addImage(imgData, "PNG", 0, 10, pageWidth, Math.min(imgHeight, 280)); // 280mm ~ safe A4 height

        document.body.removeChild(table);

        const progress = 30 + Math.round(((p + 1) / totalPages) * 70);
        setPdfProgress(Math.min(progress, 100));
      }

      pdf.save(`daily_report_${selectedDate}.pdf`);
    } catch (err) {
      console.error("PDF export failed:", err);
      alert("Failed to generate PDF. Try with fewer orders.");
    } finally {
      setIsExportingPDF(false);
      setPdfProgress(0);
    }
  };

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center min-vh-100">
        <div className="text-center">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="mt-3">Loading Daily Report...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container my-4">
      {/* HEADER & DATE FILTER */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 className="text-primary fw-bold">📊 Daily Report</h2>
      </div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <label htmlFor="reportDate" className="form-label me-2">Select Date:</label>
          <input
            type="date"
            id="reportDate"
            className="form-control d-inline-block"
            style={{ width: "180px" }}
            value={selectedDate}
            onChange={handleDateChange}
          />
        </div>
        <button
          className="btn btn-danger position-relative"
          onClick={exportFullReport}
          disabled={isExportingPDF}
        >
          📄 Export Full Report (PDF)
          {isExportingPDF && (
            <span className="ms-2">
              <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
              <span className="ms-1">{pdfProgress}%</span>
            </span>
          )}
        </button>
      </div>

      {/* ===== PAGE 1: SUMMARY & GRAPHS ===== */}
      <div ref={page1Ref} className="p-3 bg-white rounded shadow-sm mb-4">
        <h4 className="text-center mb-4">📊 Summary for {selectedDate}</h4>

        {/* === MAIN METRIC CARDS === */}
        <div className="row g-3 mb-4">
          {[
            { label: "Total Orders", value: summary.totalOrders, color: "primary", icon: "🛒" },
            { label: "Orders Income", value: `${symbol}${formatCurrency(summary.totalOrdersIncome)}`, color: "success", icon: "💰" },
            { label: "Other Income", value: `${symbol}${formatCurrency(summary.totalOtherIncome)}`, color: "success", icon: "🎁" },
            { label: "Other Expenses", value: `${symbol}${formatCurrency(summary.totalOtherExpenses)}`, color: "danger", icon: "🔧" }
          ].map((card, idx) => (
            <div className="col-md-3" key={idx}>
              <div className={`card bg-${card.color} text-white shadow-sm h-100`}>
                <div className="card-body text-center">
                  <div className="fs-3">{card.icon}</div>
                  <h6 className="mt-2 fw-bold">{card.label}</h6>
                  <h5 className="fw-bold">{card.value}</h5>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* === ADDITIONAL SUMMARY CARDS === */}
        <div className="row g-3 mb-4">
          {/* Top Menus */}
          <div className="col-md-4">
            <div className="card shadow-sm h-100">
              <div className="card-body">
                <h6 className="fw-bold mb-2">🍽️ Top Ordered Menu Items</h6>
                {summary.topMenus.length === 0 ? (
                  <p className="text-muted small mb-0">No items sold</p>
                ) : (
                  <div style={{ maxHeight: "1000px", overflowY: "auto" }}>
                    <ul className="list-group list-group-flush">
                      {summary.topMenus.slice(0, 10).map((item, idx) => (
                        <li key={idx} className="list-group-item d-flex justify-content-between align-items-center py-1">
                          <span>{item.name}</span>
                          <span className="badge bg-dark">{item.count}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Order Summary */}
          <div className="col-md-4">
            <div className="card shadow-sm h-100">
              <div className="card-body">
                <h6 className="fw-bold mb-2">📌 Order Summary</h6>
                {Object.keys(summary.statusCounts).length === 0 ? (
                  <p className="text-muted small mb-0">No orders</p>
                ) : (
                  <table className="table table-sm mb-0">
                    <tbody>
                      {Object.entries(summary.statusCounts).map(([status, count]) => (
                        <tr key={status}>
                          <td>{status}</td>
                          <td className="text-end fw-bold">{count}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>

          {/* Payment Summary */}
          <div className="col-md-4">
            <div className="card shadow-sm h-100">
              <div className="card-body">
                <h6 className="fw-bold mb-2">💸 Payment Summary</h6>
                <table className="table table-sm mb-0">
                  <tbody>
                    <tr>
                      <td>Cash</td>
                      <td className="text-end">{symbol}{formatCurrency(
                        Math.max(0, summary.paymentBreakdown.cash - summary.paymentBreakdown.cashdue)
                      )}</td>
                    </tr>
                    <tr>
                      <td>Card</td>
                      <td className="text-end">{symbol}{formatCurrency(summary.paymentBreakdown.card)}</td>
                    </tr>
                    <tr>
                      <td>Bank Transfer</td>
                      <td className="text-end">{symbol}{formatCurrency(summary.paymentBreakdown.bank)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        {/* === CHARTS SECTION === */}
        <div className="row g-4">
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
                <h6 className="fw-bold text-center mb-3">📊 Other Expenses</h6>
                <Doughnut data={costChartData} options={{ plugins: { legend: { position: "bottom" } } }} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ===== PAGE 2: ORDERS TABLE (UI) ===== */}
      <div ref={page2ContainerRef}>
        <h4 className="text-center mb-3">📋 Order Details for {selectedDate}</h4>
        {orders.length === 0 ? (
          <p className="text-muted text-center">No orders found.</p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table className="table table-bordered table-hover align-middle">
              <thead className="table-light">
                <tr>
                  <th>Date</th>
                  <th>Customer</th>
                  <th>Table / Takeaway</th>
                  <th>Status</th>
                  <th>Items</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order._id}>
                    <td>{new Date(order.createdAt).toLocaleString()}</td>
                    <td>{order.customerName || "—"}</td>
                    <td>
                      {order.tableNo > 0
                        ? `Table ${order.tableNo}`
                        : order.deliveryType === "Customer Pickup"
                        ? `Takeaway - ${order.deliveryType}`
                        : `Takeaway - ${order.deliveryPlaceName || order.deliveryType || "—"}`}
                    </td>
                    <td>
                      <span className={`badge ${
                        order.status === "Ready" ? "bg-success" :
                        order.status === "Processing" ? "bg-primary" :
                        order.status === "Completed" ? "bg-secondary" :
                        "bg-warning text-dark"
                      }`}>
                        {order.status}
                      </span>
                    </td>
                    <td>
                      {(order.items || []).map((item, i) => (
                        <div key={i} style={{ fontSize: "0.9em" }}>{item.name} x{item.quantity}</div>
                      ))}
                    </td>
                    <td>{symbol}{(order.totalPrice || 0).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default DailyReport;