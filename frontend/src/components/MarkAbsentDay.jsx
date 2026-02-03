import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

const MarkAbsentDay = () => {
    const [courses, setCourses] = useState([]);
    const [absentDays, setAbsentDays] = useState([]);
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        courseId: '',
        absentDate: '',
        reason: ''
    });
    const [filterMonth, setFilterMonth] = useState(new Date().getMonth());
    const [filterYear, setFilterYear] = useState(new Date().getFullYear());

    // Fetch courses and absent days on mount
    useEffect(() => {
        fetchCourses();
        fetchAbsentDays();
    }, []);

    useEffect(() => {
        fetchAbsentDays();
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

    const fetchAbsentDays = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get(
                `https://unicorninstititutelms.onrender.com/api/auth/sessions/absent?month=${filterMonth}&year=${filterYear}`,
                { headers: { Authorization: `Bearer ${token}` } }
            );
            setAbsentDays(res.data);
        } catch (err) {
            toast.error('Failed to load absent days');
        }
    };

    const handleInputChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const { courseId, absentDate } = formData;
        
        if (!courseId || !absentDate) {
            toast.error('Please fill all required fields');
            return;
        }

        // 🔹 Validate absentDate matches course day
        const courseDay = getCourseDay(courseId);
        const selectedDay = getDayOfWeek(absentDate);

        if (courseDay && selectedDay !== courseDay) {
            toast.error(`Date must be a ${courseDay.charAt(0).toUpperCase() + courseDay.slice(1)}!`);
            return;
        }

        try {
            const token = localStorage.getItem('token');
            await axios.post(
                'https://unicorninstititutelms.onrender.com/api/auth/sessions/absent',
                formData,
                { headers: { Authorization: `Bearer ${token}` } }
            );
            toast.success('Absent day marked successfully!');
            setFormData({ courseId: '', absentDate: '', reason: '' });
            fetchAbsentDays(); // refresh
        } catch (err) {
            const msg = err.response?.data?.error || 'Failed to mark absent day';
            toast.error(msg);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Remove this absent day?')) return;
        try {
            const token = localStorage.getItem('token');
            await axios.delete(
                `https://unicorninstititutelms.onrender.com/api/auth/sessions/absent/${id}`,
                { headers: { Authorization: `Bearer ${token}` } }
            );
            toast.success('Removed');
            fetchAbsentDays();
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

    const getCourseTime = (courseId) => {
        const course = courses.find(c => c._id === courseId);
        if (!course) return { startTime: '', endTime: '' };
        return { startTime: course.startTime, endTime: course.endTime };
    };

    return (
        <div className="container py-4">
            <h2 className="mb-4 text-primary fw-bold border-bottom pb-2">🚫 Mark Absent Days</h2>

            {/* Form */}
            <div className="card p-4 mb-5 shadow-sm">
                <h5 className="mb-3">Mark Session as Absent</h5>
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
                            <label className="form-label fw-semibold">Absent Date *</label>
                            <div className="position-relative">
                                <DatePicker
                                    selected={formData.absentDate ? new Date(formData.absentDate) : null}
                                    onChange={(date) =>
                                        setFormData({
                                            ...formData,
                                            absentDate: date ? date.toISOString().split('T')[0] : '',
                                        })
                                    }
                                    filterDate={(date) => {
                                        const allowedDay = getCourseDayIndex(formData.courseId);
                                        return allowedDay !== null ? date.getDay() === allowedDay : true;
                                    }}
                                    placeholderText="Select a valid course day"
                                    className="form-control shadow-sm"
                                    dateFormat="yyyy-MM-dd"
                                    required
                                />
                            </div>
                        </div>
                        <div className="col-md-6">
                            <label className="form-label fw-semibold">Reason (Optional)</label>
                            <input
                                type="text"
                                name="reason"
                                value={formData.reason}
                                onChange={handleInputChange}
                                className="form-control"
                                placeholder="e.g., Public holiday"
                            />
                        </div>
                        <div className="col-12">
                            <button type="submit" className="btn btn-primary w-100 py-2">
                                🚫 Mark as Absent
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

            {/* List of Absent Days */}
            <div className="table-responsive">
                <table className="table table-hover align-middle">
                    <thead className="table-light">
                        <tr>
                            <th>Course</th>
                            <th>Absent Date</th>
                            <th>Time</th>
                            <th>Reason</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {absentDays.length === 0 ? (
                            <tr>
                                <td colSpan="5" className="text-center text-muted py-3">
                                    No absent days found for this month
                                </td>
                            </tr>
                        ) : (
                            absentDays.map((a) => {
                                const courseTime = getCourseTime(a.course._id);
                                return (
                                    <tr key={a._id}>
                                        <td>{getCourseName(a.course)}</td>
                                        <td>{formatDate(a.absentDate)}</td>
                                        <td>
                                            {courseTime.startTime} - {courseTime.endTime}
                                        </td>
                                        <td>{a.reason || '—'}</td>
                                        <td>
                                            <button
                                                className="btn btn-sm btn-danger"
                                                onClick={() => handleDelete(a._id)}
                                            >
                                                Remove
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>

            <ToastContainer />
        </div>
    );
};

export default MarkAbsentDay;