// src/components/UserLogin.jsx
import React, { useState, useContext } from "react";
import axios from "axios";
import { useNavigate, Link } from "react-router-dom";
import { AuthContext } from "../context/auth-context";
import { motion } from "framer-motion";
import InstallPWAButton from "./InstallPWAButton";

const UserLogin = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { login } = useContext(AuthContext);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await axios.post(
        "http://localhost:5000/api/auth/login",
        { email, password }
      );
      const data = res.data;

      if (data.role !== "user") {
        alert("Unauthorized Access");
        setLoading(false);
        return;
      }

      login(data);
      navigate("/user");
    } catch (err) {
      alert("Login failed. Please check your credentials.");
      setLoading(false);
    }
  };

  return (
    <div
      className="min-vh-100 d-flex justify-content-center align-items-center"
      style={{
        background: "linear-gradient(135deg, #dfe9f3 0%, #ffffff 100%)",
        padding: "20px",
        position: 'relative'
      }}
    >
      <div style={{ position: 'absolute', top: '20px', right: '20px' }}>
        <InstallPWAButton />
      </div>
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-4 shadow-lg"
        style={{
          width: "100%",
          maxWidth: "420px",
          borderRadius: "20px",
          backdropFilter: "blur(12px)",
          background: "rgba(255, 255, 255, 0.65)",
          border: "1px solid rgba(255, 255, 255, 0.4)",
        }}
      >
        <div className="text-center mb-4">
          <h2 className="fw-bold" style={{ letterSpacing: "0.5px" }}>
            Welcome Back
          </h2>
          <p className="text-muted mb-1">Login to continue</p>
        </div>

        {/* FORM */}
        <form onSubmit={handleLogin}>
          <div className="mb-3">
            <label className="form-label fw-semibold">Email Address</label>
            <input
              type="email"
              className="form-control shadow-sm"
              placeholder="example@mail.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              required
              style={{ borderRadius: "12px" }}
            />
          </div>

          <div className="mb-3">
            <label className="form-label fw-semibold">Password</label>
            <input
              type="password"
              className="form-control shadow-sm"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              required
              style={{ borderRadius: "12px" }}
            />
          </div>

          <motion.button
            whileTap={{ scale: 0.97 }}
            type="submit"
            disabled={loading}
            className="btn btn-primary w-100 py-2 fw-semibold shadow-sm"
            style={{
              borderRadius: "14px",
              fontSize: "16px",
            }}
          >
            {loading ? (
              <>
                <span
                  className="spinner-border spinner-border-sm me-2"
                  role="status"
                ></span>
                Logging in...
              </>
            ) : (
              "Login"
            )}
          </motion.button>
        </form>

        <div className="text-center mt-3">
          <Link className="text-decoration-none" to="/forgot-password">
            Forgot Password?
          </Link>
        </div>

        <hr />

        <p className="text-center">
          Don't have an account?{" "}
          <Link to="/signup?role=user" className="fw-semibold text-primary">
            Sign Up
          </Link>
        </p>
      </motion.div>
    </div>
  );
};

export default UserLogin;
