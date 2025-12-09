// src/pages/CustomerList.js
import React, { useEffect, useState } from "react";
import axios from "axios";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const CustomerList = () => {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(
        "https://projectnuckels.onrender.com/api/auth/customers-list",
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setCustomers(res.data);
      setLoading(false);
    } catch (err) {
      console.error("Failed to load customers:", err);
      toast.error("Failed to load customer list");
      setLoading(false);
    }
  };

  // Export to Excel
  const exportToExcel = () => {
    import("xlsx").then((XLSX) => {
      const worksheetData = customers.map((cust, idx) => ({
        "#": idx + 1,
        Name: cust.name || "Unnamed",
        "Phone Number": cust.phone
      }));

      const ws = XLSX.utils.json_to_sheet(worksheetData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Customers");
      XLSX.writeFile(wb, "rms_customers.xlsx");
    });
  };

  // Export to PDF
  const exportToPDF = () => {
    const input = document.getElementById("customer-table-container");
    if (!input) {
      toast.error("Table not found for export");
      return;
    }

    html2canvas(input, { scale: 2 }).then((canvas) => {
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");
      const imgWidth = 210; // A4 width in mm
      const pageHeight = 297; // A4 height in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      pdf.save("rms_customers.pdf");
    });
  };

  return (
    <div className="container py-4">
      <h2 className="mb-4 fw-bold border-bottom pb-2 text-primary">Customer Directory</h2>

      {/* Actions */}
      <div className="mb-4 d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center gap-3">
        <div>
          <h5 className="mb-0">Total Customers: {customers.length}</h5>
        </div>
        <div className="d-flex gap-2">
          <button className="btn btn-outline-success" onClick={exportToExcel}>
            📊 Export to Excel
          </button>
          <button className="btn btn-outline-danger" onClick={exportToPDF}>
            🧾 Export to PDF
          </button>
        </div>
      </div>

      {/* Customer Table */}
      {loading ? (
        <p className="text-info">Loading customers...</p>
      ) : customers.length === 0 ? (
        <p className="text-muted">No customers found.</p>
      ) : (
        <div id="customer-table-container" className="table-responsive rounded shadow-sm border">
          <table id="customer-table" className="table table-hover align-middle table-bordered mb-0">
            <thead className="table-primary">
              <tr>
                <th>#</th>
                <th>Name</th>
                <th>Phone Number</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((cust, idx) => (
                <tr key={cust.phone || idx}>
                  <td>{idx + 1}</td>
                  <td className="fw-semibold">{cust.name || "—"} </td>
                  <td>{cust.phone}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ToastContainer />
    </div>
  );
};

export default CustomerList;