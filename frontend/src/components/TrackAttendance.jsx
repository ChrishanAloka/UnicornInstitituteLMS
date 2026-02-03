import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

const TrackAttendance = () => {
  const [students, setStudents] = useState([]);
  const [courses, setCourses] = useState([]);
  const [attendanceData, setAttendanceData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState({
    studentId: '',
    courseId: '',
    month: new Date().getMonth(),
    year: new Date().getFullYear()
  });
  const [viewMode, setViewMode] = useState('overview'); // 'overview', 'student', 'course'
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [selectedCourse, setSelectedCourse] = useState(null);

  useEffect(() => {
    fetchStudents();
    fetchCourses();
    fetchAttendanceData();
  }, [filter]);

  const fetchStudents = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('https://unicorninstititutelms.onrender.com/api/auth/students', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStudents(res.data);
    } catch (err) {
      toast.error('Failed to load students');
    }
  };

  const fetchCourses = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('https://unicorninstititutelms.onrender.com/api/auth/course', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCourses(res.data);
    } catch (err) {
      toast.error('Failed to load courses');
    }
  };

  const fetchAttendanceData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      let url = `https://unicorninstititutelms.onrender.com/api/auth/attendance/track?month=${filter.month}&year=${filter.year}`;
      
      if (filter.studentId) url += `&studentId=${filter.studentId}`;
      if (filter.courseId) url += `&courseId=${filter.courseId}`;

      const res = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAttendanceData(res.data);
    } catch (err) {
      toast.error('Failed to load attendance data');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (field, value) => {
    setFilter(prev => ({ ...prev, [field]: value }));
  };

  const getCourseName = (courseId) => {
    const course = courses.find(c => c._id === courseId);
    return course ? course.courseName : 'Unknown';
  };

  const getStudentName = (studentId) => {
    const student = students.find(s => s.studentId === studentId);
    return student ? student.name : 'Unknown';
  };

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('en-GB');
  };

  const getBadgeColor = (percentage) => {
    if (percentage >= 90) return 'success';
    if (percentage >= 75) return 'warning';
    return 'danger';
  };

  const handleViewStudent = (student) => {
    setSelectedStudent(student);
    setViewMode('student');
  };

  const handleViewCourse = (course) => {
    setSelectedCourse(course);
    setViewMode('course');
  };

  const handleBack = () => {
    setViewMode('overview');
    setSelectedStudent(null);
    setSelectedCourse(null);
  };

  return (
    <div className="container py-4">
      <ToastContainer position="top-right" autoClose={3000} />
      
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 className="text-primary fw-bold">
          <i className="bi bi-calendar-check me-2"></i>
          Track Attendance
        </h2>
        {viewMode !== 'overview' && (
          <button className="btn btn-outline-secondary" onClick={handleBack}>
            <i className="bi bi-arrow-left me-1"></i> Back to Overview
          </button>
        )}
      </div>

      {/* Filter Controls */}
      <div className="card p-4 mb-4 shadow-sm">
        <div className="row g-3">
          <div className="col-md-3">
            <label className="form-label fw-semibold">Month</label>
            <select
              className="form-select"
              value={filter.month}
              onChange={(e) => handleFilterChange('month', parseInt(e.target.value))}
            >
              {Array.from({ length: 12 }, (_, i) => (
                <option key={i} value={i}>
                  {new Date(2020, i, 1).toLocaleString('default', { month: 'long' })}
                </option>
              ))}
            </select>
          </div>

          <div className="col-md-3">
            <label className="form-label fw-semibold">Year</label>
            <select
              className="form-select"
              value={filter.year}
              onChange={(e) => handleFilterChange('year', parseInt(e.target.value))}
            >
              {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i).map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>

          <div className="col-md-3">
            <label className="form-label fw-semibold">Student (Optional)</label>
            <select
              className="form-select"
              value={filter.studentId}
              onChange={(e) => handleFilterChange('studentId', e.target.value)}
            >
              <option value="">All Students</option>
              {students.map(s => (
                <option key={s.studentId} value={s.studentId}>
                  {s.name} ({s.studentId})
                </option>
              ))}
            </select>
          </div>

          <div className="col-md-3">
            <label className="form-label fw-semibold">Course (Optional)</label>
            <select
              className="form-select"
              value={filter.courseId}
              onChange={(e) => handleFilterChange('courseId', e.target.value)}
            >
              <option value="">All Courses</option>
              {courses.map(c => (
                <option key={c._id} value={c._id}>
                  {c.courseName}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Overview View */}
      {viewMode === 'overview' && (
        <>
          {loading ? (
            <div className="text-center py-5">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
              <p className="mt-2 text-muted">Loading attendance data...</p>
            </div>
          ) : attendanceData.length === 0 ? (
            <div className="alert alert-info text-center">
              <i className="bi bi-inbox display-4 d-block mb-2"></i>
              <h6>No attendance records found for the selected filters</h6>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover align-middle">
                <thead className="table-light">
                  <tr>
                    <th>Student</th>
                    <th>Course</th>
                    <th>
                      <i className="bi bi-calendar-week me-1"></i>
                      Total Sessions
                    </th>
                    <th>
                      <i className="bi bi-check-circle me-1"></i>
                      Attended
                    </th>
                    <th>
                      <i className="bi bi-x-circle me-1"></i>
                      Absent
                    </th>
                    <th>
                      <i className="bi bi-percent me-1"></i>
                      Attendance %
                    </th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {attendanceData.map((record, idx) => (
                    <tr key={idx}>
                      <td>
                        <div className="fw-bold">{record.student.name}</div>
                        <div className="text-muted small">{record.student.studentId}</div>
                        <div className="text-muted small">{record.student.currentGrade}</div>
                      </td>
                      <td>
                        <div className="fw-bold">{record.course.courseName}</div>
                        <div className="text-muted small">
                          {record.course.dayOfWeek} | {record.course.timeFrom} - {record.course.timeTo}
                        </div>
                      </td>
                      <td>
                        <span className="badge bg-primary">
                          {record.totalSessions}
                        </span>
                        <div className="text-muted small mt-1">
                          <i className="bi bi-info-circle me-1"></i>
                          {record.details.regularSessions} Regular, 
                          {record.details.extraSessions} Extra, 
                          {record.details.absentSessions} Absent, 
                          {record.details.rescheduledSessions} Rescheduled
                        </div>
                      </td>
                      <td>
                        <span className="badge bg-success">
                          {record.attendedSessions}
                        </span>
                      </td>
                      <td>
                        <span className="badge bg-danger">
                          {record.absentSessions}
                        </span>
                      </td>
                      <td>
                        <div className="d-flex align-items-center">
                          <div className="progress" style={{ width: '80px', height: '8px', marginRight: '8px' }}>
                            <div
                              className={`progress-bar bg-${getBadgeColor(record.attendancePercentage)}`}
                              role="progressbar"
                              style={{ width: `${record.attendancePercentage}%` }}
                            ></div>
                          </div>
                          <span className={`fw-bold text-${getBadgeColor(record.attendancePercentage)}`}>
                            {record.attendancePercentage}%
                          </span>
                        </div>
                      </td>
                      <td>
                        <button
                          className="btn btn-sm btn-primary me-1"
                          onClick={() => handleViewStudent(record.student)}
                          title="View Student Details"
                        >
                          <i className="bi bi-person"></i>
                        </button>
                        <button
                          className="btn btn-sm btn-info"
                          onClick={() => handleViewCourse(record.course)}
                          title="View Course Details"
                        >
                          <i className="bi bi-book"></i>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* Student Detail View */}
      {viewMode === 'student' && selectedStudent && (
        <div className="card p-4 shadow-sm">
          <h4 className="mb-4">
            <i className="bi bi-person me-2"></i>
            Attendance for {selectedStudent.name} ({selectedStudent.studentId})
          </h4>
          
          <div className="table-responsive">
            <table className="table table-hover align-middle">
              <thead className="table-light">
                <tr>
                  <th>Course</th>
                  <th>Total Sessions</th>
                  <th>Attended</th>
                  <th>Absent</th>
                  <th>Attendance %</th>
                  <th>Details</th>
                </tr>
              </thead>
              <tbody>
                {attendanceData
                  .filter(r => r.student.studentId === selectedStudent.studentId)
                  .map((record, idx) => (
                    <tr key={idx}>
                      <td>
                        <div className="fw-bold">{record.course.courseName}</div>
                        <div className="text-muted small">
                          {record.course.dayOfWeek} | {record.course.timeFrom} - {record.course.timeTo}
                        </div>
                      </td>
                      <td>
                        <span className="badge bg-primary">{record.totalSessions}</span>
                      </td>
                      <td>
                        <span className="badge bg-success">{record.attendedSessions}</span>
                      </td>
                      <td>
                        <span className="badge bg-danger">{record.absentSessions}</span>
                      </td>
                      <td>
                        <span className={`fw-bold text-${getBadgeColor(record.attendancePercentage)}`}>
                          {record.attendancePercentage}%
                        </span>
                      </td>
                      <td>
                        <button
                          className="btn btn-sm btn-outline-primary"
                          onClick={async () => {
                            // Fetch detailed attendance
                            const token = localStorage.getItem('token');
                            const res = await axios.get(
                              `https://unicorninstititutelms.onrender.com/api/auth/attendance/details?studentId=${selectedStudent.studentId}&courseId=${record.course._id}&month=${filter.month}&year=${filter.year}`,
                              { headers: { Authorization: `Bearer ${token}` } }
                            );
                            console.log('Detailed Attendance:', res.data);
                            // You can show this in a modal or new view
                            toast.info('Detailed view coming soon!');
                          }}
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Course Detail View */}
      {viewMode === 'course' && selectedCourse && (
        <div className="card p-4 shadow-sm">
          <h4 className="mb-4">
            <i className="bi bi-book me-2"></i>
            Attendance for {selectedCourse.courseName}
          </h4>
          
          <div className="table-responsive">
            <table className="table table-hover align-middle">
              <thead className="table-light">
                <tr>
                  <th>Student</th>
                  <th>Grade</th>
                  <th>Total Sessions</th>
                  <th>Attended</th>
                  <th>Absent</th>
                  <th>Attendance %</th>
                </tr>
              </thead>
              <tbody>
                {attendanceData
                  .filter(r => r.course._id === selectedCourse._id)
                  .map((record, idx) => (
                    <tr key={idx}>
                      <td>
                        <div className="fw-bold">{record.student.name}</div>
                        <div className="text-muted small">{record.student.studentId}</div>
                      </td>
                      <td>{record.student.currentGrade}</td>
                      <td>
                        <span className="badge bg-primary">{record.totalSessions}</span>
                      </td>
                      <td>
                        <span className="badge bg-success">{record.attendedSessions}</span>
                      </td>
                      <td>
                        <span className="badge bg-danger">{record.absentSessions}</span>
                      </td>
                      <td>
                        <div className="d-flex align-items-center">
                          <div className="progress" style={{ width: '60px', height: '6px', marginRight: '6px' }}>
                            <div
                              className={`progress-bar bg-${getBadgeColor(record.attendancePercentage)}`}
                              role="progressbar"
                              style={{ width: `${record.attendancePercentage}%` }}
                            ></div>
                          </div>
                          <span className={`fw-bold text-${getBadgeColor(record.attendancePercentage)}`}>
                            {record.attendancePercentage}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Summary Statistics */}
      {viewMode === 'overview' && attendanceData.length > 0 && (
        <div className="row mt-4">
          <div className="col-md-3">
            <div className="card bg-primary text-white p-3">
              <h6 className="mb-0">Total Records</h6>
              <h3 className="mb-0">{attendanceData.length}</h3>
            </div>
          </div>
          <div className="col-md-3">
            <div className="card bg-success text-white p-3">
              <h6 className="mb-0">Avg Attendance %</h6>
              <h3 className="mb-0">
                {Math.round(
                  attendanceData.reduce((sum, r) => sum + r.attendancePercentage, 0) / attendanceData.length
                )}%
              </h3>
            </div>
          </div>
          <div className="col-md-3">
            <div className="card bg-warning text-dark p-3">
              <h6 className="mb-0">Total Sessions</h6>
              <h3 className="mb-0">
                {attendanceData.reduce((sum, r) => sum + r.totalSessions, 0)}
              </h3>
            </div>
          </div>
          <div className="col-md-3">
            <div className="card bg-info text-white p-3">
              <h6 className="mb-0">Total Students</h6>
              <h3 className="mb-0">
                {new Set(attendanceData.map(r => r.student.studentId)).size}
              </h3>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TrackAttendance;