// src/components/StudentProfile.jsx
import React, { useState, useEffect } from "react";
import axios from "axios";
import { ToastContainer, toast } from "react-toastify";

const StudentProfile = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [student, setStudent] = useState(null);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [enrolledCourses, setEnrolledCourses] = useState([]);

  // For enrollment: track open date fields per course
  const [dateInputs, setDateInputs] = useState({}); // { courseId: { startDate, endDate } }

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

  // Toggle date fields for a course
  const toggleDateFields = (courseId) => {
    setDateInputs(prev => ({
      ...prev,
      [courseId]: prev[courseId] ? null : { startDate: "", endDate: "" }
    }));
  };

  // Update date values
  const handleDateChange = (courseId, field, value) => {
    setDateInputs(prev => ({
      ...prev,
      [courseId]: { ...prev[courseId], [field]: value }
    }));
  };

  const handleEnroll = async (courseId) => {
    const dates = dateInputs[courseId] || {};
    try {
      const token = localStorage.getItem("token");
      const res = await axios.post(
        `https://unicorninstititutelms.onrender.com/api/auth/students/enroll/${student._id}`,
        {
          courseId,
          startDate: dates.startDate || undefined,
          endDate: dates.endDate || undefined
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setEnrolledCourses(res.data.enrolledCourses);
      setDateInputs(prev => ({ ...prev, [courseId]: null })); // close after enroll
      toast.success("Enrolled successfully!");
    } catch (err) {
      toast.error("Enrollment failed");
    }
  };

  const handleUnenroll = async (studentId, enrollmentId) => {
    if (!window.confirm("Unenroll from this course?")) return;
    try {
      const token = localStorage.getItem("token");
      const res = await axios.delete(
        `https://unicorninstititutelms.onrender.com/api/auth/students/${studentId}/unenroll/${enrollmentId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setEnrolledCourses(res.data.enrolledCourses);
      toast.success("Unenrolled successfully");
    } catch (err) {
      toast.error("Failed to unenroll");
    }
  };

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

      {student && (
        <>
          <h4 className="mb-3 text-secondary">Enroll in Course</h4>
          {courses
            .filter(c => !enrolledCourses.some(e => e.course._id === c._id))
            .map(course => (
              <div className="card mb-3" key={course._id}>
                <div className="card-body d-flex flex-wrap justify-content-between align-items-start">
                  <div>
                    <h6 className="mb-1">{course.courseName}</h6>
                    <p className="text-muted small mb-0">
                      {course.dayOfWeek?.charAt(0).toUpperCase() + course.dayOfWeek?.slice(1)} • 
                      {course.timeFrom}–{course.timeTo}
                    </p>
                  </div>
                  <div className="mt-2 mt-md-0">
                    {!dateInputs[course._id] ? (
                      <button
                        className="btn btn-sm btn-outline-secondary"
                        onClick={() => toggleDateFields(course._id)}
                      >
                        📅 Set Dates (Optional)
                      </button>
                    ) : (
                      <div className="d-flex flex-column flex-md-row gap-2">
                        <input
                          type="date"
                          className="form-control form-control-sm"
                          value={dateInputs[course._id].startDate}
                          onChange={(e) => handleDateChange(course._id, 'startDate', e.target.value)}
                          placeholder="Start Date"
                        />
                        <input
                          type="date"
                          className="form-control form-control-sm"
                          value={dateInputs[course._id].endDate}
                          onChange={(e) => handleDateChange(course._id, 'endDate', e.target.value)}
                          placeholder="End Date"
                        />
                        <button
                          className="btn btn-sm btn-success"
                          onClick={() => handleEnroll(course._id)}
                        >
                          ➕ Enroll
                        </button>
                        <button
                          className="btn btn-sm btn-secondary"
                          onClick={() => toggleDateFields(course._id)}
                        >
                          Cancel
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))
          }

          {enrolledCourses.length === 0 ? null : (
            <>
              <h4 className="mb-3 text-secondary mt-5">Enrolled Courses</h4>
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
                            onClick={() => handleUnenroll(student._id, enroll._id)}
                          >
                            🗑️ Unenroll
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </>
      )}

      <ToastContainer />
    </div>
  );
};

export default StudentProfile;