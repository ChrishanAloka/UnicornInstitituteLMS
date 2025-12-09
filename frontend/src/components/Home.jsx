import React from "react";
import { Link } from "react-router-dom";
import LogoImage from "../upload/logo.png";

const Home = () => {
  return (
    <div
      className="min-vh-100 d-flex align-items-center justify-content-center text-center px-3"
      style={{
        background: "linear-gradient(135deg, #eef2f3, #dfe9f3)",
      }}
    >
      <div
        className="p-4 p-md-5 shadow-lg"
        style={{
          width: "100%",
          maxWidth: "620px",
          borderRadius: "20px",
          backdropFilter: "blur(10px)",
          background: "rgba(255, 255, 255, 0.6)",
          border: "1px solid rgba(255,255,255,0.3)",
        }}
      >
        {/* Logo */}
        <div className="mb-3 d-flex justify-content-center">
          <div
            style={{
              width: "160px",
              height: "160px",
              borderRadius: "50%",
              overflow: "hidden",
              boxShadow: "0 10px 25px rgba(0,0,0,0.15)",
            }}
          >
            <img
              src={LogoImage}
              alt="Logo"
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          </div>
        </div>

        <h1 className="fw-bold mb-1" style={{ letterSpacing: "1px" }}>
          Unicorn Institute
        </h1>
        <h5 className="text-secondary mb-4">Learning Management System</h5>

        <p className="text-muted mb-4">
          Choose your role to continue
        </p>

        {/* Login Buttons */}
        <div className="d-grid gap-3 mb-4">
          <Link className="btn btn-lg btn-outline-primary fw-semibold" to="/user-login">
            User Login
          </Link>

          <Link className="btn btn-lg btn-outline-success fw-semibold" to="/admin-login">
            Admin Login
          </Link>
        </div>

        <hr />

        {/* Sign Up Section */}
        <p className="mt-3 text-muted">New user? Register as:</p>

        <div className="d-grid gap-2 mt-2">
          <Link className="btn btn-primary btn-sm fw-semibold" to="/signup?role=user">
            Sign Up as User
          </Link>

          <Link className="btn btn-success btn-sm fw-semibold" to="/signup?role=admin">
            Sign Up as Admin
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Home;
