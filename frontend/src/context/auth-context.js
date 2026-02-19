import React, { createContext, useState, useEffect, useContext  } from "react";
import axios from "axios";

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currencySymbol, setCurrencySymbol] = useState("$");
  const [currencyCode, setCurrencyCode] = useState("USD");
  const [tokenExpiry, setTokenExpiry] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem("token");

    if (token) {
      try {
        const decoded = JSON.parse(atob(token.split(".")[1]));
        setUser(decoded);
        setTokenExpiry(decoded.exp * 1000); // Store expiry timestamp
      } catch (err) {
        localStorage.removeItem("token");
        setUser(null);
      }
    }

    setLoading(false);
  }, []);

  // Load user from token on mount
  useEffect(() => {
    const token = localStorage.getItem("token");

    if (!token) {
      setLoading(false);
      return;
    }

    try {
      const decoded = JSON.parse(atob(token.split(".")[1]));
      setUser(decoded);
    } catch (err) {
      console.error("Invalid token:", err.message);
      localStorage.removeItem("token");
    }

    setLoading(false);
  }, []);

  // Load currency settings
  useEffect(() => {
    const savedSymbol = localStorage.getItem("currencySymbol");
    const savedCode = localStorage.getItem("currencyCode");

    if (savedSymbol && savedCode) {
      setCurrencySymbol(savedSymbol);
      setCurrencyCode(savedCode);
      return;
    }

    const fetchCurrency = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await axios.get("http://localhost:5000/api/auth/settings/currency", {
          headers: { Authorization: `Bearer ${token}` }
        });

        setCurrencySymbol(res.data.symbol || "$");
        setCurrencyCode(res.data.currency || "USD");

        // Save to localStorage
        localStorage.setItem("currencySymbol", res.data.symbol || "$");
        localStorage.setItem("currencyCode", res.data.currency || "USD");
      } catch (err) {
        console.warn("Failed to load currency:", err.message);
        setCurrencySymbol("$");
        setCurrencyCode("USD");
        localStorage.setItem("currencySymbol", "$");
        localStorage.setItem("currencyCode", "USD");
      }
    };

    fetchCurrency();
  }, []);

  const updateCurrency = async (symbol, code) => {
    try {
      const token = localStorage.getItem("token");
      await axios.put(
        "http://localhost:5000/api/auth/settings/currency",
        { symbol, currency: code },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      setCurrencySymbol(symbol);
      setCurrencyCode(code);

      // Save updated values to localStorage
      localStorage.setItem("currencySymbol", symbol);
      localStorage.setItem("currencyCode", code);
    } catch (err) {
      alert("Failed to update currency");
    }
  };

  const login = (data) => {
    localStorage.setItem("token", data.token);
    localStorage.setItem("userId", data._id);       // User ID
    localStorage.setItem("userRole", data.role);     // Role
    localStorage.setItem("userName", data.name);
    const decoded = JSON.parse(atob(data.token.split(".")[1]));
    setUser(decoded);
  };

  const logout = () => {
    localStorage.removeItem("token");
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        logout,
        loading,
        currencySymbol,
        currencyCode,
        updateCurrency
      }}
    >
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context)
    throw new Error("useAuth must be used inside AuthProvider");
  return context;
};