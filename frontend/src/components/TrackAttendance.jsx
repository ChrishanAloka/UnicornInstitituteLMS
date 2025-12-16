// src/components/TrackAttendance.jsx
import React, { useState, useEffect } from "react";
import axios from "axios";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const TrackAttendance = () => {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeMonth, setActiveMonth] = useState(new Date().getMonth());
  const [activeYear, setActiveYear] = useState(new Date().getFullYear());

  const startYear = new Date().getFullYear() - 2;
  const years = Array.from({ length: 5 }, (_, i) => startYear + i);
  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  useEffect(() => {
    fetchAttendanceData();
  }, [activeMonth, activeYear]);

  const fetchAttendanceData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const params = new URLSearchParams({ month: activeMonth, year: activeYear });
      const url = `https://unicorninstititutelms.onrender.com/api/auth/course/track-attendance?${params}`;
      
      const res = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setCourses(res.data.courses || []);
    } catch (err) {
      console.error("Error:", err);
      toast.error("Failed to load attendance data");
      setCourses([]);
    } finally {
      setLoading(false);
    }
  };

  const ProgressBar = ({ progress }) => (
    <div style={{ width: '100%', height: '20px', backgroundColor: '#e9ecef', borderRadius: '4px', overflow: 'hidden' }}>
      <div
        style={{
          height: '100%',
          width: `${Math.min(100, progress)}%`,
          backgroundColor: progress >= 100 ? '#28a745' : '#007bff',
          transition: 'width 0.4s ease'
        }}
      />
    </div>
  );

  const formatDate = (dateStr) => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="container py-5 text-center">
        <div className="spinner-border text-primary" />
        <p>Loading attendance data...</p>
      </div>
    );
  }

  return (
    <div className="container py-4">
      <h2 className="mb-4 text-primary fw-bold border-bottom pb-2">Track Attendance</h2>

      <div className="row g-3 mb-4">
        <div className="col-md-6">
          <select className="form-select" value={activeMonth} onChange={e => setActiveMonth(Number(e.target.value))}>
            {months.map((m, i) => <option key={i} value={i}>{m}</option>)}
          </select>
        </div>
        <div className="col-md-6">
          <select className="form-select" value={activeYear} onChange={e => setActiveYear(Number(e.target.value))}>
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </div>

      {courses.length === 0 ? (
        <div className="alert alert-info">No courses found.</div>
      ) : (
        courses.map((course) => (
          <div key={`${course.courseName}-${course.courseType}`} className="mb-5 p-4 bg-body shadow-sm rounded border">
            <div className="d-flex justify-content-between align-items-start mb-3">
              <div>
                <h4 className="mb-1">{course.courseName}</h4>
                <p className="text-muted small mb-1">
                  <strong>Schedule:</strong> Every {course.dayOfWeek}
                </p>
                <p className="text-muted small mb-0">
                  <strong>Course Dates:</strong> {formatDate(course.courseStartDate)} 
                  {course.courseEndDate ? ` – ${formatDate(course.courseEndDate)}` : ' (Ongoing)'}
                </p>
                <p className="text-muted small mb-0">
                  <strong>Total Sessions Held:</strong> {course.totalScheduled}
                </p>
              </div>
              <span className={`badge bg-${course.courseType === 'monthly' ? 'primary' : course.courseType === 'weekly' ? 'warning' : 'success'}`}>
                {course.courseType.toUpperCase()}
              </span>
            </div>

            {course.students.length === 0 ? (
              <p className="text-muted">No students enrolled.</p>
            ) : (
              <div className = "table-responsive">
                <table className="table table-hover">
                  <thead>
                    <tr>
                      <th>Student ID</th>
                      <th>Student Name</th>
                      <th>Enrolled Date</th>
                      <th>Attendance (Up to Today)</th>
                      <th>Attendance (Full Month)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {course.students.map((s) => (
                      <tr key={`${course.courseName}-${s.studentId}`}>
                        <td>{s.studentId}</td>
                        <td>{s.name}</td>
                        <td>{s.enrolledDate}</td>
                        
                        {/* Up to Today */}
                        <td>
                            <div><strong>To Date:</strong> {s.uptoTodayAttended} / {s.totalUptoToday}</div>
                            <div style={{ width: '120px', marginTop: '4px' }}>
                            <ProgressBar progress={s.uptoTodayProgress} />
                            </div>
                            <small className="text-muted">{s.uptoTodayProgress}%</small>
                        </td>
                        <td>
                            <div><strong>Month:</strong> {s.monthlyAttended} / {s.totalMonthly}</div>
                            <div style={{ width: '120px', marginTop: '4px' }}>
                            <ProgressBar progress={s.monthlyProgress} />
                            </div>
                            <small className="text-muted">{s.monthlyProgress}%</small>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ))
      )}

      <ToastContainer />
    </div>
  );
};

export default TrackAttendance;