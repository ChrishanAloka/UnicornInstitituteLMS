import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

const AddExtraSession = () => {
    const [courses, setCourses] = useState([]);
    const [extraSessions, setExtraSessions] = useState([]);
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        courseId: '',
        extraDate: '',
        startTime: '',
        endTime: '',
        reason: ''
    });
    const [filterMonth, setFilterMonth] = useState(new Date().getMonth());
    const [filterYear, setFilterYear] = useState(new Date().getFullYear());

    // Fetch courses and extra sessions on mount
    useEffect(() => {
        fetchCourses();
        fetchExtraSessions();
    }, []);

    useEffect(() => {
        fetchExtraSessions();
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

    const fetchExtraSessions = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get(
                `https://unicorninstititutelms.onrender.com/api/auth/sessions/extra?month=${filterMonth}&year=${filterYear}`,
                { headers: { Authorization: `Bearer ${token}` } }
            );
            setExtraSessions(res.data);
        } catch (err) {
            toast.error('Failed to load extra sessions');
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        
        // Auto-fill times when course is selected
        if (name === 'courseId') {
            const course = courses.find(c => c._id === value);
            if (course) {
                setFormData(prev => ({
                    ...prev,
                    courseId: value,
                    startTime: prev.courseId !== value ? course.startTime || '09:00' : prev.startTime,
                    endTime: prev.courseId !== value ? course.endTime || '10:30' : prev.endTime
                }));
            } else {
                setFormData(prev => ({ ...prev, courseId: value }));
            }
            return;
        }
        
        setFormData({ ...formData, [name]: value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const { courseId, extraDate, startTime, endTime } = formData;
        
        if (!courseId || !extraDate || !startTime || !endTime) {
            toast.error('Please fill all required fields');
            return;
        }

        if (startTime >= endTime) {
            toast.error('Start time must be before end time');
            return;
        }

        try {
            const token = localStorage.getItem('token');
            await axios.post(
                'https://unicorninstititutelms.onrender.com/api/auth/sessions/extra',
                formData,
                { headers: { Authorization: `Bearer ${token}` } }
            );
            toast.success('Extra session added successfully!');
            setFormData({ 
                courseId: '', 
                extraDate: '', 
                startTime: '', 
                endTime: '', 
                reason: '' 
            });
            fetchExtraSessions(); // refresh
        } catch (err) {
            const msg = err.response?.data?.error || 'Failed to add extra session';
            toast.error(msg);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Remove this extra session?')) return;
        try {
            const token = localStorage.getItem('token');
            await axios.delete(
                `https://unicorninstititutelms.onrender.com/api/auth/sessions/extra/${id}`,
                { headers: { Authorization: `Bearer ${token}` } }
            );
            toast.success('Removed');
            fetchExtraSessions();
        } catch (err) {
            toast.error('Failed to delete');
        }
    };

    const formatDate = (dateStr) => {
        return new Date(dateStr).toLocaleDateString('en-GB');
    };

    const formatTime = (timeStr) => {
        if (!timeStr) return '';
        const [hours, minutes] = timeStr.split(':');
        return `${hours}:${minutes}`;
    };

    const getCourseName = (courseId) => {
        const course = courses.find(c => c._id === courseId._id);
        return course ? course.courseName : '—';
    };

    const getCourseDetails = (courseId) => {
        return courses.find(c => c._id === courseId) || {};
    };

    return (
        <div className="container py-4">
            <h2 className="mb-4 text-primary fw-bold border-bottom pb-2">➕ Add Extra Course Sessions</h2>

            {/* Form */}
            <div className="card p-4 mb-5 shadow-sm">
                <h5 className="mb-3">Add New Extra Session</h5>
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
                                    <option key={c._id} value={c._id}>
                                        {c.courseName} ({c.dayOfWeek})
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="col-md-6">
                            <label className="form-label fw-semibold">Session Date *</label>
                            <div className="position-relative">
                                <DatePicker
                                    selected={formData.extraDate ? new Date(formData.extraDate) : null}
                                    onChange={(date) =>
                                        setFormData({
                                            ...formData,
                                            extraDate: date ? date.toISOString().split('T')[0] : '',
                                        })
                                    }
                                    placeholderText="Select date"
                                    className="form-control shadow-sm"
                                    dateFormat="yyyy-MM-dd"
                                    required
                                />
                            </div>
                        </div>
                        <div className="col-md-6">
                            <label className="form-label fw-semibold">Start Time *</label>
                            <input
                                type="time"
                                name="startTime"
                                value={formData.startTime}
                                onChange={handleInputChange}
                                className="form-control"
                                required
                                step="300"
                            />
                        </div>
                        <div className="col-md-6">
                            <label className="form-label fw-semibold">End Time *</label>
                            <input
                                type="time"
                                name="endTime"
                                value={formData.endTime}
                                onChange={handleInputChange}
                                className="form-control"
                                required
                                step="300"
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
                                placeholder="e.g., Makeup class"
                            />
                        </div>
                        <div className="col-12">
                            <button type="submit" className="btn btn-primary w-100 py-2">
                                ➕ Add Extra Session
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
                        <option key={y} value={y}>{y}</option>
                    ))}
                </select>
            </div>

            {/* List of Extra Sessions */}
            <div className="table-responsive">
                <table className="table table-hover align-middle">
                    <thead className="table-light">
                        <tr>
                            <th>Course</th>
                            <th>Date</th>
                            <th>Time</th>
                            <th>Reason</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {extraSessions.length === 0 ? (
                            <tr>
                                <td colSpan="5" className="text-center text-muted py-3">
                                    No extra sessions found for this month
                                </td>
                            </tr>
                        ) : (
                            extraSessions.map((s) => (
                                <tr key={s._id}>
                                    <td>{getCourseName(s.course)}</td>
                                    <td>{formatDate(s.extraDate)}</td>
                                    <td>
                                        {formatTime(s.startTime)} - {formatTime(s.endTime)}
                                    </td>
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

export default AddExtraSession;