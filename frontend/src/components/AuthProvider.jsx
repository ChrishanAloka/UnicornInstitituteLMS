// src/components/AuthProvider.jsx
import React, { createContext, useContext, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  // Check token on mount
  useEffect(() => {
    const token = localStorage.getItem("token");

    if (token) {
      try {
        const decoded = JSON.parse(atob(token.split(".")[1]));

        // ✅ Make sure decoded contains role
        console.log("Decoded token:", decoded);

        setUser(decoded);
        // Only auto-navigate if not already on a role-specific page
        if (
          window.location.pathname === "/" ||
          window.location.pathname === "/login"
        ) {
          navigate(`/${decoded.role}`, { replace: true });
        }
      } catch (err) {
        localStorage.removeItem("token");
        setUser(null);
        navigate("/login", { replace: true });
      }
    } else {
      setUser(null);
      navigate("/login", { replace: true });
    }
  }, [navigate]);

  const login = (data) => {
    localStorage.setItem("token", data.token);
    const decoded = JSON.parse(atob(data.token.split(".")[1]));
    setUser(decoded);
    navigate(`/${decoded.role}`); // ✅ Redirect based on role
  };

  const logout = () => {
    localStorage.removeItem("token");
    setUser(null);
    navigate("/", { replace: true });
  };

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context)
    throw new Error("useAuth must be used inside AuthProvider");
  return context;
};