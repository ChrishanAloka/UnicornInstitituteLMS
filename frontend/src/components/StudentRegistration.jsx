import React, { useState, useEffect } from "react";
import axios from "axios";
import { ToastContainer, toast } from "react-toastify";
import { QRCodeSVG } from "qrcode.react";
import "react-toastify/dist/ReactToastify.css";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { useNavigate } from "react-router-dom";
import "./StudentRegistration.css"

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
  const [birthdayInputMode, setBirthdayInputMode] = useState('text'); // 'text' or 'date'
  const [editBirthdayMode, setEditBirthdayMode] = useState('text');   // In your edit modal, add this state:

  const [loading, setLoading] = useState(true);            // for initial fetch
  const [creating, setCreating] = useState(false);         // for register
  const [updating, setUpdating] = useState(false);         // for edit
  const [deleting, setDeleting] = useState(false);         // for delete

  const [searchText, setSearchText] = useState("");
  const [sortColumn, setSortColumn] = useState("name");
  const [sortDirection, setSortDirection] = useState("asc"); // asc | desc
  const [showFilter, setShowFilter] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loadingStudents, setLoadingStudents] = useState(false);


  // Generate unique student ID (you can also let backend generate it)
  const generateStudentId = () => {
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.floor(1000 + Math.random() * 9000);
    return `STU${timestamp}${random}`;
  };
  const navigate = useNavigate();

  // Load students on mount
  useEffect(() => {
    fetchStudents(1);
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

  const fetchStudents = async (page = 1) => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(
        "https://unicorninstititutelms.onrender.com/api/auth/students/registered",
        {
          headers: { Authorization: `Bearer ${token}` },
          params: { page, limit: 10 }
        }
      );
      setStudents(res.data.students || []);
      console.log(res.data.students);
      setTotalPages(res.data.totalPages || 1);
      setCurrentPage(page);
    } catch (err) {
      toast.error("Failed to load students");
      setStudents([]);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    { label: "Name", key: "name" },
    { label: "Student ID", key: "studentId" },
    { label: "Grade", key: "currentGrade" },
    { label: "Birthday", key: "birthday" },
    { label: "Phone", key: "phoneNo" },
    { label: "School", key: "school" },
    { label: "Guardian", key: "guardianName" },
  ];


  const matchesSearch = (student) => {
    if (!searchText) return true;

    return columns.some(col => {
      const value = student[col.key];
      return (
        value &&
        String(value).toLowerCase().includes(searchText.toLowerCase())
      );
    });
  };

  const processedStudents = students
  .filter(matchesSearch)
  .sort((a, b) => {
    const aVal = a[sortColumn] ?? "";
    const bVal = b[sortColumn] ?? "";

    // Date support
    if (sortColumn === "birthday") {
      return sortDirection === "asc"
        ? new Date(aVal) - new Date(bVal)
        : new Date(bVal) - new Date(aVal);
    }

    // Text/number
    return sortDirection === "asc"
      ? String(aVal).localeCompare(String(bVal))
      : String(bVal).localeCompare(String(aVal));
  });
  

  const handleChange = (e) =>
    setNewStudent({ ...newStudent, [e.target.name]: e.target.value });

  // Converts "14/06/2002" → "2002-06-14"
  const convertToISODate = (ddmmyyyy) => {
    if (!ddmmyyyy) return '';
    const parts = ddmmyyyy.split('/');
    if (parts.length !== 3) return ''; // invalid format
    const [day, month, year] = parts;
    // Validate numbers
    const d = parseInt(day, 10);
    const m = parseInt(month, 10);
    const y = parseInt(year, 10);
    if (isNaN(d) || isNaN(m) || isNaN(y)) return '';
    // Create ISO string (Mongoose can parse this)
    return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  };

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

    // ✅ Validate and convert birthday
    const isoBirthday = convertToISODate(birthday);
    if (!isoBirthday) {
      toast.error("Please enter a valid birthday in dd/mm/yyyy format");
      return;
    }

    // Auto-generate student ID only if not manually entered
    const studentId = newStudent.studentId || generateStudentId();

    setCreating(true); // start loading

    try {
      const token = localStorage.getItem("token");

      // ✅ Send ISO date to backend
      const payload = {
        ...newStudent,
        studentId,
        birthday: isoBirthday // 🔄 converted here!
      };

      const res = await axios.post(
        "https://unicorninstititutelms.onrender.com/api/auth/students/register",
        payload,
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
      fetchStudents(currentPage);
    } catch (err) {
      const errorMessage = err.response?.data?.error || "Failed to register student";
      toast.error(errorMessage);
    } finally {
      setCreating(false); // stop loading
    }
  };

  const openEditModal = (student) => {
    const formatDateToDisplay = (isoString) => {
      if (!isoString) return '';
      const date = new Date(isoString);
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      return `${day}/${month}/${year}`;
    };

    setEditingStudent(student._id);
    setEditData({
      studentId: student.studentId,
      name: student.name,
      birthday: formatDateToDisplay(student.birthday),
      address: student.address,
      school: student.school,
      currentGrade: student.currentGrade,
      phoneNo: student.phoneNo,
      email: student.email || "",               // ✅
      guardianName: student.guardianName || "", // ✅
      guardianPhoneNo: student.guardianPhoneNo || "", // ✅
      nicNumber: student.nicNumber || ""        // ✅
    });
    setEditBirthdayMode('text');
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

    const isoBirthday = convertToISODate(birthday);
    if (!isoBirthday) {
      toast.error("Please enter a valid birthday in dd/mm/yyyy format");
      return;
    }

    setUpdating(true); // start loading

    try {
      const token = localStorage.getItem("token");

      // ✅ Send ISO date to backend
      const payload = {
        ...editData,
        birthday: isoBirthday // 🔄 converted here!
      };
      
      const res = await axios.put(
        `https://unicorninstititutelms.onrender.com/api/auth/students/${editingStudent}`,
        payload,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      setStudents(students.map((s) => (s._id === editingStudent ? res.data : s)));
      setEditingStudent(null);
      setEditBirthdayMode('text');
      toast.success("Student updated successfully!");
    } catch (err) {
      toast.error(`Failed to update student: ${err.response?.message || err.message}`);
    } finally {
      setUpdating(false); // stop loading
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this student?")) return;

    setLoading(true); // start loading
    try {
      const token = localStorage.getItem("token");
      await axios.delete(
        `https://unicorninstititutelms.onrender.com/api/auth/students/${id}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setStudents(students.filter((s) => s._id !== id));
      toast.success("Student deleted successfully!");
    } catch (err) {
      toast.error("Failed to delete student");
    } finally {
      setLoading(false); // stop loading
    }
  };

  // Converts "15/05/2010" → "2010-05-15"
  const formatDateToISO = (dateStr) => {
    if (!dateStr || dateStr.length !== 10) return '';
    const [day, month, year] = dateStr.split('/');
    if (!day || !month || !year) return '';
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
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
              // disabled={!!newStudent.studentId}
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
            <div className="input-group">
              {birthdayInputMode === 'text' ? (
                <input
                  type="text"
                  name="birthday"
                  value={newStudent.birthday}
                  onChange={(e) => {
                    // Allow only digits and slashes, auto-format as you type (optional)
                    let value = e.target.value.replace(/\D/g, '').slice(0, 8);
                    if (value.length >= 3) {
                      value = value.slice(0, 2) + '/' + value.slice(2);
                    }
                    if (value.length >= 6) {
                      value = value.slice(0, 5) + '/' + value.slice(5);
                    }
                    setNewStudent({ ...newStudent, birthday: value });
                  }}
                  className="form-control shadow-sm"
                  placeholder="dd/mm/yyyy"
                  required
                  onFocus={() => setBirthdayInputMode('text')} // keep in text mode on focus
                />
              ) : (
                <input
                  type="date"
                  value={newStudent.birthday ? formatDateToISO(newStudent.birthday) : ''}
                  onChange={(e) => {
                    const isoDate = e.target.value; // "2010-05-15"
                    if (isoDate) {
                      const [year, month, day] = isoDate.split('-');
                      setNewStudent({ ...newStudent, birthday: `${day}/${month}/${year}` });
                    }
                    setBirthdayInputMode('text'); // go back to text after picking
                  }}
                  className="form-control shadow-sm"
                  required
                  autoFocus // helps on mobile
                />
              )}
              <button
                type="button"
                className="btn btn-outline-secondary"
                onClick={() => {
                  if (birthdayInputMode === 'text') {
                    setBirthdayInputMode('date');
                  } else {
                    setBirthdayInputMode('text');
                  }
                }}
              >
                📅
              </button>
            </div>
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
            <button 
              type="submit" 
              className="btn btn-success w-100 py-2 fs-5" 
              disabled={creating}
            >
              {creating ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                  Registering...
                </>
              ) : (
                '✅ Register Student'
              )}
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
                <button 
                  className="btn-close btn-close-white" 
                  onClick={() => {
                    setEditingStudent(null);
                    setEditBirthdayMode('text');
                  }} 
                />
              </div>
              <div className="modal-body">
                <form onSubmit={handleUpdate}>
                  {/* Student ID */}
                  <div className="mb-3">
                    <label className="form-label fw-semibold">Student ID</label>
                    <input
                      type="text"
                      name="studentId"
                      value={editData.studentId}
                      onChange={handleEditChange}
                      className="form-control shadow-sm"
                      disabled
                    />
                  </div>

                  {/* Full Name */}
                  <div className="mb-3">
                    <label className="form-label fw-semibold">Full Name *</label>
                    <input
                      type="text"
                      name="name"
                      value={editData.name}
                      onChange={handleEditChange}
                      className="form-control shadow-sm"
                      required
                    />
                  </div>

                  {/* Birthday — Flexible Input */}
                  <div className="mb-3">
                    <label className="form-label fw-semibold">Birthday *</label>
                    <div className="input-group">
                      {editBirthdayMode === 'text' ? (
                        <input
                          type="text"
                          name="birthday"
                          value={editData.birthday}
                          onChange={(e) => {
                            let value = e.target.value.replace(/\D/g, '').slice(0, 8);
                            if (value.length >= 3) {
                              value = value.slice(0, 2) + '/' + value.slice(2);
                            }
                            if (value.length >= 6) {
                              value = value.slice(0, 5) + '/' + value.slice(5);
                            }
                            setEditData({ ...editData, birthday: value });
                          }}
                          className="form-control shadow-sm"
                          placeholder="dd/mm/yyyy"
                          required
                        />
                      ) : (
                        <input
                          type="date"
                          value={editData.birthday ? formatDateToISO(editData.birthday) : ''}
                          onChange={(e) => {
                            const isoDate = e.target.value;
                            if (isoDate) {
                              const [year, month, day] = isoDate.split('-');
                              setEditData({ ...editData, birthday: `${day}/${month}/${year}` });
                            }
                            setEditBirthdayMode('text');
                          }}
                          className="form-control shadow-sm"
                          required
                          autoFocus
                        />
                      )}
                      <button
                        type="button"
                        className="btn btn-outline-secondary"
                        onClick={() => {
                          setEditBirthdayMode(editBirthdayMode === 'text' ? 'date' : 'text');
                        }}
                      >
                        📅
                      </button>
                    </div>
                  </div>

                  {/* Phone No */}
                  <div className="mb-3">
                    <label className="form-label fw-semibold">Phone No *</label>
                    <input
                      type="text"
                      name="phoneNo"
                      value={editData.phoneNo}
                      onChange={handleEditChange}
                      className="form-control shadow-sm"
                      required
                    />
                  </div>

                  {/* School */}
                  <div className="mb-3">
                    <label className="form-label fw-semibold">School</label>
                    <input
                      type="text"
                      name="school"
                      value={editData.school}
                      onChange={handleEditChange}
                      className="form-control shadow-sm"
                    />
                  </div>

                  {/* Current Grade */}
                  <div className="mb-3">
                    <label className="form-label fw-semibold">Current Grade</label>
                    <input
                      type="text"
                      name="currentGrade"
                      value={editData.currentGrade}
                      onChange={handleEditChange}
                      className="form-control shadow-sm"
                    />
                  </div>

                  {/* Address */}
                  <div className="mb-3">
                    <label className="form-label fw-semibold">Address</label>
                    <input
                      type="text"
                      name="address"
                      value={editData.address}
                      onChange={handleEditChange}
                      className="form-control shadow-sm"
                    />
                  </div>

                  {/* Email Address */}
                  <div className="mb-3">
                    <label className="form-label fw-semibold">Email Address</label>
                    <input
                      type="email"
                      name="email"
                      value={editData.email}
                      onChange={handleEditChange}
                      className="form-control shadow-sm"
                      placeholder="e.g. parent@example.com"
                    />
                  </div>

                  {/* Guardian's Name */}
                  <div className="mb-3">
                    <label className="form-label fw-semibold">Guardian's Name *</label>
                    <input
                      type="text"
                      name="guardianName"
                      value={editData.guardianName}
                      onChange={handleEditChange}
                      className="form-control shadow-sm"
                      placeholder="e.g. Jane Smith"
                      required
                    />
                  </div>

                  {/* Guardian Phone No */}
                  <div className="mb-3">
                    <label className="form-label fw-semibold">Guardian Phone No *</label>
                    <input
                      type="text"
                      name="guardianPhoneNo"
                      value={editData.guardianPhoneNo}
                      onChange={handleEditChange}
                      className="form-control shadow-sm"
                      placeholder="e.g. 0771234567"
                      required
                    />
                  </div>

                  {/* NIC Number */}
                  <div className="mb-3">
                    <label className="form-label fw-semibold">NIC Number</label>
                    <input
                      type="text"
                      name="nicNumber"
                      value={editData.nicNumber}
                      onChange={handleEditChange}
                      className="form-control shadow-sm"
                      placeholder="e.g. 901234567V"
                    />
                  </div>

                  {/* Action Buttons */}
                  <div className="d-flex justify-content-between mt-4">
                    <button
                      type="button"
                      className="btn btn-outline-secondary"
                      onClick={() => {
                        setEditingStudent(null);
                        setEditBirthdayMode('text');
                      }}
                    >
                      Cancel
                    </button>
                    <button 
                      type="submit" 
                      className="btn btn-success" 
                      disabled={updating}
                    >
                      {updating ? (
                        <>
                          <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                          Saving...
                        </>
                      ) : (
                        '💾 Save Changes'
                      )}
                    </button>
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
                      {viewingStudent.guardianPhoneNo && (
                        <div style={{ fontSize: "10px" }}>
                          Guardian Phone: {viewingStudent.guardianPhoneNo}
                        </div>
                      )}
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
      <div className="container py-4">
        <div className="d-flex justify-content-between align-items-center mb-2">
          <h4 className="text-secondary mb-0">📋 Registered Students</h4>

          <button
            className="btn btn-outline-secondary"
            onClick={() => setShowFilter(prev => !prev)} // toggle
          >
            <i className="bi bi-funnel"></i>
          </button>

        </div>
        
        {showFilter && (
          <div className="sticky-top bg-body border-bottom p-3 mb-3 shadow-sm rounded border" style={{ zIndex: 20 }}>
            <div className="row g-2 align-items-end">

              {/* 🔍 Search */}
              <div className="col-12 col-md-4">
                <label className="form-label fw-semibold mb-1">Search</label>
                <input
                  type="search"
                  className="form-control"
                  placeholder="Search anything..."
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                />
              </div>

              {/* Sort column */}
              <div className="col-6 col-md-4">
                <label className="form-label fw-semibold mb-1">Sort by</label>
                <select
                  className="form-select"
                  value={sortColumn}
                  onChange={(e) => setSortColumn(e.target.value)}
                >
                  {columns.map(col => (
                    <option key={col.key} value={col.key}>
                      {col.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Sort direction */}
              <div className="col-6 col-md-4">
                <label className="form-label fw-semibold mb-1">Order</label>
                <select
                  className="form-select"
                  value={sortDirection}
                  onChange={(e) => setSortDirection(e.target.value)}
                >
                  <option value="asc">A → Z</option>
                  <option value="desc">Z → A</option>
                </select>
              </div>
            </div>

            {/* Result count */}
            <div className="mt-2 text-muted small">
              Showing <strong>{processedStudents.length}</strong> students
            </div>
          </div>
        )}

        {loading ? (
          <div className="text-center py-4">
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
            <p className="mt-2 text-muted">Loading students...</p>
          </div>
        ) : (
          <div className="table-responsive shadow-sm rounded border">
            <table className="table table-hover align-middle text-center mb-0">
              <thead>
                <tr>
                  <th className="align-middle">Student ID</th>
                  <th className="align-top">Name</th>
                  <th className="align-top">Birthday</th>
                  <th className="align-top">Phone</th>
                  <th className="align-top">Grade</th>
                  <th className="align-middle">QR Code</th>
                  <th className="align-top">Actions</th>
                </tr>
              </thead>
              <tbody>
                {processedStudents.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="text-center text-muted py-4">
                      No students found
                    </td>
                  </tr>
                ) : (
                  processedStudents.map((s) => (
                    <tr key={s._id}>
                      <td className="align-middle"><code>{s.studentId}</code></td>
                      <td className="align-middle">{s.name}</td>
                      <td className="align-middle">{new Date(s.birthday).toLocaleDateString()}</td>
                      <td className="align-middle">{s.phoneNo}</td>
                      <td className="align-middle">{s.currentGrade || "-"}</td>
                      <td className="align-middle">
                        <div style={{ width: "60px", height: "60px", margin: "0 auto" }}>
                          <QRCodeSVG value={s.studentId} size={60} />
                        </div>
                      </td>
                      <td className="align-middle">
                        <div className="d-flex flex-column gap-2">
                          <button
                            className="btn btn-sm btn-info d-flex align-items-center justify-content-center"
                            onClick={() => setViewingStudent(s)}
                          >
                            <i className="bi bi-eye me-1"></i> View
                          </button>
                          <button
                            className="btn btn-sm btn-secondary d-flex align-items-center justify-content-center"
                            onClick={() => navigate(`/user/comp-Level4?studentId=${s._id}`)}
                          >
                            <i className="bi bi-person-lines-fill me-1"></i> Profile
                          </button>
                          <button
                            className="btn btn-sm btn-primary d-flex align-items-center justify-content-center"
                            onClick={() => openEditModal(s)}
                          >
                            <i className="bi bi-pencil-square me-1"></i> Edit
                          </button>
                          <button
                            className="btn btn-sm btn-danger d-flex align-items-center justify-content-center"
                            onClick={() => handleDelete(s._id)}
                          >
                            <i className="bi bi-trash me-1"></i> Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>

          </div>
        )}
        
        {/* Pagination Controls */}
        {totalPages > 1 && (
          <nav className="mt-4">
            <ul className="pagination justify-content-center">
              <li className={`page-item ${currentPage === 1 ? "disabled" : ""}`}>
                <button
                  className="page-link"
                  onClick={() => fetchStudents(currentPage - 1)}
                  disabled={currentPage === 1}
                >
                  Previous
                </button>
              </li>

              {/* Optional: Show page numbers (only if totalPages <= 10) */}
              {totalPages <= 10 ? (
                [...Array(totalPages)].map((_, i) => (
                  <li
                    key={i + 1}
                    className={`page-item ${currentPage === i + 1 ? "active" : ""}`}
                  >
                    <button
                      className="page-link"
                      onClick={() => fetchStudents(i + 1)}
                    >
                      {i + 1}
                    </button>
                  </li>
                ))
              ) : (
                // Or just show current page
                <li className="page-item active">
                  <span className="page-link">
                    Page {currentPage} of {totalPages}
                  </span>
                </li>
              )}

              <li className={`page-item ${currentPage === totalPages ? "disabled" : ""}`}>
                <button
                  className="page-link"
                  onClick={() => fetchStudents(currentPage + 1)}
                  disabled={currentPage === totalPages}
                >
                  Next
                </button>
              </li>
            </ul>
          </nav>
        )}
      </div>
      <ToastContainer />
    </div>
  );
};

export default StudentRegistration;