// src/components/Attendance.jsx
import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { ToastContainer, toast } from "react-toastify";
import { Html5Qrcode } from "html5-qrcode";


const Attendance = () => {
  const [input, setInput] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
  const [student, setStudent] = useState(null);
  const [enrolledCourses, setEnrolledCourses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isScanning, setIsScanning] = useState(false);

  const html5QrCodeRef = useRef(null);
  const isScannerActive = useRef(false);

  // Initialize date to today
  useEffect(() => {
    const today = new Date().toISOString().split("T")[0];
    setSelectedDate(today);
  }, []);

  // Auto-search student when input changes (3+ chars)
  // useEffect(() => {
  //   if (input.trim().length >= 3 && selectedDate) {
  //     fetchStudent();
  //   } else {
  //     resetState();
  //   }
  // }, [input, selectedDate]);

  const handleSearch = (e) => {
    e.preventDefault();
    if (!input.trim()) {
      toast.warn("Please enter a student ID or name");
      return;
    }
    fetchStudent();
  };

  // Cleanup scanner on unmount
  useEffect(() => {
    return () => {
      if (isScannerActive.current && html5QrCodeRef.current) {
        html5QrCodeRef.current.stop().then(() => {
          html5QrCodeRef.current.clear().catch(() => {});
        }).catch(() => {});
      }
    };
  }, []);

  // ✅ RESET STATE
  const resetState = () => {
    setStudent(null);
    setEnrolledCourses([]);
    setLoading(false);
  };

  // ✅ FETCH STUDENT WITH ATTENDANCE STATUS FOR SELECTED DATE
  const fetchStudent = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(
        `https://unicorninstititutelms.onrender.com/api/auth/students/search?q=${encodeURIComponent(input.trim())}&date=${selectedDate}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.data) {
        setStudent(res.data);
        setEnrolledCourses(res.data.enrolledCourses || []);
      } else {
        resetState();
      }
    } catch (err) {
      resetState();
      toast.error("Student not found");
    } finally {
      setLoading(false);
    }
  };

  // ✅ MARK ATTENDANCE
  const handleMarkAttendance = async (courseId) => {
    if (!student || !selectedDate) return;
    try {
      const token = localStorage.getItem("token");
      await axios.post(
        "https://unicorninstititutelms.onrender.com/api/auth/attendance/mark",
        {
          studentId: student.studentId,
          courseId: courseId,
          date: selectedDate,
          status: "present"
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success(`Attendance marked for ${formatDateDisplay(selectedDate)}!`);
      // ✅ Refetch to update "Marked" status
      fetchStudent();
    } catch (err) {
      toast.error("Failed to mark attendance");
    }
  };

  // ✅ HANDLE DATE CHANGE
  const handleDateChange = (e) => {
    setSelectedDate(e.target.value);
    // resetState() is called via useEffect on [input, selectedDate]
  };

  // ✅ HANDLE INPUT CLEAR
  const handleInputClear = () => {
    setInput("");
    resetState();
  };

  // ✅ QR SCANNER
  const startScanner = async () => {
    if (isScanning || isScannerActive.current) return;

    setIsScanning(true);
    resetState();

    try {
      const qrCode = new Html5Qrcode("qr-reader");
      html5QrCodeRef.current = qrCode;
      isScannerActive.current = true;

      await qrCode.start(
        { facingMode: "environment" }, // back camera
        {
          fps: 10,
          qrbox: { width: 250, height: 250 }
        },
        (decodedText) => {
          setInput(decodedText.trim());
          stopScanner();
        }
      );
    } catch (err) {
      console.error(err);
      toast.error("Camera access failed. Use HTTPS & allow permission.");
      stopScanner();
    }
  };


  const stopScanner = async () => {
    if (!html5QrCodeRef.current) {
      setIsScanning(false);
      return;
    }

    try {
      await html5QrCodeRef.current.stop();
      await html5QrCodeRef.current.clear();
    } catch (e) {}

    html5QrCodeRef.current = null;
    isScannerActive.current = false;
    setIsScanning(false);
  };


  const formatDateDisplay = (dateStr) => {
    if (!dateStr) return "";
    return new Date(dateStr).toLocaleDateString();
  };

  // ✅ Helper: Get day of week from selected date
  const getDayOfWeek = (dateStr) => {
    if (!dateStr) return null;
    const date = new Date(dateStr);
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    return days[date.getUTCDay()]; // or .getDay() for local time
  };

  // ✅ Compute target day
  const targetDay = getDayOfWeek(selectedDate);

  // ✅ Filter courses to only those matching the day
  const relevantCourses = enrolledCourses.filter(enroll => {
    const courseDay = enroll.course?.dayOfWeek?.toLowerCase();
    return courseDay === targetDay;
  });

  return (
    <div className="container py-4">
      <h2 className="mb-4 text-primary fw-bold border-bottom pb-2">Attendance</h2>

      <form onSubmit={handleSearch} className="mb-5 p-4 bg-body shadow-sm rounded border">
        {/* Input + Date + Scan */}
        <div className="mb-5 p-4 bg-body shadow-sm rounded border">
          <div className="row g-3">
            <div className="col-md-7">
              <label className="form-label fw-semibold">Student ID or Name</label>
              <div className="input-group gap-2">
                <input
                  type="text"
                  className="form-control"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Type ID/name or scan QR"
                  autoFocus
                />
                <button
                  className="btn btn-outline-primary"
                  type="button"
                  onClick={startScanner}
                  disabled={isScanning}
                >
                  📷 Scan
                </button>
                <div className="col-md-2 d-flex align-items-end">
                  <button type="submit" className="btn btn-primary w-100" disabled={loading}>
                    {loading ? "Searching..." : "🔍 Search"}
                  </button>
                </div>
                {(input || student) && (
                  <button
                    className="btn btn-outline-secondary"
                    type="button"
                    onClick={handleInputClear}
                  >
                    ✕
                  </button>
                )}
              </div>
              {loading && (
                <div className="mt-2 text-muted">
                  <span className="spinner-border spinner-border-sm"></span> Loading...
                </div>
              )}
            </div>
            <div className="col-md-3">
              <label className="form-label fw-semibold">Date</label>
              <input
                type="date"
                max={new Date().toISOString().split("T")[0]}
                className="form-control"
                value={selectedDate}
                onChange={handleDateChange}
              />
            </div>
            <div className="col-md-2">
              <div className="w-100 text-center p-2 bg-body rounded">
                <small className="text-muted">
                  Selected: {formatDateDisplay(selectedDate)}
                </small>
              </div>
              <div className="w-100 text-center p-2 bg-body rounded">
                <small className="text-muted">
                  Today: {new Date().toISOString().split("T")[0]}
                </small>
              </div>
            </div>
          </div>

          {/* QR Reader (always in DOM) */}
          <div
            id="qr-reader"
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
              className="btn btn-secondary mt-2"
              onClick={stopScanner}
            >
              Cancel Scan
            </button>
          )}
        </div>
      </form>

      {/* Student & Courses */}
      {student && !isScanning && (
        <>
          <div className="mb-4 p-4 bg-body shadow-sm rounded border">
            <h4 className="mb-2">✅ {student.name}</h4>
            <p className="text-muted mb-1">
              <strong>ID:</strong> {student.studentId} • <strong>Grade:</strong> {student.currentGrade || "—"}
            </p>
          </div>

          <h4 className="mb-3 text-secondary">
            Enrolled Courses — Attendance for {formatDateDisplay(selectedDate)}
          </h4>

          {relevantCourses.length === 0 ? (
            <div className="alert alert-info">
              No courses scheduled for {formatDateDisplay(selectedDate)} ({targetDay}).
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover align-middle">
                <thead>
                  <tr>
                    <th>Course</th>
                    <th>Time</th>
                    <th>Enrollment Period</th>
                    <th className="text-center">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {relevantCourses.map(enroll => (
                    <tr key={enroll._id}>
                      <td><strong>{enroll.course?.courseName || "—"}</strong></td>
                      <td>
                        {enroll.course?.timeFrom}–{enroll.course?.timeTo}
                      </td>
                      <td>
                        {formatDateDisplay(enroll.startDate)} → {formatDateDisplay(enroll.endDate)}
                      </td>
                      <td className="text-center">
                        {enroll.isMarked ? (
                          <span className="badge bg-success">✅ Marked</span>
                        ) : (
                          <button
                            className="btn btn-sm btn-success"
                            onClick={() => handleMarkAttendance(enroll.course._id)}
                            disabled={!enroll.course?._id}
                          >
                            ➕ Mark Present
                          </button>
                        )}
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

export default Attendance;