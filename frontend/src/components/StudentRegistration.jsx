import React, { useState, useEffect } from "react";
import axios from "axios";
import { ToastContainer, toast } from "react-toastify";
import { QRCodeSVG } from "qrcode.react";
import "react-toastify/dist/ReactToastify.css";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { useNavigate } from "react-router-dom";

const StudentRegistration = () => {
  const [students, setStudents] = useState([]);
  const [newStudent, setNewStudent] = useState({
    studentId: "",
    name: "",
    birthday: "",
    address: "",
    school: "",
    currentGrade: "",
    phoneNo: "",
    email: "",               // optional
    guardianName: "",        // mandatory
    guardianPhoneNo: "",     // mandatory
    nicNumber: ""  
  });
  const [editingStudent, setEditingStudent] = useState(null);
  const [editData, setEditData] = useState({ ...newStudent });
  const [viewingStudent, setViewingStudent] = useState(null); // for card modal

  // Generate unique student ID (you can also let backend generate it)
  const generateStudentId = () => {
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.floor(1000 + Math.random() * 9000);
    return `STU${timestamp}${random}`;
  };
  const navigate = useNavigate();

  // Load students on mount
  useEffect(() => {
    fetchStudents();
  }, []);

  // Optional: Add this in a useEffect or global stylesheet
  useEffect(() => {
    const style = document.createElement('style');
    style.innerHTML = `
      @media print {
        body * { visibility: hidden; }
        #student-card, #student-card * { visibility: visible; }
        #student-card { position: absolute; left: 0; top: 0; width: 100%; }
      }
    `;
    document.head.appendChild(style);
    return () => document.head.removeChild(style);
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

    const { 
      name, birthday, phoneNo, 
      guardianName, guardianPhoneNo 
    } = newStudent;

    if (!name || !birthday || !phoneNo || !guardianName || !guardianPhoneNo) {
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
        phoneNo: "",
        email: "",               // optional
        guardianName: "",        // mandatory
        guardianPhoneNo: "",     // mandatory
        nicNumber: ""  
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
      phoneNo: student.phoneNo,
      email: student.email || "",
      guardianName: student.guardianName || "",
      guardianPhoneNo: student.guardianPhoneNo || "",
      nicNumber: student.nicNumber || ""
    });
  };

  const handleEditChange = (e) =>
    setEditData({ ...editData, [e.target.name]: e.target.value });

  const handleUpdate = async (e) => {
    e.preventDefault();

    const { 
        name, birthday, phoneNo, 
        guardianName, guardianPhoneNo 
      } = editData;

      if (!name || !birthday || !phoneNo || !guardianName || !guardianPhoneNo) {
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
      <form onSubmit={handleCreate} className="p-4 bg-body shadow-sm rounded border mb-5">
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
          {/* New Fields */}
          <div className="col-md-6">
            <label className="form-label fw-semibold">Email Address</label>
            <input
              type="email"
              name="email"
              value={newStudent.email}
              onChange={handleChange}
              className="form-control shadow-sm"
              placeholder="e.g. parent@example.com"
            />
          </div>

          <div className="col-md-6">
            <label className="form-label fw-semibold">Guardian's Name *</label>
            <input
              type="text"
              name="guardianName"
              value={newStudent.guardianName}
              onChange={handleChange}
              className="form-control shadow-sm"
              placeholder="e.g. Jane Smith"
              required
            />
          </div>

          <div className="col-md-6">
            <label className="form-label fw-semibold">Guardian Phone No *</label>
            <input
              type="text"
              name="guardianPhoneNo"
              value={newStudent.guardianPhoneNo}
              onChange={handleChange}
              className="form-control shadow-sm"
              placeholder="e.g. 0771234567"
              required
            />
          </div>

          <div className="col-md-6">
            <label className="form-label fw-semibold">NIC Number</label>
            <input
              type="text"
              name="nicNumber"
              value={newStudent.nicNumber}
              onChange={handleChange}
              className="form-control shadow-sm"
              placeholder="e.g. 901234567V"
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

      {/* Student Card Modal */}
      {viewingStudent && (
        <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: "rgba(0,0,0,0.5)" }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow-lg" style={{ maxWidth: "420px" }}>
              <div className="modal-header bg-dark text-white">
                <h5 className="modal-title">Student ID Card</h5>
                <button className="btn-close btn-close-white" onClick={() => setViewingStudent(null)} />
              </div>
              <div className="modal-body d-flex justify-content-center p-3">
                {/* Business-card-style student ID */}
                <div
                  id="student-card"
                  style={{
                    width: "323px",        // ≈ 85.6mm
                    height: "204px",       // ≈ 54mm
                    fontFamily: "Inter, Arial, sans-serif",
                    background: "linear-gradient(135deg, #0f2027, #203a43, #2c5364)",
                    color: "#fff",
                    borderRadius: "14px",
                    overflow: "hidden",
                    display: "flex",
                    boxShadow: "0 10px 30px rgba(0,0,0,0.25)"
                  }}
                >
                  {/* LEFT STRIP */}
                  <div
                    style={{
                      width: "70px",
                      background: "rgba(255,255,255,0.12)",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center"
                    }}
                  >
                    <img
                      src="/logo.png"
                      alt="Institute Logo"
                      style={{ width: "42px", marginBottom: "6px" }}
                    />
                    <span style={{ fontSize: "9px", fontWeight: 600, textAlign: "center" }}>
                      UNICORN<br />INSTITUTE
                    </span>
                  </div>

                  {/* RIGHT CONTENT */}
                  <div
                    style={{
                      flex: 1,
                      padding: "14px",
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "space-between"
                    }}
                  >
                    <div>
                      <div style={{ fontSize: "15px", fontWeight: 700 }}>
                        {viewingStudent.name}
                      </div>

                      <div style={{ fontSize: "10px", opacity: 0.85, marginTop: "2px" }}>
                        Student ID: <strong>{viewingStudent.studentId}</strong>
                      </div>

                      <div style={{ fontSize: "10px", marginTop: "4px" }}>
                        Grade: {viewingStudent.currentGrade || "—"}
                      </div>

                      <div style={{ fontSize: "10px" }}>
                        DOB: {new Date(viewingStudent.birthday).toLocaleDateString("en-GB")}
                      </div>

                      <div style={{ fontSize: "10px", marginTop: "4px" }}>
                        Guardian: {viewingStudent.guardianName || "—"}
                      </div>
                    </div>

                    {/* QR */}
                    <div style={{ alignSelf: "flex-end" }}>
                      <QRCodeSVG
                        value={viewingStudent.studentId}
                        size={46}
                        bgColor="#ffffff"
                        fgColor="#000000"
                      />
                    </div>
                  </div>
                </div>

              </div>

              {/* Action Buttons */}
              <div className="modal-footer d-flex justify-content-center gap-2">
                <button
                  className="btn btn-success"
                  onClick={async () => {
                    const input = document.getElementById("student-card");
                    const canvas = await html2canvas(input, {
                      scale: 2.5,
                      useCORS: true,
                      allowTaint: false,
                      backgroundColor: "#ffffff"
                    });
                    const imgData = canvas.toDataURL("image/png");
                    const pdf = new jsPDF({
                      orientation: "landscape",
                      unit: "mm",
                      format: [85.6, 54]
                    });

                    pdf.addImage(imgData, "PNG", 0, 0, 85.6, 54);
                    pdf.save(`StudentCard_${viewingStudent.studentId}.pdf`);

                  }}
                >
                  📥 Download PDF
                </button>
                <button
                  className="btn btn-outline-secondary"
                  onClick={() => {
                    const cardElement = document.getElementById("student-card");

                    // Clone the card
                    const clone = cardElement.cloneNode(true);

                    // Create a new window for printing
                    const printWindow = window.open('', '_blank');

                    // Build minimal HTML with inline styles (to preserve appearance)
                    printWindow.document.write(`
                      <!DOCTYPE html>
                      <html>
                        <head>
                          <title>Student ID Card</title>
                          <style>
                            body {
                              margin: 0;
                              padding: 10mm;
                              display: flex;
                              justify-content: center;
                              align-items: center;
                              background: white;
                              font-family: 'Helvetica Neue', Arial, sans-serif;
                            }
                            @media print {
                              @page {
                                size: 85.6mm 54mm;
                                margin: 0;
                              }
                              body {
                                padding: 0;
                                margin: 0;
                              }
                              #student-card {
                                box-shadow: none !important;
                              }
                            }
                          </style>
                        </head>
                        <body>
                          ${clone.outerHTML}
                        </body>
                      </html>
                    `);

                    printWindow.document.close();
                    printWindow.focus();

                    // Wait for content to load, then print
                    printWindow.onload = () => {
                      printWindow.print();
                      // Optionally close after print (not always desired)
                      // printWindow.close();
                    };
                  }}
                >
                  🖨️ Print
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Students Table */}
      <h4 className="text-secondary mb-3">📋 Registered Students</h4>
      <div className="table-responsive shadow-sm rounded border">
        <table className="table table-hover align-middle mb-0">
          <thead>
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
                    <button 
                      className="btn btn-sm btn-info me-2" 
                      onClick={() => setViewingStudent(s)}
                    >
                      🪪 View Card
                    </button>
                    <button 
                      className="btn btn-sm btn-secondary me-2" 
                      onClick={() => navigate(`/user/comp-Level4?studentId=${s._id}`)}
                    >
                      👤 Profile
                    </button>
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