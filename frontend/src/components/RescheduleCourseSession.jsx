// src/components/RescheduleCourseSession.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

const RescheduleCourseSession = () => {
    const [courses, setCourses] = useState([]);
    const [sessions, setSessions] = useState([]);
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        courseId: '',
        originalDate: '',
        newDate: '',
        reason: ''
    });
    const [filterMonth, setFilterMonth] = useState(new Date().getMonth());
    const [filterYear, setFilterYear] = useState(new Date().getFullYear());
    

    // Fetch courses and sessions on mount
    useEffect(() => {
        fetchCourses();
        fetchSessions();
    }, []);

    useEffect(() => {
        fetchSessions();
    }, [filterMonth, filterYear]);

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

    const fetchSessions = async () => {
        try {
        const token = localStorage.getItem('token');
        const res = await axios.get(
            `https://unicorninstititutelms.onrender.com/api/auth/sessions/reschedule?month=${filterMonth}&year=${filterYear}`,
            { headers: { Authorization: `Bearer ${token}` } }
        );
        setSessions(res.data);
        } catch (err) {
        toast.error('Failed to load rescheduled sessions');
        }
    };

    const handleInputChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const { courseId, originalDate, newDate } = formData;
        if (!courseId || !originalDate || !newDate) {
        toast.error('Please fill all required fields');
        return;
        }

        // 🔹 Validate originalDate matches course day
        const courseDay = getCourseDay(courseId); // e.g., "monday"
        const selectedDay = getDayOfWeek(originalDate); // e.g., "tuesday"

        if (courseDay && selectedDay !== courseDay) {
            toast.error(`Original date must be a ${courseDay.charAt(0).toUpperCase() + courseDay.slice(1)}!`);
            return;
        }

        if (new Date(newDate) <= new Date(originalDate)) {
        toast.error('New date must be after the original date');
        return;
        }

        try {
        const token = localStorage.getItem('token');
        await axios.post(
            'https://unicorninstititutelms.onrender.com/api/auth/sessions/reschedule',
            formData,
            { headers: { Authorization: `Bearer ${token}` } }
        );
        toast.success('Session rescheduled successfully!');
        setFormData({ courseId: '', originalDate: '', newDate: '', reason: '' });
        fetchSessions(); // refresh
        } catch (err) {
        const msg = err.response?.data?.error || 'Failed to reschedule';
        toast.error(msg);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Remove this rescheduled session?')) return;
        try {
        const token = localStorage.getItem('token');
        await axios.delete(
            `https://unicorninstititutelms.onrender.com/api/auth/sessions/reschedule/${id}`,
            { headers: { Authorization: `Bearer ${token}` } }
        );
        toast.success('Removed');
        fetchSessions();
        } catch (err) {
        toast.error('Failed to delete');
        }
    };

    const formatDate = (dateStr) => {
        return new Date(dateStr).toLocaleDateString('en-GB');
    };

    const getCourseName = (courseId) => {
        const course = courses.find(c => c._id === courseId._id);
        return course ? course.courseName : '—';
    };

    const getDayOfWeek = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
    };

    const getCourseDay = (courseId) => {
        const course = courses.find(c => c._id === courseId);
        return course ? course.dayOfWeek?.toLowerCase() : null;
    };

  // Inside component
    const getCourseDayIndex = (courseId) => {
        const course = courses.find(c => c._id === courseId);
        if (!course) return null;
            const dayMap = {
                sunday: 0,
                monday: 1,
                tuesday: 2,
                wednesday: 3,
                thursday: 4,
                friday: 5,
                saturday: 6
            };
        return dayMap[course.dayOfWeek.toLowerCase()];
    };


    return (
        <div className="container py-4">
        <h2 className="mb-4 text-primary fw-bold border-bottom pb-2">🔄 Reschedule Course Sessions</h2>

        {/* Form */}
        <div className="card p-4 mb-5 shadow-sm">
            <h5 className="mb-3">Add New Rescheduled Session</h5>
            <form onSubmit={handleSubmit}>
            <div className="row g-3">
                <div className="col-md-6">
                <label className="form-label fw-semibold">Course *</label>
                <select
                    name="courseId"
                    value={formData.courseId}
                    onChange={handleInputChange}
                    className="form-select"
                    required
                >
                    <option value="">-- Select Course --</option>
                    {courses.map(c => (
                    <option key={c._id} value={c._id}>{c.courseName} ({c.dayOfWeek})</option>
                    ))}
                </select>
                </div>
                <div className="col-md-6">
                <label className="form-label fw-semibold">Original Date *</label>
                <div className="position-relative">
                    <DatePicker
                    selected={formData.originalDate ? new Date(formData.originalDate) : null}
                    onChange={(date) =>
                        setFormData({
                        ...formData,
                        originalDate: date ? date.toISOString().split('T')[0] : '',
                        })
                    }
                    filterDate={(date) => {
                        const allowedDay = getCourseDayIndex(formData.courseId);
                        return allowedDay !== null ? date.getDay() === allowedDay : true;
                    }}
                    placeholderText="Select a valid course day"
                    className="form-control shadow-sm" // 👈 This is key!
                    dateFormat="yyyy-MM-dd"
                    required
                    />
                </div>
                </div>
                <div className="col-md-6">
                <label className="form-label fw-semibold">New Date *</label>
                <input
                    type="date"
                    name="newDate"
                    value={formData.newDate}
                    onChange={handleInputChange}
                    className="form-control"
                    required
                />
                </div>
                <div className="col-md-6">
                <label className="form-label fw-semibold">Reason (Optional)</label>
                <input
                    type="text"
                    name="reason"
                    value={formData.reason}
                    onChange={handleInputChange}
                    className="form-control"
                    placeholder="e.g., Instructor unavailable"
                />
                </div>
                <div className="col-12">
                <button type="submit" className="btn btn-primary w-100 py-2">
                    ➕ Add Rescheduled Session
                </button>
                </div>
            </div>
            </form>
        </div>

        {/* Filter by Month/Year */}
        <div className="d-flex gap-3 mb-3">
            <select
            value={filterMonth}
            onChange={(e) => setFilterMonth(Number(e.target.value))}
            className="form-select w-auto"
            >
            {Array.from({ length: 12 }, (_, i) => (
                <option key={i} value={i}>
                {new Date(2020, i, 1).toLocaleString('default', { month: 'long' })}
                </option>
            ))}
            </select>
            <select
            value={filterYear}
            onChange={(e) => setFilterYear(Number(e.target.value))}
            className="form-select w-auto"
            >
            {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i).map(y => (
                < option key={y} value={y}>{y}</option>
            ))}
            </select>
        </div>

        {/* List of Rescheduled Sessions */}
        <div className="table-responsive">
            <table className="table table-hover align-middle">
            <thead className="table-light">
                <tr>
                <th>Course</th>
                <th>Original Date</th>
                <th>New Date</th>
                <th>Reason</th>
                <th>Actions</th>
                </tr>
            </thead>
            <tbody>
                {sessions.length === 0 ? (
                <tr>
                    <td colSpan="5" className="text-center text-muted py-3">
                    No rescheduled sessions found for this month
                    </td>
                </tr>
                ) : (
                sessions.map((s) => (
                    <tr key={s._id}>
                    <td>{getCourseName(s.course)}</td>
                    <td>{formatDate(s.originalDate)}</td>
                    <td>{formatDate(s.newDate)}</td>
                    <td>{s.reason || '—'}</td>
                    <td>
                        <button
                        className="btn btn-sm btn-danger"
                        onClick={() => handleDelete(s._id)}
                        >
                        Remove
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

export default RescheduleCourseSession;