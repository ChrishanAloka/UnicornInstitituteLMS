// src/components/Attendance.jsx
import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { ToastContainer, toast } from "react-toastify";
import { Html5Qrcode } from "html5-qrcode";
import "react-toastify/dist/ReactToastify.css";

const Attendance = () => {
  const [input, setInput] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
  const [students, setStudents] = useState([]); // Array of students (or single in array)
  const [loading, setLoading] = useState(false);
  const [isScanning, setIsScanning] = useState(false);

  const html5QrCodeRef = useRef(null);
  const isScannerActive = useRef(false);

  // Set today as default date
  useEffect(() => {
    const today = new Date().toISOString().split("T")[0];
    setSelectedDate(today);
  }, []);

  // Auto-fetch when input or date changes
  useEffect(() => {
    if (!selectedDate) return;

    const trimmed = input.trim();
    if (trimmed.length === 0 || trimmed.length >= 3) {
      fetchStudents();
    } else {
      setStudents([]);
    }
  }, [input, selectedDate]);

  // Cleanup scanner on unmount
  useEffect(() => {
    return () => {
      if (isScannerActive.current && html5QrCodeRef.current) {
        html5QrCodeRef.current
          .stop()
          .then(() => html5QrCodeRef.current?.clear())
          .catch(() => {});
      }
    };
  }, []);

  const fetchStudents = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        toast.error("Authentication required");
        setStudents([]);
        return;
      }

      let url = `https://unicorninstititutelms.onrender.com/api/auth/students/search?date=${selectedDate}`;
      if (input.trim()) {
        url += `&q=${encodeURIComponent(input.trim())}`;
      }

      const res = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` },
      });

      // Backend returns array (even for single student wrapped in array)
      const data = Array.isArray(res.data) ? res.data : res.data ? [res.data] : [];
      setStudents(data);
    } catch (err) {
      console.error("Fetch error:", err);
      setStudents([]);
      const msg = err.response?.data?.error || "Failed to load students";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAttendance = async (studentId, courseId, status = 'present') => {
    if (!studentId || !courseId || !selectedDate) return;

    try {
      const token = localStorage.getItem("token");
      await axios.post(
        "https://unicorninstititutelms.onrender.com/api/auth/attendance/mark",
        {
          studentId,
          courseId,
          date: selectedDate,
          status, // 'present' or 'absent'
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success(`Attendance marked as ${status}!`);
      fetchStudents(); // Refresh list
    } catch (err) {
      toast.error("Failed to mark attendance");
    }
  };

  const startScanner = async () => {
    if (isScanning || isScannerActive.current) return;

    setIsScanning(true);
    setStudents([]);

    try {
      const qrCode = new Html5Qrcode("qr-reader");
      html5QrCodeRef.current = qrCode;
      isScannerActive.current = true;

      await qrCode.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decodedText) => {
          setInput(decodedText.trim());
          stopScanner();
        }
      );
    } catch (err) {
      console.error("QR Scan error:", err);
      toast.error("Camera access failed. Use HTTPS and allow permission.");
      stopScanner();
    }
  };

  const stopScanner = async () => {
    if (html5QrCodeRef.current) {
      try {
        await html5QrCodeRef.current.stop();
        await html5QrCodeRef.current.clear();
      } catch (e) {
        /* ignore */
      }
      html5QrCodeRef.current = null;
    }
    isScannerActive.current = false;
    setIsScanning(false);
  };

  const handleInputClear = () => {
    setInput("");
    setStudents([]);
  };

  const formatDateDisplay = (dateStr) => {
    if (!dateStr) return "";
    return new Date(dateStr).toLocaleDateString("en-GB"); // dd/mm/yyyy
  };

  const getDayOfWeek = (dateStr) => {
    const days = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
    return days[new Date(dateStr).getDay()];
  };

  const targetDay = selectedDate ? getDayOfWeek(selectedDate) : null;

  return (
    <div className="container py-4">
      <h2 className="mb-4 text-primary fw-bold border-bottom pb-2">Attendance</h2>

      {/* Search Form */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          fetchStudents();
        }}
        className="mb-5 p-4 bg-body shadow-sm rounded border"
      >
        <div className="row g-3">
          {/* Student Input */}
          <div className="col-md-7">
            <label className="form-label fw-semibold">Student ID or Name (optional)</label>
            <div className="input-group">
              <input
                type="text"
                className="form-control"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Leave blank to show all students for the selected date"
                autoFocus
              />
              {(input || students.length > 0) && (
                <button
                  className="btn btn-outline-secondary"
                  type="button"
                  onClick={handleInputClear}
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* Scan Button */}
          <div className="col-md-3 d-flex align-items-end">
            <button
              className="btn btn-outline-primary w-100"
              type="button"
              onClick={startScanner}
              disabled={isScanning}
            >
              📷 Scan QR
            </button>
          </div>

          {/* Search Button */}
          <div className="col-md-2 d-flex align-items-end">
            <button type="submit" className="btn btn-primary w-100" disabled={loading}>
              {loading ? "Searching..." : "🔍 Search"}
            </button>
          </div>

          {/* Date Picker */}
          <div className="col-md-3">
            <label className="form-label fw-semibold">Date</label>
            <input
              type="date"
              max={new Date().toISOString().split("T")[0]}
              className="form-control"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
            />
          </div>

          {/* Date Info */}
          <div className="col-md-2 d-flex align-items-end">
            <div className="w-100 text-center p-2  rounded">
              <small className="text-muted">
                Selected: {selectedDate ? formatDateDisplay(selectedDate) : "—"}
              </small>
            </div>
          </div>
        </div>

        {/* QR Scanner Container */}
        <div
          id="qr-reader"
          style={{
            width: "100%",
            height: isScanning ? "300px" : "0",
            overflow: "hidden",
            marginTop: isScanning ? "1rem" : "0",
            transition: "height 0.3s",
          }}
        ></div>

        {isScanning && (
          <button
            className="btn btn-secondary mt-2"
            type="button"
            onClick={stopScanner}
          >
            Cancel Scan
          </button>
        )}

        {loading && (
          <div className="mt-2 text-muted">
            <span className="spinner-border spinner-border-sm"></span> Loading...
          </div>
        )}
      </form>

      {/* Results */}
      {students.length > 0 && !isScanning && (
        <div className="mt-4">
          {/* Group students by course */}
          {(() => {
            // Build a map: courseId → { courseInfo, students[] }
            const courseMap = new Map();

            students.forEach(student => {
              student.enrolledCourses.forEach(enroll => {
                const courseId = enroll.course._id.toString();
                if (!courseMap.has(courseId)) {
                  courseMap.set(courseId, {
                    course: enroll.course,
                    students: []
                  });
                }

                courseMap.get(courseId).students.push({
                  ...student,
                  enrollment: enroll // carry enrollment info (status, dates, etc.)
                });
              });
            });

            // Convert to array and sort (optional: by course name)
            const groupedCourses = Array.from(courseMap.values())
              .sort((a, b) =>
                a.course.courseName.localeCompare(b.course.courseName)
              );

            return groupedCourses.map(({ course, students }) => (
              <div key={course._id} className="mb-5">
                {/* Course Header */}
                <div className="p-3 bg-primary text-white rounded-top">
                  <h4 className="mb-1">{course.courseName}</h4>
                  <div>
                    <span className="me-3">📅 {getDayOfWeek(selectedDate).charAt(0).toUpperCase() + getDayOfWeek(selectedDate).slice(1)}</span>
                    <span>⏰ {course.timeFrom} – {course.timeTo}</span>
                  </div>
                </div>

                {/* Students Table */}
                <div className="table-responsive border rounded-bottom">
                  <table className="table table-hover align-middle mb-0">
                    <thead className="table-light">
                      <tr>
                        <th>Student ID</th>
                        <th>Name</th>
                        <th>Grade</th>
                        <th>Enrollment Period</th>
                        <th className="text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {students.map(({ _id, studentId, name, currentGrade, enrollment }) => (
                        <tr key={_id}>
                          <td><strong>{studentId}</strong></td>
                          <td>{name}</td>
                          <td>{currentGrade || "—"}</td>
                          <td>
                            {formatDateDisplay(enrollment.startDate)} →{" "}
                            {enrollment.endDate ? formatDateDisplay(enrollment.endDate) : "Ongoing"}
                          </td>
                          <td className="text-center">
                            {enrollment.isMarked ? (
                              <span className={`badge ${enrollment.status === 'absent' ? 'bg-danger' : 'bg-success'}`}>
                                {enrollment.status === 'absent' ? '❌ Absent' : '✅ Present'}
                              </span>
                            ) : (
                              <div className="d-flex gap-2 justify-content-center">
                                <button
                                  className="btn btn-sm btn-success"
                                  onClick={() => handleMarkAttendance(studentId, course._id, 'present')}
                                  title="Mark Present"
                                >
                                  ✅ Present
                                </button>
                                <button
                                  className="btn btn-sm btn-danger"
                                  onClick={() => handleMarkAttendance(studentId, course._id, 'absent')}
                                  title="Mark Absent"
                                >
                                  ❌ Absent
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ));
          })()}
        </div>
      )}

      {!loading && students.length === 0 && input.trim().length > 0 && (
        <div className="alert alert-warning mt-4">
          No student found matching "{input}"
        </div>
      )}

      {!loading && students.length === 0 && input.trim().length === 0 && selectedDate && (
        <div className="alert alert-info mt-4">
          No students have active weekly courses scheduled on{" "}
          {formatDateDisplay(selectedDate)} ({targetDay}).
        </div>
      )}

      <ToastContainer position="top-right" autoClose={3000} />
    </div>
  );
};

export default Attendance;