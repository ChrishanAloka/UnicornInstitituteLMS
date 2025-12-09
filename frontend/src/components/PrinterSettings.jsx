// src/components/PrinterSettings.jsx
import React, { useState, useEffect } from "react";
import axios from "axios";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const PrinterSettings = () => {
  const [savedPrinters, setSavedPrinters] = useState([]); // from backend
  const [systemPrinters, setSystemPrinters] = useState([]); // from QZ Tray
  const [selectedPrinter, setSelectedPrinter] = useState("");
  const [loadingQZ, setLoadingQZ] = useState(false);
  const [saving, setSaving] = useState(false);

  // Load saved printers from backend
  useEffect(() => {
    fetchSavedPrinters();
    loadSystemPrinters(); // auto-load on mount
  }, []);

  const fetchSavedPrinters = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get("https://unicorninstititutelms.onrender.com/api/auth/printers", {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSavedPrinters(res.data);
    } catch (err) {
      console.error("Failed to load saved printers:", err.message);
      toast.error("Failed to load saved printers");
    }
  };

  // Fetch printers from QZ Tray
  const loadSystemPrinters = async () => {
    if (typeof qz === "undefined") {
      toast.error("QZ Tray is not loaded. Check console.");
      return;
    }

    setLoadingQZ(true);
    try {
      await qz.websocket.connect();
      const printers = await qz.printers.find();
      setSystemPrinters(printers);
      if (printers.length > 0) {
        setSelectedPrinter(printers[0]); // auto-select first
      }
    } catch (err) {
      console.error("QZ Tray error:", err);
      toast.error("Failed to load system printers. Is QZ Tray running?");
    } finally {
      try {
        await qz.websocket.disconnect();
      } catch (e) {
        console.warn("QZ disconnect warning:", e);
      }
      setLoadingQZ(false);
    }
  };

  // Save selected printer to backend
  const handleSavePrinter = async () => {
    if (!selectedPrinter.trim()) {
      toast.error("Please select a printer");
      return;
    }

    if (savedPrinters.length >= 2 && !savedPrinters.some(p => p.name === selectedPrinter)) {
      toast.error("Maximum of 2 printers allowed");
      return;
    }

    setSaving(true);
    try {
      const token = localStorage.getItem("token");
      const payload = { name: selectedPrinter };
      // Don't send ID — we're adding a new one (backend handles dupes via unique name)
      const res = await axios.post(
        "https://unicorninstititutelms.onrender.com/api/auth/printers",
        payload,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // Update local state
      setSavedPrinters(prev => {
        const exists = prev.find(p => p.name === selectedPrinter);
        if (exists) {
          // Replace if name matches (update)
          return prev.map(p => p.name === selectedPrinter ? res.data : p);
        } else {
          // Add new (limit to 2)
          return [res.data, ...prev].slice(0, 2);
        }
      });

      toast.success("Printer saved successfully!");
    } catch (err) {
      const msg = err.response?.data?.error || "Failed to save printer";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this saved printer?")) return;
    try {
      const token = localStorage.getItem("token");
      await axios.delete(`https://unicorninstititutelms.onrender.com/api/auth/printers/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSavedPrinters(savedPrinters.filter(p => p._id !== id));
      toast.success("Printer deleted");
    } catch (err) {
      toast.error("Failed to delete printer");
    }
  };

  return (
    <div className="container py-4">
      <h2 className="mb-4 fw-bold text-success border-bottom pb-2">🖨️ Printer Configuration</h2>

      {/* System Printer Selector */}
      <div className="card p-4 mb-5 shadow-sm">
        <h5 className="mb-3">Add Printer from System</h5>
        <div className="row g-3 align-items-end">
          <div className="col-md-6">
            <label className="form-label fw-semibold">Available Printers</label>
            <select
              className="form-select"
              value={selectedPrinter}
              onChange={(e) => setSelectedPrinter(e.target.value)}
              disabled={loadingQZ}
            >
              <option value="">— Select a printer —</option>
              {systemPrinters.length > 0 ? (
                systemPrinters.map((printer, i) => (
                  <option key={i} value={printer}>
                    {printer}
                  </option>
                ))
              ) : (
                <option disabled>No printers found</option>
              )}
            </select>
          </div>
          <div className="col-md-3">
            <button
              className="btn btn-outline-primary w-100"
              onClick={loadSystemPrinters}
              disabled={loadingQZ}
            >
              {loadingQZ ? "Loading..." : "🔄 Refresh Printers"}
            </button>
          </div>
          <div className="col-md-3">
            <button
              className="btn btn-success w-100"
              onClick={handleSavePrinter}
              disabled={!selectedPrinter || saving}
            >
              {saving ? "Saving..." : "💾 Save Printer"}
            </button>
          </div>
        </div>
        <small className="text-muted mt-2 d-block">
          ℹ️ Make sure <strong>QZ Tray</strong> is running on this computer.
        </small>
      </div>

      {/* Saved Printers List */}
      <div className="mt-4">
        <h4 className="mb-3 text-secondary">
          ✅ Saved Printers ({savedPrinters.length}/2)
        </h4>
        {savedPrinters.length === 0 ? (
          <div className="alert alert-info">No printers saved yet.</div>
        ) : (
          <div className="table-responsive shadow-sm rounded border">
            <table className="table table-bordered table-striped align-middle mb-0">
              <thead className="table-dark">
                <tr>
                  <th>Printer Name</th>
                  <th className="text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {savedPrinters.map((printer) => (
                  <tr key={printer._id}>
                    <td>{printer.name}</td>
                    <td className="text-center">
                      <button
                        className="btn btn-sm btn-danger"
                        onClick={() => handleDelete(printer._id)}
                      >
                        🗑️ Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ToastContainer />
    </div>
  );
};

export default PrinterSettings;