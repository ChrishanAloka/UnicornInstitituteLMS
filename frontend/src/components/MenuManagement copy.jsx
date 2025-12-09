import React, { useState, useEffect } from "react";
import axios from "axios";

import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const MenuManagement = () => {
  const [menus, setMenus] = useState([]);
  const [newMenu, setNewMenu] = useState({
    name: "",
    description: "",
    price: "",
    cost: "",
    category: "Main Course",
    minimumQty: 5,
  });
  const [editingMenu, setEditingMenu] = useState(null);
  const [editData, setEditData] = useState({ ...newMenu });
  const [image, setImage] = useState(null);
  const [editImage, setEditImage] = useState(null);
  const [preview, setPreview] = useState("");
  const [editPreview, setEditPreview] = useState("");
  const [restockModalOpen, setRestockModalOpen] = useState(false);
  const [restockMenu, setRestockMenu] = useState(null);
  const [restockAmount, setRestockAmount] = useState(0);

  // Load menus on mount
  useEffect(() => {
    fetchMenus();
  }, []);

  const fetchMenus = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get("https://projectnuckels.onrender.com/api/auth/menus", {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMenus(res.data);
    } catch (err) {
      console.error("Failed to load menus:", err.message);
    }
  };

  // Handle create input change
  const handleChange = (e) =>
    setNewMenu({ ...newMenu, [e.target.name]: e.target.value });

  // Calculate net profit
  const calculateNetProfit = (price, cost) => {
    return (parseFloat(price || 0) - parseFloat(cost || 0)).toFixed(2);
  };

  // Add new menu
  const handleCreate = async (e) => {
    e.preventDefault();
    const formData = new FormData();
    Object.entries(newMenu).forEach(([key, value]) =>
      formData.append(key, value)
    );
    formData.append("currentQty", newMenu.minimumQty); // Auto-set currentQty
    if (image) formData.append("image", image);

    try {
      const token = localStorage.getItem("token");
      const res = await axios.post("https://projectnuckels.onrender.com/api/auth/menu", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
          Authorization: `Bearer ${token}`
        }
      });
      setMenus([...menus, res.data]);
      resetForm();
    } catch (err) {
      alert("Failed to add menu item");
    }
  };

  const resetForm = () => {
    setNewMenu({
      name: "",
      description: "",
      price: "",
      cost: "",
      category: "Main Course",
      minimumQty: 5
    });
    setImage(null);
    setPreview("");
  };

  // Open edit modal
  const openEditModal = (menu) => {
  setEditingMenu(menu._id);
  setEditData({
    name: menu.name,
    description: menu.description || "",
    price: menu.price,
    cost: menu.cost,
    category: menu.category,
    minimumQty: menu.minimumQty,
    currentQty: menu.currentQty
  });
  setEditImage(null);
  setEditPreview("");
};

  const handleEditChange = (e) =>
    setEditData({ ...editData, [e.target.name]: e.target.value });

  // Submit edit
  const handleUpdate = async (e) => {
  e.preventDefault();

  const formData = new FormData();
  Object.entries(editData).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      formData.append(key, value);
    }
  });

  if (editImage) {
    formData.append("image", editImage);
  }

  try {
    const token = localStorage.getItem("token");
    const res = await axios.put(
      `https://projectnuckels.onrender.com/api/auth/menu/${editingMenu}`,
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
          Authorization: `Bearer ${token}`
        }
      }
    );

    setMenus(menus.map((m) => (m._id === editingMenu ? res.data : m)));
    toast.success("Menu updated successfully!");
    setEditingMenu(null);
  } catch (err) {
    console.error("Update failed:", err.response?.data || err.message);
    toast.error("Failed to update menu");
  }
};

  // Delete menu
 const handleDelete = async (id) => {
  const confirmDelete = window.confirm("Are you sure you want to delete this menu?");
  if (!confirmDelete) return;

  try {
    const token = localStorage.getItem("token");
    await axios.delete(`https://projectnuckels.onrender.com/api/auth/menu/${id}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    setMenus(menus.filter((menu) => menu._id !== id));
    toast.success("Menu deleted successfully!");
  } catch (err) {
    console.error("Delete failed:", err.response?.data || err.message);
    toast.error("Failed to delete menu");
  }
};

  // Restock functions
  const openRestockModal = (menu) => {
    setRestockMenu(menu);
    setRestockAmount(0);
    setRestockModalOpen(true);
  };

  const closeRestockModal = () => {
    setRestockModalOpen(false);
    setRestockMenu(null);
    setRestockAmount(0);
  };

  const sendNotification = (type, message) => {
  const icons = {
    order: "🛒",
    stock: "📦",
    table: "🪑",
    cleaning: "🧼",
    task: "📋",
    payment: "💳",
    update: "🔧"
  };

  const icon = icons[type] || "🔔";

  // Show notification with relevant icon
  toast.info(`${icon} ${message}`, {
    autoClose: 3000,
    hideProgressBar: false,
    closeOnClick: true,
    pauseOnHover: true,
    draggable: true,
    progress: undefined,
  });
};

  const handleRestockSubmit = async () => {
  if (restockAmount <= 0) {
    alert("Please enter a valid restock amount");
    return;
  }

  const updatedAvailableQty = restockMenu.minimumQty + parseInt(restockAmount);
  const updatedCurrentQty = restockMenu.currentQty + parseInt(restockAmount);

  try {
    const token = localStorage.getItem("token");

    const res = await axios.put(
      `https://projectnuckels.onrender.com/api/auth/menu/${restockMenu._id}`,
      {
        minimumQty: updatedAvailableQty,
        currentQty: updatedCurrentQty
      },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        }
      }
    );

    setMenus(menus.map((m) => (m._id === restockMenu._id ? res.data : m)));
    toast.success("Menu restocked successfully!");

    // ✅ Only call sendNotification after successful update
    sendNotification("stock", `Stock updated for "${restockMenu.name}"`);
    
    closeRestockModal();
  } catch (err) {
    console.error("Restock failed:", err.response?.data || err.message);
    alert("Failed to restock");
  }
};

  // Helper functions
  const calculateMenuStatus = (qty) => {
    if (!qty || qty <= 0) return "Out of Stock";
    else if (qty <= 5) return "Low Stock";
    else return "In Stock";
  };

  const getStatusLabelClass = (status) => {
    switch (status) {
      case "In Stock":
        return "bg-success text-white";
      case "Low Stock":
        return "bg-warning text-dark";
      case "Out of Stock":
        return "bg-danger text-white";
      default:
        return "";
    }
  };

  return (
    <div>
      <h2>Menu Management</h2>
      <ToastContainer />

      {/* Create Form */}
      <form onSubmit={handleCreate} className="mb-4 p-3 border rounded bg-light">
        <div className="row g-3">
          <div className="col-md-6">
            <label className="form-label">Name</label>
            <input
              type="text"
              name="name"
              value={newMenu.name}
              onChange={handleChange}
              placeholder="Enter name"
              className="form-control"
              required
            />
          </div>
          <div className="col-md-6">
            <label className="form-label">Category</label>
            <select
              name="category"
              value={newMenu.category}
              onChange={handleChange}
              className="form-select"
            >
              <option>Main Course</option>
              <option>Appetizer</option>
              <option>Dessert</option>
              <option>Drink</option>
            </select>
          </div>
          <div className="col-md-6">
            <label className="form-label">Price ($)</label>
            <input
              type="number"
              name="price"
              value={newMenu.price}
              onChange={handleChange}
              placeholder="Enter price"
              className="form-control"
              step="0.01"
              required
            />
          </div>
          <div className="col-md-6">
            <label className="form-label">Cost ($)</label>
            <input
              type="number"
              name="cost"
              value={newMenu.cost}
              onChange={handleChange}
              placeholder="Enter cost"
              className="form-control"
              step="0.01"
              required
            />
          </div>
          <div className="col-md-6">
            <label className="form-label">Minimum Quantity</label>
            <input
              type="number"
              name="minimumQty"
              value={newMenu.minimumQty}
              onChange={(e) =>
                setNewMenu({
                  ...newMenu,
                  minimumQty: e.target.value
                })
              }
              className="form-control"
              min="1"
              required
            />
          </div>
          <div className="col-md-6">
            <label className="form-label">Current Quantity</label>
            <input
              type="text"
              value={newMenu.minimumQty}
              readOnly
              className="form-control bg-light"
            />
          </div>
          <div className="col-12">
            <label className="form-label">Description</label>
            <textarea
              name="description"
              value={newMenu.description}
              onChange={handleChange}
              placeholder="Enter description"
              className="form-control"
              rows="2"
            ></textarea>
          </div>
          <div className="col-12 mt-2">
            <label className="form-label">Image Upload</label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => {
                setImage(e.target.files[0]);
                setPreview(URL.createObjectURL(e.target.files[0]));
              }}
              className="form-control"
            />
          </div>
          <div className="col-12 mt-2">
            <img
              src={preview}
              alt="Preview"
              style={{ width: "100%", maxHeight: "200px", objectFit: "cover" }}
            />
          </div>
          <div className="col-12 mt-2">
            <label className="form-label">Net Profit</label>
            <input
              type="text"
              value={`$${calculateNetProfit(newMenu.price, newMenu.cost)}`}
              readOnly
              className="form-control bg-light text-success"
            />
          </div>
          <div className="col-12 mt-3">
            <button type="submit" className="btn btn-success w-100">
              Add Menu Item
            </button>
          </div>
        </div>
      </form>

      {/* Restock Modal */}
      {restockModalOpen && restockMenu && (
        <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: "rgba(0,0,0,0.5)" }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Restock "{restockMenu.name}"</h5>
                <button
                  className="btn-close"
                  onClick={closeRestockModal}
                ></button>
              </div>
              <div className="modal-body">
                <div className="mb-3">
                  <label className="form-label">Enter Quantity to Add</label>
                  <input
                    type="number"
                    min="1"
                    value={restockAmount}
                    onChange={(e) => setRestockAmount(parseInt(e.target.value))}
                    className="form-control"
                    placeholder="e.g., 10"
                  />
                </div>
                <div className="mb-3">
                  <strong>Current Available:</strong> {restockMenu.minimumQty} <br />
                  <strong>Current Stock:</strong> {restockMenu.currentQty}
                </div>
                <div className="mt-4 d-flex justify-content-between">
                  <button
                    className="btn btn-secondary"
                    onClick={closeRestockModal}
                  >
                    Cancel
                  </button>
                  <button
                    className="btn btn-success"
                    onClick={handleRestockSubmit}
                  >
                    Add Stock
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Menu List */}
      <div className="row g-3">
        {menus.length === 0 && (
          <p className="text-muted">No menu items found</p>
        )}
        {menus.map((menu) => {
          const inStock = menu.currentQty > 0;
          const lowStock = menu.currentQty <= menu.minimumQty;

          return (
            <div key={menu._id} className="col-md-3 mb-3">
              <div className="card shadow-sm h-100 position-relative">
                <img
                  src={`https://projectnuckels.onrender.com${menu.imageUrl}`}
                  alt={menu.name}
                  className="card-img-top"
                  style={{ height: "280px", objectFit: "fill" }}
                />
                <div className="card-body d-flex flex-column">
                  <h5>{menu.name}</h5>
                  <p className="card-text">
                    Price: ${menu.price.toFixed(2)}<br />
                    Cost: ${menu.cost?.toFixed(2) || "0.00"}<br />
                    Ava: {menu.currentQty || 0} / Min: {menu.minimumQty || 5}
                    <br />
                    <span className={`badge ${getStatusLabelClass(menu.menuStatus)}`}>
                      {menu.menuStatus || "In Stock"}
                    </span>
                  </p>
                  <div className="d-flex gap-2 mt-auto">
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={() => openEditModal(menu)}
                    >
                      Edit
                    </button>
                    <button
                      className="btn btn-danger btn-sm"
                      onClick={() => handleDelete(menu._id)}
                    >
                      Delete
                    </button>
                    <button
                      className="btn btn-success btn-sm"
                      onClick={() => openRestockModal(menu)}
                    >
                      Restock
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Edit Modal */}
      {editingMenu && (
        <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: "rgba(0,0,0,0.5)" }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Edit Menu</h5>
                <button className="btn-close" onClick={() => setEditingMenu(null)}></button>
              </div>
              <div className="modal-body">
                <form onSubmit={handleUpdate}>
                  <div className="mb-3">
                    <label className="form-label">Name</label>
                    <input
                      type="text"
                      name="name"
                      value={editData.name}
                      onChange={handleEditChange}
                      className="form-control"
                      required
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Price</label>
                    <input
                      type="number"
                      name="price"
                      value={editData.price}
                      onChange={handleEditChange}
                      className="form-control"
                      step="0.01"
                      required
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Cost</label>
                    <input
                      type="number"
                      name="cost"
                      value={editData.cost}
                      onChange={handleEditChange}
                      className="form-control"
                      step="0.01"
                      required
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Minimum Quantity</label>
                    <input
                      type="number"
                      name="minimumQty"
                      value={editData.minimumQty}
                      onChange={handleEditChange}
                      className="form-control"
                      min="1"
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Current Qty</label>
                    <input
                      type="text"
                      name="currentQty"
                      value={editData.currentQty = editData.minimumQty}
                      readOnly
                      className="form-control bg-light"
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Category</label>
                    <select
                      name="category"
                      value={editData.category}
                      onChange={handleEditChange}
                      className="form-select"
                    >
                      <option>Main Course</option>
                      <option>Appetizer</option>
                      <option>Dessert</option>
                      <option>Drink</option>
                    </select>
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Description</label>
                    <textarea
                      name="description"
                      value={editData.description}
                      onChange={handleEditChange}
                      className="form-control"
                      rows="2"
                    ></textarea>
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Image</label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        setEditImage(e.target.files[0]);
                        setEditPreview(URL.createObjectURL(e.target.files[0]));
                      }}
                      className="form-control"
                    />
                  </div>
                  <img
                    src={
                      editPreview ||
                      `https://projectnuckels.onrender.com${editData.imageUrl}`
                    }
                    alt="Preview"
                    style={{
                      width: "100%",
                      maxHeight: "200px",
                      objectFit: "cover"
                    }}
                  />
                  <div className="mt-3">
                    <button type="submit" className="btn btn-primary w-100">
                      Save Changes
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MenuManagement;