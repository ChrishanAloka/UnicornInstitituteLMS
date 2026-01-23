// backend/routes/authRoute.js

const express = require("express");
const router = express.Router();
const { signup, login, getUsers, getSignupKeys, generateSignupKey, deleteSignupKey, updateUserRole, deactivateUser, reactivateUser } = require("../controllers/authController");


const multer = require("multer");
const storage = multer.memoryStorage(); // For buffer upload
const upload = multer({ storage });

const authMiddleware = require("../middleware/authMiddleware");

const authController = require("../controllers/authController");

const studentController = require('../controllers/studentController');
const courseController = require('../controllers/courseController');
const instructorController = require('../controllers/instructorController');
const attendanceController = require("../controllers/attendanceController");
const rescheduledSessionController = require("../controllers/rescheduledSessionController");

// Public routes
router.post("/signup", signup);
router.post("/login", login);

// Protected route - Admin only
router.get("/users", authMiddleware(["admin"]), getUsers); // ✅ Now protected

// Protected routes - Admin only
router.get("/signup-keys", authMiddleware(["admin"]), getSignupKeys);
router.post("/generate-key", authMiddleware(["admin"]), generateSignupKey);
router.delete("/signup-key/:id", authMiddleware(["admin"]), deleteSignupKey);

// Role management
router.put("/user/:id/role", authMiddleware(["admin"]), updateUserRole);
router.put("/user/:id/deactivate", authMiddleware(["admin"]), deactivateUser);
router.put("/user/reactivate/:id", authMiddleware(["admin"]), reactivateUser);

router.post("/verify-reset-key", authController.verifyResetKey);
router.post("/reset-password", authController.resetPassword);

// All routes are protected
router.post('/students/register', authMiddleware(["admin", "user"]), studentController.registerStudent);
router.get('/students/', authMiddleware(["admin", "user"]), studentController.getStudents);
router.get('/students/registered/', authMiddleware(["admin", "user"]), studentController.getAllRegisterdStudents);
router.put('/students/:id', authMiddleware(["admin", "user"]), studentController.updateStudent);
router.delete('/students/:id', authMiddleware(["admin", "user"]), studentController.deleteStudent);
router.get('/students/search', authMiddleware(["admin", "user"]), studentController.searchStudent);
router.get('/students/:studentId/courses', authMiddleware(["admin", "user"]), studentController.getStudentWithCourses);
router.post('/students/enroll/:studentId', authMiddleware(["admin", "user"]), studentController.enrollStudent);
router.delete('/students/:studentId/unenroll/:enrollmentId', authMiddleware(["admin", "user"]), studentController.unenrollStudent);
router.get('/students/:studentId/payments', authMiddleware(["admin", "user"]), studentController.getStudentPayments);
router.post('/students/payments', authMiddleware(["admin", "user"]), studentController.createPayment);
router.put('/students/:studentId/enrollments/:enrollmentId', authMiddleware(["admin", "user"]), studentController.updateEnrollmentDates);
router.get('/students/recent', authMiddleware(["admin", "user"]), studentController.getRecentStudents);
router.get('/students/:id', authMiddleware(["admin", "user"]), studentController.getStudentById);


// Instructors
router.post('/instructor/register', authMiddleware(["admin", "user"]), instructorController.registerInstructor);
router.get('/instructor', authMiddleware(["admin", "user"]), instructorController.getInstructors);
router.put('/instructor/:id', authMiddleware(["admin", "user"]), instructorController.updateInstructor);
router.delete('/instructor/:id', authMiddleware(["admin", "user"]), instructorController.deleteInstructor);

// Courses
router.post('/course/register', authMiddleware(["admin", "user"]), courseController.registerCourse);
router.get('/course', authMiddleware(["admin", "user"]), courseController.getCourses);
router.put('/course/:id', authMiddleware(["admin", "user"]), courseController.updateCourse);
router.delete('/course/:id', authMiddleware(["admin", "user"]), courseController.deleteCourse);
router.get('/course/track-payments', authMiddleware(["admin", "user"]), courseController.getPaymentTracking);
router.get('/course/track-attendance', authMiddleware(["admin", "user"]), courseController.getAttendanceTracking);
router.get('/course/:id/students', authMiddleware(["admin", "user"]), courseController.getStudentsByCourse);


// Attendance Routes
router.post("/attendance/mark", authMiddleware(["admin", "user"]), attendanceController.markAttendance);
router.get("/attendance", authMiddleware(["admin", "user"]), attendanceController.getStudentWithCourses);

// Example route setup
router.post('/sessions/reschedule', authMiddleware(["admin", "user"]), rescheduledSessionController.createRescheduledSession);
router.get('/sessions/reschedule', authMiddleware(["admin", "user"]), rescheduledSessionController.getRescheduledSessions);
router.delete('/sessions/reschedule/:id', authMiddleware(["admin", "user"]), rescheduledSessionController.deleteRescheduledSession);

module.exports = router;