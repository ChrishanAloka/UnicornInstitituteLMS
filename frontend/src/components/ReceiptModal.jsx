import React from "react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { printReceiptToBoth } from "../utils/printReceipt";
import LogoImage from "../upload/logo.png";

const exportToPDF = () => {
  const input = document.getElementById("receipt-content");

  if (!input) {
    alert("Receipt not found");
    return;
  }

  html2canvas(input).then((canvas) => {
    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF("p", "mm", "a4");
    const width = pdf.internal.pageSize.getWidth();
    const height = (canvas.height * width) / canvas.width;

    pdf.addImage(imgData, "PNG", 0, 0, width, height);
    pdf.save("receipt.pdf");
  });
};

const ReceiptModal = ({ order, onClose }) => {
  if (!order) return null;

  const symbol = localStorage.getItem("currencySymbol") || "$";

  const {
    customerName,
    customerPhone,
    tableNo,
    items,
    totalPrice
  } = order;

  // Inside ReceiptModal component
  const generatePrintableHTML = () => {
    const symbol = localStorage.getItem("currencySymbol") || "$";
    const now = new Date().toLocaleString();

    // Build items rows
    const itemsRows = order.items.map((item, idx) => `
      <tr key="${idx}">
        <td style="padding:4px 0;width:50%;text-align:left;">${item.name}</td>
        <td style="padding:4px 0;width:20%;text-align:center;">${item.quantity}</td>
        <td style="padding:4px 0;width:30%;text-align:right;">${symbol}${(item.price || 0).toFixed(2)}</td>
      </tr>
    `).join('');

    let serviceChargeRow = '';
    if (order.serviceCharge > 0) {
      const pct = order.subtotal ? ((order.serviceCharge * 100) / order.subtotal).toFixed(2) : '0.00';
      serviceChargeRow = `
        <tr>
          <td style="padding:4px 0;text-align:left;">Service Charge (${pct}%)</td>
          <td></td>
          <td style="padding:4px 0;text-align:right;">${symbol}${order.serviceCharge.toFixed(2)}</td>
        </tr>
      `;
    }

    let deliveryChargeRow = '';
    if (order.deliveryCharge > 0) {
      deliveryChargeRow = `
        <tr>
          <td style="padding:4px 0;text-align:left;">Delivery Charge</td>
          <td></td>
          <td style="padding:4px 0;text-align:right;">${symbol}${order.deliveryCharge.toFixed(2)}</td>
        </tr>
      `;
    }

    let paymentSection = '';
    if (order.payment) {
      const p = order.payment;
      let lines = '';
      if (p.cash > 0) lines += `<p class="mb-1">Cash: ${symbol}${p.cash.toFixed(2)}</p>`;
      if (p.card > 0) lines += `<p class="mb-1">Card: ${symbol}${p.card.toFixed(2)}</p>`;
      if (p.bankTransfer > 0) lines += `<p class="mb-1">Bank Transfer: ${symbol}${p.bankTransfer.toFixed(2)}</p>`;
      
      paymentSection = `
        <div class="mb-1">
          <p class="mb-1"><strong>Paid via:</strong></p>
          ${lines}
          <p class="mb-1"><strong>Total Paid:</strong> ${symbol}${(p.totalPaid || 0).toFixed(2)}</p>
          <p class="mb-1"><strong>Change Due:</strong> ${symbol}${(p.changeDue || 0).toFixed(2)}</p>
        </div>
      `;
    }

    let deliveryNoteSection = '';
    if (order.deliveryCharge > 0 && order.deliveryNote) {
      deliveryNoteSection = `<p><strong>Delivery Note:</strong><br>${order.deliveryNote}</p>`;
    }

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <title>Receipt</title>
          <style>
            body {
              font-family: Calibri, Arial, sans-serif;
              width: 275px;
              margin: 0;
              padding: 7.5px;
              background: #fff;
              color: #000;
              line-height: 1.4;
              box-sizing: border-box;
            }
            hr {
              border: 0;
              border-top: 1px dashed #000;
              margin: 4px 0;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin: 8px 0 16px;
            }
            th, td {
              padding: 4px 0;
            }
            .text-center { text-align: center; }
            .text-end { text-align: right; }
            .mb-1 { margin-bottom: 4px; }
            h3, h4, h5 { margin: 6px 0; }
            p { margin: 4px 0; }
          </style>
        </head>
        <body>
        <!-- ✅ SMALL CIRCULAR LOGO -->
        <div class="text-center mb-2">
          <div style="width:80px;height:80px;border-radius:50%;overflow:hidden;margin:0 auto 4px;box-shadow:0 1px 2px rgba(0,0,0,0.1);">
            <img src=${LogoImage} alt="Golden plus Logo" style="width:100%;height:100%;object-fit:cover;display:block;">
          </div>
        </div>
          <h3 class="text-center" style=" font-size:20px; "><strong>Golden plus</strong></h3>
          <h3 class="text-center" style=" font-size:20px; "><strong>Cafe and Restaurant</strong></h3>
          <p class="text-center mb-1" style=" font-size:12px; ">33/C, Naranwala, Gampaha.</p>
          <p class="text-center mb-3" style=" font-size:15px; "><strong> 0770115235 / 0742257227</strong></p>
          <hr />

          <div style="font-size:16px;margin-bottom:12px;">
            <div style="display:flex;gap:4px;margin-bottom:4px; font-size:14px;">
              <div style="width:90px;"><strong>Invoice No:</strong></div>
              <div>${order.invoiceNo || 'N/A'}</div>
            </div>
            <div style="display:flex;gap:4px;margin-bottom:4px; font-size:14px;">
              <div style="width:90px;"><strong>Date:</strong></div>
              <div>${now}</div>
            </div>
            <div style="display:flex;gap:4px;margin-bottom:4px; font-size:14px;">
              <div style="width:90px;"><strong>Customer:</strong></div>
              <div>${order.customerName || 'Walk-in'}</div>
            </div>
            <div style="display:flex;gap:4px;margin-bottom:4px; font-size:14px;">
              <div style="width:90px;"><strong>Phone:</strong></div>
              <div>${order.customerPhone || 'N/A'}</div>
            </div>
            <div style="display:flex;gap:4px;margin-bottom:4px; font-size:14px;">
              <div style="width:90px;"><strong>Order Type:</strong></div>
              <div>${order.tableNo > 0 ? `Dine In - Table ${order.tableNo}` : `Takeaway ( ${order.deliveryType} )`}</div>
            </div>
            ${order.tableNo === "Takeaway" && order.deliveryType === "Delivery Service" ? `
            <div style="display:flex;gap:4px;margin-bottom:4px; font-size:14px;">
              <div style="width:90px;"><strong>Delivery Place:</strong></div>
              <div>${order.deliveryPlaceName}</div>
            </div>` : ''}
          </div>

          <hr />

          <table style="font-size:12px;">
            <thead>
              <tr>
                <th style="text-align:left;">Items</th>
                <th style="text-align:center;">Qty</th>
                <th style="text-align:right;">Amount</th>
              </tr>
            </thead>
            <tbody>
              ${itemsRows}
              ${serviceChargeRow}
              ${deliveryChargeRow}
            </tbody>
          </table>

          <hr />

          <h5 class="text-end mb-1" style=" font-size:16px; ">Total: ${symbol}${(order.totalPrice || 0).toFixed(2)}</h5>

          <hr />
          <p class="text-center mb-1" style=" font-size:16px; "> <strong> Thank you for your order!</strong> </p>
          <p class="text-center mb-1" style=" font-size:12px; ">Software By: Raxwo (Pvt) Ltd.</p>
          <p class="text-center mb-1" style=" font-size:12px; ">Contact: 074 357 3333</p>
          <hr />

          ${deliveryNoteSection}
        </body>
      </html>
    `;
  };

  return (
    <div
      className="receipt-modal"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        zIndex: 1000,
        backgroundColor: "#f8f9fa",
        width: "100%",
        height: "100%",
        overflowY: "auto",
        padding: "30px"
      }}
    >
      {/* Controls */}
      <div className="text-center mb-4 d-print-none">
        <button onClick={onClose} className="btn btn-secondary me-2">
          Close
        </button>
        <button onClick={exportToPDF} className="btn btn-primary me-2">
          📄 Export PDF
        </button>
        <button
          className="btn btn-success"
          onClick={() => window.print()}
          // onClick={() => {
          //   // const content = document.getElementById("receipt-content").innerHTML;
          //   const fullHTML = generatePrintableHTML();
          //   printReceiptToBoth(fullHTML);
          // }}
        >
          🖨️ Print Receipt
        </button>
      </div>

      {/* Receipt Content */}
      <div
        id="receipt-content"
        style={{
          maxWidth: "283px",
          margin: "auto",
          background: "#fff",
          border: "1px solid #ccc",
          borderRadius: "8px",
          padding: "7.5px",
          lineHeight: 1.4,
          fontFamily: "Calibri, sans-serif", // ✅ Set Calibri font globally
          boxShadow: "0 0 10px rgba(0,0,0,0.15)"
        }}
      >
        {/* ✅ SMALL CIRCULAR LOGO - ON SCREEN PREVIEW */}
        <div className="text-center mb-2">
          <div
            style={{
              width: '80px',
              height: '80px',
              borderRadius: '50%',
              overflow: 'hidden',
              margin: '0 auto 4px',
              boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
            }}
          >
            <img
              src={LogoImage}
              alt="Golden plus Logo"
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                display: 'block',
              }}
            />
          </div>
        </div>
        {/* <h4 className="text-center mb-3">🍽️ <strong>Gasma Chinese Restaurant </strong></h4> */}
        {/* <h3 className="mb-0 fs-5" style={{ textAlign: "center" }} ><strong>Gasma</strong></h3> */}
        <h3 className="mb-1 fs-4" style={{ textAlign: "center" }}><strong>Golden plus</strong></h3>
        <h3 className="mb-1 fs-4" style={{ textAlign: "center" }}><strong>Cafe and Restaurant</strong></h3>
        <p className="mb-0" style={{ textAlign: "center", fontSize: "13px" }}> 33/C, Naranwala, Gampaha.</p>
        <p className="mb-3" style={{ textAlign: "center", fontSize: "14px" }}><strong> 0770115235 / 0742257227</strong></p>
        <hr style={{ margin: "10px 4px" }}/>
        {/* <p className="mb-1"><strong>Invoice No:</strong> {order.invoiceNo}</p>
        <p className="mb-1"><strong>Date:</strong> {new Date().toLocaleString()}</p>
        <p className="mb-1"><strong>Customer:</strong> {customerName}</p>
        <p className="mb-1"><strong>Phone:</strong> {customerPhone}</p>
        <p className="mb-1"><strong>Order Type:</strong> {tableNo > 0 ? `Dine In - Table ${tableNo}` : "Takeaway" }</p>
        { (tableNo > 0) ? <></> : (<p><strong>Delivery Type:</strong>  {order.deliveryType}</p>)} */}

        <div style={{ fontSize: "16px", marginBottom: "0px", lineHeight: "1.6" }}>
          {/* Row */}
          <div style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "14px"  }}>
            <div style={{ width: "90px",  lineHeight: "0", paddingBottom: "4px" }}>
              <strong>Invoice No:</strong>
            </div>
            <div>{order.invoiceNo}</div>
          </div>

          {/* Row */}
          <div style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "14px"  }}>
            <div style={{ width: "90px", lineHeight: "0", paddingBottom: "4px" }}>
              <strong>Date:</strong>
            </div>
            <div>{new Date().toLocaleString()}</div>
          </div>

          {/* Row */}
          <div style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "14px"  }}>
            <div style={{ width: "90px",  lineHeight: "0", paddingBottom: "4px" }}>
              <strong>Customer:</strong>
            </div>
            <div>{customerName}</div>
          </div>

          {/* Row */}
          <div style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "14px"  }}>
            <div style={{ width: "90px",  lineHeight: "0", paddingBottom: "4px" }}>
              <strong>Phone:</strong>
            </div>
            <div>{customerPhone}</div>
          </div>

          {/* Row */}
          <div style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "14px"  }}>
            <div style={{ width: "90px", lineHeight: "0", paddingBottom: "4px" }}>
              <strong>Order Type:</strong>
            </div>
            <div>{tableNo > 0 ? `Dine In - Table ${tableNo}` : `Takeaway ( ${order.deliveryType} )`}</div>
          </div>

          {/* Conditional Row */}
          {tableNo === "Takeaway" && order.deliveryType === "Delivery Service" && (
            <div style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "14px"  }}>
              <div style={{ width: "90px",  lineHeight: "0", paddingBottom: "4px" }}>
                <strong>Delivery Place:</strong>
              </div>
              <div>{order.deliveryPlaceName}</div>
            </div>
          )}
        </div>

        <hr style={{ margin: "10px 4px" }}/>

        {/* <ul className="mb-3" style={{ listStyle: "none", padding: 0 }}>
          {items.map((item, idx) => (
            <li key={idx} style={{ marginBottom: "6px" }} className="list-group-item d-flex justify-content-between">
              <span>{item.name} x {item.quantity} </span>              
              <span className="text-end">{symbol}{item.price?.toFixed(2)}</span>
            </li>
          ))}
          {order.serviceCharge > 0 && (
            <li className="list-group-item d-flex justify-content-between">
              <span>Service Charge ({order.serviceCharge * 100 / order.subtotal?.toFixed(2) || 0}%)</span>
              <span className="text-end">{symbol}{order.serviceCharge?.toFixed(2)}</span>
              
            </li>
          )}

          {order.deliveryCharge > 0 && (
            <li className="list-group-item d-flex justify-content-between">
              <span>Delivery Charge </span>
              <span className="text-end">{symbol}{order.deliveryCharge?.toFixed(2)}</span>
            </li>
          )}
        </ul> */}

        {/* ✅ Replaced list with table for cleaner, aligned display */}
        <table style={{ width: "100%", borderCollapse: "collapse", paddingTop: "0px", paddingBottom:"0px", fontSize: "13px"  }}>
          <thead>
              <th style={{ padding: "4px 0", width: "50%", textAlign: "left" }}> Items</th>
              <th style={{ padding: "4px 0", width: "20%", textAlign: "center" }}> Qty</th>
              <th style={{ padding: "4px 0", width: "30%", textAlign: "right" }}> Amount</th>
          </thead>
          <tbody>
            {items.map((item, idx) => (
              <tr key={idx}>
                <td style={{ padding: "4px 0", width: "50%", textAlign: "left" }}>
                  {item.name}
                </td>
                <td style={{ padding: "4px 0", width: "20%", textAlign: "center" }}>
                  {item.quantity}
                </td>
                <td style={{ padding: "4px 0", width: "30%", textAlign: "right" }}>
                  {symbol}{item.price?.toFixed(2)}
                </td>
              </tr>
            ))}

            {order.serviceCharge > 0 && (
              <tr>
                <td style={{ padding: "4px 0", textAlign: "left" }}>
                  Service Charge ({((order.serviceCharge * 100) / (order.subtotal || 1)).toFixed(2)}%)
                </td>
                <td></td>
                <td style={{ padding: "4px 0", textAlign: "right" }}>
                  {symbol}{order.serviceCharge?.toFixed(2)}
                </td>
              </tr>
            )}

            {order.deliveryCharge > 0 && (
              <tr>
                <td style={{ padding: "4px 0", textAlign: "left" }}>
                  Delivery Charge
                </td>
                <td></td>
                <td style={{ padding: "4px 0", textAlign: "right" }}>
                  {symbol}{order.deliveryCharge?.toFixed(2)}
                </td>
              </tr>
            )}
          </tbody>
        </table>

        <hr style={{ margin: "10px 4px" }}/>
        <h5 className="text-end fs-6 mb-1">Total: {symbol}{totalPrice?.toFixed(2)}</h5>

        {/* {order.payment && (
          <div className="mb-1">
            <p className="mb-1"><strong>Paid via:</strong></p>
            {order.payment.cash > 0 && <p className="mb-1">Cash: {symbol}{order.payment.cash.toFixed(2)}</p>}
            {order.payment.card > 0 && <p className="mb-1">Card: {symbol}{order.payment.card.toFixed(2)}</p>}
            {order.payment.bankTransfer > 0 && (
              <p className="mb-1">Bank Transfer: {symbol}{order.payment.bankTransfer.toFixed(2)}</p>
            )}
            <p className="mb-1"><strong>Total Paid:</strong> {symbol}{order.payment.totalPaid.toFixed(2)}</p>
            <p className="mb-1"><strong>Change Due:</strong> {symbol}{order.payment.changeDue.toFixed(2)}</p>
          </div>
        )} */}
        <hr style={{ margin: "10px 4px" }}/>
        <p className="text-center mb-1 fw-bold" style={{ fontSize: "16px" }}> Thank you for your order! </p>
        <p className="text-center  mb-1" style={{ fontSize: "13px" }}>Software By: Raxwo (Pvt) Ltd.</p>
        <p className="text-center  mb-1 " style={{ fontSize: "13px" }}>Contact: 074 357 3333</p>
        <hr style={{ margin: "10px 4px" }}/>
        {order.deliveryCharge > 0 && order.deliveryNote?.trim() && (
          <p>
            <p>
              <strong>Delivery Note :</strong>
            </p>
            <span >{order.deliveryNote}</span>
          </p>
        )}
      </div>

      {/* Hide everything except receipt when printing */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #receipt-content, #receipt-content * {
            visibility: visible;
          }
          #receipt-content {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            margin: 0;
          }
        }
      `}</style>
    </div>
  );
};

export default ReceiptModal;
