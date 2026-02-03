// src/components/Attendance.jsx
import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { ToastContainer, toast } from "react-toastify";
import { Html5Qrcode } from "html5-qrcode";
import "react-toastify/dist/ReactToastify.css";

const Attendance = () => {
  const [input, setInput] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [attendanceType, setAttendanceType] = useState("NORMAL"); // 'NORMAL', 'MOVED_AWAY', 'RESCHEDULED_SESSION'
  const [rescheduleContext, setRescheduleContext] = useState(null);
  const [absentSessions, setAbsentSessions] = useState([]); // ✅ NEW: Track absent sessions
  const [hasExtraSessions, setHasExtraSessions] = useState(false); // ✅ NEW: Track extra sessions

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
      setAttendanceType("NORMAL");
      setRescheduleContext(null);
      setAbsentSessions([]);
      setHasExtraSessions(false);
    }
  }, [input, selectedDate]);

  // Cleanup scanner
  useEffect(() => {
    return () => {
      if (isScannerActive.current && html5QrCodeRef.current) {
        html5QrCodeRef.current.stop().catch(() => {});
      }
    };
  }, []);

  // Notify about absent sessions on current day
  useEffect(() => {
    if (
      absentSessions.length > 0 &&
      selectedDate === new Date().toISOString().split("T")[0]
    ) {
      toast.warn(
        `⚠️ ${absentSessions.length} session(s) cancelled today. Students have been notified.`,
        {
          autoClose: false,
          closeOnClick: false,
          draggable: false,
          position: "top-center",
        }
      );
    }
  }, [absentSessions, selectedDate]);

  const fetchStudents = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        toast.error("Authentication required");
        setStudents([]);
        setAbsentSessions([]);
        setHasExtraSessions(false);
        return;
      }

      let url = `https://unicorninstititutelms.onrender.com/api/auth/students/search?date=${selectedDate}`;
      if (input.trim()) {
        url += `&q=${encodeURIComponent(input.trim())}`;
      }

      const res = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = res.data;

      // ✅ Handle absent sessions info
      if (Array.isArray(data.absentSessions)) {
        setAbsentSessions(data.absentSessions);
      } else {
        setAbsentSessions([]);
      }

      // ✅ Handle extra sessions flag
      setHasExtraSessions(!!data.hasExtraSessions);

      if (data.type === "MOVED_AWAY") {
        setAttendanceType("MOVED_AWAY");
        setRescheduleContext(data);
        setStudents([]);
      } else if (data.type === "RESCHEDULED_SESSION") {
        setAttendanceType("RESCHEDULED_SESSION");
        setRescheduleContext(data);
        setStudents(data.students || []);
      } else if (data.type === "NORMAL") {
        // ✅ Handle new structured response
        setStudents(data.students || []);
        setAttendanceType("NORMAL");
        setRescheduleContext(null);
      } else {
        // ❓ Fallback: old format (raw student or array)
        const studentArray = Array.isArray(data) ? data : data ? [data] : [];
        setStudents(studentArray);
        setAttendanceType("NORMAL");
        setRescheduleContext(null);
      }
    } catch (err) {
      console.error("Fetch error:", err);
      setStudents([]);
      setAttendanceType("NORMAL");
      setRescheduleContext(null);
      setAbsentSessions([]);
      setHasExtraSessions(false);
      const msg = err.response?.data?.error || "Failed to load students";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAttendance = async (studentId, courseId, status = "present") => {
    if (!studentId || !courseId || !selectedDate) return;

    try {
      const token = localStorage.getItem("token");
      await axios.post(
        "https://unicorninstititutelms.onrender.com/api/auth/attendance/mark",
        {
          studentId,
          courseId,
          date: selectedDate,
          status,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success(`Attendance marked as ${status}!`);
      fetchStudents(); // Refresh
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
      toast.error("Camera access failed. Use HTTPS and allow permission.");
      stopScanner();
    }
  };

  const stopScanner = async () => {
    if (html5QrCodeRef.current) {
      try {
        await html5QrCodeRef.current.stop();
        await html5QrCodeRef.current.clear();
      } catch (e) {}
      html5QrCodeRef.current = null;
    }
    isScannerActive.current = false;
    setIsScanning(false);
  };

  const handleInputClear = () => {
    setInput("");
    setStudents([]);
    setAbsentSessions([]);
    setHasExtraSessions(false);
  };

  const formatDateDisplay = (dateStr) => {
    if (!dateStr) return "";
    return new Date(dateStr).toLocaleDateString("en-GB"); // dd/mm/yyyy
  };

  const getDayOfWeek = (dateStr) => {
    const days = [
      "sunday",
      "monday",
      "tuesday",
      "wednesday",
      "thursday",
      "friday",
      "saturday",
    ];
    return days[new Date(dateStr).getDay()];
  };

  const targetDay = selectedDate ? getDayOfWeek(selectedDate) : null;

  return (
    <div className="container py-4">
      <h2 className="mb-4 text-primary fw-bold border-bottom pb-2">
        Attendance
      </h2>

      {/* Search Form */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          fetchStudents();
        }}
        className="mb-5 p-4 bg-body shadow-sm rounded border"
      >
        <div className="row g-3">
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

          <div className="col-md-3 d-flex align-items-end">
            <div className="w-100 text-center p-2 bg-light rounded">
              <small className="text-muted">
                Selected:{" "}
                {selectedDate ? formatDateDisplay(selectedDate) : "—"}
              </small>
            </div>
          </div>

          <div className="col-md-7">
            <label className="form-label fw-semibold">
              Student ID or Name (optional)
            </label>
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

          <div className="col-md-2 d-flex align-items-end">
            <button
              type="submit"
              className="btn btn-primary w-100"
              disabled={loading}
            >
              {loading ? "Searching..." : "🔍 Search"}
            </button>
          </div>
        </div>

        {/* QR Scanner */}
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
            <span className="spinner-border spinner-border-sm"></span>{" "}
            Loading...
          </div>
        )}
      </form>

      {/* ─── MOVED AWAY MESSAGE ─── */}
      {attendanceType === "MOVED_AWAY" && rescheduleContext && (
        <div className="alert alert-warning mb-4">
          <strong>⚠️ Session Rescheduled!</strong>
          <br />
          The class <strong>"{rescheduleContext.courseName}"</strong>{" "}
          scheduled for{" "}
          <strong>{formatDateDisplay(selectedDate)}</strong> has been moved to{" "}
          <strong>{formatDateDisplay(rescheduleContext.newDate)}</strong>.
          <br />
          Please select the new date to mark attendance.
          <button
            className="btn btn-primary btn-sm mt-2"
            onClick={() =>
              setSelectedDate(
                rescheduleContext.newDate.toISOString().split("T")[0]
              )
            }
          >
            Go to {formatDateDisplay(rescheduleContext.newDate)}
          </button>
        </div>
      )}

      {/* ─── RESCHEDULED SESSION BANNER ─── */}
      {attendanceType === "RESCHEDULED_SESSION" && rescheduleContext && (
        <div className="alert alert-info mb-4">
          <strong>🔄 Rescheduled Session</strong>
          <br />
          This is a make-up class for:
          <ul className="mb-0 mt-2">
            {rescheduleContext.originalSessions.map((sess, i) => (
              <li key={i}>
                <strong>{sess.courseName}</strong> (originally on{" "}
                {formatDateDisplay(sess.originalDate)},{" "}
                {new Date(sess.originalDate).toLocaleDateString("en-US", {
                  weekday: "long",
                })}
                )
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* ─── ABSENT SESSIONS BANNER ─── */}
      {absentSessions.length > 0 && (
        <div className="alert alert-danger mb-4 border-2 border-danger">
          <div className="d-flex align-items-start">
            <i className="bi bi-x-circle-fill fs-4 me-3 mt-1 text-danger"></i>
            <div>
              <strong className="fs-5">🚫 Cancelled Sessions Today</strong>
              <ul className="mt-2 mb-0 ps-3">
                {absentSessions.map((sess, i) => (
                  <li key={i} className="text-dark fw-medium">
                    <strong>{sess.courseName}</strong>
                    {sess.reason && (
                      <span className="text-muted ms-2">
                        ({sess.reason})
                      </span>
                    )}
                  </li>
                ))}
              </ul>
              <div className="mt-2 small text-muted">
                <i className="bi bi-info-circle me-1"></i>
                Attendance will not be recorded for cancelled sessions.
                Students have been notified.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── EXTRA SESSION INDICATOR ─── */}
      {hasExtraSessions && absentSessions.length === 0 && (
        <div className="alert alert-success mb-4 border-2 border-success">
          <div className="d-flex align-items-start">
            <i className="bi bi-star-fill fs-4 me-3 mt-1 text-success"></i>
            <div>
              <strong className="fs-5">⭐ Extra Session Today!</strong>
              <p className="mb-0 mt-1">
                Additional session(s) scheduled. Attendance will be recorded
                normally.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ─── STUDENT TABLE ─── */}
      {attendanceType !== "MOVED_AWAY" &&
        students.length > 0 &&
        !isScanning && (
          <div className="mt-4">
            {(() => {
              const courseMap = new Map();
              students.forEach((student) => {
                // 🔒 Safeguard: ensure enrolledCourses exists and is an array
                const enrollments = Array.isArray(student.enrolledCourses)
                  ? student.enrolledCourses
                  : [];

                enrollments.forEach((enroll) => {
                  // 🔒 Also ensure enroll.course exists
                  if (!enroll?.course?._id) return;

                  const courseId = enroll.course._id.toString();
                  if (!courseMap.has(courseId)) {
                    courseMap.set(courseId, {
                      course: enroll.course,
                      students: [],
                    });
                  }
                  courseMap
                    .get(courseId)
                    .students.push({ ...student, enrollment: enroll });
                });
              });

              const groupedCourses = Array.from(courseMap.values()).sort(
                (a, b) =>
                  a.course.courseName.localeCompare(b.course.courseName)
              );

              return groupedCourses.map(({ course, students }) => (
                <div key={course._id} className="mb-5">
                  <div
                    className={`p-3 text-white rounded-top ${
                      absentSessions.some(
                        (s) => s.courseName === course.courseName
                      )
                        ? "bg-danger"
                        : hasExtraSessions
                        ? "bg-success"
                        : "bg-primary"
                    }`}
                  >
                    <h4 className="mb-1 d-flex align-items-center">
                      {hasExtraSessions && (
                        <span className="me-2">
                          <i className="bi bi-star-fill"></i>
                        </span>
                      )}
                      {course.courseName}
                      {absentSessions.some(
                        (s) => s.courseName === course.courseName
                      ) && (
                        <span className="ms-2 badge bg-light text-danger">
                          <i className="bi bi-x-circle me-1"></i>Cancelled
                        </span>
                      )}
                    </h4>
                    <div>
                      <span className="me-3">
                        📅{" "}
                        {getDayOfWeek(selectedDate).charAt(0).toUpperCase() +
                          getDayOfWeek(selectedDate).slice(1)}
                      </span>
                      <span>
                        ⏰ {course.timeFrom} – {course.timeTo}
                      </span>
                      {hasExtraSessions && (
                        <span className="ms-2 badge bg-light text-success">
                          Extra Session
                        </span>
                      )}
                    </div>
                  </div>
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
                        {students.map(
                          ({ _id, studentId, name, currentGrade, enrollment }) => (
                            <tr key={_id || studentId}>
                              <td>
                                <strong>{studentId}</strong>
                              </td>
                              <td>{name}</td>
                              <td>{currentGrade || "—"}</td>
                              <td>
                                {enrollment?.startDate
                                  ? formatDateDisplay(enrollment.startDate)
                                  : "—"}{" "}
                                →{" "}
                                {enrollment?.endDate
                                  ? formatDateDisplay(enrollment.endDate)
                                  : "Ongoing"}
                              </td>
                              <td className="text-center">
                                {enrollment?.isMarked ? (
                                  <span
                                    className={`badge ${
                                      enrollment.status === "absent"
                                        ? "bg-danger"
                                        : "bg-success"
                                    }`}
                                  >
                                    {enrollment.status === "absent"
                                      ? "❌ Absent"
                                      : "✅ Present"}
                                  </span>
                                ) : (
                                  <div className="d-flex gap-2 justify-content-center">
                                    <button
                                      className="btn btn-sm btn-success"
                                      onClick={() =>
                                        handleMarkAttendance(
                                          studentId,
                                          course._id,
                                          "present"
                                        )
                                      }
                                    >
                                      ✅ Present
                                    </button>
                                    <button
                                      className="btn btn-sm btn-danger"
                                      onClick={() =>
                                        handleMarkAttendance(
                                          studentId,
                                          course._id,
                                          "absent"
                                        )
                                      }
                                    >
                                      ❌ Absent
                                    </button>
                                  </div>
                                )}
                              </td>
                            </tr>
                          )
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              ));
            })()}
          </div>
        )}

      {/* Empty States */}
      {!loading &&
        students.length === 0 &&
        attendanceType === "NORMAL" &&
        input.trim().length === 0 && (
          <div className="alert alert-info mt-4">
            No students have active courses scheduled on{" "}
            {formatDateDisplay(selectedDate)} ({targetDay}).
          </div>
        )}

      {!loading &&
        students.length === 0 &&
        attendanceType === "RESCHEDULED_SESSION" && (
          <div className="alert alert-info mt-4">
            No students enrolled in rescheduled sessions for this date.
          </div>
        )}

      {!loading &&
        students.length === 0 &&
        input.trim().length > 0 && (
          <div className="alert alert-warning mt-4">
            No student found matching "{input}"
          </div>
        )}

      <ToastContainer position="top-right" autoClose={3000} />
    </div>
  );
};

export default Attendance;