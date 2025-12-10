import React, { useState, useEffect } from "react";
import axios from "axios";
import { ToastContainer, toast } from "react-toastify";
import { QRCodeSVG } from "qrcode.react";
import "react-toastify/dist/ReactToastify.css";

const StudentRegistration = () => {
  const [students, setStudents] = useState([]);
  const [newStudent, setNewStudent] = useState({
    studentId: "",
    name: "",
    birthday: "",
    address: "",
    school: "",
    currentGrade: "",
    phoneNo: ""
  });
  const [editingStudent, setEditingStudent] = useState(null);
  const [editData, setEditData] = useState({ ...newStudent });

  // Generate unique student ID (you can also let backend generate it)
  const generateStudentId = () => {
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.floor(1000 + Math.random() * 9000);
    return `STU${timestamp}${random}`;
  };

  // Load students on mount
  useEffect(() => {
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get("https://unicorninstititutelms.onrender.com/api/auth/students", {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStudents(res.data);
    } catch (err) {
      toast.error("Failed to load students");
    }
  };

  const handleChange = (e) =>
    setNewStudent({ ...newStudent, [e.target.name]: e.target.value });

  const handleCreate = async (e) => {
    e.preventDefault();

    const { name, birthday, address, school, currentGrade, phoneNo } = newStudent;
    if (!name || !birthday || !phoneNo) {
      toast.error("Please fill all required fields");
      return;
    }

    // Auto-generate student ID only if not manually entered
    const studentId = newStudent.studentId || generateStudentId();

    try {
      const token = localStorage.getItem("token");
      const res = await axios.post(
        "https://unicorninstititutelms.onrender.com/api/auth/students/register",
        { ...newStudent, studentId },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      setStudents([...students, res.data]);
      setNewStudent({
        studentId: "",
        name: "",
        birthday: "",
        address: "",
        school: "",
        currentGrade: "",
        phoneNo: ""
      });
      toast.success("Student registered successfully!");
    } catch (err) {
      const errorMessage = err.response?.data?.error || "Failed to register student";
      toast.error(errorMessage);
    }
  };

  const openEditModal = (student) => {
    // Helper to format date from ISO to YYYY-MM-DD
    const formatDateForInput = (dateString) => {
        if (!dateString) return "";
        const date = new Date(dateString);
        // Use UTC to avoid timezone shifting the day
        return new Date(date.getTime() - date.getTimezoneOffset() * 60000)
        .toISOString()
        .split("T")[0];
    };
    
    setEditingStudent(student._id);
    setEditData({
      studentId: student.studentId,
      name: student.name,
      birthday: formatDateForInput(student.birthday),
      address: student.address,
      school: student.school,
      currentGrade: student.currentGrade,
      phoneNo: student.phoneNo
    });
  };

  const handleEditChange = (e) =>
    setEditData({ ...editData, [e.target.name]: e.target.value });

  const handleUpdate = async (e) => {
    e.preventDefault();

    const { name, birthday, phoneNo } = editData;
    if (!name || !birthday || !phoneNo) {
      toast.error("Please fill all required fields");
      return;
    }

    try {
      const token = localStorage.getItem("token");
      const res = await axios.put(
        `https://unicorninstititutelms.onrender.com/api/auth/students/${editingStudent}`,
        editData,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      setStudents(students.map((s) => (s._id === editingStudent ? res.data : s)));
      setEditingStudent(null);
      toast.success("Student updated successfully!");
    } catch (err) {
      toast.error("Failed to update student");
    }
  };

  const handleDelete = (id) => {
    if (!window.confirm("Are you sure you want to delete this student?")) return;

    axios
      .delete(`https://unicorninstititutelms.onrender.com/api/auth/students/${id}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
      })
      .then(() => {
        setStudents(students.filter((s) => s._id !== id));
        toast.success("Student deleted successfully!");
      })
      .catch(() => {
        toast.error("Failed to delete student");
      });
  };

  return (
    <div className="container py-4">
      <h2 className="mb-4 text-primary fw-bold border-bottom pb-2">Register New Student</h2>

      {/* Form */}
      <form onSubmit={handleCreate} className="p-4 bg-white shadow-sm rounded border mb-5">
        <div className="row g-4">
          <div className="col-md-6">
            <label className="form-label fw-semibold">Student ID (auto-generated if blank)</label>
            <input
              type="text"
              name="studentId"
              value={newStudent.studentId}
              onChange={handleChange}
              className="form-control shadow-sm"
              placeholder="Leave blank for auto ID"
              disabled={!!newStudent.studentId}
            />
          </div>
          <div className="col-md-6">
            <label className="form-label fw-semibold">Full Name *</label>
            <input
              type="text"
              name="name"
              value={newStudent.name}
              onChange={handleChange}
              className="form-control shadow-sm"
              placeholder="e.g. John Smith"
              required
            />
          </div>
          <div className="col-md-6">
            <label className="form-label fw-semibold">Birthday *</label>
            <input
              type="date"
              name="birthday"
              value={newStudent.birthday}
              onChange={handleChange}
              className="form-control shadow-sm"
              required
            />
          </div>
          <div className="col-md-6">
            <label className="form-label fw-semibold">Phone No *</label>
            <input
              type="text"
              name="phoneNo"
              value={newStudent.phoneNo}
              onChange={handleChange}
              className="form-control shadow-sm"
              placeholder="e.g. 0771234567"
              required
            />
          </div>
          <div className="col-md-6">
            <label className="form-label fw-semibold">School</label>
            <input
              type="text"
              name="school"
              value={newStudent.school}
              onChange={handleChange}
              className="form-control shadow-sm"
              placeholder="e.g. Green Valley High"
            />
          </div>
          <div className="col-md-6">
            <label className="form-label fw-semibold">Current Grade</label>
            <input
              type="text"
              name="currentGrade"
              value={newStudent.currentGrade}
              onChange={handleChange}
              className="form-control shadow-sm"
              placeholder="e.g. Grade 10"
            />
          </div>
          <div className="col-md-12">
            <label className="form-label fw-semibold">Address</label>
            <input
              type="text"
              name="address"
              value={newStudent.address}
              onChange={handleChange}
              className="form-control shadow-sm"
              placeholder="Full address"
            />
          </div>

          <div className="col-12 pt-2">
            <button type="submit" className="btn btn-success w-100 py-2 fs-5">
              ✅ Register Student
            </button>
          </div>
        </div>
      </form>

      {/* Edit Modal */}
      {editingStudent && (
        <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: "rgba(0,0,0,0.5)" }}>
          <div className="modal-dialog">
            <div className="modal-content border-0 shadow-lg">
              <div className="modal-header bg-primary text-white">
                <h5 className="modal-title">✏️ Edit Student</h5>
                <button className="btn-close btn-close-white" onClick={() => setEditingStudent(null)} />
              </div>
              <div className="modal-body">
                <form onSubmit={handleUpdate}>
                  {[
                    { name: "studentId", label: "Student ID", type: "text" },
                    { name: "name", label: "Full Name", type: "text", required: true },
                    { name: "birthday", label: "Birthday", type: "date", required: true },
                    { name: "phoneNo", label: "Phone No", type: "text", required: true },
                    { name: "school", label: "School", type: "text" },
                    { name: "currentGrade", label: "Current Grade", type: "text" },
                    { name: "address", label: "Address", type: "text" }
                  ].map((field) => (
                    <div className="mb-3" key={field.name}>
                      <label className="form-label fw-semibold">{field.label}{field.required && " *"}</label>
                      <input
                        type={field.type}
                        name={field.name}
                        value={editData[field.name]}
                        onChange={handleEditChange}
                        className="form-control shadow-sm"
                        required={field.required}
                      />
                    </div>
                  ))}

                  <div className="d-flex justify-content-between mt-4">
                    <button type="button" className="btn btn-outline-secondary" onClick={() => setEditingStudent(null)}>
                      Cancel
                    </button>
                    <button type="submit" className="btn btn-success">💾 Save Changes</button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Students Table */}
      <h4 className="text-secondary mb-3">📋 Registered Students</h4>
      <div className="table-responsive shadow-sm rounded border">
        <table className="table table-hover align-middle mb-0">
          <thead className="table-light">
            <tr>
              <th>Student ID</th>
              <th>Name</th>
              <th>Birthday</th>
              <th>Phone</th>
              <th>Grade</th>
              <th>QR Code</th>
              <th className="text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {students.length === 0 ? (
              <tr>
                <td colSpan="7" className="text-center text-muted py-4">
                  No students found
                </td>
              </tr>
            ) : (
              students.map((s) => (
                <tr key={s._id}>
                  <td><code>{s.studentId}</code></td>
                  <td>{s.name}</td>
                  <td>{new Date(s.birthday).toLocaleDateString()}</td>
                  <td>{s.phoneNo}</td>
                  <td>{s.currentGrade || "-"}</td>
                  <td>
                    <div style={{ width: "60px", height: "60px" }}>
                      <QRCodeSVG value={s.studentId} size={60} />
                    </div>
                  </td>
                  <td className="text-center">
                    <button className="btn btn-sm btn-primary me-2" onClick={() => openEditModal(s)}>
                      ✏️ Edit
                    </button>
                    <button className="btn btn-sm btn-danger" onClick={() => handleDelete(s._id)}>
                      🗑️ Delete
                    </button>
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

export default StudentRegistration;