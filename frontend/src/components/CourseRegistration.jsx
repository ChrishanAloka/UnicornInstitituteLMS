// src/components/CourseRegistration.jsx
import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import * as XLSX from 'xlsx'; // For Excel export
import jsPDF from 'jspdf'; // For PDF export
import html2canvas from 'html2canvas'; // For PDF export


const CourseRegistration = () => {
  const [courses, setCourses] = useState([]);
  const [instructors, setInstructors] = useState([]);
  const [newCourse, setNewCourse] = useState({
    courseName: "",
    dayOfWeek: "",
    timeFrom: "",
    timeTo: "",
    description: "",
    courseType: "Monthly",
    instructor: "",
    courseStartDate: "",
    courseEndDate: "",
    courseFees: ""
  });
  const [editingCourse, setEditingCourse] = useState(null);
  const [editData, setEditData] = useState({ ...newCourse });
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState("");
  const [sortColumn, setSortColumn] = useState("courseName");
  const [sortDirection, setSortDirection] = useState("asc");
  const [showFilter, setShowFilter] = useState(false);
  const [filterDay, setFilterDay] = useState(""); // e.g., "monday", "tuesday", etc.

  const [showEnrollModal, setShowEnrollModal] = useState(false);
  const [selectedCourseForEnroll, setSelectedCourseForEnroll] = useState(null); // { _id, courseName }
  const [allStudents, setAllStudents] = useState([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [selectedStudentIds, setSelectedStudentIds] = useState(new Set());
  const [enrollmentDates, setEnrollmentDates] = useState({ startDate: "", endDate: "" });

  const [showUnenrollModal, setShowUnenrollModal] = useState(false);
  const [selectedCourseForUnenroll, setSelectedCourseForUnenroll] = useState(null); // { _id, courseName }
  const [enrolledStudents, setEnrolledStudents] = useState([]);
  const [loadingEnrolled, setLoadingEnrolled] = useState(false);
  const [selectedUnenrollStudentIds, setSelectedUnenrollStudentIds] = useState(new Set());

  const [showPastCourses, setShowPastCourses] = useState(false);

  const [showTimetableModal, setShowTimetableModal] = useState(false);

  const [rescheduledSessions, setRescheduledSessions] = useState([]);
  const [loadingReschedules, setLoadingReschedules] = useState(false);

  // Columns for filtering & sorting
  const columns = [
    { label: "Course", key: "courseName" },
    { label: "Day", key: "dayOfWeek" },
    { label: "Time From", key: "timeFrom" },
    { label: "Time To", key: "timeTo" },
    { label: "Type", key: "courseType" },
    { label: "Instructor", key: "instructorName" }, // derived
    { label: "Start Date", key: "courseStartDate" },
    { label: "Fees", key: "courseFees" },
  ];

  const filterRef = useRef(null);

  useEffect(() => {
    fetchCourses();
    fetchInstructors();
    fetchRescheduledSessions();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showFilter && filterRef.current && !filterRef.current.contains(event.target)) {
        setShowFilter(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showFilter]);

  const fetchAllStudents = async () => {
    setLoadingStudents(true);
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(
        "https://unicorninstititutelms.onrender.com/api/auth/students",
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setAllStudents(res.data);
    } catch (err) {
      toast.error("Failed to load students");
      setAllStudents([]);
    } finally {
      setLoadingStudents(false);
    }
  };

  const fetchEnrolledStudents = async (courseId) => {
    setLoadingEnrolled(true);
    try {
      const token = localStorage.getItem("token");
      // Assuming your backend has an endpoint like: GET /api/auth/course/:id/students
      const res = await axios.get(
        `https://unicorninstititutelms.onrender.com/api/auth/course/${courseId}/students`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      // Expected response: array of student objects with enrollment info
      setEnrolledStudents(res.data);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load enrolled students");
      setEnrolledStudents([]);
    } finally {
      setLoadingEnrolled(false);
    }
  };

  const fetchCourses = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get("https://unicorninstititutelms.onrender.com/api/auth/course", {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCourses(res.data);
    } catch (err) {
      toast.error("Failed to load courses");
    } finally {
      setLoading(false);
    }
  };

  const fetchInstructors = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get("https://unicorninstititutelms.onrender.com/api/auth/instructor", {
        headers: { Authorization: `Bearer ${token}` }
      });
      setInstructors(res.data);
    } catch (err) {
      console.warn("Could not load instructors for dropdown");
    }
  };

  const fetchRescheduledSessions = async () => {
    try {
      setLoadingReschedules(true);
      const token = localStorage.getItem("token");
      const res = await axios.get(
        "https://unicorninstititutelms.onrender.com/api/auth/sessions/reschedule",
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setRescheduledSessions(res.data);
    } catch (err) {
      console.error("Failed to fetch rescheduled sessions:", err);
      toast.error("Failed to load rescheduled sessions");
    } finally {
      setLoadingReschedules(false);
    }
  };

  const handleChange = (e) =>
    setNewCourse({ ...newCourse, [e.target.name]: e.target.value });

  const handleCreate = async (e) => {
    e.preventDefault();
    const { courseName, dayOfWeek, timeFrom, timeTo, courseType, courseStartDate } = newCourse;
    if (!courseName || !dayOfWeek || !timeFrom || !timeTo) {
      toast.error("Please fill all required fields");
      return;
    }

    if (courseType === "other" && !courseStartDate) {
      toast.error("Course Start Date is required for 'Other' course type");
      return;
    }

    const payload = { ...newCourse };
    if (!payload.courseStartDate) delete payload.courseStartDate;
    if (!payload.courseEndDate) delete payload.courseEndDate;
    if (payload.courseFees === "") delete payload.courseFees;
    else payload.courseFees = Number(payload.courseFees);

    try {
      const token = localStorage.getItem("token");
      const res = await axios.post(
        "https://unicorninstititutelms.onrender.com/api/auth/course/register",
        payload,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setCourses([...courses, res.data]);
      setNewCourse({
        courseName: "",
        dayOfWeek: "",
        timeFrom: "",
        timeTo: "",
        description: "",
        courseType: "Monthly",
        instructor: "",
        courseStartDate: "",
        courseEndDate: "",
        courseFees: ""
      });
      toast.success("Course registered!");
    } catch (err) {
      const msg = err.response?.data?.error || "Registration failed";
      toast.error(msg);
    }
  };

  const openEditModal = (course) => {
    const formatDateForInput = (dateString) => {
      if (!dateString) return "";
      const date = new Date(dateString);
      return new Date(date.getTime() - date.getTimezoneOffset() * 60000)
        .toISOString()
        .split("T")[0];
    };

    setEditingCourse(course._id);
    setEditData({
      courseName: course.courseName,
      dayOfWeek: course.dayOfWeek || "",
      timeFrom: course.timeFrom,
      timeTo: course.timeTo,
      description: course.description || "",
      courseType: course.courseType || "Monthly",
      instructor: course.instructor?._id || course.instructor || "",
      courseStartDate: formatDateForInput(course.courseStartDate) || "",
      courseEndDate: formatDateForInput(course.courseEndDate) || "",
      courseFees: course.courseFees || ""
    });
  };

  const handleEditChange = (e) =>
    setEditData({ ...editData, [e.target.name]: e.target.value });

  const handleUpdate = async (e) => {
    e.preventDefault();
    const { courseName, dayOfWeek, timeFrom, timeTo, courseType, courseStartDate } = editData;

    if (!courseName || !dayOfWeek || !timeFrom || !timeTo) {
      toast.error("Required fields missing");
      return;
    }

    if (courseType === "other" && !courseStartDate) {
      toast.error("Course Start Date is required for 'Other' course type");
      return;
    }

    const payload = { ...editData };
    if (!payload.courseStartDate) delete payload.courseStartDate;
    if (!payload.courseEndDate) delete payload.courseEndDate;
    if (payload.courseFees === "") delete payload.courseFees;
    else payload.courseFees = Number(payload.courseFees);

    try {
      const token = localStorage.getItem("token");
      const res = await axios.put(
        `https://unicorninstititutelms.onrender.com/api/auth/course/${editingCourse}`,
        payload,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setCourses(courses.map(c => c._id === editingCourse ? res.data : c));
      setEditingCourse(null);
      toast.success("Course updated!");
    } catch (err) {
      toast.error("Update failed");
    }
  };

  const handleDelete = (id) => {
    if (!window.confirm("Delete course?")) return;
    axios
      .delete(`https://unicorninstititutelms.onrender.com/api/auth/course/${id}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
      })
      .then(() => {
        setCourses(courses.filter(c => c._id !== id));
        toast.success("Course deleted!");
      })
      .catch(() => toast.error("Delete failed"));
  };

  const handleBulkEnroll = async () => {
    if (selectedStudentIds.size === 0) return;

    const token = localStorage.getItem("token");
    const courseId = selectedCourseForEnroll._id;
    const { startDate, endDate } = enrollmentDates;

    let successCount = 0;
    let errorCount = 0;

    // Enroll each selected student
    for (const studentId of selectedStudentIds) {
      try {
        await axios.post(
          `https://unicorninstititutelms.onrender.com/api/auth/students/enroll/${studentId}`,
          {
            courseId,
            startDate: startDate || undefined,
            endDate: endDate || undefined
          },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        successCount++;
      } catch (err) {
        console.error(`Failed to enroll student ${studentId}:`, err);
        errorCount++;
      }
    }

    toast.success(`${successCount} student(s) enrolled successfully!`);
    if (errorCount > 0) {
      toast.warn(`${errorCount} enrollment(s) failed.`);
    }

    setShowEnrollModal(false);
    // Optionally refresh course list or student data
  };

  const handleBulkUnenroll = async () => {
    if (selectedUnenrollStudentIds.size === 0) return;

    const token = localStorage.getItem("token");
    let successCount = 0;
    let errorCount = 0;

    // Map studentId → enrollmentId (needed for your delete endpoint)
    const studentToEnrollmentMap = {};
    enrolledStudents.forEach(s => {
      if (selectedUnenrollStudentIds.has(s._id)) {
        studentToEnrollmentMap[s._id] = s.enrollmentId;
      }
    });

    // Confirm before unenrolling
    if (!window.confirm(`Are you sure you want to unenroll ${selectedUnenrollStudentIds.size} student(s)?`)) {
      return;
    }

    for (const studentId of selectedUnenrollStudentIds) {
      const enrollmentId = studentToEnrollmentMap[studentId];
      if (!enrollmentId) continue;

      try {
        await axios.delete(
          `https://unicorninstititutelms.onrender.com/api/auth/students/${studentId}/unenroll/${enrollmentId}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        successCount++;
      } catch (err) {
        console.error(`Failed to unenroll student ${studentId}:`, err);
        errorCount++;
      }
    }

    toast.success(`${successCount} student(s) unenrolled!`);
    if (errorCount > 0) {
      toast.error(`${errorCount} unenrollment(s) failed.`);
    }

    // Refresh the list
    await fetchEnrolledStudents(selectedCourseForUnenroll._id);
  };

  const capitalize = (str) => str ? str.charAt(0).toUpperCase() + str.slice(1) : "-";

  const formatDate = (dateStr) => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString("en-GB");
  };

  // Derive instructorName for filtering
  const enrichedCourses = courses.map(c => ({
    ...c,
    instructorName: c.instructor?.name || "-"
  }));

  console.log("enrisched ",enrichedCourses);

  const matchesSearch = (course) => {
    if (!searchText) return true;
    return columns.some(col => {
      let value = course[col.key];
      if (col.key === "courseFees" && value !== undefined) {
        value = String(value);
      }
      return value && String(value).toLowerCase().includes(searchText.toLowerCase());
    });
  };

  const WEEKDAY_ORDER = {
    monday: 1,
    tuesday: 2,
    wednesday: 3,
    thursday: 4,
    friday: 5,
    saturday: 6,
    sunday: 7
  };

  const today = new Date();
  today.setHours(0, 0, 0, 0); // normalize to start of day

  const processedCourses = enrichedCourses
    .filter((course) => {
      // Text & day filter (existing)
      const matchesText = !searchText || columns.some(col => {
        const val = course[col.key];
        return val != null && String(val).toLowerCase().includes(searchText.toLowerCase());
      });
      const matchesDay = !filterDay || course.dayOfWeek === filterDay;

      if (!matchesText || !matchesDay) return false;

      // Past course logic
      if (showPastCourses) {
        return true; // show all (including past)
      }

      // Hide courses that ended before today
      if (course.courseEndDate) {
        const endDate = new Date(course.courseEndDate);
        endDate.setHours(0, 0, 0, 0);
        return endDate >= today;
      }

      // If no end date, assume it's still active
      return true;
    })
    .sort((a, b) => {
      // ... your existing sort logic (unchanged)
      if (sortColumn === "dayOfWeek") {
        const aOrder = WEEKDAY_ORDER[a.dayOfWeek?.toLowerCase()] ?? 99;
        const bOrder = WEEKDAY_ORDER[b.dayOfWeek?.toLowerCase()] ?? 99;
        return sortDirection === "asc" ? aOrder - bOrder : bOrder - aOrder;
      }
      if (sortColumn === "courseStartDate") {
        return sortDirection === "asc"
          ? new Date(a.courseStartDate) - new Date(b.courseStartDate)
          : new Date(b.courseStartDate) - new Date(a.courseStartDate);
      }
      if (sortColumn === "courseFees") {
        const aVal = parseFloat(a.courseFees) || 0;
        const bVal = parseFloat(b.courseFees) || 0;
        return sortDirection === "asc" ? aVal - bVal : bVal - aVal;
      }
      const aVal = a[sortColumn] ?? "";
      const bVal = b[sortColumn] ?? "";
      return sortDirection === "asc"
        ? String(aVal).localeCompare(String(bVal))
        : String(bVal).localeCompare(String(aVal));
    });

  // Add this function to get the current week dates
  const getWeekDates = () => {
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0 (Sunday) to 6 (Saturday)
    const diff = today.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1); // Adjust to Monday
    const monday = new Date(today.setDate(diff));
    
    const weekDates = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(monday);
      date.setDate(monday.getDate() + i);
      weekDates.push({
        date: date,
        day: date.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase(),
        formatted: date.toLocaleDateString('en-GB')
      });
    }
    return weekDates;
  };

  // Add this function to organize courses by day and time
  const organizeTimetable = () => {
    const weekDates = getWeekDates();
    const timetable = {};
    
    // Initialize all days
    weekDates.forEach(({ day }) => {
      timetable[day] = [];
    });
    
    // Filter active courses for this week
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Create a map of rescheduled sessions by course
    const rescheduleMap = {};
    rescheduledSessions.forEach(session => {
      if (!rescheduleMap[session.course._id]) {
        rescheduleMap[session.course._id] = [];
      }
      rescheduleMap[session.course._id].push(session);
    });
    
    enrichedCourses.forEach(course => {
      // Check if course is active
      if (course.courseEndDate) {
        const endDate = new Date(course.courseEndDate);
        endDate.setHours(0, 0, 0, 0);
        if (endDate < today) return;
      }
      
      // Get rescheduled sessions for this course
      const courseReschedules = rescheduleMap[course._id] || [];
      
      // Process each day of the week
      weekDates.forEach(({ day, date }) => {
        const dayKey = day.toLowerCase();
        const courseDayKey = course.dayOfWeek?.toLowerCase();
        
        // Check if this is the course's regular day
        const isRegularDay = courseDayKey === dayKey;
        
        if (isRegularDay) {
          // Check if this date has been rescheduled
          const originalDateStr = date.toISOString().split('T')[0];
          const isRescheduled = courseReschedules.some(rs => {
            const rsOriginalDate = new Date(rs.originalDate).toISOString().split('T')[0];
            return rsOriginalDate === originalDateStr;
          });
          
          // Only add if NOT rescheduled
          if (!isRescheduled) {
            timetable[dayKey].push({
              ...course,
              isRescheduled: false,
              isOriginal: true
            });
          }
        }
        
        // Check if any rescheduled session falls on this date
        courseReschedules.forEach(rs => {
          const rsNewDate = new Date(rs.newDate);
          const rsNewDateStr = rsNewDate.toISOString().split('T')[0];
          const currentDateStr = date.toISOString().split('T')[0];
          
          if (rsNewDateStr === currentDateStr) {
            // Add the rescheduled session
            timetable[dayKey].push({
              ...course,
              isRescheduled: true,
              isOriginal: false,
              originalDate: rs.originalDate,
              rescheduleReason: rs.reason,
              rescheduleId: rs._id
            });
          }
        });
      });
    });
    
    // Sort courses by time
    Object.keys(timetable).forEach(day => {
      timetable[day].sort((a, b) => {
        return a.timeFrom.localeCompare(b.timeFrom);
      });
    });
    
    return { weekDates, timetable };
  };

  const formatRescheduleInfo = (session) => {
    if (!session.isRescheduled) return null;
    
    const originalDate = new Date(session.originalDate);
    const formattedOriginal = originalDate.toLocaleDateString('en-GB', {
      weekday: 'short',
      day: 'numeric',
      month: 'short'
    });
    
    return {
      originalDate: formattedOriginal,
      reason: session.rescheduleReason || 'Rescheduled'
    };
  };

  // Add this helper function for time formatting
  const formatTimeRange = (timeFrom, timeTo) => {
    if (!timeFrom || !timeTo) return '';
    return `${timeFrom} - ${timeTo}`;
  };

  // Add this inside your component or in a CSS file
  const printStyles = `
  @media print {
    body * {
      visibility: hidden;
    }
    #timetable-print, #timetable-print * {
      visibility: visible;
    }
    #timetable-print {
      position: absolute;
      left: 0;
      top: 0;
      width: 100%;
    }
    .no-print {
      display: none !important;
    }
    table {
      page-break-inside: avoid;
    }
    tr {
      page-break-inside: avoid;
    }
    .modal {
      position: static !important;
      display: block !important;
      overflow: visible !important;
    }
    .modal-dialog {
      width: 100% !important;
      max-width: none !important;
      margin: 0 !important;
      padding: 0 !important;
    }
    .modal-content {
      border: none !important;
      box-shadow: none !important;
    }
    .modal-header, .modal-footer {
      display: none !important;
    }
    .modal-body {
      padding: 0 !important;
    }
    table {
      font-size: 10px !important;
    }
    th, td {
      padding: 4px !important;
    }
  }
  `;

  // Add these functions to your component

  // Print Function
  const handlePrintTimetable = () => {
    window.print();
  };

  // Excel Export Function
  const handleExportExcel = () => {
    try {
      const { weekDates, timetable } = organizeTimetable();
      
      // Prepare data for Excel
      const excelData = [];
      
      // Header row
      const headerRow = ['Time'];
      weekDates.forEach(({ day }) => {
        headerRow.push(capitalize(day));
      });
      excelData.push(headerRow);
      
      // Data rows (time slots)
      for (let i = 0; i < 25; i++) {
        const hour = Math.floor(8 + i / 2);
        const minute = i % 2 === 0 ? '00' : '30';
        const timeSlot = `${hour.toString().padStart(2, '0')}:${minute}`;
        
        const row = [timeSlot];
        
        weekDates.forEach(({ day }) => {
          const courses = timetable[day] || [];
          const overlappingCourses = courses.filter(course => {
            if (!course.timeFrom || !course.timeTo) return false;
            
            const slotTime = new Date();
            slotTime.setHours(parseInt(timeSlot.split(':')[0]), parseInt(timeSlot.split(':')[1]));
            
            const courseStart = new Date();
            const [startHour, startMin] = course.timeFrom.split(':');
            courseStart.setHours(parseInt(startHour), parseInt(startMin));
            
            const courseEnd = new Date();
            const [endHour, endMin] = course.timeTo.split(':');
            courseEnd.setHours(parseInt(endHour), parseInt(endMin));
            
            return slotTime >= courseStart && slotTime < courseEnd;
          });
          
          // Join all course names for this slot
          const courseNames = overlappingCourses.map(c => 
            `${c.courseName} (${c.instructorName !== '-' ? c.instructorName : 'No Instructor'})`
          ).join('\n');
          
          row.push(courseNames);
        });
        
        excelData.push(row);
      }
      
      // Create worksheet
      const ws = XLSX.utils.aoa_to_sheet(excelData);
      
      // Set column widths
      ws['!cols'] = [
        { wch: 10 }, // Time column
        ...Array(7).fill({ wch: 25 }) // Day columns
      ];
      
      // Create workbook and export
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Weekly Timetable");
      
      // Generate filename with current week
      const today = new Date();
      const fileName = `Weekly_Timetable_${today.toISOString().split('T')[0]}.xlsx`;
      
      XLSX.writeFile(wb, fileName);
      
      toast.success("Timetable exported to Excel!");
    } catch (error) {
      console.error("Excel export error:", error);
      toast.error("Failed to export Excel file");
    }
  };

  // PDF Export Function
  const handleExportPDF = async () => {
    try {
      toast.info("Generating PDF... Please wait");
      
      // Get the timetable element
      const element = document.getElementById('timetable-print');
      
      if (!element) {
        toast.error("Timetable element not found");
        return;
      }
      
      // Use html2canvas to capture the element
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        onclone: (document) => {
          // Hide non-print elements in the cloned document
          const noPrintElements = document.querySelectorAll('.no-print');
          noPrintElements.forEach(el => {
            el.style.display = 'none';
          });
        }
      });
      
      // Convert canvas to image
      const imgData = canvas.toDataURL('image/png');
      const imgWidth = 210; // A4 width in mm
      const pageHeight = 297; // A4 height in mm
      const imgHeight = canvas.height * imgWidth / canvas.width;
      
      // Create PDF
      const pdf = new jsPDF('landscape', 'mm', 'a4');
      
      // Calculate how many pages needed
      let heightLeft = imgHeight;
      let position = 0;
      
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
      
      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage('a4', 'landscape');
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }
      
      // Generate filename
      const today = new Date();
      const fileName = `Weekly_Timetable_${today.toISOString().split('T')[0]}.pdf`;
      
      // Save PDF
      pdf.save(fileName);
      
      toast.success("Timetable exported to PDF!");
    } catch (error) {
      console.error("PDF export error:", error);
      toast.error("Failed to export PDF file");
    }
  };

  return (
    <div className="container py-4">
      <h2 className="mb-4 text-primary fw-bold border-bottom pb-2">Register Course</h2>

      <form onSubmit={handleCreate} className="p-4 bg-body shadow-sm rounded border mb-5">
        <div className="row g-4">
          <div className="col-md-6">
            <label className="form-label fw-semibold">Course Name *</label>
            <input
              type="text"
              name="courseName"
              value={newCourse.courseName}
              onChange={handleChange}
              className="form-control shadow-sm"
              required
            />
          </div>
          <div className="col-md-6">
            <label className="form-label fw-semibold">Day of Week *</label>
            <select
              name="dayOfWeek"
              value={newCourse.dayOfWeek}
              onChange={handleChange}
              className="form-select shadow-sm"
              required
            >
              <option value="">-- Select Day --</option>
              {["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"].map(day => (
                <option key={day} value={day}>{capitalize(day)}</option>
              ))}
            </select>
          </div>
          <div className="col-md-6">
            <label className="form-label fw-semibold">Time From *</label>
            <input
              type="time"
              name="timeFrom"
              value={newCourse.timeFrom}
              onChange={handleChange}
              className="form-control shadow-sm"
              required
            />
          </div>
          <div className="col-md-6">
            <label className="form-label fw-semibold">Time To *</label>
            <input
              type="time"
              name="timeTo"
              value={newCourse.timeTo}
              onChange={handleChange}
              className="form-control shadow-sm"
              required
            />
          </div>
          <div className="col-md-6">
            <label className="form-label fw-semibold">Course Type</label>
            <select
              name="courseType"
              value={newCourse.courseType}
              onChange={handleChange}
              className="form-select shadow-sm"
            >
              <option value="Monthly">Monthly</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div className="col-md-6">
            <label className="form-label fw-semibold">Instructor (Optional)</label>
            <select
              name="instructor"
              value={newCourse.instructor}
              onChange={handleChange}
              className="form-select shadow-sm"
            >
              <option value="">-- Select --</option>
              {instructors.map(ins => (
                <option key={ins._id} value={ins._id}>{ins.name}</option>
              ))}
            </select>
          </div>
          <div className="col-md-6">
            <label className="form-label fw-semibold">Course Start Date *</label>
            <input
              type="date"
              name="courseStartDate"
              value={newCourse.courseStartDate}
              onChange={handleChange}
              className="form-control shadow-sm"
              required
            />
          </div>
          <div className="col-md-6">
            <label className="form-label fw-semibold">Course End Date (Optional)</label>
            <input
              type="date"
              name="courseEndDate"
              value={newCourse.courseEndDate}
              onChange={handleChange}
              className="form-control shadow-sm"
              min={newCourse.courseStartDate || undefined} // optional: prevent end < start
            />
          </div>
          <div className="col-md-6">
            <label className="form-label fw-semibold">Course Fees (Optional)</label>
            <input
              type="number"
              name="courseFees"
              value={newCourse.courseFees}
              onChange={handleChange}
              className="form-control shadow-sm"
              min="0"
              step="0.01"
              placeholder="e.g. 150.50"
            />
          </div>
          <div className="col-md-12">
            <label className="form-label fw-semibold">Description</label>
            <textarea
              name="description"
              value={newCourse.description}
              onChange={handleChange}
              className="form-control shadow-sm"
              rows="3"
            />
          </div>
          <div className="col-12 pt-2">
            <button type="submit" className="btn btn-success w-100 py-2 fs-5">
              ✅ Register Course
            </button>
          </div>
        </div>
      </form>

      {/* Edit Modal */}
      {editingCourse && (
        <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: "rgba(0,0,0,0.5)" }}>
          <div className="modal-dialog">
            <div className="modal-content border-0 shadow-lg">
              <div className="modal-header bg-primary text-white">
                <h5 className="modal-title">✏️ Edit Course</h5>
                <button
                  className="btn-close btn-close-white"
                  onClick={() => setEditingCourse(null)}
                />
              </div>
              <div className="modal-body">
                <form onSubmit={handleUpdate}>
                  <div className="mb-3">
                    <label className="form-label fw-semibold">Course Name *</label>
                    <input
                      type="text"
                      name="courseName"
                      value={editData.courseName}
                      onChange={handleEditChange}
                      className="form-control shadow-sm"
                      required
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label fw-semibold">Day of Week *</label>
                    <select
                      name="dayOfWeek"
                      value={editData.dayOfWeek}
                      onChange={handleEditChange}
                      className="form-select shadow-sm"
                      required
                    >
                      <option value="">-- Select Day --</option>
                      {["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"].map(day => (
                        <option key={day} value={day}>{capitalize(day)}</option>
                      ))}
                    </select>
                  </div>
                  <div className="mb-3">
                    <label className="form-label fw-semibold">Time From *</label>
                    <input
                      type="time"
                      name="timeFrom"
                      value={editData.timeFrom}
                      onChange={handleEditChange}
                      className="form-control shadow-sm"
                      required
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label fw-semibold">Time To *</label>
                    <input
                      type="time"
                      name="timeTo"
                      value={editData.timeTo}
                      onChange={handleEditChange}
                      className="form-control shadow-sm"
                      required
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label fw-semibold">Course Type</label>
                    <select
                      name="courseType"
                      value={editData.courseType}
                      onChange={handleEditChange}
                      className="form-select shadow-sm"
                    >
                      <option value="Monthly">Monthly</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div className="mb-3">
                    <label className="form-label fw-semibold">Course Start Date</label>
                    <input
                      type="date"
                      name="courseStartDate"
                      value={editData.courseStartDate}
                      onChange={handleEditChange}
                      className="form-control shadow-sm"
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label fw-semibold">Course End Date (Optional)</label>
                    <input
                      type="date"
                      name="courseEndDate"
                      value={editData.courseEndDate}
                      onChange={handleEditChange}
                      className="form-control shadow-sm"
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label fw-semibold">Course Fees (Optional)</label>
                    <input
                      type="number"
                      name="courseFees"
                      value={editData.courseFees}
                      onChange={handleEditChange}
                      className="form-control shadow-sm"
                      min="0"
                      step="0.01"
                      placeholder="e.g. 150.50"
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label fw-semibold">Instructor</label>
                    <select
                      name="instructor"
                      value={editData.instructor}
                      onChange={handleEditChange}
                      className="form-select shadow-sm"
                    >
                      <option value="">-- Select --</option>
                      {instructors.map(ins => (
                        <option key={ins._id} value={ins._id}>{ins.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="mb-3">
                    <label className="form-label fw-semibold">Description</label>
                    <textarea
                      name="description"
                      value={editData.description}
                      onChange={handleEditChange}
                      className="form-control shadow-sm"
                      rows="2"
                    />
                  </div>
                  <div className="d-flex justify-content-end gap-2 mt-4">
                    <button
                      type="button"
                      className="btn btn-outline-secondary"
                      onClick={() => setEditingCourse(null)}
                    >
                      Cancel
                    </button>
                    <button type="submit" className="btn btn-success">
                      💾 Save Changes
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filter & Table */}
      <div className="container py-4">
        <div className="d-flex justify-content-between align-items-center mb-2 flex-wrap gap-2">
          <h4 className="text-secondary mb-0">📋 Registered Courses</h4>
          <div className="d-flex gap-2">
            <button
              className="btn btn-outline-secondary"
              onClick={() => setShowFilter((prev) => !prev)}
            >
              <i className="bi bi-funnel me-1"></i> Filter
            </button>
            <button
              className={`btn ${showPastCourses ? 'btn-primary' : 'btn-outline-secondary'}`}
              onClick={() => setShowPastCourses(!showPastCourses)}
            >
              {showPastCourses ? '✅ Hide Past Courses' : '🕒 Show Past Courses'}
            </button>
            <button
              className="btn btn-info text-white"
              onClick={() => setShowTimetableModal(true)}
            >
              <i className="bi bi-calendar-week me-1"></i> Weekly Timetable
            </button>
          </div>
        </div>

        {showFilter && (
          <div ref={filterRef} className="sticky-top bg-body border-bottom p-3 mb-3 shadow-sm rounded border" style={{ zIndex: 20 }}>
            <div className="row g-2 align-items-end">
              <div className="col-12 col-md-4">
                <label className="form-label fw-semibold mb-1">Search</label>
                <input
                  type="search"
                  className="form-control shadow-sm"
                  placeholder="Search anything..."
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                />
              </div>
              <div className="col-6 col-md-4">
                <label className="form-label fw-semibold mb-1">Sort by</label>
                <select
                  className="form-select shadow-sm"
                  value={sortColumn}
                  onChange={(e) => setSortColumn(e.target.value)}
                >
                  {columns.map((col) => (
                    <option key={col.key} value={col.key}>
                      {col.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-6 col-md-3">
                <label className="form-label fw-semibold mb-1">Day of Week</label>
                <select
                  className="form-select shadow-sm"
                  value={filterDay}
                  onChange={(e) => setFilterDay(e.target.value)}
                >
                  <option value="">All Days</option>
                  <option value="monday">Monday</option>
                  <option value="tuesday">Tuesday</option>
                  <option value="wednesday">Wednesday</option>
                  <option value="thursday">Thursday</option>
                  <option value="friday">Friday</option>
                  <option value="saturday">Saturday</option>
                  <option value="sunday">Sunday</option>
                </select>
              </div>
              <div className="col-6 col-md-4">
                <label className="form-label fw-semibold mb-1">Order</label>
                <select
                  className="form-select shadow-sm"
                  value={sortDirection}
                  onChange={(e) => setSortDirection(e.target.value)}
                >
                  <option value="asc">A → Z</option>
                  <option value="desc">Z → A</option>
                </select>
              </div>
            </div>
            <div className="mt-2 text-muted small">
              Showing <strong>{processedCourses.length}</strong> courses
            </div>
          </div>
        )}

        {loading ? (
          <div className="text-center py-4">
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
            <p className="mt-2 text-muted">Loading courses...</p>
          </div>
        ) : (
          <div className="table-responsive shadow-sm rounded border">
            <table className="table table-hover align-middle text-center mb-0">
              <thead>
                <tr>
                  <th>Course</th>
                  <th>Day</th>
                  <th>Time</th>
                  <th>Type</th>
                  <th>Instructor</th>
                  <th>Start Date</th>
                  <th>Fees</th>
                  <th className="text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {processedCourses.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="text-center text-muted py-4">
                      No courses found
                    </td>
                  </tr>
                ) : (
                  processedCourses.map((c) => (
                    <tr key={c._id}>
                      <td className="align-middle">{c.courseName}</td>
                      <td className="align-middle">{capitalize(c.dayOfWeek)}</td>
                      <td className="align-middle">{c.timeFrom} – {c.timeTo}</td>
                      <td className="align-middle">{capitalize(c.courseType)}</td>
                      <td className="align-middle">{c.instructorName}</td>
                      <td className="align-middle">{formatDate(c.courseStartDate)}</td>
                      <td className="align-middle">{c.courseFees ? `Rs. ${c.courseFees}` : "—"}</td>
                      <td className="align-middle">
                        <div className="d-flex flex-column gap-2">
                          <button
                            className="btn btn-sm btn-success d-flex align-items-center justify-content-center"
                            onClick={() => {
                              setSelectedCourseForEnroll({ _id: c._id, courseName: c.courseName });
                              setSelectedStudentIds(new Set());
                              setEnrollmentDates({ startDate: "", endDate: "" });
                              fetchAllStudents();
                              setShowEnrollModal(true);
                            }}
                          >
                            <i className="bi bi-person-plus me-1"></i> Enroll
                          </button>
                          <button
                            className="btn btn-sm btn-warning d-flex align-items-center justify-content-center"
                            onClick={async () => {
                              setSelectedCourseForUnenroll({ _id: c._id, courseName: c.courseName });
                              setSelectedUnenrollStudentIds(new Set());
                              await fetchEnrolledStudents(c._id);
                              setShowUnenrollModal(true);
                            }}
                          >
                            <i className="bi bi-people me-1"></i> Manage
                          </button>
                          <button
                            className="btn btn-sm btn-primary d-flex align-items-center justify-content-center"
                            onClick={() => openEditModal(c)}
                          >
                            <i className="bi bi-pencil-square me-1"></i> Edit
                          </button>
                          {/* <button
                            className="btn btn-sm btn-danger d-flex align-items-center justify-content-center"
                            onClick={() => handleDelete(c._id)}
                          >
                            <i className="bi bi-trash me-1"></i> Delete
                          </button> */}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Enroll Students Modal */}
        {showEnrollModal && (
          <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: "rgba(0,0,0,0.5)" }}>
            <div className="modal-dialog modal-lg">
              <div className="modal-content">
                <div className="modal-header bg-success text-white">
                  <h5>Enroll Students in "{selectedCourseForEnroll?.courseName}"</h5>
                  <button
                    className="btn-close btn-close-white"
                    onClick={() => setShowEnrollModal(false)}
                  />
                </div>
                <div className="modal-body">
                  {/* Date Inputs (Optional) */}
                  <div className="row mb-3">
                    <div className="col-md-6">
                      <label className="form-label">Start Date (Optional)</label>
                      <input
                        type="date"
                        className="form-control"
                        value={enrollmentDates.startDate}
                        onChange={(e) => setEnrollmentDates({ ...enrollmentDates, startDate: e.target.value })}
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">End Date (Optional)</label>
                      <input
                        type="date"
                        className="form-control"
                        value={enrollmentDates.endDate}
                        onChange={(e) => setEnrollmentDates({ ...enrollmentDates, endDate: e.target.value })}
                      />
                    </div>
                  </div>

                  {/* Student List */}
                  <h6>Select Students:</h6>
                  {loadingStudents ? (
                    <p>Loading students...</p>
                  ) : allStudents.length === 0 ? (
                    <p className="text-muted">No students available.</p>
                  ) : (
                    <div className="list-group" style={{ maxHeight: "300px", overflowY: "auto" }}>
                      {allStudents.map((student) => (
                        <div key={student._id} className="list-group-item d-flex align-items-center">
                          <input
                            type="checkbox"
                            className="form-check-input me-2"
                            id={`student-${student._id}`}
                            checked={selectedStudentIds.has(student._id)}
                            onChange={(e) => {
                              const newSet = new Set(selectedStudentIds);
                              if (e.target.checked) {
                                newSet.add(student._id);
                              } else {
                                newSet.delete(student._id);
                              }
                              setSelectedStudentIds(newSet);
                            }}
                          />
                          <label className="form-check-label flex-grow-1" htmlFor={`student-${student._id}`}>
                            <strong>{student.initials} {student.firstname} {(student.surname || student.surname=="") ? (student.surname) : (student.secondName)}</strong> ({student.studentId})
                          </label>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setShowEnrollModal(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="btn btn-success"
                    disabled={selectedStudentIds.size === 0}
                    onClick={handleBulkEnroll}
                  >
                    Enroll {selectedStudentIds.size} Student(s)
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Unenroll / Manage Enrollments Modal */}
        {showUnenrollModal && (
          <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: "rgba(0,0,0,0.5)" }}>
            <div className="modal-dialog modal-lg">
              <div className="modal-content">
                <div className="modal-header bg-warning text-dark">
                  <h5>Enrolled Students – "{selectedCourseForUnenroll?.courseName}"</h5>
                  <button
                    className="btn-close"
                    onClick={() => setShowUnenrollModal(false)}
                  />
                </div>
                <div className="modal-body">
                  {loadingEnrolled ? (
                    <p>Loading enrolled students...</p>
                  ) : enrolledStudents.length === 0 ? (
                    <p className="text-muted">No students enrolled in this course.</p>
                  ) : (
                    <>
                      <p>Select students to unenroll:</p>
                      <div className="list-group" style={{ maxHeight: "300px", overflowY: "auto" }}>
                        {enrolledStudents.map((student) => (
                          <div key={student._id} className="list-group-item d-flex align-items-center">
                            <input
                              type="checkbox"
                              className="form-check-input me-2"
                              id={`unenroll-${student._id}`}
                              checked={selectedUnenrollStudentIds.has(student._id)}
                              onChange={(e) => {
                                const newSet = new Set(selectedUnenrollStudentIds);
                                if (e.target.checked) {
                                  newSet.add(student._id);
                                } else {
                                  newSet.delete(student._id);
                                }
                                setSelectedUnenrollStudentIds(newSet);
                              }}
                            />
                            <label className="form-check-label flex-grow-1" htmlFor={`unenroll-${student._id}`}>
                              <strong>{student.initials} {student.firstname} {(student.surname || student.surname=="") ? (student.surname) : (student.secondName)}</strong> ({student.studentId})
                              {student.startDate && (
                                <span className="text-muted ms-2">
                                  From: {new Date(student.startDate).toLocaleDateString()}
                                </span>
                              )}
                              {student.endDate && (
                                <span className="text-muted ms-2">
                                  To: {new Date(student.endDate).toLocaleDateString()}
                                </span>
                              )}
                            </label>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setShowUnenrollModal(false)}
                  >
                    Close
                  </button>
                  <button
                    type="button"
                    className="btn btn-danger"
                    disabled={selectedUnenrollStudentIds.size === 0}
                    onClick={handleBulkUnenroll}
                  >
                    Unenroll {selectedUnenrollStudentIds.size} Student(s)
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      {/* Weekly Timetable Modal */}
      {showTimetableModal && (
        <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: "rgba(0,0,0,0.5)" }}>
          <div className="modal-dialog modal-xl">
            <div className="modal-content">
              <div className="modal-header bg-info text-white">
                <h5 className="modal-title">
                  <i className="bi bi-calendar-week me-2"></i>
                  Weekly Timetable
                </h5>
                <button
                  className="btn-close btn-close-white"
                  onClick={() => setShowTimetableModal(false)}
                />
              </div>
              <div className="modal-body">
                {/* Print Styles */}
                <style>{printStyles}</style>
                
                {/* Loading Indicator */}
                {loadingReschedules && (
                  <div className="alert alert-info">
                    <i className="bi bi-hourglass-split me-2"></i>
                    Loading rescheduled sessions...
                  </div>
                )}
                
                {/* Timetable Content - Add ID for printing */}
                <div id="timetable-print">
                  <div className="table-responsive">
                    <table className="table table-bordered table-hover">
                      <thead className="table-light">
                        <tr>
                          <th style={{ width: '120px', verticalAlign: 'middle' }}>Time</th>
                          {getWeekDates().map(({ day, formatted }) => (
                            <th key={day} className="text-center" style={{ minWidth: '180px' }}>
                              <div className="fw-bold text-capitalize">{day}</div>
                              <div className="text-muted small">{formatted}</div>
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {/* Generate time slots from 8:00 AM to 8:00 PM */}
                        {Array.from({ length: 25 }, (_, i) => {
                          const hour = Math.floor(8 + i / 2);
                          const minute = i % 2 === 0 ? '00' : '30';
                          const timeSlot = `${hour.toString().padStart(2, '0')}:${minute}`;
                          
                          return (
                            <tr key={timeSlot}>
                              <td className="fw-semibold bg-light">{timeSlot}</td>
                              {getWeekDates().map(({ day }) => {
                                const { timetable } = organizeTimetable();
                                const courses = timetable[day] || [];
                                
                                // Find courses that overlap with this time slot
                                const overlappingCourses = courses.filter(course => {
                                  if (!course.timeFrom || !course.timeTo) return false;
                                  
                                  const slotTime = new Date();
                                  slotTime.setHours(parseInt(timeSlot.split(':')[0]), parseInt(timeSlot.split(':')[1]));
                                  
                                  const courseStart = new Date();
                                  const [startHour, startMin] = course.timeFrom.split(':');
                                  courseStart.setHours(parseInt(startHour), parseInt(startMin));
                                  
                                  const courseEnd = new Date();
                                  const [endHour, endMin] = course.timeTo.split(':');
                                  courseEnd.setHours(parseInt(endHour), parseInt(endMin));
                                  
                                  // Check if time slot is within course duration
                                  return slotTime >= courseStart && slotTime < courseEnd;
                                });
                                
                                return (
                                  <td key={day} className="align-middle" style={{ backgroundColor: overlappingCourses.length > 0 ? '#e3f2fd' : 'inherit' }}>
                                    {overlappingCourses.map((course, idx) => {
                                      const rescheduleInfo = formatRescheduleInfo(course);
                                      
                                      return (
                                        <div
                                          key={idx}
                                          className={`p-2 mb-2 rounded border ${
                                            course.isRescheduled 
                                              ? 'bg-warning text-dark border-warning' 
                                              : 'bg-primary text-white border-primary'
                                          }`}
                                          style={{ 
                                            cursor: 'pointer',
                                            position: 'relative',
                                            borderLeftWidth: '4px',
                                            borderLeftStyle: 'solid'
                                          }}
                                          onClick={() => openEditModal(course)}
                                        >
                                          {/* Reschedule Badge */}
                                          {course.isRescheduled && (
                                            <div className="position-absolute top-0 end-0 translate-middle badge bg-danger">
                                              <i className="bi bi-calendar2-x"></i>
                                            </div>
                                          )}
                                          
                                          <div className="fw-bold">
                                            {course.courseName}
                                            {course.isRescheduled && (
                                              <span className="ms-2">
                                                <i className="bi bi-arrow-right-circle text-danger"></i>
                                              </span>
                                            )}
                                          </div>
                                          
                                          <div className="small mt-1">
                                            <i className="bi bi-clock me-1"></i>
                                            {formatTimeRange(course.timeFrom, course.timeTo)}
                                          </div>
                                          
                                          <div className="small mt-1">
                                            <i className="bi bi-person-circle me-1"></i>
                                            {course.instructorName !== '-' ? course.instructorName : 'No Instructor'}
                                          </div>
                                          
                                          {/* Show original date for rescheduled sessions */}
                                          {course.isRescheduled && rescheduleInfo && (
                                            <div className="small mt-1 text-dark">
                                              <i className="bi bi-calendar2-minus me-1"></i>
                                              Was: {rescheduleInfo.originalDate}
                                            </div>
                                          )}
                                          
                                          {/* Show reason if available */}
                                          {course.isRescheduled && course.rescheduleReason && (
                                            <div className="small mt-1 text-dark">
                                              <i className="bi bi-info-circle me-1"></i>
                                              {course.rescheduleReason}
                                            </div>
                                          )}
                                          
                                          {course.courseType && (
                                            <div className="mt-2">
                                              <span className={`badge ${
                                                course.isRescheduled ? 'bg-light text-warning' : 'bg-light text-primary'
                                              }`}>
                                                {capitalize(course.courseType)}
                                                {course.isRescheduled && ' (Rescheduled)'}
                                              </span>
                                            </div>
                                          )}
                                        </div>
                                      );
                                    })}
                                  </td>
                                );
                              })}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  
                  {/* Legend */}
                  <div className="mt-4 p-3 bg-light rounded">
                    <h6 className="mb-3">Legend:</h6>
                    <div className="d-flex flex-wrap gap-4">
                      <div className="d-flex align-items-center">
                        <div className="bg-primary text-white p-2 rounded me-2" style={{ width: '20px', height: '20px' }}></div>
                        <span>Regular Session</span>
                      </div>
                      <div className="d-flex align-items-center">
                        <div className="bg-warning text-dark p-2 rounded me-2" style={{ width: '20px', height: '20px' }}></div>
                        <span>Rescheduled Session</span>
                      </div>
                      <div className="d-flex align-items-center">
                        <div className="bg-light border p-2 rounded me-2" style={{ width: '20px', height: '20px' }}></div>
                        <span>No Session</span>
                      </div>
                      <div className="d-flex align-items-center">
                        <span className="badge bg-danger me-2">
                          <i className="bi bi-calendar2-x"></i>
                        </span>
                        <span>Reschedule Indicator</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Rescheduled Sessions Summary */}
                  {rescheduledSessions.length > 0 && (
                    <div className="mt-4 p-3 bg-info bg-opacity-10 rounded border border-info">
                      <h6 className="mb-3">
                        <i className="bi bi-calendar2-week me-2"></i>
                        Rescheduled Sessions This Week
                      </h6>
                      <div className="table-responsive">
                        <table className="table table-sm table-bordered">
                          <thead className="table-light">
                            <tr>
                              <th>Course</th>
                              <th>Original Date</th>
                              <th>New Date</th>
                              <th>Reason</th>
                            </tr>
                          </thead>
                          <tbody>
                            {rescheduledSessions
                              .filter(rs => {
                                const newDate = new Date(rs.newDate);
                                const weekStart = getWeekDates()[0].date;
                                const weekEnd = getWeekDates()[6].date;
                                return newDate >= weekStart && newDate <= weekEnd;
                              })
                              .map((rs, idx) => (
                                <tr key={idx}>
                                  <td className="fw-semibold">{rs.course?.courseName || 'Unknown'}</td>
                                  <td>{new Date(rs.originalDate).toLocaleDateString('en-GB')}</td>
                                  <td className="text-success fw-bold">
                                    {new Date(rs.newDate).toLocaleDateString('en-GB')}
                                  </td>
                                  <td>{rs.reason || '—'}</td>
                                </tr>
                              ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary no-print"
                  onClick={() => setShowTimetableModal(false)}
                >
                  Close
                </button>
                <button
                  type="button"
                  className="btn btn-primary no-print"
                  onClick={handlePrintTimetable}
                >
                  <i className="bi bi-printer me-1"></i> Print
                </button>
                <button
                  type="button"
                  className="btn btn-success no-print"
                  onClick={handleExportExcel}
                >
                  <i className="bi bi-file-earmark-excel me-1"></i> Excel
                </button>
                <button
                  type="button"
                  className="btn btn-danger no-print"
                  onClick={handleExportPDF}
                >
                  <i className="bi bi-file-earmark-pdf me-1"></i> PDF
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      <ToastContainer />
    </div>
  );
};

export default CourseRegistration;