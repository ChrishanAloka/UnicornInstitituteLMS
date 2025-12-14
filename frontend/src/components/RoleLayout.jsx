// RoleLayout.jsx
import React, { useState, useEffect, useRef } from "react";
import { Outlet, Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "./ProtectedRoute";
import useTokenCountdown from "../hooks/useTokenCountdown";
import {
  FaBars, FaSignOutAlt, FaTachometerAlt, FaUsers, FaKey, FaFileInvoice,
  FaChartBar, FaUserTie, FaCalendarCheck, FaTruck, FaMoneyBillWave,
  FaMoneyCheckAlt, FaUtensils, FaDollarSign, FaShoppingCart, FaHistory,
  FaBookOpen, FaClipboardList, FaUserCircle, FaPercentage, FaTruckLoading, 
  FaFirstOrder, FaMotorcycle, FaUserClock, FaCashRegister, FaBookReader,
  FaCoins, FaWallet, FaPrint, FaUserTag, FaBell, FaSearch, FaTimes, FaMoon, FaSun,
  FaUserGraduate,FaChalkboardTeacher,FaBook, FaUserCheck,FaUserPlus, FaChartLine, FaMoneyCheckAlt as FaPayment,
} from "react-icons/fa";
import NotificationCenter from "./NotificationCenter";
import "./AppleRoleLayout.css";

const RoleLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [userDropdown, setUserDropdown] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('darkMode');
    return saved ? JSON.parse(saved) : false;
  });
  
  const { user, logout } = useAuth();
  const countdown = useTokenCountdown();
  const location = useLocation();
  const navigate = useNavigate();
  const dropdownRef = useRef();
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);
      if (!mobile) setSidebarOpen(false);
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setUserDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Apply dark mode class to body
  useEffect(() => {
    if (darkMode) {
      document.body.classList.add('dark-mode');
    } else {
      document.body.classList.remove('dark-mode');
    }
    localStorage.setItem('darkMode', JSON.stringify(darkMode));
  }, [darkMode]);

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
  };

  const toggleSidebarCollapse = () => {
    if (!isMobile) {
      setSidebarCollapsed(!sidebarCollapsed);
    }
  };

  const LevelIcon = ({ level }) => (
    <span className="level-icon-apple">L{level}</span>
  );

  const ActivityIcon = ({ level }) => (
    <span className="level-icon-apple">A{level}</span>
  );

  const L1Icon = () => <LevelIcon level={1} />;
  const L2Icon = () => <LevelIcon level={2} />;
  const L3Icon = () => <ActivityIcon level={3} />;
  const L4Icon = () => <LevelIcon level={4} />;
  const L5Icon = () => <LevelIcon level={5} />;

  const getMenuItems = () => {
    switch (user?.role) {
      case "admin":
        return [
          { to: "/admin", label: "Dashboard", icon: FaTachometerAlt },
          { to: "/cashier/today", label: "Daily Report", icon: FaBookOpen },
          { to: "/cashier", label: "Order Management", icon: FaCashRegister },
          { to: "/kitchen/menu", label: "Manage Menu", icon: FaClipboardList },
          { to: "/kitchen", label: "Live Orders", icon: FaShoppingCart },
          { to: "/cashier/orders", label: "Order History", icon: FaHistory },
          { to: "/cashier/takeaway-orders", label: "Takeaway Orders", icon: FaFirstOrder },
          { to: "/cashier-summery", label: "Cashier Summery", icon: FaBookReader },
          { divider: true },
          { to: "/admin/users", label: "User Management", icon: FaUsers },
          { to: "/admin/report", label: "Monthly Report", icon: FaChartBar },
          { to: "/admin/customers", label: "Customers", icon: FaUserTag },
          { to: "/admin/employees", label: "Employees", icon: FaUserTie },
          { divider: true },
          { to: "/kitchen/attendance/add", label: "Live Attendance", icon: FaUserClock },
          { to: "/admin/attendance", label: "Attendance History", icon: FaCalendarCheck },
          { to: "/cashier/driver-register", label: "Takeaway Driver Register", icon: FaMotorcycle },
          { to: "/admin/suppliers", label: "Suppliers Register", icon: FaTruck },
          { to: "/admin/expenses", label: "Supplier Expenses", icon: FaMoneyBillWave },
          { to: "/cashier/other-income", label: "Other Incomes", icon: FaCoins },
          { to: "/cashier/other-expences", label: "Other Expences", icon: FaWallet },
          { to: "/admin/bills", label: "Restaurant Bills", icon: FaFileInvoice },
          { to: "/admin/salaries", label: "Salary Payments", icon: FaMoneyCheckAlt },
          { to: "/admin/service-charge", label: "Service Charge", icon: FaPercentage },
          { to: "/admin/delivery-charges", label: "Delivery Charge", icon: FaTruckLoading },
          { to: "/printer-settings", label: "Printer Settings", icon: FaPrint },
          { to: "/admin/signup-key", label: "Signup Key", icon: FaKey },
          { to: "/admin/currency", label: "Currency", icon: FaDollarSign }
        ];
      case "cashier":
        return [
          { to: "/cashier", label: "Order Management", icon: FaCashRegister },
          { to: "/kitchen/menu", label: "Manage Menu", icon: FaClipboardList },
          { to: "/kitchen", label: "Live Orders", icon: FaShoppingCart },
          { to: "/cashier/orders", label: "Order History", icon: FaHistory },
          { to: "/cashier/takeaway-orders", label: "Takeaway Orders", icon: FaFirstOrder },
          { to: "/cashier/today", label: "Daily Report", icon: FaBookOpen },
          { to: "/cashier-summery", label: "Cashier Summery", icon: FaBookReader },
          { to: "/cashier/other-income", label: "Other Incomes", icon: FaCoins },
          { to: "/cashier/other-expences", label: "Other Expences", icon: FaWallet },
          { to: "/cashier/driver-register", label: "Driver Register", icon: FaMotorcycle },
          { to: "/kitchen/kitchen-requestsForm", label: "Admin Requests", icon: FaUtensils },
          { to: "/kitchen/attendance/add", label: "Live Attendance", icon: FaUserClock },
          { to: "/printer-settings", label: "Printer Settings", icon: FaPrint }
        ];
      case "kitchen":
        return [
          { to: "/kitchen", label: "Live Orders", icon: FaShoppingCart },
          { to: "/kitchen/history", label: "Order History", icon: FaHistory },
          { to: "/kitchen/menu", label: "Manage Menu", icon: FaClipboardList },
          { to: "/kitchen/kitchen-requestsForm", label: "Admin Requests", icon: FaUtensils },
          { to: "/kitchen/attendance/add", label: "Attendance", icon: FaUserClock }
        ];
      case "user":
        return [
          { to: "/user", label: "Student Registration", icon: FaUserGraduate },
          { to: "/user/comp-Level1", label: "Instructor Registration", icon: FaChalkboardTeacher },
          { to: "/user/comp-Level2", label: "Course Registration", icon: FaBook },
          { to: "/user/comp-Level3", label: "Mark Attendance", icon: FaUserCheck },
          { to: "/user/comp-Level4", label: "Student Profile", icon: FaUserPlus },
          { divider: true },
          { to: "/user/track-attendance", label: "Track Attendance", icon: FaChartLine },
          { to: "/user/track-payment", label: "Track Payments", icon: FaPayment }
          
        ];
      default:
        return [];
    }
  };

  const menuItems = getMenuItems();
  const filteredMenuItems = searchQuery
    ? menuItems.filter(item => !item.divider && item.label.toLowerCase().includes(searchQuery.toLowerCase()))
    : menuItems;

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <div className={`apple-layout ${darkMode ? 'dark-mode' : ''}`}>
      {/* Sidebar */}
      <aside className={`apple-sidebar ${sidebarOpen ? 'open' : ''} ${sidebarCollapsed ? 'collapsed' : ''}`}>
        {/* Logo Section */}
        <div className="apple-sidebar-header">
          <div className="apple-logo-wrapper">
            <img
              src="/logo.png"
              alt="Logo"
              className="apple-logo"
            />
            {!sidebarCollapsed && <span className="apple-logo-text">UNICORN INSTITUTE LMS</span>}
          </div>
          {/* {isMobile ? (
            <button onClick={() => setSidebarOpen(false)} className="apple-close-btn">
              <FaTimes />
            </button>
          ) : (
            <button onClick={toggleSidebarCollapse} className="apple-collapse-btn" title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}>
              <FaBars />
            </button>
          )} */}
        </div>

        {/* Search Bar */}
        {!sidebarCollapsed && (
          <div className="apple-search-container">
            <FaSearch className="apple-search-icon" />
            <input
              type="text"
              placeholder="Search menu..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="apple-search-input"
            />
          </div>
        )}

        {/* Menu Items */}
        <nav className="apple-nav">
          {filteredMenuItems.map((item, index) => {
            if (item.divider) {
              return !sidebarCollapsed && <div key={`divider-${index}`} className="apple-divider" />;
            }
            
            const Icon = item.icon;
            const isActive = location.pathname === item.to;
            
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`apple-menu-item ${isActive ? 'active' : ''}`}
                onClick={() => isMobile && setSidebarOpen(false)}
                title={sidebarCollapsed ? item.label : ''}
              >
                <Icon className="apple-menu-icon" />
                {!sidebarCollapsed && <span className="apple-menu-label">{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* User Info at Bottom */}
        <div className="apple-sidebar-footer">
          <div className="apple-user-info">
            <div className="apple-user-avatar">
              <FaUserCircle />
            </div>
            {!sidebarCollapsed && (
              <div className="apple-user-details">
                <div className="apple-user-name">{user?.name || 'User'}</div>
                <div className="apple-user-role">{user?.role}</div>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Overlay for mobile */}
      {isMobile && sidebarOpen && (
        <div className="apple-overlay" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Main Content */}
      <div className="apple-main-content">
        {/* Header */}
        <header className="apple-header">
          <div className="apple-header-left">
            <button onClick={() => isMobile ? setSidebarOpen(!sidebarOpen) : toggleSidebarCollapse()} className="apple-menu-button">
              <FaBars />
            </button>
            <div className="apple-session-timer">
              <span className="apple-timer-dot" />
              <span className="apple-timer-text">Session: {countdown}</span>
            </div>
          </div>

          <div className="apple-header-right">
            {/* Dark Mode Toggle */}
            <button 
              onClick={toggleDarkMode} 
              className="apple-theme-toggle"
              title={darkMode ? "Switch to light mode" : "Switch to dark mode"}
            >
              {darkMode ? <FaSun /> : <FaMoon />}
            </button>

            {/* Notifications */}
            <div className="apple-notification-wrapper">
              <NotificationCenter />
            </div>

            {/* User Dropdown */}
            <div ref={dropdownRef} className="apple-user-dropdown-container">
              <button
                onClick={() => setUserDropdown(!userDropdown)}
                className="apple-user-button"
              >
                <FaUserCircle />
                <span className="apple-user-button-text">{user?.role}</span>
              </button>
              {userDropdown && (
                <div className="apple-dropdown">
                  <button className="apple-dropdown-item" onClick={() => {
                    setUserDropdown(false);
                    // Add profile navigation if needed
                  }}>
                    <FaUserCircle className="apple-dropdown-icon" />
                    Profile
                  </button>
                  <div className="apple-dropdown-divider" />
                  <button className="apple-dropdown-item logout" onClick={handleLogout}>
                    <FaSignOutAlt className="apple-dropdown-icon" />
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="apple-page-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default RoleLayout;