import React, { useEffect, useState } from "react";
import axios from "axios";

const AdminKitchenRequests = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  // Load all kitchen requests
  useEffect(() => {
    const fetchRequests = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await axios.get("https://unicorninstititutelms.onrender.com/api/auth/kitchen/requests", {
          headers: { Authorization: `Bearer ${token}` }
        });
        setRequests(res.data);
      } catch (err) {
        alert("Failed to load requests");
      } finally {
        setLoading(false);
      }
    };
    fetchRequests();
  }, []);

  // Handle status change
  const handleStatusChange = async (id, newStatus) => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.put(
        `https://unicorninstititutelms.onrender.com/api/auth/kitchen/request/${id}/status`,
        { status: newStatus },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      setRequests(
        requests.map((r) => (r._id === id ? res.data : r))
      );
    } catch (err) {
      alert("Failed to update request status");
    }
  };

  if (loading) return <p>Loading requests...</p>;

  return (
  <div className="container py-4">
    <h2 className="mb-4 fw-bold text-primary border-bottom pb-2">
      Kitchen Supply Requests
    </h2>

    {loading ? (
      <p className="text-info">🔄 Loading requests...</p>
    ) : requests.length === 0 ? (
      <div className="alert alert-secondary text-center">
        🚫 No kitchen supply requests found.
      </div>
    ) : (
      <div className="table-responsive shadow-sm border rounded">
        <table className="table table-hover table-bordered align-middle mb-0">
          <thead className="table-light">
            <tr className="text-center">
              <th>Date</th>
              <th>Requested By</th>
              <th>Item</th>
              <th>Quantity</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>

          <tbody>
            {requests.map((req, idx) => (
              <tr key={idx}>
                <td>{new Date(req.date).toLocaleDateString()}</td>
                <td>
                  {req.requestedBy?.name || "Unknown"}
                  <span className="text-muted small ms-1">
                    ({req.requestedBy?.role || "—"})
                  </span>
                </td>
                <td>{req.item}</td>
                <td>
                  {req.quantity} {req.unit}
                </td>
                <td className="text-center">
                  <span
                    className={`badge rounded-pill px-3 py-2 fw-semibold ${
                      req.status === "Pending"
                        ? "bg-warning text-dark"
                        : req.status === "Approved"
                        ? "bg-success"
                        : "bg-danger"
                    }`}
                  >
                    {req.status}
                  </span>
                </td>
                <td className="text-center">
                  {req.status === "Pending" ? (
                    <div className="d-flex justify-content-center gap-2">
                      <button
                        className="btn btn-sm btn-success"
                        onClick={() => handleStatusChange(req._id, "Approved")}
                      >
                        ✅ Approve
                      </button>
                      <button
                        className="btn btn-sm btn-danger"
                        onClick={() => handleStatusChange(req._id, "Rejected")}
                      >
                        ❌ Reject
                      </button>
                    </div>
                  ) : (
                    <span className="text-muted small">No action available</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )}
  </div>
);

};

export default AdminKitchenRequests;