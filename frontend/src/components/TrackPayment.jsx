// src/components/TrackPayment.jsx
import React, { useState, useEffect } from "react";
import axios from "axios";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const TrackPayment = () => {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchTrackData();
  }, []);

  const fetchTrackData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(
        "https://unicorninstititutelms.onrender.com/api/auth/course/track-payments",
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setCourses(res.data || []);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load payment tracking data");
      setCourses([]);
    } finally {
      setLoading(false);
    }
  };

  const ProgressBar = ({ progress }) => (
    <div
      style={{
        width: "100%",
        height: "20px",
        backgroundColor: "#e9ecef",
        borderRadius: "4px",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          height: "100%",
          width: `${Math.min(100, progress)}%`,
          backgroundColor: progress >= 100 ? "#28a745" : "#007bff",
          transition: "width 0.4s ease",
        }}
      />
    </div>
  );

  const formatDateRange = (course) => {
    if (course.courseType === "monthly") {
      const now = new Date();
      return `Month of ${now.toLocaleString("default", {
        month: "long",
        year: "numeric",
      })}`;
    } else if (course.courseType === "weekly") {
      const now = new Date();
      const day = now.getDay(); // 0 = Sun
      const diffToMonday = day === 0 ? -6 : 1 - day;
      const start = new Date(now);
      start.setDate(now.getDate() + diffToMonday);
      start.setHours(0, 0, 0, 0);
      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      return `${start.toLocaleDateString()} – ${end.toLocaleDateString()}`;
    } else if (course.courseType === "other") {
      const start = course.courseStartDate
        ? new Date(course.courseStartDate).toLocaleDateString()
        : "—";
      const end = course.courseEndDate
        ? new Date(course.courseEndDate).toLocaleDateString()
        : "Ongoing";
      return `${start} to ${end}`;
    }
    return "—";
  };

  if (loading) {
    return (
      <div className="container py-5 text-center">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
        <p className="mt-2">Loading payment tracking data...</p>
      </div>
    );
  }

  return (
    <div className="container py-4">
      <h2 className="mb-4 text-primary fw-bold border-bottom pb-2">
        Track Payments
      </h2>

      {courses.length === 0 ? (
        <div className="alert alert-info">
          No course payment data available.
        </div>
      ) : (
        courses.map((course) => (
          <div
            key={course.courseName} // or use course._id if added to response
            className="mb-5 p-4 bg-white shadow-sm rounded border"
          >
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h4 className="mb-0">{course.courseName}</h4>
              <span className="badge bg-secondary">
                {course.courseType.toUpperCase()}
              </span>
            </div>
            <p className="text-muted small mb-3">
              <strong>Fee:</strong> $
              {(course.courseFees || 0).toFixed(2)} •
              <strong> Period:</strong> {formatDateRange(course)}
            </p>

            {course.students.length === 0 ? (
              <p className="text-muted">No enrolled students.</p>
            ) : (
              <div className="table-responsive">
                <table className="table table-hover">
                  <thead className="table-light">
                    <tr>
                      <th>Student ID</th>
                      <th>Student Name</th>
                      <th>Paid</th>
                      <th>Total Due</th>
                      <th>Progress</th>
                    </tr>
                  </thead>
                  <tbody>
                    {course.students.map((s, idx) => (
                      <tr key={`${course.courseName}-${s.studentId}`}>
                        <td>{s.studentId}</td>
                        <td>{s.name}</td>
                        <td>${s.totalPaid.toFixed(2)}</td>
                        <td>${(course.courseFees || 0).toFixed(2)}</td>
                        <td>
                          <div className="d-flex align-items-center">
                            <div style={{ width: "120px", marginRight: "8px" }}>
                              <ProgressBar progress={s.progressPercent} />
                            </div>
                            <span className="fw-semibold">
                              {s.progressPercent}%
                            </span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ))
      )}

      <ToastContainer />
    </div>
  );
};

export default TrackPayment;