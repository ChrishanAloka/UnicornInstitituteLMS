// src/components/Home.jsx
import React from "react";
import { Link } from "react-router-dom";
import LogoImage from "../upload/logo.png"; 



const Home = () => {
  return (
    <div className="d-flex align-items-center justify-content-center min-vh-100 bg-light text-center px-3">
      <div>
        {/* 👇 Round Logo image added here */}
        <div className="my-2 d-flex justify-content-center">
          <div
            style={{
              width: "150px",
              height: "150px",
              borderRadius: "50%",
              overflow: "hidden",
              boxShadow: "0 4px 8px rgba(0,0,0,0.1)",
            }}
          >
            <img
              src={LogoImage}
              alt="MPMS Logo"
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
              }}
            />
          </div>
        </div>
        <h1 className="mb-2">Welcome to MPMS</h1>
        <h5 className="mb-3 border-bottom pb-2">Multi-Project Management System</h5>
        
        <p className="lead mb-4">Please select your role to continue:</p>

        <div className="d-grid gap-3" style={{ maxWidth: "300px", margin: "auto" }}>
          <Link to="/user-login" className="btn btn-outline-primary btn-lg">
            User Login
          </Link>
          {/* <Link to="/kitchen-login" className="btn btn-outline-dark btn-lg">
            Kitchen Login
          </Link> */}
          <Link to="/admin-login" className="btn btn-outline-success btn-lg">
            Admin Login
          </Link>
        </div>

        <hr className="my-4" />

        <div className="mt-3">
          <p className="text-muted">
            New user? Sign up as:
          </p>
          <div className="d-grid gap-2" style={{ maxWidth: "300px", margin: "auto" }}>
            <Link to="/signup?role=user" className="btn btn-primary btn-sm">
              Sign Up as User
            </Link>
            {/* <Link to="/signup?role=kitchen" className="btn btn-dark btn-sm">
              Sign Up as Kitchen Staff
            </Link> */}
            <Link to="/signup?role=admin" className="btn btn-success btn-sm">
              Sign Up as Admin
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;