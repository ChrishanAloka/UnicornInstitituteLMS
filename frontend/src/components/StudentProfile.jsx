// src/components/StudentProfile.jsx
import React, { useState, useEffect,useRef } from "react";
import axios from "axios";
import { ToastContainer, toast } from "react-toastify";
import Html5QrCode from "html5-qrcode";

const StudentProfile = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [student, setStudent] = useState(null);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [enrolledCourses, setEnrolledCourses] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loadingPayments, setLoadingPayments] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [newPayment, setNewPayment] = useState({
    courseId: "",
    amount: "",
    method: "Cash",
    notes: ""
  });
  // For enrollment: track open date fields per course
  const [dateInputs, setDateInputs] = useState({}); // { courseId: { startDate, endDate } }
  const [editingEnrollmentId, setEditingEnrollmentId] = useState(null);
  const [editDates, setEditDates] = useState({ startDate: "", endDate: "" });
  const html5QrCodeRef = useRef(null);
  const isScannerActive = useRef(false);
  const [isScanning, setIsScanning] = useState(false);
  

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

  const fetchPayments = async (studentId) => {
    setLoadingPayments(true);
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(
        `https://unicorninstititutelms.onrender.com/api/auth/students/${studentId}/payments`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setPayments(res.data);
    } catch (err) {
      toast.error("Failed to load payments");
      setPayments([]);
    } finally {
      setLoadingPayments(false);
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
        fetchPayments(res.data._id);
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

  const startScanner = () => {
    if (isScanning || isScannerActive.current) return;
    setIsScanning(true);
    setSearchTerm(""); // clear any existing input
    setStudent(null);
    setTimeout(() => {
      if (isScannerActive.current) return;
      const html5QrCode = new html5QrCode("qr-reader");
      html5QrCodeRef.current = html5QrCode;
      isScannerActive.current = true;
      html5QrCode
        .start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 250, height: 250 } },
          (decodedText) => {
            setSearchTerm(decodedText.trim());
            stopScanner();
          },
          () => {}
        )
        .catch(() => {
          toast.error("Camera access denied.");
          stopScanner();
        });
    }, 100);
  };

  const stopScanner = () => {
    if (!isScannerActive.current) {
      setIsScanning(false);
      return;
    }
    const html5QrCode = html5QrCodeRef.current;
    if (html5QrCode) {
      html5QrCode
        .stop()
        .then(() => html5QrCode.clear())
        .then(() => {
          isScannerActive.current = false;
          setIsScanning(false);
        })
        .catch(() => {
          isScannerActive.current = false;
          setIsScanning(false);
        });
    } else {
      isScannerActive.current = false;
      setIsScanning(false);
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (isScannerActive.current && html5QrCodeRef.current) {
        html5QrCodeRef.current.stop().then(() => {
          html5QrCodeRef.current.clear().catch(() => {});
        }).catch(() => {});
      }
    };
  }, []);

  const openPaymentModal = (courseId, courseName) => {
    setNewPayment({
      courseId: courseId,
      amount: "",
      method: "Cash",
      notes: ""
    });
    setShowPaymentModal(true);
  };

  const handleRecordPayment = async (e) => {
    e.preventDefault();
    const { courseId, amount, method, notes } = newPayment;

    if (!courseId || !amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      toast.error("Please enter a valid amount and select a course.");
      return;
    }

    try {
      const token = localStorage.getItem("token");
      await axios.post(
        `https://unicorninstititutelms.onrender.com/api/auth/students/payments`,
        {
          studentId: student._id,
          courseId,
          amount: Number(amount),
          method,
          notes: notes || undefined
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      toast.success("Payment recorded!");
      setShowPaymentModal(false);
      fetchPayments(student._id); // Refresh payments
      setNewPayment({ courseId: "", amount: "", method: "Cash", notes: "" });
    } catch (err) {
      toast.error("Failed to record payment");
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

  const startEditingDates = (enrollment) => {
    setEditingEnrollmentId(enrollment._id);
    setEditDates({
      startDate: enrollment.startDate ? new Date(enrollment.startDate).toISOString().split('T')[0] : "",
      endDate: enrollment.endDate ? new Date(enrollment.endDate).toISOString().split('T')[0] : ""
    });
  };

  const cancelEditing = () => {
    setEditingEnrollmentId(null);
    setEditDates({ startDate: "", endDate: "" });
  };

  const handleSaveDates = async (studentId, enrollmentId) => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.put(
        `https://unicorninstititutelms.onrender.com/api/auth/students/${studentId}/enrollments/${enrollmentId}`,
        {
          startDate: editDates.startDate || undefined,
          endDate: editDates.endDate || undefined
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setEnrolledCourses(res.data.enrolledCourses);
      setEditingEnrollmentId(null);
      toast.success("Enrollment dates updated!");
    } catch (err) {
      toast.error("Failed to update dates");
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
          <div className="col-md-7">
            <label className="form-label fw-semibold">Search Student (by ID or Name)</label>
            <div className="input-group">
              <input
                type="text"
                className="form-control"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Enter student ID, name, or scan QR"
              />
              {(searchTerm || student) && (
                <button
                  className="btn btn-outline-secondary"
                  type="button"
                  onClick={() => {
                    setSearchTerm("");
                    setStudent(null);
                  }}
                >
                  ✕
                </button>
              )}
            </div>
          </div>
          <div className="col-md-3 d-flex align-items-end">
            <button
              type="button"
              className="btn btn-outline-primary w-100"
              onClick={startScanner}
              disabled={isScanning}
            >
              📷 Scan QR
            </button>
          </div>
          <div className="col-md-2 d-flex align-items-end">
            <button type="submit" className="btn btn-primary w-100" disabled={loading}>
              {loading ? "Searching..." : "🔍 Search"}
            </button>
          </div>
        </div>

        {/* QR Scanner Container */}
        <div
          id="profile-qr-reader"
          style={{
            width: "100%",
            height: isScanning ? "300px" : "0",
            overflow: "hidden",
            marginTop: isScanning ? "1rem" : "0",
            transition: "height 0.3s"
          }}
        ></div>
        {isScanning && (
          <button
            type="button"
            className="btn btn-secondary mt-2"
            onClick={stopScanner}
          >
            Cancel Scan
          </button>
        )}
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

                      {/* Start Date */}
                      <td>
                        {editingEnrollmentId === enroll._id ? (
                          <input
                            type="date"
                            className="form-control form-control-sm"
                            value={editDates.startDate}
                            onChange={(e) => setEditDates({ ...editDates, startDate: e.target.value })}
                          />
                        ) : (
                          formatDate(enroll.startDate)
                        )}
                      </td>

                      {/* End Date */}
                      <td>
                        {editingEnrollmentId === enroll._id ? (
                          <input
                            type="date"
                            className="form-control form-control-sm"
                            value={editDates.endDate}
                            onChange={(e) => setEditDates({ ...editDates, endDate: e.target.value })}
                          />
                        ) : (
                          formatDate(enroll.endDate)
                        )}
                      </td>

                      {/* Actions */}
                      <td>
                        {editingEnrollmentId === enroll._id ? (
                          <div className="d-flex gap-2">
                            <button
                              className="btn btn-sm btn-success"
                              onClick={() => handleSaveDates(student._id, enroll._id)}
                            >
                              ✅ Save
                            </button>
                            <button
                              className="btn btn-sm btn-secondary"
                              onClick={cancelEditing}
                            >
                              ❌ Cancel
                            </button>
                          </div>
                        ) : (
                          <div className="d-flex gap-2">
                            <button
                              className="btn btn-sm btn-outline-primary"
                              onClick={() => startEditingDates(enroll)}
                            >
                              📅 Edit Dates
                            </button>
                            <button
                              className="btn btn-sm btn-danger"
                              onClick={() => handleUnenroll(student._id, enroll._id)}
                            >
                              🗑️ Unenroll
                            </button>
                            <button
                              className="btn btn-sm btn-success"
                              onClick={() => openPaymentModal(enroll.course._id, enroll.course.courseName)}
                            >
                              💰 Pay
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {/* Payments Section */}
          {student && (
            <>
              <h4 className="mb-3 text-secondary mt-5">Payments</h4>
              {loadingPayments ? (
                <p>Loading payments...</p>
              ) : payments.length === 0 ? (
                <p className="text-muted">No payments recorded for this student.</p>
              ) : (
                <div className="table-responsive">
                  <table className="table table-hover">
                    <thead className="table-light">
                      <tr>
                        <th>Date</th>
                        <th>Course</th>
                        <th>Amount</th>
                        <th>Method</th>
                        <th>Notes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {payments.map(payment => (
                        <tr key={payment._id}>
                          <td>{new Date(payment.paymentDate).toLocaleDateString()}</td>
                          <td>{payment.course?.courseName || "—"} </td>
                          <td>${payment.amount.toFixed(2)}</td>
                          <td>{payment.method || "—"}</td>
                          <td>{payment.notes || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}

          {/* Record Payment Modal */}
          {showPaymentModal && (
            <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: "rgba(0,0,0,0.5)" }}>
              <div className="modal-dialog">
                <div className="modal-content">
                  <div className="modal-header bg-success text-white">
                    <h5>Record Payment</h5>
                    <button className="btn-close btn-close-white" onClick={() => setShowPaymentModal(false)} />
                  </div>
                  <div className="modal-body">
                    <form onSubmit={handleRecordPayment}>
                      <div className="mb-3">
                        <label className="form-label">Course</label>
                        <input
                          type="text"
                          className="form-control"
                          value={courses.find(c => c._id === newPayment.courseId)?.courseName || "—"}
                          disabled
                        />
                      </div>
                      <div className="mb-3">
                        <label className="form-label">Amount *</label>
                        <input
                          type="number"
                          className="form-control"
                          value={newPayment.amount}
                          onChange={(e) => setNewPayment({ ...newPayment, amount: e.target.value })}
                          min="0.01"
                          step="0.01"
                          required
                        />
                      </div>
                      <div className="mb-3">
                        <label className="form-label">Payment Method *</label>
                        <select
                          className="form-select"
                          value={newPayment.method}
                          onChange={(e) => setNewPayment({ ...newPayment, method: e.target.value })}
                          required
                        >
                          <option value="Cash">Cash</option>
                          <option value="Bank Transfer">Bank Transfer</option>
                          <option value="Mobile Money">Mobile Money</option>
                          <option value="Card">Card</option>
                          <option value="Cheque">Cheque</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>
                      <div className="mb-3">
                        <label className="form-label">Notes (Optional)</label>
                        <textarea
                          className="form-control"
                          value={newPayment.notes}
                          onChange={(e) => setNewPayment({ ...newPayment, notes: e.target.value })}
                          rows="2"
                        />
                      </div>
                      <div className="d-flex justify-content-end gap-2">
                        <button type="button" className="btn btn-secondary" onClick={() => setShowPaymentModal(false)}>
                          Cancel
                        </button>
                        <button type="submit" className="btn btn-success">Record Payment</button>
                      </div>
                    </form>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      <ToastContainer />
    </div>
  );
};

export default StudentProfile;