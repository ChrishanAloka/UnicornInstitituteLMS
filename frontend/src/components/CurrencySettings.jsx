import React, { useEffect, useState } from "react";
import axios from "axios";

const CurrencySettings = () => {
  const [currency, setCurrency] = useState("USD");
  const [symbol, setSymbol] = useState("$");

  // Load current settings
  useEffect(() => {
    const fetchCurrency = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await axios.get("http://localhost:5000/api/auth/settings/currency", {
          headers: { Authorization: `Bearer ${token}` }
        });

        setCurrency(res.data.currency || "USD");
        setSymbol(res.data.symbol || "$");
      } catch (err) {
        console.error("Failed to load currency:", err.message);
        alert("Failed to load currency. Default $ will be used.");
      }
    };

    fetchCurrency();
  }, []);

  // Save updated currency
  const handleSave = async () => {
    try {
      const token = localStorage.getItem("token");
      await axios.put(
        "http://localhost:5000/api/auth/settings/currency",
        { currency, symbol },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      // ✅ Show success message
      alert("Currency updated successfully!");

      // ✅ Update currency in localStorage too
      localStorage.setItem("currencySymbol", symbol);
      localStorage.setItem("currencyCode", currency);

    } catch (err) {
      console.error("Update failed:", err.response?.data || err.message);
      alert("Failed to update currency");
    }
  };

  return (
    <div className="container my-5" style={{ maxWidth: 500 }}>
      <h2 className="mb-4 text-center">Currency Settings</h2>

      <div className="mb-3">
        <label className="form-label fw-semibold">Currency Code</label>
        <input
          type="text"
          value={currency}
          onChange={(e) => setCurrency(e.target.value)}
          placeholder="e.g., LKR"
          className="form-control"
        />
      </div>

      <div className="mb-4">
        <label className="form-label fw-semibold">Symbol</label>
        <input
          type="text"
          value={symbol}
          onChange={(e) => setSymbol(e.target.value)}
          placeholder="e.g., $ or Rs."
          className="form-control"
        />
      </div>

      <button
        className="btn btn-primary w-100 fw-bold"
        onClick={handleSave}
      >
        Save Changes
      </button>
    </div>
  );
};

export default CurrencySettings;