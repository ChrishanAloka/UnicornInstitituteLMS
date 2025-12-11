import React, { useState } from "react";
import { FaBell, FaUserCircle, FaBars } from "react-icons/fa";

const Header = ({ onToggleSidebar, notifications = [], user = {} }) => {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [notifyOpen, setNotifyOpen] = useState(false);

  const unreadCount = notifications?.filter(n => !n.read)?.length || 0;

  return (
    <header className="header-container">
      {/* LEFT */}
      <div className="header-left">
        <button className="header-toggle-btn" onClick={onToggleSidebar}>
          <FaBars />
        </button>
      </div>

      {/* RIGHT */}
      <div className="header-right">

        {/* NOTIFICATION */}
        <div
          className="header-icon notification-center"
          onClick={() => setNotifyOpen(!notifyOpen)}
        >
          <FaBell className="icon" />
          {unreadCount > 0 && <span className="badge">{unreadCount}</span>}

          {notifyOpen && (
            <div className="dropdown-menu notify-dropdown">
              {notifications.length === 0 ? (
                <div className="dropdown-item">No Notifications</div>
              ) : (
                notifications.map((n, i) => (
                  <div
                    key={i}
                    className={`dropdown-item ${n.read ? "read" : "unread"}`}
                  >
                    {n.message}
                    <span className="badge">{n.time}</span>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* USER DROPDOWN */}
        <div className="user-dropdown">
          <div
            className="user-toggle"
            onClick={() => setDropdownOpen(!dropdownOpen)}
          >
            <FaUserCircle className="user-icon" />
            <span>{user?.name || "User"}</span>
          </div>

          {dropdownOpen && (
            <div className="dropdown-menu show">
              <button className="dropdown-item">Profile</button>
              <button className="dropdown-item">Settings</button>
              <button className="dropdown-item logout-btn">Logout</button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
