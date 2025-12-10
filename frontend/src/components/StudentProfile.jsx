// src/components/StudentProfile.jsx
import React, { useState, useEffect } from "react";
import axios from "axios";
import { ToastContainer, toast } from "react-toastify";

const StudentProfile = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [student, setStudent] = useState(null);
  const [courses, setCourses] = useState([]); // all available courses
  const [loading, setLoading] = useState(false);
  const [enrolledCourses, setEnrolledCourses] = useState([]);

  // Load all courses once
  useEffect(() => {
    fetchAllCourses();
  }, []);

  const fetchAllCourses = async () => {
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

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchTerm.trim()) return;
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(
        `https://unicorninstititutelms.onrender.com/api/auth/students/search?q=${encodeURIComponent(searchTerm)}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.data) {
        setStudent(res.data);
        setEnrolledCourses(res.data.enrolledCourses || []);
      } else {
        toast.error("Student not found");
        setStudent(null);
        setEnrolledCourses([]);
      }
    } catch (err) {
      toast.error("Student not found");
      setStudent(null);
      setEnrolledCourses([]);
    } finally {
      setLoading(false);
    }
  };

  const handleEnroll = async (courseId) => {
    const course = courses.find(c => c._id === courseId);
    if (!course) return;

    const startDate = prompt("Enter start date (YYYY-MM-DD) - optional:");
    const endDate = prompt("Enter end date (YYYY-MM-DD) - optional:");

    try {
      const token = localStorage.getItem("token");
      const res = await axios.post(
        `https://unicorninstititutelms.onrender.com/api/auth/students/enroll/${student._id}`,
        {
          courseId,
          startDate: startDate || undefined,
          endDate: endDate || undefined
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setEnrolledCourses(res.data.enrolledCourses);
      toast.success(`Enrolled in ${course.courseName}`);
    } catch (err) {
      toast.error("Enrollment failed");
    }
  };

  const handleUnenroll = async (enrollmentId) => {
    if (!window.confirm("Unenroll from this course?")) return;
    try {
      const token = localStorage.getItem("token");
      const res = await axios.delete(
        `https://unicorninstititutelms.onrender.com/api/auth/students/unenroll/${enrollmentId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setEnrolledCourses(res.data.enrolledCourses);
      toast.success("Unenrolled successfully");
    } catch (err) {
      toast.error("Failed to unenroll");
    }
  };

  // Format date for display
  const formatDate = (dateStr) => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString();
  };

  return (
    <div className="container py-4">
      <h2 className="mb-4 text-primary fw-bold border-bottom pb-2">Student Profile</h2>

      {/* Search Form */}
      <form onSubmit={handleSearch} className="mb-5 p-4 bg-white shadow-sm rounded border">
        <div className="row g-3">
          <div className="col-md-8">
            <label className="form-label fw-semibold">Search Student (by ID or Name)</label>
            <input
              type="text"
              className="form-control"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Enter student ID or name"
              required
            />
          </div>
          <div className="col-md-4 d-flex align-items-end">
            <button type="submit" className="btn btn-primary w-100" disabled={loading}>
              {loading ? "Searching..." : "🔍 Search"}
            </button>
          </div>
        </div>
      </form>

      {/* Student Details */}
      {student && (
        <div className="mb-5 p-4 bg-white shadow-sm rounded border">
          <h4 className="mb-3">Student Details</h4>
          <div className="row">
            <div className="col-md-6">
              <p><strong>ID:</strong> {student.studentId}</p>
              <p><strong>Name:</strong> {student.name}</p>
              <p><strong>Birthday:</strong> {new Date(student.birthday).toLocaleDateString()}</p>
              <p><strong>Phone:</strong> {student.phoneNo}</p>
            </div>
            <div className="col-md-6">
              <p><strong>School:</strong> {student.school || "—"} </p>
              <p><strong>Grade:</strong> {student.currentGrade || "—"} </p>
              <p><strong>Address:</strong> {student.address || "—"} </p>
            </div>
          </div>
        </div>
      )}

      {/* Enroll Section */}
      {student && (
        <>
          <h4 className="mb-3 text-secondary">Enroll in Course</h4>
          <div className="row g-3 mb-4">
            {courses
              .filter(c => !enrolledCourses.some(e => e.course._id === c._id))
              .map(course => (
                <div className="col-md-6 col-lg-4" key={course._id}>
                  <div className="card h-100">
                    <div className="card-body">
                      <h6>{course.courseName}</h6>
                      <p className="text-muted small">
                        {course.dayOfWeek?.charAt(0).toUpperCase() + course.dayOfWeek?.slice(1)} • 
                        {course.timeFrom}–{course.timeTo}
                      </p>
                      <button
                        className="btn btn-sm btn-success"
                        onClick={() => handleEnroll(course._id)}
                      >
                        ➕ Enroll
                      </button>
                    </div>
                  </div>
                </div>
              ))}
          </div>

          {/* Enrolled Courses */}
          <h4 className="mb-3 text-secondary">Enrolled Courses</h4>
          {enrolledCourses.length === 0 ? (
            <p className="text-muted">No courses enrolled.</p>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover">
                <thead className="table-light">
                  <tr>
                    <th>Course</th>
                    <th>Day & Time</th>
                    <th>Start Date</th>
                    <th>End Date</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {enrolledCourses.map(enroll => (
                    <tr key={enroll._id}>
                      <td>{enroll.course?.courseName || "—"}</td>
                      <td>
                        {enroll.course?.dayOfWeek && (
                          <>
                            {enroll.course.dayOfWeek.charAt(0).toUpperCase() + enroll.course.dayOfWeek.slice(1)} • 
                            {enroll.course.timeFrom}–{enroll.course.timeTo}
                          </>
                        )}
                      </td>
                      <td>{formatDate(enroll.startDate)}</td>
                      <td>{formatDate(enroll.endDate)}</td>
                      <td>
                        <button
                          className="btn btn-sm btn-danger"
                          onClick={() => handleUnenroll(enroll._id)}
                        >
                          🗑️ Unenroll
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      <ToastContainer />
    </div>
  );
};

export default StudentProfile;