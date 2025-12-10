// src/components/CourseRegistration.jsx
import React, { useState, useEffect } from "react";
import axios from "axios";
import { ToastContainer, toast } from "react-toastify";

const CourseRegistration = () => {
  const [courses, setCourses] = useState([]);
  const [instructors, setInstructors] = useState([]);
  const [newCourse, setNewCourse] = useState({
    courseName: "",
    dayOfWeek: "", // ✅ replaced courseDate
    timeFrom: "",
    timeTo: "",
    description: "",
    courseType: "weekly", // ✅ changed default to 'weekly' (more common for day-of-week)
    instructor: ""
  });
  const [editingCourse, setEditingCourse] = useState(null);
  const [editData, setEditData] = useState({ ...newCourse });

  useEffect(() => {
    fetchCourses();
    fetchInstructors();
  }, []);

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
    const { courseName, dayOfWeek, timeFrom, timeTo } = newCourse;
    if (!courseName || !dayOfWeek || !timeFrom || !timeTo) {
      toast.error("Please fill all required fields");
      return;
    }

    try {
      const token = localStorage.getItem("token");
      const res = await axios.post(
        "https://unicorninstititutelms.onrender.com/api/auth/course/register",
        newCourse,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setCourses([...courses, res.data]);
      setNewCourse({
        courseName: "",
        dayOfWeek: "",
        timeFrom: "",
        timeTo: "",
        description: "",
        courseType: "weekly",
        instructor: ""
      });
      toast.success("Course registered!");
    } catch (err) {
      const msg = err.response?.data?.error || "Registration failed";
      toast.error(msg);
    }
  };

  const openEditModal = (course) => {
    setEditingCourse(course._id);
    setEditData({
      courseName: course.courseName,
      dayOfWeek: course.dayOfWeek || "",
      timeFrom: course.timeFrom,
      timeTo: course.timeTo,
      description: course.description || "",
      courseType: course.courseType || "weekly",
      instructor: course.instructor?._id || course.instructor || ""
    });
  };

  const handleEditChange = (e) =>
    setEditData({ ...editData, [e.target.name]: e.target.value });

  const handleUpdate = async (e) => {
    e.preventDefault();
    const { courseName, dayOfWeek, timeFrom, timeTo } = editData;
    if (!courseName || !dayOfWeek || !timeFrom || !timeTo) {
      toast.error("Required fields missing");
      return;
    }

    try {
      const token = localStorage.getItem("token");
      const res = await axios.put(
        `https://unicorninstititutelms.onrender.com/api/auth/course/${editingCourse}`,
        editData,
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

  // Helper: capitalize first letter
  const capitalize = (str) => str ? str.charAt(0).toUpperCase() + str.slice(1) : "-";

  return (
    <div className="container py-4">
      <h2 className="mb-4 text-primary fw-bold border-bottom pb-2">Register Course</h2>

      <form onSubmit={handleCreate} className="p-4 bg-white shadow-sm rounded border mb-5">
        <div className="row g-4">
          <div className="col-md-6">
            <label className="form-label fw-semibold">Course Name *</label>
            <input
              type="text"
              name="courseName"
              value={newCourse.courseName}
              onChange={handleChange}
              className="form-control"
              required
            />
          </div>
          <div className="col-md-6">
            <label className="form-label fw-semibold">Day of Week *</label>
            <select
              name="dayOfWeek"
              value={newCourse.dayOfWeek}
              onChange={handleChange}
              className="form-select"
              required
            >
              <option value="">-- Select Day --</option>
              <option value="monday">Monday</option>
              <option value="tuesday">Tuesday</option>
              <option value="wednesday">Wednesday</option>
              <option value="thursday">Thursday</option>
              <option value="friday">Friday</option>
              <option value="saturday">Saturday</option>
              <option value="sunday">Sunday</option>
            </select>
          </div>
          <div className="col-md-6">
            <label className="form-label fw-semibold">Time From *</label>
            <input
              type="time"
              name="timeFrom"
              value={newCourse.timeFrom}
              onChange={handleChange}
              className="form-control"
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
              className="form-control"
              required
            />
          </div>
          <div className="col-md-6">
            <label className="form-label fw-semibold">Course Type</label>
            <select
              name="courseType"
              value={newCourse.courseType}
              onChange={handleChange}
              className="form-select"
            >
              <option value="Weekly">Weekly</option>
              <option value="Monthly">Monthly</option>
              <option value="3-Month">3 Month Course</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div className="col-md-6">
            <label className="form-label fw-semibold">Instructor (Optional)</label>
            <select
              name="instructor"
              value={newCourse.instructor}
              onChange={handleChange}
              className="form-select"
            >
              <option value="">-- Select --</option>
              {instructors.map(ins => (
                <option key={ins._id} value={ins._id}>{ins.name}</option>
              ))}
            </select>
          </div>
          <div className="col-md-12">
            <label className="form-label fw-semibold">Description</label>
            <textarea
              name="description"
              value={newCourse.description}
              onChange={handleChange}
              className="form-control"
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
            <div className="modal-content">
              <div className="modal-header bg-primary text-white">
                <h5>Edit Course</h5>
                <button className="btn-close btn-close-white" onClick={() => setEditingCourse(null)} />
              </div>
              <div className="modal-body">
                <form onSubmit={handleUpdate}>
                  <div className="mb-3">
                    <label className="form-label">Course Name *</label>
                    <input
                      type="text"
                      name="courseName"
                      value={editData.courseName}
                      onChange={handleEditChange}
                      className="form-control"
                      required
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Day of Week *</label>
                    <select
                      name="dayOfWeek"
                      value={editData.dayOfWeek}
                      onChange={handleEditChange}
                      className="form-select"
                      required
                    >
                      <option value="">-- Select Day --</option>
                      <option value="monday">Monday</option>
                      <option value="tuesday">Tuesday</option>
                      <option value="wednesday">Wednesday</option>
                      <option value="thursday">Thursday</option>
                      <option value="friday">Friday</option>
                      <option value="saturday">Saturday</option>
                      <option value="sunday">Sunday</option>
                    </select>
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Time From *</label>
                    <input
                      type="time"
                      name="timeFrom"
                      value={editData.timeFrom}
                      onChange={handleEditChange}
                      className="form-control"
                      required
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Time To *</label>
                    <input
                      type="time"
                      name="timeTo"
                      value={editData.timeTo}
                      onChange={handleEditChange}
                      className="form-control"
                      required
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Course Type</label>
                    <select
                      name="courseType"
                      value={editData.courseType}
                      onChange={handleEditChange}
                      className="form-select"
                    >
                      <option value="Weekly">Weekly</option>
                      <option value="Monthly">Monthly</option>
                      <option value="3-Month">3 Month Course</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Instructor</label>
                    <select
                      name="instructor"
                      value={editData.instructor}
                      onChange={handleEditChange}
                      className="form-select"
                    >
                      <option value="">-- Select --</option>
                      {instructors.map(ins => (
                        <option key={ins._id} value={ins._id}>{ins.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Description</label>
                    <textarea
                      name="description"
                      value={editData.description}
                      onChange={handleEditChange}
                      className="form-control"
                      rows="2"
                    />
                  </div>
                  <div className="d-flex justify-content-end gap-2">
                    <button type="button" className="btn btn-secondary" onClick={() => setEditingCourse(null)}>
                      Cancel
                    </button>
                    <button type="submit" className="btn btn-success">Save Changes</button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Courses Table */}
      <h4 className="text-secondary mb-3">Registered Courses</h4>
      <div className="table-responsive shadow-sm rounded border">
        <table className="table table-hover">
          <thead className="table-light">
            <tr>
              <th>Course</th>
              <th>Day</th>
              <th>Time</th>
              <th>Type</th>
              <th>Instructor</th>
              <th className="text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {courses.length === 0 ? (
              <tr><td colSpan="6" className="text-center text-muted">No courses</td></tr>
            ) : (
              courses.map(c => (
                <tr key={c._id}>
                  <td>{c.courseName}</td>
                  <td>{capitalize(c.dayOfWeek)}</td>
                  <td>{c.timeFrom} – {c.timeTo}</td>
                  <td>{capitalize(c.courseType)}</td>
                  <td>{c.instructor?.name || "-"}</td>
                  <td className="text-center">
                    <button className="btn btn-sm btn-primary me-2" onClick={() => openEditModal(c)}>Edit</button>
                    <button className="btn btn-sm btn-danger" onClick={() => handleDelete(c._id)}>Delete</button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <ToastContainer />
    </div>
  );
};

export default CourseRegistration;