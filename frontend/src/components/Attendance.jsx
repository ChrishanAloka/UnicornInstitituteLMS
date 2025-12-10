// src/components/Attendance.jsx
import React, { useState, useEffect } from "react";
import axios from "axios";
import { ToastContainer, toast } from "react-toastify";

const Attendance = () => {
  const [studentId, setStudentId] = useState("");
  const [student, setStudent] = useState(null);
  const [coursesToday, setCoursesToday] = useState([]);
  const [nextCourse, setNextCourse] = useState(null);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [loading, setLoading] = useState(false);
  const [attendanceStatus, setAttendanceStatus] = useState(""); // 'present', 'absent'

  const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
  const todayDay = new Date().toLocaleDateString("en-US", { weekday: "long" }).toLowerCase();

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!studentId.trim()) return;
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      // Get student + their enrolled courses
      const res = await axios.get(
        `https://unicorninstititutelms.onrender.com/api/auth/students/${studentId}/courses`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setStudent(res.data.student);
      const enrolled = res.data.enrolledCourses || [];

      // Filter courses for TODAY (by dayOfWeek)
      const todayCourses = enrolled.filter(enroll => {
        const courseDay = enroll.course?.dayOfWeek?.toLowerCase();
        return courseDay === todayDay;
      });
      setCoursesToday(todayCourses);

      // Find next upcoming course (Mon-Fri only)
      if (todayCourses.length === 0) {
        const days = ["monday", "tuesday", "wednesday", "thursday", "friday"];
        const todayIndex = days.indexOf(todayDay);
        let nextDay = null;
        for (let i = 1; i <= 5; i++) {
          const idx = (todayIndex + i) % 5;
          const day = days[idx];
          const course = enrolled.find(e => e.course?.dayOfWeek?.toLowerCase() === day);
          if (course) {
            nextDay = { day, course };
            break;
          }
        }
        setNextCourse(nextDay);
      } else {
        setNextCourse(null);
      }

      setSelectedCourse(null);
      setAttendanceStatus("");
    } catch (err) {
      toast.error("Student not found or no enrollment");
      setStudent(null);
      setCoursesToday([]);
      setNextCourse(null);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAttendance = async () => {
    if (!selectedCourse || !attendanceStatus) {
      toast.error("Please select a course and attendance status");
      return;
    }

    try {
      const token = localStorage.getItem("token");
      await axios.post(
        "https://unicorninstititutelms.onrender.com/api/auth/attendance/mark",
        {
          studentId: student.studentId,
          courseId: selectedCourse.course._id,
          date: today,
          status: attendanceStatus
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success("Attendance marked successfully!");
      setSelectedCourse(null);
      setAttendanceStatus("");
    } catch (err) {
      toast.error("Failed to mark attendance");
    }
  };

  return (
    <div className="container py-4">
      <h2 className="mb-4 text-primary fw-bold border-bottom pb-2">Attendance</h2>

      {/* Input Section */}
      <form onSubmit={handleSearch} className="mb-5 p-4 bg-white shadow-sm rounded border">
        <div className="row g-3">
          <div className="col-md-6">
            <label className="form-label fw-semibold">Student ID</label>
            <input
              type="text"
              className="form-control"
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
              placeholder="Enter or scan student ID"
              required
            />
          </div>
          <div className="col-md-3 d-flex align-items-end">
            <button type="submit" className="btn btn-primary w-100" disabled={loading}>
              {loading ? "Loading..." : "🔍 Load Student"}
            </button>
          </div>
          <div className="col-md-3 d-flex align-items-end">
            <div className="bg-light p-2 rounded w-100 text-center">
              <small className="text-muted">Today: {new Date().toLocaleDateString()}</small>
            </div>
          </div>
        </div>
      </form>

      {/* Student Info */}
      {student && (
        <div className="mb-4 p-3 bg-white shadow-sm rounded border">
          <h5>Student: <strong>{student.name}</strong> (ID: {student.studentId})</h5>
        </div>
      )}

      {/* Attendance Logic */}
      {student && (
        <div>
          {coursesToday.length > 0 ? (
            <>
              <h4 className="text-success mb-3">Courses Today</h4>
              <div className="row g-3">
                {coursesToday.map(enroll => (
                  <div className="col-md-6 col-lg-4" key={enroll._id}>
                    <div className="card h-100 border-primary">
                      <div className="card-body">
                        <h6>{enroll.course.courseName}</h6>
                        <p className="text-muted small">
                          {enroll.course.timeFrom} – {enroll.course.timeTo}
                        </p>
                        <button
                          className={`btn btn-sm w-100 ${
                            selectedCourse?._id === enroll._id ? "btn-primary" : "btn-outline-primary"
                          }`}
                          onClick={() => setSelectedCourse(enroll)}
                        >
                          {selectedCourse?._id === enroll._id ? "Selected" : "Select"}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Attendance Form */}
              {selectedCourse && (
                <div className="mt-4 p-4 bg-light rounded">
                  <h5>Mark Attendance for: {selectedCourse.course.courseName}</h5>
                  <div className="mt-3">
                    <div className="form-check form-check-inline">
                      <input
                        className="form-check-input"
                        type="radio"
                        name="attendance"
                        id="present"
                        checked={attendanceStatus === "present"}
                        onChange={() => setAttendanceStatus("present")}
                      />
                      <label className="form-check-label" htmlFor="present">Present</label>
                    </div>
                    <div className="form-check form-check-inline">
                      <input
                        className="form-check-input"
                        type="radio"
                        name="attendance"
                        id="absent"
                        checked={attendanceStatus === "absent"}
                        onChange={() => setAttendanceStatus("absent")}
                      />
                      <label className="form-check-label" htmlFor="absent">Absent</label>
                    </div>
                  </div>
                  <button
                    className="btn btn-success mt-3"
                    onClick={handleMarkAttendance}
                    disabled={!attendanceStatus}
                  >
                    ✅ Mark Attendance
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="alert alert-warning">
              <h5>⚠️ No courses scheduled for today ({todayDay})</h5>
              {nextCourse ? (
                <p>
                  Next course: <strong>{nextCourse.course.courseName}</strong> on{" "}
                  <strong>{nextCourse.day.charAt(0).toUpperCase() + nextCourse.day.slice(1)}</strong>
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