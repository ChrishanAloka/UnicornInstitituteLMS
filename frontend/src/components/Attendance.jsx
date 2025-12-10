// src/components/Attendance.jsx
import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { ToastContainer, toast } from "react-toastify";
import html5QrCode from "html5-qrcode";

const Attendance = () => {
  const [input, setInput] = useState("");
  const [selectedDate, setSelectedDate] = useState(""); // Custom date
  const [student, setStudent] = useState(null);
  const [enrolledCourses, setEnrolledCourses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [marked, setMarked] = useState(new Set());
  const [isScanning, setIsScanning] = useState(false);

  const html5QrCodeRef = useRef(null);
  const isScannerActive = useRef(false);

  // Initialize selectedDate to today
  useEffect(() => {
    const today = new Date().toISOString().split("T")[0];
    setSelectedDate(today);
  }, []);

  // Auto-search student when input changes (3+ chars)
  useEffect(() => {
    if (input.trim().length >= 3) {
      fetchStudent();
    } else {
      setStudent(null);
      setEnrolledCourses([]);
    }
  }, [input]);

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

  const fetchStudent = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(
        `https://unicorninstititutelms.onrender.com/api/auth/students/search?q=${encodeURIComponent(input.trim())}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.data) {
        setStudent(res.data);
        setEnrolledCourses(res.data.enrolledCourses || []);
        setMarked(new Set());
      } else {
        setStudent(null);
        setEnrolledCourses([]);
      }
    } catch (err) {
      setStudent(null);
      setEnrolledCourses([]);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAttendance = async (courseId) => {
    if (!student || !selectedDate) return;
    console.log("courseId:", courseId);
    try {
      const token = localStorage.getItem("token");
      await axios.post(
        "https://unicorninstititutelms.onrender.com/api/auth/attendance/mark",
        {
          studentId: student.studentId,
          courseId: courseId,
          date: selectedDate, // ← Custom date!
          status: "present"
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setMarked(prev => new Set(prev).add(courseId));
      toast.success(`Attendance marked for ${formatDateDisplay(selectedDate)}!`);
    } catch (err) {
      toast.error("Failed to mark attendance");
    }
  };

  const startScanner = () => {
    if (isScanning || isScannerActive.current) return;
    
    setIsScanning(true);
    setStudent(null);
    setEnrolledCourses([]);
    
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
            setInput(decodedText.trim());
            stopScanner();
          },
          (errorMessage) => {}
        )
        .catch((err) => {
          toast.error("Camera access denied. Please allow permission.");
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

  const formatDateDisplay = (dateStr) => {
    if (!dateStr) return "";
    return new Date(dateStr).toLocaleDateString();
  };

  return (
    <div className="container py-4">
      <h2 className="mb-4 text-primary fw-bold border-bottom pb-2">Attendance</h2>

      {/* Input + Date + Scan Section */}
      <div className="mb-5 p-4 bg-white shadow-sm rounded border">
        <div className="row g-3">
          <div className="col-md-5">
            <label className="form-label fw-semibold">Student ID or Name</label>
            <div className="input-group">
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
            </div>
            {loading && (
              <div className="mt-2 text-muted">
                <span className="spinner-border spinner-border-sm"></span> Loading...
              </div>
            )}
          </div>
          <div className="col-md-4">
            <label className="form-label fw-semibold">Date</label>
            <input
              type="date"
              max={new Date().toISOString().split("T")[0]}
              className="form-control"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
            />
          </div>
          <div className="col-md-3 d-flex align-items-end">
            <div className="w-100 text-center p-2 bg-light rounded">
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

      {/* Student Not Found */}
      {input && !loading && !student && !isScanning && (
        <div className="alert alert-warning">
          <h5>⚠️ Student not found</h5>
        </div>
      )}

      {/* Student Found */}
      {student && !isScanning && (
        <>
          <div className="mb-4 p-4 bg-white shadow-sm rounded border">
            <h4 className="mb-2">✅ {student.name}</h4>
            <p className="text-muted mb-1">
              <strong>ID:</strong> {student.studentId} • <strong>Grade:</strong> {student.currentGrade || "—"}
            </p>
          </div>

          <h4 className="mb-3 text-secondary">
            Enrolled Courses — Mark Attendance for {formatDateDisplay(selectedDate)}
          </h4>

          {enrolledCourses.length === 0 ? (
            <div className="alert alert-info">No courses enrolled.</div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover align-middle">
                <thead className="table-light">
                  <tr>
                    <th>Course</th>
                    <th>Day & Time</th>
                    <th>Enrollment Period</th>
                    <th className="text-center">Mark Attendance</th>
                  </tr>
                </thead>
                <tbody>
                  {enrolledCourses.map(enroll => {
                    const courseId = enroll.course?._id;
                    const isMarked = marked.has(courseId);
                    return (
                      <tr key={enroll._id}>
                        <td><strong>{enroll.course?.courseName || "—"}</strong></td>
                        <td>
                          {enroll.course?.dayOfWeek && (
                            <>
                              {enroll.course.dayOfWeek.charAt(0).toUpperCase() + enroll.course.dayOfWeek.slice(1)} •{" "}
                              {enroll.course.timeFrom}–{enroll.course.timeTo}
                            </>
                          )}
                        </td>
                        <td>
                          {formatDateDisplay(enroll.startDate)} → {formatDateDisplay(enroll.endDate)}
                        </td>
                        <td className="text-center">
                          {isMarked ? (
                            <span className="badge bg-success">✅ Marked</span>
                          ) : (
                            <button
                              className="btn btn-sm btn-success"
                              onClick={() => handleMarkAttendance(courseId)}
                              disabled={!courseId}
                            >
                              ➕ Mark Present
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
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