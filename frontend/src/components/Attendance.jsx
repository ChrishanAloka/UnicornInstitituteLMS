// src/components/Attendance.jsx
import React, { useState } from "react";
import axios from "axios";
import { ToastContainer, toast } from "react-toastify";

const Attendance = () => {
  const [studentId, setStudentId] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [studentData, setStudentData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState(null);

  const handleCheck = async () => {
    if (!studentId.trim()) {
      toast.error("Please enter Student ID");
      return;
    }
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(
        "https://unicorninstititutelms.onrender.com/api/auth/attendance",
        {
          headers: { Authorization: `Bearer ${token}` },
          params: { studentId: studentId.trim(), date }
        }
      );
      setStudentData(res.data);
      setSelectedCourse(null);
      toast.success("Student loaded!");
    } catch (err) {
      const msg = err.response?.data?.error || "Student not found";
      toast.error(msg);
      setStudentData(null);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAttendance = async (courseId) => {
    try {
      const token = localStorage.getItem("token");
      await axios.post(
        "https://unicorninstititutelms.onrender.com/api/auth/attendance",
        { studentId, courseId, date },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success("Attendance marked!");
      setSelectedCourse(courseId);
    } catch (err) {
      toast.error("Failed to mark attendance");
    }
  };

  const formatDate = (d) => new Date(d).toLocaleDateString();

  return (
    <div className="container py-4">
      <h2 className="mb-4 text-primary fw-bold border-bottom pb-2">Attendance</h2>

      {/* Input Section */}
      <div className="card p-4 mb-4 shadow-sm">
        <div className="row g-3">
          <div className="col-md-4">
            <label className="form-label">Student ID *</label>
            <input
              type="text"
              className="form-control"
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
              placeholder="Enter Student ID"
            />
          </div>
          <div className="col-md-3">
            <label className="form-label">Date</label>
            <input
              type="date"
              className="form-control"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
          <div className="col-md-3 d-flex align-items-end">
            <button
              className="btn btn-primary w-100"
              onClick={handleCheck}
              disabled={loading}
            >
              {loading ? "Checking..." : "Check Student"}
            </button>
          </div>
        </div>
      </div>

      {/* Student & Courses */}
      {studentData && (
        <div className="mb-4">
          <div className="alert alert-info">
            <h5>{studentData.student.name} (ID: {studentData.student.studentId})</h5>
            <p>Grade: {studentData.student.currentGrade} | Date: {formatDate(studentData.date)}</p>
          </div>

          {studentData.todayCourses.length > 0 ? (
            <div>
              <h5 className="text-success">Today's Courses</h5>
              <div className="row">
                {studentData.todayCourses.map((course) => (
                  <div className="col-md-6 mb-3" key={course._id}>
                    <div className="card border-left-success">
                      <div className="card-body">
                        <h6>{course.courseName}</h6>
                        <p className="mb-2">
                          {course.timeFrom} – {course.timeTo} ({course.dayOfWeek})
                        </p>
                        <button
                          className={`btn btn-sm ${
                            selectedCourse === course._id ? "btn-success" : "btn-outline-success"
                          }`}
                          onClick={() => handleMarkAttendance(course._id)}
                          disabled={selectedCourse === course._id}
                        >
                          {selectedCourse === course._id ? "✓ Attended" : "Mark Present"}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="alert alert-warning">
              <h5>No courses scheduled for today!</h5>
              {studentData.nextCourse ? (
                <p>
                  Next course: <strong>{studentData.nextCourse.courseName}</strong> on{" "}
                  <strong>{formatDate(studentData.nextCourse.nextDate)}</strong> ({studentData.nextCourse.dayOfWeek})
                </p>
              ) : (
                <p>No upcoming courses found.</p>
              )}
            </div>
          )}
        </div>
      )}

      <ToastContainer />
    </div>
  );
};

export default Attendance;