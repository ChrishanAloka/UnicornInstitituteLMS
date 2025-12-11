import React from "react";
import { NavLink } from "react-router-dom";
import {
  FaHome,
  FaDatabase,
  FaUsers,
  FaProjectDiagram,
  FaBars,
} from "react-icons/fa";

const Sidebar = ({ isOpen, toggleSidebar }) => {
  return (
    <aside className={`sidebar ${isOpen ? "open" : "collapsed"}`}>
      {/* SIDEBAR HEADER */}
      <div className="sidebar-header">
        <h3 className="sidebar-title">
          {isOpen ? "Dashboard" : "DB"}
        </h3>

        <button className="toggle-btn" onClick={toggleSidebar}>
          <FaBars />
        </button>
      </div>

      {/* SIDEBAR MENU */}
      <ul className="sidebar-menu">

        <li>
          <NavLink
            to="/admin/home"
            className="menu-link"
          >
            <FaHome className="menu-icon" />
            {isOpen && <span className="menu-label">Home</span>}
          </NavLink>
        </li>

        <li>
          <NavLink
            to="/admin/db-status"
            className="menu-link"
          >
            <FaDatabase className="menu-icon" />
            {isOpen && <span className="menu-label">Database Status</span>}
          </NavLink>
        </li>

        <li>
          <NavLink
            to="/admin/users"
            className="menu-link"
          >
            <FaUsers className="menu-icon" />
            {isOpen && <span className="menu-label">Users</span>}
          </NavLink>
        </li>

        <li>
          <NavLink
            to="/admin/projects"
            className="menu-link"
          >
            <FaProjectDiagram className="menu-icon" />
            {isOpen && <span className="menu-label">Projects</span>}
          </NavLink>
        </li>

      </ul>
    </aside>
  );
};

export default Sidebar;
