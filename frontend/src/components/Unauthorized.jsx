import React from "react";
import { Link } from "react-router-dom";

const Unauthorized = () => {
  return (
    <div className="d-flex justify-content-center align-items-center min-vh-100 bg-body">
      <div className="text-center">
        <h2>🚫 Unauthorized Access</h2>
        <p>You don't have permission to view this page.</p>
        <Link to="/" className="btn btn-primary">
          Go Back Home
        </Link>
      </div>
    </div>
  );
};

export default Unauthorized;