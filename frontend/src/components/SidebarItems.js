import { 
  FaHome, FaUsers, FaUserShield, FaKey,
  FaUtensils, FaCashRegister, FaTruck, FaChartPie,
  FaUserGraduate, FaBook, FaListUl 
} from "react-icons/fa";

const SidebarItems = {
  admin: [
    { label: "Dashboard", path: "/admin", icon: <FaHome /> },
    { label: "Users", path: "/admin/users", icon: <FaUsers /> },
    { label: "Signup Keys", path: "/admin/signup-key", icon: <FaKey /> },
    { label: "Employees", path: "/admin/employees", icon: <FaUserShield /> },
    { label: "Suppliers", path: "/admin/suppliers", icon: <FaTruck /> },
    { label: "Expenses", path: "/admin/expenses", icon: <FaCashRegister /> },
    { label: "Salaries", path: "/admin/salaries", icon: <FaCashRegister /> },
    { label: "Currency", path: "/admin/currency", icon: <FaChartPie /> },
  ],

  cashier: [
    { label: "Dashboard", path: "/cashier/today", icon: <FaHome /> },
    { label: "Summary", path: "/cashier-summery", icon: <FaChartPie /> },
    { label: "Orders", path: "/cashier/orders", icon: <FaListUl /> },
    { label: "Takeaway Orders", path: "/cashier/takeaway-orders", icon: <FaTruck /> },
    { label: "Register Driver", path: "/cashier/driver-register", icon: <FaUsers /> },
  ],

  kitchen: [
    { label: "Kitchen Home", path: "/kitchen", icon: <FaUtensils /> },
    { label: "Bills", path: "/kitchen/bills", icon: <FaCashRegister /> },
    { label: "Menu", path: "/kitchen/menu", icon: <FaListUl /> },
  ],

  user: [
    { label: "Register", path: "/user", icon: <FaUserGraduate /> },
    { label: "Level 1", path: "/user/comp-Level1", icon: <FaBook /> },
    { label: "Level 2", path: "/user/comp-Level2", icon: <FaBook /> },
    { label: "Level 3", path: "/user/comp-Level3", icon: <FaBook /> },
    { label: "Level 4", path: "/user/comp-Level4", icon: <FaBook /> },
    { label: "Level 5", path: "/user/comp-Level5", icon: <FaBook /> },
  ],
};

export default SidebarItems;
