// src/components/StudentProfile.jsx
import React, { useState, useEffect } from "react";
import axios from "axios";
import { ToastContainer, toast } from "react-toastify";
import { useParams } from "react-router-dom";

const StudentProfile = () => {
  const { id } = useParams(); // student _id
  const [student, setStudent] = useState(null);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [enrollLoading, setEnrollLoading] = useState(false);

  // Enrollment form state
  const [selectedCourseId, setSelectedCourseId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Fetch student + all courses
  useEffect(() => {
    fetchStudent();
    fetchCourses();
  }, [id]);

  const fetchStudent = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(`https://unicorninstititutelms.onrender.com/api/auth/students/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStudent(res.data);
      setLoading(false);
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  };

  const fetchCourses = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get("https://unicorninstititutelms.onrender.com/api/auth/course", {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCourses(res.data);
    } catch (err) {
      toast.error("Failed to load courses");
    }
  };

  // === ENROLL ===
  const handleEnroll = async (e) => {
    e.preventDefault();
    if (!selectedCourseId || !startDate) {
      toast.error("Please select a course and set a start date");
      return;
    }

    setEnrollLoading(true);
    try {
      const token = localStorage.getItem("token");
      await axios.post(
        "https://unicorninstititutelms.onrender.com/api/auth/enroll",
        {
          studentId: student.studentId,
          courseId: selectedCourseId,
          startDate,
          endDate: endDate || undefined
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success("Enrolled successfully!");
      setSelectedCourseId("");
      setStartDate("");
      setEndDate("");
      fetchStudent(); // Refresh
    } catch (err) {
      const msg = err.response?.data?.error || "Enrollment failed";
      toast.error(msg);
    } finally {
      setEnrollLoading(false);
    }
  };

  // === UNENROLL ===
  const handleUnenroll = async (courseId) => {
    if (!window.confirm("Are you sure you want to unenroll this student from the course?")) {
      return;
    }

    try {
      const token = localStorage.getItem("token");
      await axios.delete(
        `https://unicorninstititutelms.onrender.com/api/auth/unenroll/${student.studentId}/${courseId}`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      toast.success("Unenrolled successfully!");
      fetchStudent(); // Refresh data
    } catch (err) {
      toast.error("Failed to unenroll");
    }
  };

  if (loading) return <div className="container py-5">Loading...</div>;

  if (!student) {
    return (
        <div className="container py-5">
        <div className="alert alert-danger">Student not found.</div>
        </div>
    );
    }

  return (
    <div className="container py-4">
      <h2 className="mb-4 text-primary fw-bold">Student Profile</h2>

      {/* Student Info Card */}
      <div className="card shadow-sm mb-4">
        <div className="card-body">
          <h5 className="card-title">{student.name}</h5>
          <p><strong>Student ID:</strong> {student.studentId}</p>
          <p><strong>Grade:</strong> {student.currentGrade || "-"}</p>
          <p><strong>Phone:</strong> {student.phoneNo}</p>
          <p><strong>Address:</strong> {student.address || "-"}</p>
        </div>
      </div>

      {/* Enroll to New Course */}
      <div className="card shadow-sm mb-4">
        <div className="card-header bg-primary text-white fw-bold">
          Enroll to New Course
        </div>
        <div className="card-body">
          <form onSubmit={handleEnroll}>
            <div className="row g-3">
              <div className="col-md-5">
                <label className="form-label">Select Course *</label>
                <select
                  className="form-select"
                  value={selectedCourseId}
                  onChange={(e) => setSelectedCourseId(e.target.value)}
                  required
                >
                  <option value="">-- Choose Course --</option>
                  {courses.map((course) => (
                    <option key={course._id} value={course._id}>
                      {course.courseName} ({course.dayOfWeek}, {course.timeFrom}–{course.timeTo})
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-md-3">
                <label className="form-label">Start Date *</label>
                <input
                  type="date"
                  className="form-control"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  required
                />
              </div>
              <div className="col-md-3">
                <label className="form-label">End Date (Optional)</label>
                <input
                  type="date"
                  className="form-control"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
              <div className="col-md-1 d-flex align-items-end">
                <button
                  type="submit"
                  className="btn btn-success"
                  disabled={enrollLoading}
                >
                  {enrollLoading ? "Saving..." : "Enroll"}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>

      {/* Enrolled Courses */}
      <h4 className="mb-3">Enrolled Courses</h4>
      {student.enrolledCourses?.length === 0 ? (
        <div className="alert alert-info">No courses enrolled yet.</div>
      ) : (
        <div className="row">
          {student.enrolledCourses.map((enroll, idx) => {
            const course = enroll.course;
            if (!course) return null; // skip if course was deleted

            return (
              <div className="col-md-6 mb-3" key={idx}>
                <div className="card border-left-primary h-100">
                  <div className="card-body d-flex flex-column">
                    <h6 className="fw-bold">{course.courseName}</h6>
                    <p className="mb-2">
                      <small>
                        Start: {new Date(enroll.startDate).toLocaleDateString()}<br />
                        {enroll.endDate && `End: ${new Date(enroll.endDate).toLocaleDateString()}`}
                      </small>
                    </p>
                    <div className="mt-auto d-flex justify-content-between align-items-center">
                      <span className="badge bg-info">
                        {course.dayOfWeek.charAt(0).toUpperCase() + course.dayOfWeek.slice(1)}
                      </span>
                      <button
                        className="btn btn-sm btn-outline-danger"
                        onClick={() => handleUnenroll(course._id)}
                      >
                        Unenroll
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <ToastContainer />
    </div>
  );
};

export default StudentProfile;