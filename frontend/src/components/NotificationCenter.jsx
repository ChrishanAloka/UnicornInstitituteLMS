import React, { useState, useEffect, useRef } from "react";
// import useNotifications from "../hooks/useNotification";
import { FaBell, FaRegBell } from "react-icons/fa";
import axios from "axios";
import { ToastContainer, toast } from "react-toastify";

const NotificationCenter = () => {
  // const {
  //   notifications,
  //   unreadCount,
  //   userRole,
  //   markAsRead,
  //   markAllAsRead
  // } = useNotifications();

  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef();

  // Mark all as read when dropdown opens
  const toggleDropdown = () => {
    if (!showDropdown && unreadCount > 0) {
      // markAllAsRead();
    }
    setShowDropdown(!showDropdown);
  };

  // Get icon per type
  const getIcon = (type) => {
    const icons = {
      order: "🛒",
      stock: "📦",
      table: "🪑",
      cleaning: "🧼",
      task: "📋",
      payment: "💳",
      update: "🔧"
    };
    return icons[type] || "🔔";
  };

  return (
    <div className="position-relative">
      Bell Icon
      <button
        onClick={toggleDropdown}
        style={{
          fontSize: "1.2rem",
          color: "#495057",
          background: "none",
          border: "none"
        }}
        type="button"
      >
        {/* {unreadCount > 0 ? <FaBell /> : <FaRegBell />}
        {unreadCount > 0 && (
          <span
            style={{
              position: "absolute",
              top: "-5px",
              right: "-5px",
              fontSize: "0.6rem",
              padding: "2px 6px",
              borderRadius: "50%",
              backgroundColor: "red",
              color: "white"
            }}
          >
            {unreadCount}
          </span>
        )} */}
      </button>

      {/* Dropdown Content */}
      {showDropdown && (
        <div
          ref={dropdownRef}
          style={{
            position: "absolute",
            top: "40px",
            right: "0",
            minWidth: "300px",
            maxHeight: "400px",
            overflowY: "auto",
            backgroundColor: "#fff",
            border: "1px solid #ccc",
            boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
            zIndex: 1000,
            padding: "10px"
          }}
        >
          <h6 className="text-center mb-3">For {userRole}</h6>
          {notifications.length === 0 ? (
            <p className="text-muted text-center">No notifications</p>
          ) : (
            notifications.map((notif, idx) => (
              <div
                key={idx}
                className={`mb-2 p-2 ${notif.read ? "bg-light" : "bg-white fw-bold"}`}
                style={{ cursor: "pointer" }}
                onClick={() => !notif.read && markAsRead(notif._id)}
              >
                <strong>{getIcon(notif.type)}</strong> {notif.message}
                <small className="d-block text-muted">
                  {new Date(notif.createdAt).toLocaleTimeString([], {
                     year: "numeric",
                    month: "long",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit"
                  })}
                </small>
              </div>
            ))
          )}

          <hr className="my-2" />
          <button
            className="btn btn-sm btn-success w-100"
            disabled={unreadCount === 0}
            onClick={markAllAsRead}
          >
            Mark All Read
          </button>
        </div>
      )}
    </div>
  );
};

export default NotificationCenter;