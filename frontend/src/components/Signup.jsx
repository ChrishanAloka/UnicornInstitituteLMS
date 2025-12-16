// src/components/Signup.jsx
import React, { useState } from "react";
import axios from "axios";
import { useNavigate, useLocation } from "react-router-dom";
import { Link } from "react-router-dom";

const Signup = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [key, setKey] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false); // 👈 Loading state

  const navigate = useNavigate();
  const location = useLocation();
  const role = new URLSearchParams(location.search).get("role") || "cashier";

  const requiresKey = ["cashier", "kitchen"].includes(role);

  const handleSignup = async (e) => {
    e.preventDefault();

    // Validate fields
    if (!name || !email || !password || (requiresKey && !key)) {
      setError("All fields are required");
      return;
    }

    setIsLoading(true); // 👈 Start loading

    try {
      await axios.post("https://unicorninstititutelms.onrender.com/api/auth/signup", {
        name,
        email,
        password,
        role,
        ...(requiresKey && { signupKey: key }), // only include if needed
      });

      alert(`${role.charAt(0).toUpperCase() + role.slice(1)} account created successfully!`);
      navigate(`/${role}-login`);
    } catch (err) {
      setError(err.response?.data?.error || "Signup failed. Try again.");
    } finally {
      setIsLoading(false); // 👈 Stop loading regardless of outcome
    }
  };

  return (
    <div className="d-flex justify-content-center align-items-center min-vh-100 bg-body">
      <div className="card shadow-sm p-4" style={{ maxWidth: "400px", width: "100%" }}>
        <h4 className="text-center mb-4">Sign Up as {role.charAt(0).toUpperCase() + role.slice(1)}</h4>

        <form onSubmit={handleSignup}>
          <div className="mb-3">
            <label htmlFor="name" className="form-label">Full Name</label>
            <input
              type="text"
              className="form-control"
              id="name"
              placeholder="Enter full name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div className="mb-3">
            <label htmlFor="email" className="form-label">Email address</label>
            <input
              type="email"
              className="form-control"
              id="email"
              placeholder="Enter email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="mb-3">
            <label htmlFor="password" className="form-label">Password</label>
            <input
              type="password"
              className="form-control"
              id="password"
              placeholder="Enter password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {/* Conditional Signup Key Field */}
          {requiresKey && (
            <div className="mb-3">
              <label htmlFor="key" className="form-label">Signup Key</label>
              <input
                type="text"
                className="form-control"
                id="key"
                placeholder="Enter signup key"
                value={key}
                onChange={(e) => setKey(e.target.value)}
                required
              />
            </div>
          )}

          {error && <div className="alert alert-danger">{error}</div>}

          <button
            type="submit"
            className="btn btn-success w-100 mb-3"
            disabled={isLoading} // 👈 Disable during loading
          >
            {isLoading ? (
              <>
                <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                Signing Up...
              </>
            ) : (
              `Sign Up as ${role.charAt(0).toUpperCase() + role.slice(1)}`
            )}
          </button>
        </form>

        <hr />

        <p className="text-center mb-0">
          Already have an account?{" "}
          <Link to={`/${role}-login`} className="text-decoration-none">
            Login
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Signup;