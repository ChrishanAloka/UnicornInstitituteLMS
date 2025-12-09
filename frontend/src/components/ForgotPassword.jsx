import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

const ResetPassword = () => {
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState("");
  const [key, setKey] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const navigate = useNavigate();

  const handleVerifyKey = async () => {
    try {
      await axios.post("https://projectnuckels.onrender.com/api/auth/verify-reset-key", { key });
      setStep(2);
    } catch (err) {
      alert(err.response?.data?.message || "Invalid or expired key");
    }
  };

  const handleResetPassword = async () => {
    try {
      await axios.post("https://projectnuckels.onrender.com/api/auth/reset-password", { email, key, newPassword });
      alert("Password reset successful!");
      navigate("/");
    } catch (err) {
      alert(err.response?.data?.message || "Password reset failed");
    }
  };

  return (
    <div className="container py-5" style={{ maxWidth: 500 }}>
      <h2 className="text-center text-primary mb-4">Reset Password</h2>

      {step === 1 && (
        <>
          <label>Reset Key (from Admin)</label>
          <input
            type="text"
            className="form-control mb-3"
            value={key}
            onChange={(e) => setKey(e.target.value)}
          />
          <button className="btn btn-primary w-100" onClick={handleVerifyKey}>
            Verify Key
          </button>
        </>
      )}

      {step === 2 && (
        <>
          <label>Email</label>
          <input
            type="email"
            className="form-control mb-3"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <label>New Password</label>
          <input
            type="password"
            className="form-control mb-3"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
          <button className="btn btn-success w-100" onClick={handleResetPassword}>
            Reset Password
          </button>
        </>
      )}
    </div>
  );
};

export default ResetPassword;
