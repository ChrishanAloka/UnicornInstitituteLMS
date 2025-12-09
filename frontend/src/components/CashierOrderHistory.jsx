import React, { useState, useEffect } from "react";
import axios from "axios";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import "./CashierOrderHistory.css";
// import { printToBothPrinters } from "../utils/dualPrinter";
import { printReceiptToBoth } from "../utils/printReceipt";
import ReceiptModal from "./ReceiptModal";

if (!window.printElement) {
  window.printElement = (element) => {
    const originalContents = document.body.innerHTML;
    const printContent = element.outerHTML;

    document.body.innerHTML = `
      <style>
        body { font-family: monospace; max-width: 400px; margin: auto; }
        h3, p, li { display: block; width: 100%; text-align: left; }
      </style>
      ${printContent}
    `;

    window.print();
    document.body.innerHTML = originalContents;
    window.location.reload();
  };
}

const CashierOrderHistory = () => {
  const [orders, setOrders] = useState([]);
  const [filters, setFilters] = useState({
    startDate: "",
    endDate: "",
    status: "",
    orderType: "",        // "table" or "takeaway"
    deliveryType: ""
  });
  const [receiptOrder, setReceiptOrder] = useState(null);
  const [isExportingPDF, setIsExportingPDF] = useState(false);
  const [pdfProgress, setPdfProgress] = useState(0); // 0 to 100
  const [isExportingExcel, setIsExportingExcel] = useState(false);
  const [excelProgress, setExcelProgress] = useState(0);

  useEffect(() => {
    fetchOrders();
  }, [filters]);

  const fetchOrders = async () => {
    const token = localStorage.getItem("token");

    // Get start and end of selected date
    const start = new Date(filters.startDate);
    const end = new Date(filters.endDate);

    // Set time to start & end of day
    start.setHours(0, 0, 0, 0);     // 00:00:00
    end.setHours(23, 59, 59, 999); // 23:59:59

    const params = new URLSearchParams();

    if (filters.startDate) params.append("startDate", start);
    if (filters.endDate) params.append("endDate", end);
    if (filters.status) params.append("status", filters.status);
    if (filters.orderType) params.append("orderType", filters.orderType);
    if (filters.deliveryType) params.append("deliveryType", filters.deliveryType);

    try {
      const res = await axios.get(
        `https://projectnuckels.onrender.com/api/auth/orders?${params.toString()}`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      setOrders(res.data);
    } catch (err) {
      console.error("Failed to load orders:", err.response?.data || err.message);
      alert("Failed to load order history");
    }
  };

  const exportToExcel = async () => {
    if (orders.length === 0) {
      alert("No orders to export.");
      return;
    }

    setIsExportingExcel(true);
    setExcelProgress(0);

    const formatDate = (dateStr) => {
      if (!dateStr) return "N/A";
      const d = new Date(dateStr);
      return isNaN(d.getTime()) ? "Invalid Date" : d.toLocaleString();
    };

    try {
      await new Promise(resolve => setTimeout(resolve, 100));
      setExcelProgress(20);

      const symbol = localStorage.getItem("currencySymbol") || "$";
      const total = orders.length;
      const worksheetData = [];

      for (let i = 0; i < orders.length; i++) {
        const order = orders[i];

        // ✅ 1. Format items as "Item xQty, ..."
        const itemsText = order.items
          ?.map(item => `${item.name} x${item.quantity}`)
          .join(", ") || "—";

        // ✅ 2. Format Table / Takeaway column exactly as requested
        let tableTakeawayText;
        if (order.tableNo > 0) {
          tableTakeawayText = `Table ${order.tableNo}`;
        } else {
          if (order.deliveryType === "Customer Pickup") {
            tableTakeawayText = `Takeaway - ${order.deliveryType}`;
          } else {
            tableTakeawayText = `Takeaway - ${order.deliveryPlaceName || order.deliveryType || "—"}`;
          }
        }

        worksheetData.push({
          Date: formatDate(order.createdAt),
          Customer: order.customerName || "—",
          "Table / Takeaway": tableTakeawayText, // Updated column name for clarity
          Status: order.status || "—",
          Items: itemsText,
          Total: order.totalPrice ? `${symbol}${order.totalPrice.toFixed(2)}` : "—"
        });

        if (i % 100 === 0 || i === orders.length - 1) {
          const progress = Math.min(90, Math.round(((i + 1) / total) * 100));
          setExcelProgress(progress);
        }
      }

      setExcelProgress(95);

      const XLSX = await import("xlsx");
      const ws = XLSX.utils.json_to_sheet(worksheetData);
      const range = XLSX.utils.decode_range(ws['!ref'] || "A1");
      const colWidths = [];
      for (let C = range.s.c; C <= range.e.c; ++C) {
        const col = XLSX.utils.encode_col(C);
        const maxWidth = worksheetData.reduce((w, row) => {
          const cell = row[Object.keys(row)[C]] || "";
          return Math.max(w, (cell?.toString()?.length || 10));
        }, 10);
        colWidths.push({ wch: Math.min(maxWidth + 2, 50) }); // cap at 50 chars
      }
      ws['!cols'] = colWidths;
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Orders");
      XLSX.writeFile(wb, "cashier_orders.xlsx");

      setExcelProgress(100);
    } catch (err) {
      console.error("Excel export failed:", err);
      alert("Failed to export Excel file.");
    } finally {
      setTimeout(() => {
        setIsExportingExcel(false);
        setExcelProgress(0);
      }, 300);
    }
  };

  const symbol = localStorage.getItem("currencySymbol") || "$";

  const exportToPDF = async () => {
    if (orders.length === 0) {
      alert("No orders to export.");
      return;
    }

    setIsExportingPDF(true);
    setPdfProgress(0);

    const symbol = localStorage.getItem("currencySymbol") || "$";
    const pdf = new jsPDF("p", "mm", "a4");
    const pageWidth = 210;
    const margin = 10;
    const tableWidth = pageWidth - 2 * margin;
    const ROWS_PER_PAGE = 20;
    const totalPages = Math.ceil(orders.length / ROWS_PER_PAGE);

    try {
      for (let pageIndex = 0; pageIndex < totalPages; pageIndex++) {
        if (pageIndex > 0) pdf.addPage();

        // Create table for this page
        const table = document.createElement("table");
        table.style.width = `${tableWidth}mm`;
        table.style.fontSize = "12px";
        table.style.borderCollapse = "collapse";
        table.style.fontFamily = "sans-serif";

        const thead = document.createElement("thead");
        thead.innerHTML = `
          <tr>
            <th style="border:0.5px solid #000; padding:4px; background:#f0f0f0;">Date</th>
            <th style="border:0.5px solid #000; padding:4px; background:#f0f0f0;">Customer</th>
            <th style="border:0.5px solid #000; padding:4px; background:#f0f0f0;">Table/Type</th>
            <th style="border:0.5px solid #000; padding:4px; background:#f0f0f0;">Status</th>
            <th style="border:0.5px solid #000; padding:4px; background:#f0f0f0;">Items</th>
            <th style="border:0.5px solid #000; padding:4px; background:#f0f0f0;">Total</th>
          </tr>
        `;
        table.appendChild(thead);

        const tbody = document.createElement("tbody");
        const start = pageIndex * ROWS_PER_PAGE;
        const end = Math.min(start + ROWS_PER_PAGE, orders.length);
        for (let i = start; i < end; i++) {
          const order = orders[i];
          const itemsText = order.items
            .map(item => `${item.name} x${item.quantity}`)
            .join(", ");

          const row = document.createElement("tr");
          row.innerHTML = `
            <td style="border:0.5px solid #000; padding:4px;">${new Date(order.createdAt).toLocaleString()}</td>
            <td style="border:0.5px solid #000; padding:4px;">${order.customerName || ""}</td>
            <td style="border:0.5px solid #000; padding:4px;">${order.tableNo > 0 ? `Table ${order.tableNo}` : order.deliveryType === "Customer Pickup" ? `Takeway - ${order.deliveryType}` : `Takeaway - ${order.deliveryPlaceName}`}</td>
            <td style="border:0.5px solid #000; padding:4px;">${order.status || ""}</td>
            <td style="border:0.5px solid #000; padding:4px; font-size:12px;">${itemsText}</td>
            <td style="border:0.5px solid #000; padding:4px; text-align:right;">${symbol}${(order.totalPrice || 0).toFixed(2)}</td>
          `;
          tbody.appendChild(row);
        }
        table.appendChild(tbody);

        table.style.position = "absolute";
        table.style.left = "-10000px";
        document.body.appendChild(table);

        const canvas = await html2canvas(table, {
          scale: 2,
          useCORS: true,
          backgroundColor: "#fff",
        });

        const imgData = canvas.toDataURL("image/png");
        const imgWidth = tableWidth;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        pdf.addImage(imgData, "PNG", margin, margin, imgWidth, imgHeight);

        document.body.removeChild(table);

        // ✅ Update progress: (pageIndex + 1) / totalPages
        const progress = Math.round(((pageIndex + 1) / totalPages) * 100);
        setPdfProgress(progress);
      }

      pdf.save("cashier_orders.pdf");
    } catch (err) {
      console.error("PDF export failed:", err);
      alert("Failed to generate PDF. Please try with fewer orders.");
    } finally {
      setIsExportingPDF(false);
      setPdfProgress(0); // Reset when done
    }
  };

  

  // 🧾 Generate Receipt & Print/Export
  const generateReceipt = (order) => {
    const symbol = localStorage.getItem("currencySymbol") || "$";
    const customerName = order.customerName || "-";
    const customerPhone = order.customerPhone || "-";
    const tableNo = order.tableNo || 0;
    const totalPrice = order.totalPrice || 0;

    // Create container
    const container = document.createElement("div");
    container.id = "dynamic-receipt";
    container.style.position = "fixed";
    container.style.top = "0";
    container.style.left = "0";
    container.style.right = "0";
    container.style.zIndex = "10000";
    container.style.background = "#fff";
    container.style.padding = "20px";
    container.style.fontFamily = "Calibri, sans-serif"; // ✅ Calibri font
    container.style.maxWidth = "380px";
    container.style.margin = "auto";
    container.style.boxShadow = "0 0 10px rgba(0,0,0,0.25)";
    container.style.border = "1px solid #ccc";
    container.style.borderRadius = "10px";

    // Generate invoice detail rows with dash-fill alignment
    const invoiceDetails = `
      <div style="font-size:14px; margin-bottom:12px; line-height:1.6;">
        <div style="display:flex; align-items:center; gap:4px;">
          <div style="width:90px; line-height:0; padding-bottom:4px;"><strong>Invoice No:</strong></div>
          <div>${order.invoiceNo || "-"}</div>
        </div>
        <div style="display:flex; align-items:center; gap:4px;">
          <div style="width:90px; line-height:0; padding-bottom:4px;"><strong>Date:</strong></div>
          <div>${new Date(order.createdAt || Date.now()).toLocaleString()}</div>
        </div>
        <div style="display:flex; align-items:center; gap:4px;">
          <div style="width:90px; line-height:0; padding-bottom:4px;"><strong>Customer:</strong></div>
          <div>${customerName}</div>
        </div>
        <div style="display:flex; align-items:center; gap:4px;">
          <div style="width:90px; line-height:0; padding-bottom:4px;"><strong>Phone:</strong></div>
          <div>${customerPhone}</div>
        </div>
        <div style="display:flex; align-items:center; gap:4px;">
          <div style="width:90px; line-height:0; padding-bottom:4px;"><strong>Order Type:</strong></div>
          <div>${tableNo > 0 ? `Dine In - Table ${tableNo}` : "Takeaway"}</div>
        </div>
        ${tableNo <= 0 && order.deliveryType ? `
        <div style="display:flex; align-items:center; gap:4px;">
          <div style="width:90px; line-height:0; padding-bottom:4px;"><strong>Delivery Type:</strong></div>
          <div>${order.deliveryType}</div>
        </div>` : ""}
      </div>
    `;

    // Generate item rows
    const itemRows = order.items.map(item => `
      <tr>
        <td style="padding:4px 0; width:50%; text-align:left;">${item.name}</td>
        <td style="padding:4px 0; width:20%; text-align:center;">${item.quantity}</td>
        <td style="padding:4px 0; width:30%; text-align:right;">${symbol}${(item.price || 0).toFixed(2)}</td>
      </tr>
    `).join("");

    // Service charge row
    const serviceChargeRow = order.serviceCharge > 0 ? `
      <tr>
        <td style="padding:4px 0; text-align:left;">Service Charge (${((order.serviceCharge * 100) / (order.subtotal || 1)).toFixed(2)}%)</td>
        <td></td>
        <td style="padding:4px 0; text-align:right;">${symbol}${order.serviceCharge.toFixed(2)}</td>
      </tr>
    ` : "";

    // Delivery charge row
    const deliveryChargeRow = order.deliveryCharge > 0 ? `
      <tr>
        <td style="padding:4px 0; text-align:left;">Delivery Charge</td>
        <td></td>
        <td style="padding:4px 0; text-align:right;">${symbol}${order.deliveryCharge.toFixed(2)}</td>
      </tr>
    ` : "";

    // Payment section
    const paymentSection = order.payment ? `
      <p style="margin:4px;"><strong>Paid via:</strong></p>
      ${order.payment.cash > 0 ? `<p style="margin:4px;">Cash: ${symbol}${order.payment.cash.toFixed(2)}</p>` : ""}
      ${order.payment.card > 0 ? `<p style="margin:4px;">Card: ${symbol}${order.payment.card.toFixed(2)}</p>` : ""}
      ${order.payment.bankTransfer > 0 ? `<p style="margin:4px;">Bank Transfer: ${symbol}${order.payment.bankTransfer.toFixed(2)}</p>` : ""}
      <p style="margin:4px;"><strong>Total Paid:</strong> ${symbol}${(order.payment.totalPaid || 0).toFixed(2)}</p>
      <p style="margin:4px;"><strong>Change Due:</strong> ${symbol}${(order.payment.changeDue || 0).toFixed(2)}</p>
    ` : "";

    // Delivery note (if exists)
    const deliveryNoteSection = order.deliveryCharge > 0 && order.deliveryNote ? `
      <p><strong>Delivery Note:</strong></p>
      <p>${order.deliveryNote}</p>
    ` : "";

    // Build full HTML
    container.innerHTML = `
      <h3 style="text-align:center; margin:0;"><strong>Gasma</strong></h3>
      <h3 style="text-align:center; margin:4px 0 12px;"><strong>Chinese Restaurant</strong></h3>
      <p style="text-align:center; margin:0;">No. 14/2/D, Pugoda Road, Katulanda, Dekatana.</p>
      <p style="text-align:center; margin:0 0 16px;">0777122797</p>
      <hr />

      ${invoiceDetails}

      <hr />

      <table style="width:100%; border-collapse:collapse; margin-bottom:16px;">
        <thead>
          <tr>
            <th style="padding:4px 0; width:50%; text-align:left;">Items</th>
            <th style="padding:4px 0; width:20%; text-align:center;">Qty</th>
            <th style="padding:4px 0; width:30%; text-align:right;">Amount</th>
          </tr>
        </thead>
        <tbody>
          ${itemRows}
          ${serviceChargeRow}
          ${deliveryChargeRow}
        </tbody>
      </table>

      <hr />
      <h5 style="text-align:right; margin:0;">Total: ${symbol}${totalPrice.toFixed(2)}</h5>

      ${paymentSection ? `<hr />${paymentSection}` : ""}

      <hr />
      <p style="text-align:center; margin:8px 0;">Thank you for your order!</p>
      <p style="text-align:center; margin:4px 0; font-size:12px;">SOFTWARE BY: RAXWO (Pvt) Ltd.</p>
      <p style="text-align:center; margin:4px 0 16px; font-size:12px;">CONTACT: 074 357 3333</p>
      <hr />

      ${deliveryNoteSection}
    `;

    document.body.appendChild(container);

    // ========== PRINT & EXPORT FUNCTIONS ==========

    const exportPDF = () => {
      if (typeof html2canvas !== 'undefined' && typeof jsPDF !== 'undefined') {
        html2canvas(container).then((canvas) => {
          const imgData = canvas.toDataURL("image/png");
          const pdf = new jsPDF("p", "mm", "a4");
          const width = pdf.internal.pageSize.getWidth();
          const height = (canvas.height * width) / canvas.width;
          pdf.addImage(imgData, "PNG", 0, 0, width, height);
          pdf.save("receipt.pdf");
        });
      } else {
        alert("PDF libraries not loaded. Please include html2canvas and jsPDF.");
      }
    };

    const printReceipt = () => {
      const originalContent = document.body.innerHTML;
      const printWindow = window.open("", "_blank");
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Print Receipt</title>
            <style>
              body { margin: 0; padding: 20px; font-family: Calibri, sans-serif; }
              #print-receipt { max-width: 380px; margin: auto; }
            </style>
          </head>
          <body>
            <div id="print-receipt">${container.innerHTML}</div>
            <script>
              window.onload = () => { window.print(); setTimeout(window.close, 500); };
            </script>
          </body>
        </html>
      `);
      printWindow.document.close();
    };

    // ========== USER PROMPT ==========

    const proceed = window.confirm("Do you want to print the receipt?");
    if (proceed) {
      // printReceipt();
      if (window.qz && qz.websocket.isActive()) {
        printReceiptToBoth(container.innerHTML);
      } else {
        console.warn("QZ Tray not connected — using browser print");
        const printWindow = window.open("", "_blank");
        printWindow.document.write(container.innerHTML);
        printWindow.print();
      }
    } else {
      exportPDF();
    }

    // Auto-remove after 5 seconds
    setTimeout(() => {
      if (container.parentNode) {
        container.remove();
      }
    }, 5000);
  };

  const handleDeleteOrder = async (orderId, customerName) => {
    if (!window.confirm(`Are you sure you want to delete the order for ${customerName}? This cannot be undone.`)) {
      return;
    }

    try {
      const token = localStorage.getItem("token");
      await axios.delete(
        `https://projectnuckels.onrender.com/api/auth/order/${orderId}`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      // Remove from UI
      setOrders(prev => prev.filter(order => order._id !== orderId));
      alert("Order deleted successfully");
    } catch (err) {
      console.error("Delete failed:", err.response?.data || err.message);
      alert("Failed to delete order: " + (err.response?.data?.error || "Unknown error"));
    }
  };

  // Add this after handleDeleteOrder
  const markAsReady = async (orderId) => {
    if (!window.confirm("Mark this order as Ready?")) return;

    try {
      const token = localStorage.getItem("token");
      
      // Update order status to "Ready"
      await axios.put(
        `https://projectnuckels.onrender.com/api/auth/order/${orderId}/status`,
        { status: "Ready" },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      // Optional: Send notification (same as KitchenLanding)
      // You can skip if not needed for cashier
      /*
      await axios.post(
        "https://projectnuckels.onrender.com/api/auth/notifications/send",
        {
          userId: orderId,
          message: `Order #${orderId} is ready.`,
          type: "update",
          role: "cashier",
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      */

      // Update UI: change status locally
      setOrders(prev =>
        prev.map(order =>
          order._id === orderId ? { ...order, status: "Ready" } : order
        )
      );

      alert("✅ Order marked as Ready!");
    } catch (err) {
      console.error("Failed to mark as ready:", err.response?.data || err.message);
      alert("❌ Failed to update order status");
    }
  };



  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  return (
    // <div className="mobile-scroll-container container-fluid px-3">
   <div className="mobile-scroll-container container my-4"> 
      <h2 className="mb-4 fw-bold text-primary border-bottom pb-2">Order History</h2>

      {/* Filters & Actions */}
      <div className="row g-3 align-items-end mb-4" style={{ overflowX: "auto", width: "100%" }}>
        <div className="col-md-2">
          <label className="form-label">Start Date</label>
          <input
            name="startDate"
            type="date"
            className="form-control"
            onChange={handleFilterChange}
          />
        </div>
        <div className="col-md-2">
          <label className="form-label">End Date</label>
          <input
            name="endDate"
            type="date"
            className="form-control"
            onChange={handleFilterChange}
          />
        </div>
        <div className="col-md-2">
          <label className="form-label">Status</label>
          <select
            name="status"
            className="form-select"
            onChange={handleFilterChange}
          >
            <option value="">All</option>
            <option value="Pending">Pending</option>
            <option value="Processing">Processing</option>
            <option value="Ready">Ready</option>
            <option value="Completed">Completed</option>
          </select>
        </div>
        {/* Order Type Filter */}
        <div className="col-md-2">
          <label className="form-label">Order Type</label>
          <select
            name="orderType"
            className="form-select"
            value={filters.orderType}
            onChange={handleFilterChange}
          >
            <option value="">All Types</option>
            <option value="table">Dine-In</option>
            <option value="takeaway">Takeaway</option>
          </select>
        </div>

        {/* Delivery Type Filter (only relevant for Takeaway) */}
        {filters.orderType === "takeaway" || filters.orderType === "" && (
          <div className="col-md-2">
            <label className="form-label">Delivery Type</label>
            <select
              name="deliveryType"
              className="form-select"
              value={filters.deliveryType}
              onChange={handleFilterChange}
            >
              <option value="">All</option>
              <option value="Customer Pickup">Customer Pickup</option>
              <option value="Delivery Service">Delivery Service</option>
            </select>
          </div>
        )}
        <div className="col-md-2 d-flex gap-2">
          <button className="btn btn-primary w-100" onClick={fetchOrders}>Apply</button>
        </div>
      </div>

      <div className="mb-4 d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center gap-3">
        
        <div className="d-flex gap-2"></div>
        
        <div className="d-flex gap-2">
          <button className="btn btn-success" onClick={exportToExcel} disabled={isExportingExcel || isExportingPDF}>
            📤 Export Excel
            {isExportingExcel && (
              <span className="ms-2 pdf-export-loader">
                <span>{excelProgress}%</span>
              </span>
            )}
          </button>
          <button className="btn btn-danger" onClick={exportToPDF} disabled={isExportingPDF}>
            📄 Export PDF
            {isExportingPDF && (
              <span className="ms-2 pdf-export-loader">
                <span>{pdfProgress}%</span>
              </span>
            )}
            {/* <span className="progress-text" style={{ color: 'red', background: 'white', borderRadius: '50%' }}>
              {pdfProgress}%
            </span> */}
          </button>
          
        </div>
      </div>

      {/* Order Table */}
      {orders.length === 0 ? (
        <p className="text-muted">No orders found.</p>
      ) : (
        <div
          id="order-table"
          className="shadow-sm border rounded"
          style={{
            overflowX: "auto",
            width: "100%"
          }}
        >
          <table className="table table-hover align-middle table-bordered mb-0">
            <thead className="table-light">
              <tr>
                <th>Date</th>
                <th>Customer</th>
                <th>Table No/ Takeaway</th>
                <th>Status</th>
                <th>Items</th>
                <th>Total</th>
                <th>Receipt</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order._id}>
                  <td>{new Date(order.createdAt).toLocaleString()}</td>
                  <td>{order.customerName}</td>
                  <td>{order.tableNo > 0 ? `Table ${order.tableNo} - ${order.waiterName || ""}` : `Takeaway (${order.deliveryType || ""} - ${order.deliveryPlaceName || ""})`}</td>
                  <td>
                    <span
                      className={`badge ${
                        order.status === "Ready"
                          ? "bg-success"
                          : order.status === "Processing"
                          ? "bg-primary"
                          : order.status === "Completed"
                          ? "bg-secondary"
                          : "bg-warning text-dark"
                      }`}
                    >
                      {order.status}
                    </span>
                  </td>
                  <td>
                    <ul className="mb-0 small list-unstyled">
                      {order.items.map((item, idx) => (
                        <li key={idx}>
                          {item.name} x{item.quantity}
                        </li>
                      ))}
                    </ul>
                  </td>
                  <td>{symbol}{order.totalPrice?.toFixed(2)}</td>
                  <td>
                    <div className="d-flex gap-2">
                      {/* Mark as Ready Button (only for Pending/Processing) */}
                      {(order.status === "Pending" || order.status === "Processing") && (
                        <button
                          className="btn btn-sm btn-success"
                          onClick={() => markAsReady(order._id)}
                          title="Mark order as ready for pickup"
                        >
                          ✅ Ready
                        </button>
                      )}
                      <button
                        className="btn btn-sm btn-outline-secondary"
                        // onClick={() => generateReceipt(order)}
                        onClick={() => setReceiptOrder(order)}
                      >
                        🖨️ Print
                      </button>
                      <button
                        className="btn btn-sm btn-outline-danger"
                        onClick={() => handleDeleteOrder(order._id, order.customerName)}
                        title="Delete Order"
                      >
                        🗑️
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {receiptOrder && (
        <ReceiptModal
          order={receiptOrder}
          onClose={() => setReceiptOrder(null)}
        />
      )}
    </div>
  );
};

export default CashierOrderHistory;
