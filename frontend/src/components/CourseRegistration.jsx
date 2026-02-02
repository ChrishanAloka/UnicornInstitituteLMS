// src/components/CourseRegistration.jsx
import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const CourseRegistration = () => {
  const [courses, setCourses] = useState([]);
  const [instructors, setInstructors] = useState([]);
  const [newCourse, setNewCourse] = useState({
    courseName: "",
    dayOfWeek: "",
    timeFrom: "",
    timeTo: "",
    description: "",
    courseType: "Monthly",
    instructor: "",
    courseStartDate: "",
    courseEndDate: "",
    courseFees: ""
  });
  const [editingCourse, setEditingCourse] = useState(null);
  const [editData, setEditData] = useState({ ...newCourse });
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState("");
  const [sortColumn, setSortColumn] = useState("courseName");
  const [sortDirection, setSortDirection] = useState("asc");
  const [showFilter, setShowFilter] = useState(false);
  const [filterDay, setFilterDay] = useState(""); // e.g., "monday", "tuesday", etc.

  const [showEnrollModal, setShowEnrollModal] = useState(false);
  const [selectedCourseForEnroll, setSelectedCourseForEnroll] = useState(null); // { _id, courseName }
  const [allStudents, setAllStudents] = useState([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [selectedStudentIds, setSelectedStudentIds] = useState(new Set());
  const [enrollmentDates, setEnrollmentDates] = useState({ startDate: "", endDate: "" });

  const [showUnenrollModal, setShowUnenrollModal] = useState(false);
  const [selectedCourseForUnenroll, setSelectedCourseForUnenroll] = useState(null); // { _id, courseName }
  const [enrolledStudents, setEnrolledStudents] = useState([]);
  const [loadingEnrolled, setLoadingEnrolled] = useState(false);
  const [selectedUnenrollStudentIds, setSelectedUnenrollStudentIds] = useState(new Set());

  const [showPastCourses, setShowPastCourses] = useState(false);

  // Columns for filtering & sorting
  const columns = [
    { label: "Course", key: "courseName" },
    { label: "Day", key: "dayOfWeek" },
    { label: "Time From", key: "timeFrom" },
    { label: "Time To", key: "timeTo" },
    { label: "Type", key: "courseType" },
    { label: "Instructor", key: "instructorName" }, // derived
    { label: "Start Date", key: "courseStartDate" },
    { label: "Fees", key: "courseFees" },
  ];

  const filterRef = useRef(null);

  useEffect(() => {
    fetchCourses();
    fetchInstructors();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showFilter && filterRef.current && !filterRef.current.contains(event.target)) {
        setShowFilter(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showFilter]);

  const fetchAllStudents = async () => {
    setLoadingStudents(true);
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(
        "https://unicorninstititutelms.onrender.com/api/auth/students",
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setAllStudents(res.data);
    } catch (err) {
      toast.error("Failed to load students");
      setAllStudents([]);
    } finally {
      setLoadingStudents(false);
    }
  };

  const fetchEnrolledStudents = async (courseId) => {
    setLoadingEnrolled(true);
    try {
      const token = localStorage.getItem("token");
      // Assuming your backend has an endpoint like: GET /api/auth/course/:id/students
      const res = await axios.get(
        `https://unicorninstititutelms.onrender.com/api/auth/course/${courseId}/students`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      // Expected response: array of student objects with enrollment info
      setEnrolledStudents(res.data);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load enrolled students");
      setEnrolledStudents([]);
    } finally {
      setLoadingEnrolled(false);
    }
  };

  const fetchCourses = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get("https://unicorninstititutelms.onrender.com/api/auth/course", {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCourses(res.data);
    } catch (err) {
      toast.error("Failed to load courses");
    } finally {
      setLoading(false);
    }
  };

  const fetchInstructors = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get("https://unicorninstititutelms.onrender.com/api/auth/instructor", {
        headers: { Authorization: `Bearer ${token}` }
      });
      setInstructors(res.data);
    } catch (err) {
      console.warn("Could not load instructors for dropdown");
    }
  };

  const handleChange = (e) =>
    setNewCourse({ ...newCourse, [e.target.name]: e.target.value });

  const handleCreate = async (e) => {
    e.preventDefault();
    const { courseName, dayOfWeek, timeFrom, timeTo, courseType, courseStartDate } = newCourse;
    if (!courseName || !dayOfWeek || !timeFrom || !timeTo) {
      toast.error("Please fill all required fields");
      return;
    }

    if (courseType === "other" && !courseStartDate) {
      toast.error("Course Start Date is required for 'Other' course type");
      return;
    }

    const payload = { ...newCourse };
    if (!payload.courseStartDate) delete payload.courseStartDate;
    if (!payload.courseEndDate) delete payload.courseEndDate;
    if (payload.courseFees === "") delete payload.courseFees;
    else payload.courseFees = Number(payload.courseFees);

    try {
      const token = localStorage.getItem("token");
      const res = await axios.post(
        "https://unicorninstititutelms.onrender.com/api/auth/course/register",
        payload,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setCourses([...courses, res.data]);
      setNewCourse({
        courseName: "",
        dayOfWeek: "",
        timeFrom: "",
        timeTo: "",
        description: "",
        courseType: "Monthly",
        instructor: "",
        courseStartDate: "",
        courseEndDate: "",
        courseFees: ""
      });
      toast.success("Course registered!");
    } catch (err) {
      const msg = err.response?.data?.error || "Registration failed";
      toast.error(msg);
    }
  };

  const openEditModal = (course) => {
    const formatDateForInput = (dateString) => {
      if (!dateString) return "";
      const date = new Date(dateString);
      return new Date(date.getTime() - date.getTimezoneOffset() * 60000)
        .toISOString()
        .split("T")[0];
    };

    setEditingCourse(course._id);
    setEditData({
      courseName: course.courseName,
      dayOfWeek: course.dayOfWeek || "",
      timeFrom: course.timeFrom,
      timeTo: course.timeTo,
      description: course.description || "",
      courseType: course.courseType || "Monthly",
      instructor: course.instructor?._id || course.instructor || "",
      courseStartDate: formatDateForInput(course.courseStartDate) || "",
      courseEndDate: formatDateForInput(course.courseEndDate) || "",
      courseFees: course.courseFees || ""
    });
  };

  const handleEditChange = (e) =>
    setEditData({ ...editData, [e.target.name]: e.target.value });

  const handleUpdate = async (e) => {
    e.preventDefault();
    const { courseName, dayOfWeek, timeFrom, timeTo, courseType, courseStartDate } = editData;

    if (!courseName || !dayOfWeek || !timeFrom || !timeTo) {
      toast.error("Required fields missing");
      return;
    }

    if (courseType === "other" && !courseStartDate) {
      toast.error("Course Start Date is required for 'Other' course type");
      return;
    }

    const payload = { ...editData };
    if (!payload.courseStartDate) delete payload.courseStartDate;
    if (!payload.courseEndDate) delete payload.courseEndDate;
    if (payload.courseFees === "") delete payload.courseFees;
    else payload.courseFees = Number(payload.courseFees);

    try {
      const token = localStorage.getItem("token");
      const res = await axios.put(
        `https://unicorninstititutelms.onrender.com/api/auth/course/${editingCourse}`,
        payload,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setCourses(courses.map(c => c._id === editingCourse ? res.data : c));
      setEditingCourse(null);
      toast.success("Course updated!");
    } catch (err) {
      toast.error("Update failed");
    }
  };

  const handleDelete = (id) => {
    if (!window.confirm("Delete course?")) return;
    axios
      .delete(`https://unicorninstititutelms.onrender.com/api/auth/course/${id}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
      })
      .then(() => {
        setCourses(courses.filter(c => c._id !== id));
        toast.success("Course deleted!");
      })
      .catch(() => toast.error("Delete failed"));
  };

  const handleBulkEnroll = async () => {
    if (selectedStudentIds.size === 0) return;

    const token = localStorage.getItem("token");
    const courseId = selectedCourseForEnroll._id;
    const { startDate, endDate } = enrollmentDates;

    let successCount = 0;
    let errorCount = 0;

    // Enroll each selected student
    for (const studentId of selectedStudentIds) {
      try {
        await axios.post(
          `https://unicorninstititutelms.onrender.com/api/auth/students/enroll/${studentId}`,
          {
            courseId,
            startDate: startDate || undefined,
            endDate: endDate || undefined
          },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        successCount++;
      } catch (err) {
        console.error(`Failed to enroll student ${studentId}:`, err);
        errorCount++;
      }
    }

    toast.success(`${successCount} student(s) enrolled successfully!`);
    if (errorCount > 0) {
      toast.warn(`${errorCount} enrollment(s) failed.`);
    }

    setShowEnrollModal(false);
    // Optionally refresh course list or student data
  };

  const handleBulkUnenroll = async () => {
    if (selectedUnenrollStudentIds.size === 0) return;

    const token = localStorage.getItem("token");
    let successCount = 0;
    let errorCount = 0;

    // Map studentId → enrollmentId (needed for your delete endpoint)
    const studentToEnrollmentMap = {};
    enrolledStudents.forEach(s => {
      if (selectedUnenrollStudentIds.has(s._id)) {
        studentToEnrollmentMap[s._id] = s.enrollmentId;
      }
    });

    // Confirm before unenrolling
    if (!window.confirm(`Are you sure you want to unenroll ${selectedUnenrollStudentIds.size} student(s)?`)) {
      return;
    }

    for (const studentId of selectedUnenrollStudentIds) {
      const enrollmentId = studentToEnrollmentMap[studentId];
      if (!enrollmentId) continue;

      try {
        await axios.delete(
          `https://unicorninstititutelms.onrender.com/api/auth/students/${studentId}/unenroll/${enrollmentId}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        successCount++;
      } catch (err) {
        console.error(`Failed to unenroll student ${studentId}:`, err);
        errorCount++;
      }
    }

    toast.success(`${successCount} student(s) unenrolled!`);
    if (errorCount > 0) {
      toast.error(`${errorCount} unenrollment(s) failed.`);
    }

    // Refresh the list
    await fetchEnrolledStudents(selectedCourseForUnenroll._id);
  };

  const capitalize = (str) => str ? str.charAt(0).toUpperCase() + str.slice(1) : "-";

  const formatDate = (dateStr) => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString("en-GB");
  };

  // Derive instructorName for filtering
  const enrichedCourses = courses.map(c => ({
    ...c,
    instructorName: c.instructor?.name || "-"
  }));

  const matchesSearch = (course) => {
    if (!searchText) return true;
    return columns.some(col => {
      let value = course[col.key];
      if (col.key === "courseFees" && value !== undefined) {
        value = String(value);
      }
      return value && String(value).toLowerCase().includes(searchText.toLowerCase());
    });
  };

  const WEEKDAY_ORDER = {
    monday: 1,
    tuesday: 2,
    wednesday: 3,
    thursday: 4,
    friday: 5,
    saturday: 6,
    sunday: 7
  };

  const today = new Date();
  today.setHours(0, 0, 0, 0); // normalize to start of day

  const processedCourses = enrichedCourses
    .filter((course) => {
      // Text & day filter (existing)
      const matchesText = !searchText || columns.some(col => {
        const val = course[col.key];
        return val != null && String(val).toLowerCase().includes(searchText.toLowerCase());
      });
      const matchesDay = !filterDay || course.dayOfWeek === filterDay;

      if (!matchesText || !matchesDay) return false;

      // Past course logic
      if (showPastCourses) {
        return true; // show all (including past)
      }

      // Hide courses that ended before today
      if (course.courseEndDate) {
        const endDate = new Date(course.courseEndDate);
        endDate.setHours(0, 0, 0, 0);
        return endDate >= today;
      }

      // If no end date, assume it's still active
      return true;
    })
    .sort((a, b) => {
      // ... your existing sort logic (unchanged)
      if (sortColumn === "dayOfWeek") {
        const aOrder = WEEKDAY_ORDER[a.dayOfWeek?.toLowerCase()] ?? 99;
        const bOrder = WEEKDAY_ORDER[b.dayOfWeek?.toLowerCase()] ?? 99;
        return sortDirection === "asc" ? aOrder - bOrder : bOrder - aOrder;
      }
      if (sortColumn === "courseStartDate") {
        return sortDirection === "asc"
          ? new Date(a.courseStartDate) - new Date(b.courseStartDate)
          : new Date(b.courseStartDate) - new Date(a.courseStartDate);
      }
      if (sortColumn === "courseFees") {
        const aVal = parseFloat(a.courseFees) || 0;
        const bVal = parseFloat(b.courseFees) || 0;
        return sortDirection === "asc" ? aVal - bVal : bVal - aVal;
      }
      const aVal = a[sortColumn] ?? "";
      const bVal = b[sortColumn] ?? "";
      return sortDirection === "asc"
        ? String(aVal).localeCompare(String(bVal))
        : String(bVal).localeCompare(String(aVal));
    });

  return (
    <div className="container py-4">
      <h2 className="mb-4 text-primary fw-bold border-bottom pb-2">Register Course</h2>

      <form onSubmit={handleCreate} className="p-4 bg-body shadow-sm rounded border mb-5">
        <div className="row g-4">
          <div className="col-md-6">
            <label className="form-label fw-semibold">Course Name *</label>
            <input
              type="text"
              name="courseName"
              value={newCourse.courseName}
              onChange={handleChange}
              className="form-control shadow-sm"
              required
            />
          </div>
          <div className="col-md-6">
            <label className="form-label fw-semibold">Day of Week *</label>
            <select
              name="dayOfWeek"
              value={newCourse.dayOfWeek}
              onChange={handleChange}
              className="form-select shadow-sm"
              required
            >
              <option value="">-- Select Day --</option>
              {["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"].map(day => (
                <option key={day} value={day}>{capitalize(day)}</option>
              ))}
            </select>
          </div>
          <div className="col-md-6">
            <label className="form-label fw-semibold">Time From *</label>
            <input
              type="time"
              name="timeFrom"
              value={newCourse.timeFrom}
              onChange={handleChange}
              className="form-control shadow-sm"
              required
            />
          </div>
          <div className="col-md-6">
            <label className="form-label fw-semibold">Time To *</label>
            <input
              type="time"
              name="timeTo"
              value={newCourse.timeTo}
              onChange={handleChange}
              className="form-control shadow-sm"
              required
            />
          </div>
          <div className="col-md-6">
            <label className="form-label fw-semibold">Course Type</label>
            <select
              name="courseType"
              value={newCourse.courseType}
              onChange={handleChange}
              className="form-select shadow-sm"
            >
              <option value="Monthly">Monthly</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div className="col-md-6">
            <label className="form-label fw-semibold">Instructor (Optional)</label>
            <select
              name="instructor"
              value={newCourse.instructor}
              onChange={handleChange}
              className="form-select shadow-sm"
            >
              <option value="">-- Select --</option>
              {instructors.map(ins => (
                <option key={ins._id} value={ins._id}>{ins.name}</option>
              ))}
            </select>
          </div>
          <div className="col-md-6">
            <label className="form-label fw-semibold">Course Start Date *</label>
            <input
              type="date"
              name="courseStartDate"
              value={newCourse.courseStartDate}
              onChange={handleChange}
              className="form-control shadow-sm"
              required
            />
          </div>
          <div className="col-md-6">
            <label className="form-label fw-semibold">Course End Date (Optional)</label>
            <input
              type="date"
              name="courseEndDate"
              value={newCourse.courseEndDate}
              onChange={handleChange}
              className="form-control shadow-sm"
              min={newCourse.courseStartDate || undefined} // optional: prevent end < start
            />
          </div>
          <div className="col-md-6">
            <label className="form-label fw-semibold">Course Fees (Optional)</label>
            <input
              type="number"
              name="courseFees"
              value={newCourse.courseFees}
              onChange={handleChange}
              className="form-control shadow-sm"
              min="0"
              step="0.01"
              placeholder="e.g. 150.50"
            />
          </div>
          <div className="col-md-12">
            <label className="form-label fw-semibold">Description</label>
            <textarea
              name="description"
              value={newCourse.description}
              onChange={handleChange}
              className="form-control shadow-sm"
              rows="3"
            />
          </div>
          <div className="col-12 pt-2">
            <button type="submit" className="btn btn-success w-100 py-2 fs-5">
              ✅ Register Course
            </button>
          </div>
        </div>
      </form>

      {/* Edit Modal */}
      {editingCourse && (
        <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: "rgba(0,0,0,0.5)" }}>
          <div className="modal-dialog">
            <div className="modal-content border-0 shadow-lg">
              <div className="modal-header bg-primary text-white">
                <h5 className="modal-title">✏️ Edit Course</h5>
                <button
                  className="btn-close btn-close-white"
                  onClick={() => setEditingCourse(null)}
                />
              </div>
              <div className="modal-body">
                <form onSubmit={handleUpdate}>
                  <div className="mb-3">
                    <label className="form-label fw-semibold">Course Name *</label>
                    <input
                      type="text"
                      name="courseName"
                      value={editData.courseName}
                      onChange={handleEditChange}
                      className="form-control shadow-sm"
                      required
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label fw-semibold">Day of Week *</label>
                    <select
                      name="dayOfWeek"
                      value={editData.dayOfWeek}
                      onChange={handleEditChange}
                      className="form-select shadow-sm"
                      required
                    >
                      <option value="">-- Select Day --</option>
                      {["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"].map(day => (
                        <option key={day} value={day}>{capitalize(day)}</option>
                      ))}
                    </select>
                  </div>
                  <div className="mb-3">
                    <label className="form-label fw-semibold">Time From *</label>
                    <input
                      type="time"
                      name="timeFrom"
                      value={editData.timeFrom}
                      onChange={handleEditChange}
                      className="form-control shadow-sm"
                      required
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label fw-semibold">Time To *</label>
                    <input
                      type="time"
                      name="timeTo"
                      value={editData.timeTo}
                      onChange={handleEditChange}
                      className="form-control shadow-sm"
                      required
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label fw-semibold">Course Type</label>
                    <select
                      name="courseType"
                      value={editData.courseType}
                      onChange={handleEditChange}
                      className="form-select shadow-sm"
                    >
                      <option value="Monthly">Monthly</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div className="mb-3">
                    <label className="form-label fw-semibold">Course Start Date</label>
                    <input
                      type="date"
                      name="courseStartDate"
                      value={editData.courseStartDate}
                      onChange={handleEditChange}
                      className="form-control shadow-sm"
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label fw-semibold">Course End Date (Optional)</label>
                    <input
                      type="date"
                      name="courseEndDate"
                      value={editData.courseEndDate}
                      onChange={handleEditChange}
                      className="form-control shadow-sm"
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label fw-semibold">Course Fees (Optional)</label>
                    <input
                      type="number"
                      name="courseFees"
                      value={editData.courseFees}
                      onChange={handleEditChange}
                      className="form-control shadow-sm"
                      min="0"
                      step="0.01"
                      placeholder="e.g. 150.50"
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label fw-semibold">Instructor</label>
                    <select
                      name="instructor"
                      value={editData.instructor}
                      onChange={handleEditChange}
                      className="form-select shadow-sm"
                    >
                      <option value="">-- Select --</option>
                      {instructors.map(ins => (
                        <option key={ins._id} value={ins._id}>{ins.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="mb-3">
                    <label className="form-label fw-semibold">Description</label>
                    <textarea
                      name="description"
                      value={editData.description}
                      onChange={handleEditChange}
                      className="form-control shadow-sm"
                      rows="2"
                    />
                  </div>
                  <div className="d-flex justify-content-end gap-2 mt-4">
                    <button
                      type="button"
                      className="btn btn-outline-secondary"
                      onClick={() => setEditingCourse(null)}
                    >
                      Cancel
                    </button>
                    <button type="submit" className="btn btn-success">
                      💾 Save Changes
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filter & Table */}
      <div className="container py-4">
        <div className="d-flex justify-content-between align-items-center mb-2 flex-wrap gap-2">
          <h4 className="text-secondary mb-0">📋 Registered Courses</h4>
          <div className="d-flex gap-2">
            <button
              className="btn btn-outline-secondary"
              onClick={() => setShowFilter((prev) => !prev)}
            >
              <i className="bi bi-funnel me-1"></i> Filter
            </button>
            <button
              className={`btn ${showPastCourses ? 'btn-primary' : 'btn-outline-secondary'}`}
              onClick={() => setShowPastCourses(!showPastCourses)}
            >
              {showPastCourses ? '✅ Hide Past Courses' : '🕒 Show Past Courses'}
            </button>
          </div>
        </div>

        {showFilter && (
          <div ref={filterRef} className="sticky-top bg-body border-bottom p-3 mb-3 shadow-sm rounded border" style={{ zIndex: 20 }}>
            <div className="row g-2 align-items-end">
              <div className="col-12 col-md-4">
                <label className="form-label fw-semibold mb-1">Search</label>
                <input
                  type="search"
                  className="form-control shadow-sm"
                  placeholder="Search anything..."
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                />
              </div>
              <div className="col-6 col-md-4">
                <label className="form-label fw-semibold mb-1">Sort by</label>
                <select
                  className="form-select shadow-sm"
                  value={sortColumn}
                  onChange={(e) => setSortColumn(e.target.value)}
                >
                  {columns.map((col) => (
                    <option key={col.key} value={col.key}>
                      {col.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-6 col-md-3">
                <label className="form-label fw-semibold mb-1">Day of Week</label>
                <select
                  className="form-select shadow-sm"
                  value={filterDay}
                  onChange={(e) => setFilterDay(e.target.value)}
                >
                  <option value="">All Days</option>
                  <option value="monday">Monday</option>
                  <option value="tuesday">Tuesday</option>
                  <option value="wednesday">Wednesday</option>
                  <option value="thursday">Thursday</option>
                  <option value="friday">Friday</option>
                  <option value="saturday">Saturday</option>
                  <option value="sunday">Sunday</option>
                </select>
              </div>
              <div className="col-6 col-md-4">
                <label className="form-label fw-semibold mb-1">Order</label>
                <select
                  className="form-select shadow-sm"
                  value={sortDirection}
                  onChange={(e) => setSortDirection(e.target.value)}
                >
                  <option value="asc">A → Z</option>
                  <option value="desc">Z → A</option>
                </select>
              </div>
            </div>
            <div className="mt-2 text-muted small">
              Showing <strong>{processedCourses.length}</strong> courses
            </div>
          </div>
        )}

        {loading ? (
          <div className="text-center py-4">
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
            <p className="mt-2 text-muted">Loading courses...</p>
          </div>
        ) : (
          <div className="table-responsive shadow-sm rounded border">
            <table className="table table-hover align-middle text-center mb-0">
              <thead>
                <tr>
                  <th>Course</th>
                  <th>Day</th>
                  <th>Time</th>
                  <th>Type</th>
                  <th>Instructor</th>
                  <th>Start Date</th>
                  <th>Fees</th>
                  <th className="text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {processedCourses.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="text-center text-muted py-4">
                      No courses found
                    </td>
                  </tr>
                ) : (
                  processedCourses.map((c) => (
                    <tr key={c._id}>
                      <td className="align-middle">{c.courseName}</td>
                      <td className="align-middle">{capitalize(c.dayOfWeek)}</td>
                      <td className="align-middle">{c.timeFrom} – {c.timeTo}</td>
                      <td className="align-middle">{capitalize(c.courseType)}</td>
                      <td className="align-middle">{c.instructorName}</td>
                      <td className="align-middle">{formatDate(c.courseStartDate)}</td>
                      <td className="align-middle">{c.courseFees ? `Rs. ${c.courseFees}` : "—"}</td>
                      <td className="align-middle">
                        <div className="d-flex flex-column gap-2">
                          <button
                            className="btn btn-sm btn-success d-flex align-items-center justify-content-center"
                            onClick={() => {
                              setSelectedCourseForEnroll({ _id: c._id, courseName: c.courseName });
                              setSelectedStudentIds(new Set());
                              setEnrollmentDates({ startDate: "", endDate: "" });
                              fetchAllStudents();
                              setShowEnrollModal(true);
                            }}
                          >
                            <i className="bi bi-person-plus me-1"></i> Enroll
                          </button>
                          <button
                            className="btn btn-sm btn-warning d-flex align-items-center justify-content-center"
                            onClick={async () => {
                              setSelectedCourseForUnenroll({ _id: c._id, courseName: c.courseName });
                              setSelectedUnenrollStudentIds(new Set());
                              await fetchEnrolledStudents(c._id);
                              setShowUnenrollModal(true);
                            }}
                          >
                            <i className="bi bi-people me-1"></i> Manage
                          </button>
                          <button
                            className="btn btn-sm btn-primary d-flex align-items-center justify-content-center"
                            onClick={() => openEditModal(c)}
                          >
                            <i className="bi bi-pencil-square me-1"></i> Edit
                          </button>
                          {/* <button
                            className="btn btn-sm btn-danger d-flex align-items-center justify-content-center"
                            onClick={() => handleDelete(c._id)}
                          >
                            <i className="bi bi-trash me-1"></i> Delete
                          </button> */}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Enroll Students Modal */}
        {showEnrollModal && (
          <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: "rgba(0,0,0,0.5)" }}>
            <div className="modal-dialog modal-lg">
              <div className="modal-content">
                <div className="modal-header bg-success text-white">
                  <h5>Enroll Students in "{selectedCourseForEnroll?.courseName}"</h5>
                  <button
                    className="btn-close btn-close-white"
                    onClick={() => setShowEnrollModal(false)}
                  />
                </div>
                <div className="modal-body">
                  {/* Date Inputs (Optional) */}
                  <div className="row mb-3">
                    <div className="col-md-6">
                      <label className="form-label">Start Date (Optional)</label>
                      <input
                        type="date"
                        className="form-control"
                        value={enrollmentDates.startDate}
                        onChange={(e) => setEnrollmentDates({ ...enrollmentDates, startDate: e.target.value })}
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">End Date (Optional)</label>
                      <input
                        type="date"
                        className="form-control"
                        value={enrollmentDates.endDate}
                        onChange={(e) => setEnrollmentDates({ ...enrollmentDates, endDate: e.target.value })}
                      />
                    </div>
                  </div>

                  {/* Student List */}
                  <h6>Select Students:</h6>
                  {loadingStudents ? (
                    <p>Loading students...</p>
                  ) : allStudents.length === 0 ? (
                    <p className="text-muted">No students available.</p>
                  ) : (
                    <div className="list-group" style={{ maxHeight: "300px", overflowY: "auto" }}>
                      {allStudents.map((student) => (
                        <div key={student._id} className="list-group-item d-flex align-items-center">
                          <input
                            type="checkbox"
                            className="form-check-input me-2"
                            id={`student-${student._id}`}
                            checked={selectedStudentIds.has(student._id)}
                            onChange={(e) => {
                              const newSet = new Set(selectedStudentIds);
                              if (e.target.checked) {
                                newSet.add(student._id);
                              } else {
                                newSet.delete(student._id);
                              }
                              setSelectedStudentIds(newSet);
                            }}
                          />
                          <label className="form-check-label flex-grow-1" htmlFor={`student-${student._id}`}>
                            <strong>{student.initials} {student.firstname} {(student.surname || student.surname=="") ? (student.surname) : (student.secondName)}</strong> ({student.studentId})
                          </label>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setShowEnrollModal(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="btn btn-success"
                    disabled={selectedStudentIds.size === 0}
                    onClick={handleBulkEnroll}
                  >
                    Enroll {selectedStudentIds.size} Student(s)
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Unenroll / Manage Enrollments Modal */}
        {showUnenrollModal && (
          <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: "rgba(0,0,0,0.5)" }}>
            <div className="modal-dialog modal-lg">
              <div className="modal-content">
                <div className="modal-header bg-warning text-dark">
                  <h5>Enrolled Students – "{selectedCourseForUnenroll?.courseName}"</h5>
                  <button
                    className="btn-close"
                    onClick={() => setShowUnenrollModal(false)}
                  />
                </div>
                <div className="modal-body">
                  {loadingEnrolled ? (
                    <p>Loading enrolled students...</p>
                  ) : enrolledStudents.length === 0 ? (
                    <p className="text-muted">No students enrolled in this course.</p>
                  ) : (
                    <>
                      <p>Select students to unenroll:</p>
                      <div className="list-group" style={{ maxHeight: "300px", overflowY: "auto" }}>
                        {enrolledStudents.map((student) => (
                          <div key={student._id} className="list-group-item d-flex align-items-center">
                            <input
                              type="checkbox"
                              className="form-check-input me-2"
                              id={`unenroll-${student._id}`}
                              checked={selectedUnenrollStudentIds.has(student._id)}
                              onChange={(e) => {
                                const newSet = new Set(selectedUnenrollStudentIds);
                                if (e.target.checked) {
                                  newSet.add(student._id);
                                } else {
                                  newSet.delete(student._id);
                                }
                                setSelectedUnenrollStudentIds(newSet);
                              }}
                            />
                            <label className="form-check-label flex-grow-1" htmlFor={`unenroll-${student._id}`}>
                              <strong>{student.initials} {student.firstname} {(student.surname || student.surname=="") ? (student.surname) : (student.secondName)}</strong> ({student.studentId})
                              {student.startDate && (
                                <span className="text-muted ms-2">
                                  From: {new Date(student.startDate).toLocaleDateString()}
                                </span>
                              )}
                              {student.endDate && (
                                <span className="text-muted ms-2">
                                  To: {new Date(student.endDate).toLocaleDateString()}
                                </span>
                              )}
                            </label>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setShowUnenrollModal(false)}
                  >
                    Close
                  </button>
                  <button
                    type="button"
                    className="btn btn-danger"
                    disabled={selectedUnenrollStudentIds.size === 0}
                    onClick={handleBulkUnenroll}
                  >
                    Unenroll {selectedUnenrollStudentIds.size} Student(s)
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <ToastContainer />
    </div>
  );
};

export default CourseRegistration;