// App.jsx
import React from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import PageTransition from "./components/PageTransition";

import Home from './components/Home';
import AdminLogin from './components/AdminLogin';
// import CashierLogin from './components/CashierLogin';
// import KitchenLogin from './components/KitchenLogin';

import Signup from './components/Signup';

// import Printersettings from "./components/PrinterSettings";
// import DeliveryCharges from "./components/DeliveryCharges";

// import KitchenLanding from "./components/KitchenLanding";
// import KitchenBills from "./components/KitchenBills";

// import KitchenOrderHistory from "./components/KitchenOrderHistory";

// import CashierLanding from "./components/CashierLanding";
// import CashierSummery from "./components/CashierSummery";
import ProtectedRoute from "./components/ProtectedRoute";

// import CashierOrderHistory from "./components/CashierOrderHistory";
// import CashierDashboard from "./components/CashierDashboard";

 // ✅ Import layout
import RoleLayout from "./components/RoleLayout";

// import MenuManagement from "./components/MenuManagement";
// import MonthlyReport from "./components/MonthlyReport";


// Admin Pages
// import AdminDashboard from "./components/AdminDashboard";   // ✅ Add
import AdminUsers from "./components/AdminUsers";           // ✅ Add
import AdminSignupKey from "./components/AdminSignupKey";   // ✅ Add

import Unauthorized from "./components/Unauthorized";

import ForgotPassword from "./components/ForgotPassword";
import ResetPassword from "./components/ResetPassword";

// import CurrencySettings from "./components/CurrencySettings";

import AdminEmployees from "./components/AdminEmployees";
// import CustomerList from "./components/CustomerList";

import AdminEmployeeRegister from "./components/AdminEmployeeRegister";
import AdminEmployeeEdit from "./components/AdminEmployeeEdit";

// import AttendanceDashboard from "./components/AttendanceDashboard";
// import AddAttendance from "./components/AddAttendance";

// import ReceiptView from "./components/ReceiptView";

// import SupplierRegistration from "./components/SupplierRegistration";
// import ExpensePage from "./components/ExpensePage";
// import SalaryPage from "./components/SalaryPage";

// import AdminKitchenRequests from "./components/AdminKitchenRequests";
// import KitchenRequestForm from "./components/KitchenRequestForm";

// import AdminServiceCharge from "./components/AdminServiceCharge";
// import AdminDeliveryCharge from "./components/AdminDeliveryCharge";
// import TakeawayOrdersPage from "./components/TakeawayOrdersPage";
// import RegisterDriverPage from "./components/RegisterDriverPage";

// import OtherExpenses from "./components/OtherExpenses";
// import OtherIncome from "./components/OtherIncome";

import UserLogin from './components/UserLogin';
// import MarkProgress from "./components/MarkProgress";
// import ComponentDetailsLevel1 from "./components/ComponentDetailsLevel1";
// import ComponentDetailsLevel2 from "./components/ComponentDetailsLevel2";
// import ComponentDetailsLevel3 from "./components/ComponentDetailsLevel3";
// import ComponentDetailsLevel4 from "./components/ComponentDetailsLevel4";
// import ComponentDetailsLevel5 from "./components/ComponentDetailsLevel5";

import StudentRegistration from "./components/StudentRegistration";
import InstructorRegistration from "./components/InstructorRegistration";
import CourseRegistration from "./components/CourseRegistration";
// import ClassTimetable from "./components/ClassTimetable";

import Attendance from "./components/Attendance";
import StudentProfile from "./components/StudentProfile";
import TrackPayment from "./components/TrackPayment";
import TrackAttendance from "./components/TrackAttendance";


<Route path="/unauthorized" element={<Unauthorized />} />

function App() {
  
  const location = useLocation(); // ⭐ Required for animations

  return (
    <AnimatePresence mode="wait">
      <PageTransition key={location.pathname}>
        <Routes location={location}>

          <Route path="/" element={<Home />} />
          <Route path="/admin-login" element={<AdminLogin />} />

          <Route path="/user-login" element={<UserLogin />} />

          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password/:token" element={<ResetPassword />} />
          
          <Route path="/signup" element={<Signup />} />
          <Route path="/unauthorized" element={<Unauthorized />} />
          
          <Route
            element={
              <ProtectedRoute allowedRoles={["admin"]}>
                <RoleLayout />  {/* Wrap inside layout */}
              </ProtectedRoute>
            }
          >
            <Route path="/admin/users" element={<AdminUsers />} />
            <Route path="/admin/signup-key" element={<AdminSignupKey />} />
            <Route path="/admin/employees" element={<AdminEmployees />} />
            
            <Route path="/admin/employee/new" element={<AdminEmployeeRegister />} />
            <Route path="/admin/employee/edit/:id" element={<AdminEmployeeEdit />} />

          </Route>
          
          <Route
            element={
              <ProtectedRoute allowedRoles={["user"]}>
                <RoleLayout />
              </ProtectedRoute>
            }
          >
            <Route path="/user" element={<StudentRegistration />} />
            <Route path="/user/comp-Level1" element={<InstructorRegistration />} />
            <Route path="/user/comp-Level2" element={<CourseRegistration />} />
            <Route path="/user/comp-Level3" element={<Attendance />} />
            <Route path="/user/comp-Level4" element={<StudentProfile />} />
            <Route path="/user/track-payment" element={<TrackPayment />} />
            <Route path="/user/track-attendance" element={<TrackAttendance />} />
            
          </Route>
          
        </Routes>
      </PageTransition>
    </AnimatePresence>
  );
}

export default App;