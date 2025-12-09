import React, { useState, useEffect, useRef } from "react";
import { Outlet, Link, useLocation } from "react-router-dom";
import { useAuth } from "./ProtectedRoute";
import useTokenCountdown from "../hooks/useTokenCountdown";
import {
  FaBars, FaSignOutAlt, FaTachometerAlt, FaUsers, FaKey, FaFileInvoice,
  FaChartBar, FaUserTie, FaCalendarCheck, FaTruck, FaMoneyBillWave,
  FaMoneyCheckAlt, FaUtensils, FaDollarSign, FaShoppingCart, FaHistory,
  FaBookOpen, FaClipboardList, FaUserCircle, FaPercentage, FaTruckLoading, 
  FaFirstOrder,FaMotorcycle,FaUserClock,FaCashRegister,FaBookReader,FaCoins,FaWallet,FaPrint,FaUserTag,
} from "react-icons/fa";
import "./Sidebar.css";
import NotificationCenter from "./NotificationCenter";

const RoleLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userDropdown, setUserDropdown] = useState(false);
  const { user, logout } = useAuth();
  const countdown = useTokenCountdown();
  const location = useLocation();
  const dropdownRef = useRef();
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [isHovered, setIsHovered] = useState(false);

  // Auto detect mobile view
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Close dropdown if clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setUserDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const isSidebarExpanded = sidebarOpen || (isHovered && !isMobile);

  const createMenuItem = (to, label, Icon) => {
    const isActive = location.pathname === to;
    return (
      <li title={!isSidebarExpanded ? label : ""} key={to}>
        <Link to={to} className={`menu-link ${isActive ? "active" : ""}`}>
          <Icon className="menu-icon" />
          {isSidebarExpanded && <span className="menu-label">{label}</span>}
        </Link>
      </li>
    );
  };

  const LevelIcon = ({ level }) => (
    <span className="level-icon" style={{
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: '25px',
      height: '20px',
      fontSize: '20px',
      fontWeight: 'bold',
      color: '#4a5568', // matches typical icon color
      borderRadius: '4px',
      backgroundColor: '#ffffffff',
      marginRight: '0px',
      marginLeft: '-3px'
    }}>
      L{level}
    </span>
  );

  const ActivityIcon = ({ level }) => (
    <span className="level-icon" style={{
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: '30px',
      height: '20px',
      fontSize: '20px',
      fontWeight: 'bold',
      color: '#4a5568', // matches typical icon color
      borderRadius: '4px',
      backgroundColor: '#ffffffff',
      marginRight: '0px',
      marginLeft: '-3px'
    }}>
      A{level}
    </span>
  );

  // Define pseudo-icon components
  const L1Icon = () => <LevelIcon level={1} />;
  const L2Icon = () => <LevelIcon level={2} />;
  const L3Icon = () => <ActivityIcon level={3} />;
  const L4Icon = () => <LevelIcon level={4} />;
  const L5Icon = () => <LevelIcon level={5} />;

  const renderSidebarMenu = () => {
    switch (user?.role) {
      case "admin":
        return (
          <>
            {createMenuItem("/admin", "Dashboard", FaTachometerAlt)}
            {createMenuItem("/cashier/today", "Daily Report", FaBookOpen)}
            {createMenuItem("/cashier", "Order Management", FaCashRegister)}
            {createMenuItem("/kitchen/menu", "Manage Menu", FaClipboardList)}
            {createMenuItem("/kitchen", "Live Orders", FaShoppingCart)}
            {createMenuItem("/cashier/orders", "Order History", FaHistory)}
            {createMenuItem("/cashier/takeaway-orders", "Takeaway Orders", FaFirstOrder)}
            {createMenuItem("/cashier-summery", "Cashier Summery", FaBookReader)}

            {createMenuItem("/admin/users", "User Management", FaUsers)}
            {createMenuItem("/admin/report", "Monthly Report", FaChartBar)}
            {createMenuItem("/admin/customers", "Custoemrs", FaUserTag)}
            {createMenuItem("/admin/employees", "Employees", FaUserTie)}
            
            {createMenuItem("/kitchen/attendance/add", "Live Attendance", FaUserClock)}
            {createMenuItem("/admin/attendance", "Attendance History", FaCalendarCheck)}
            {createMenuItem("/cashier/driver-register", "Takeaway Driver Register", FaMotorcycle)}
            {createMenuItem("/admin/suppliers", "Suppliers Register", FaTruck)}
            {createMenuItem("/admin/expenses", "Supplier Expenses", FaMoneyBillWave)}
            {createMenuItem("/cashier/other-income", "Other Incomes", FaCoins)}
            {createMenuItem("/cashier/other-expences", "Other Expences", FaWallet)}
            {createMenuItem("/admin/bills", "Restaurant Bills", FaFileInvoice)}            
            {createMenuItem("/admin/salaries", "Salary Payments", FaMoneyCheckAlt)}
            {createMenuItem("/admin/service-charge", "Service Charge", FaPercentage)}
            {createMenuItem("/admin/delivery-charges", "Delivery Charge", FaTruckLoading)}
            {createMenuItem("/printer-settings", "Printer Settings", FaPrint)}
            {createMenuItem("/admin/signup-key", "Signup Key", FaKey)}
            {createMenuItem("/admin/currency", "Currency", FaDollarSign)}
          </>
        );
      case "cashier":
        return (
          <>
            {createMenuItem("/cashier", "Order Management", FaCashRegister)}
            {createMenuItem("/kitchen/menu", "Manage Menu", FaClipboardList)}
            {createMenuItem("/kitchen", "Live Orders", FaShoppingCart)}
            {createMenuItem("/cashier/orders", "Order History", FaHistory)}
            {createMenuItem("/cashier/takeaway-orders", "Takeaway Orders", FaFirstOrder)}
            {createMenuItem("/cashier/today", "Daily Report", FaBookOpen)}
            {createMenuItem("/cashier-summery", "Cashier Summery", FaBookReader)}
            {createMenuItem("/cashier/other-income", "Other Incomes", FaCoins)}
            {createMenuItem("/cashier/other-expences", "Other Expences", FaWallet)}
            {createMenuItem("/cashier/driver-register", "Driver Register", FaMotorcycle)}
            {createMenuItem("/kitchen/kitchen-requestsForm", "Admin Requests", FaUtensils)}
            {createMenuItem("/kitchen/attendance/add", "Live Attendance", FaUserClock)}
            {createMenuItem("/printer-settings", "Printer Settings", FaPrint)}
            
          </>
        );
      case "kitchen":
        return (
          <>
            {createMenuItem("/kitchen", "Live Orders", FaShoppingCart)}
            {createMenuItem("/kitchen/history", "Order History", FaHistory)}
            {createMenuItem("/kitchen/menu", "Manage Menu", FaClipboardList)}
            {createMenuItem("/kitchen/kitchen-requestsForm", "Admin Requests", FaUtensils)}
            {createMenuItem("/kitchen/attendance/add", "Attendance", FaUserClock)}
          </>
        );
      case "user":
        return (
          <>
            {createMenuItem("/user", "Mark Progress", FaBookReader)}
            {createMenuItem("/user/comp-Level1", "Components", L1Icon)}
            {createMenuItem("/user/comp-Level2", "Sub-Component ", L2Icon)}
            {createMenuItem("/user/comp-Level3", "Activities", FaUserTag)}
            {createMenuItem("/user/comp-Level4", "Sub-Activities", FaUsers)}
            {createMenuItem("/user/comp-Level5", "Sub-Activity Items", FaCoins)}
          </>
        );
      default:
        return null;
    }
  };

  const getSidebarClass = () => {
  // Open if: user toggled it OR (hovering + desktop + not manually opened)
    const isOpen = sidebarOpen || (isHovered && !isMobile);
    return isOpen ? "open" : "collapsed";
  };

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
    if (!sidebarOpen) {
      setIsHovered(false); // close hover if manually opening
    }
  };

  return (
    <div className="layout d-flex">
      {!isMobile || sidebarOpen ? (
        <aside 
        // className={`sidebar ${sidebarOpen ? "open" : "collapsed"}`}
        className={`sidebar ${getSidebarClass()}`}
        onMouseEnter={() => !isMobile && !sidebarOpen && setIsHovered(true)}
        onMouseLeave={() => !isMobile && !sidebarOpen && setIsHovered(false)}
        >
          <div className="sidebar-header d-flex align-items-center">
            {isSidebarExpanded && (
              <>
                <img
                  src="/logo.png"
                  alt="Logo"
                  className="sidebar-logo rounded-circle me-2"
                  style={{
                    width: "40px",
                    height: "40px",
                    objectFit: "cover",
                    border: "2px solid #fff",
                    boxShadow: "0 2px 4px rgba(0,0,0,0.1)"
                  }}
                />
                <h3 className="justify-content-left sidebar-title mb-0">UNICORN INSTITUTE LMS</h3>
              </>
            )}
          </div>
          <ul className="sidebar-menu">{renderSidebarMenu()}</ul>
        </aside>
      ) : null}

      <div className="main-content flex-grow-1">
        <header className="top-navbar">
          <div className="navbar-left">
            <button className="btn-toggle" onClick={toggleSidebar}>
              <FaBars />
            </button>
            <span className="session-timer">⏳ Session expires in: {countdown}</span>
            <div >
              <NotificationCenter />
            </div>
          </div>
          <div className="navbar-right" ref={dropdownRef}>
            <div className="user-dropdown">
              
              <div
                className="user-toggle"
                onClick={() => setUserDropdown(!userDropdown)}
                style={{ cursor: "pointer" }}
              >
                <FaUserCircle className="user-icon" />
                <span className="user-role">{user?.role}</span>
              </div>
              {userDropdown && (
                <div className="dropdown-menu show">
                  <button className="dropdown-item" onClick={logout}>
                    <FaSignOutAlt /> Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="page-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default RoleLayout;
