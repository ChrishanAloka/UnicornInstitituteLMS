// src/components/ClassTimetable.jsx
import React, { useState, useEffect } from "react";
import axios from "axios";
import { ToastContainer, toast } from "react-toastify";
import "./ClassTimetable.css";

const ClassTimetable = () => {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCourses();
  }, []);

  const fetchCourses = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get("https://unicorninstititutelms.onrender.com/api/auth/course", {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCourses(res.data);
      setLoading(false);
    } catch (err) {
      toast.error("Failed to load timetable");
      setLoading(false);
    }
  };

  // Define time slots from 9 AM to 6 PM (hourly)
  const timeSlots = [];
  for (let hour = 9; hour <= 18; hour++) {
    const timeStr = hour <= 12 ? `${hour === 12 ? 12 : hour} AM` : `${hour > 12 ? hour - 12 : hour} PM`;
    timeSlots.push({
      hour24: hour,
      display: timeStr
    });
  }

  const days = [
    { key: "monday", label: "Monday" },
    { key: "tuesday", label: "Tuesday" },
    { key: "wednesday", label: "Wednesday" },
    { key: "thursday", label: "Thursday" },
    { key: "friday", label: "Friday" }
  ];

  // Helper: Convert "HH:MM" to minutes since midnight
  const timeToMinutes = (timeStr) => {
    if (!timeStr) return 0;
    const [h, m] = timeStr.split(":").map(Number);
    return h * 60 + m;
  };

  // Helper: Calculate how many rows a course spans
  const getRowSpan = (start, end) => {
    const startMin = timeToMinutes(start);
    const endMin = timeToMinutes(end);
    const durationHours = (endMin - startMin) / 60;
    return Math.max(1, Math.round(durationHours));
  };

  // Group courses by day
  const coursesByDay = {};
  days.forEach(day => coursesByDay[day.key] = []);

  courses.forEach(course => {
    const dayKey = course.dayOfWeek?.toLowerCase();
    if (coursesByDay[dayKey]) {
      coursesByDay[dayKey].push(course);
    }
  });

  // Sort courses by start time
  Object.values(coursesByDay).forEach(list => {
    list.sort((a, b) => timeToMinutes(a.timeFrom) - timeToMinutes(b.timeFrom));
  });

  // Find course(s) at a given day and hour
  const getCoursesAt = (dayKey, hour24) => {
    return coursesByDay[dayKey].filter(course => {
      const start = timeToMinutes(course.timeFrom);
      const end = timeToMinutes(course.timeTo);
      const slotStart = hour24 * 60;
      const slotEnd = (hour24 + 1) * 60;
      // Check for overlap (simplified: assume courses align to hour boundaries)
      return start < slotEnd && end > slotStart;
    });
  };

  // Render course block (only once at its start time)
  const renderCourseBlock = (course, dayKey) => {
    const startHour = parseInt(course.timeFrom.split(":")[0], 10);
    const rowSpan = getRowSpan(course.timeFrom, course.timeTo);
    const topHour = Math.max(9, Math.min(18, startHour)); // clamp to visible range

    if (startHour < 9 || startHour >= 18) return null;

    // Only render if this is the first row of the course
    return (
      <div
        key={course._id}
        className="timetable-course"
        style={{
          gridRow: `${topHour - 8} / span ${rowSpan}`,
          backgroundColor: course.courseType === 'weekly' ? '#d1ecf1' : 
                          course.courseType === 'monthly' ? '#d4edda' : '#f8d7da',
          borderLeft: course.courseType === 'weekly' ? '4px solid #0dcaf0' :
                        course.courseType === 'monthly' ? '4px solid #28a745' : '4px solid #dc3545'
        }}
      >
        <div className="fw-bold">{course.courseName}</div>
        <div className="text-muted small">
          {formatTime(course.timeFrom)} – {formatTime(course.timeTo)}
        </div>
        {course.instructor?.name && (
          <div className="mt-1 small">{course.instructor.name}</div>
        )}
      </div>
    );
  };

  const formatTime = (timeStr) => {
    if (!timeStr) return "";
    const [h, m] = timeStr.split(":").map(Number);
    const period = h >= 12 ? "PM" : "AM";
    const displayHour = h % 12 || 12;
    return `${displayHour}:${m.toString().padStart(2, "0")} ${period}`;
  };

  if (loading) {
    return (
      <div className="container py-5 text-center">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading timetable...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-4">
      <h2 className="mb-4 text-primary fw-bold border-bottom pb-2">Class Timetable (Mon–Fri)</h2>

      <div className="table-responsive">
        <div className="timetable-grid">
          {/* Time column */}
          <div className="timetable-time-col">
            <div className="timetable-cell header"></div>
            {timeSlots.map((slot, idx) => (
              <div key={idx} className="timetable-cell time-label">
                {slot.display}
              </div>
            ))}
          </div>

          {/* Day columns */}
          {days.map(day => (
            <div className="timetable-day-col" key={day.key}>
              <div className="timetable-cell header">{day.label}</div>
              {timeSlots.map((slot, idx) => (
                <div key={idx} className="timetable-cell">
                  {/* Render course only in the starting hour */}
                  {coursesByDay[day.key]
                    .filter(course => {
                      const startHour = parseInt(course.timeFrom.split(":")[0], 10);
                      return startHour === slot.hour24;
                    })
                    .map(course => renderCourseBlock(course, day.key))}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="mt-4 d-flex flex-wrap gap-3">
        <div><span className="badge bg-info me-2"></span> Weekly Course</div>
        <div><span className="badge bg-success me-2"></span> Monthly Course</div>
        <div><span className="badge bg-danger me-2"></span> Other</div>
      </div>

      <ToastContainer />
    </div>
  );
};

export default ClassTimetable;