import React, { useState, useEffect } from "react";
import axios from "axios";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import CreatableSelect from 'react-select/creatable';
import makeAnimated from 'react-select/animated';

const MenuManagement = () => {
  const [menus, setMenus] = useState([]);
  const [newMenu, setNewMenu] = useState({
    name: "",
    description: "",
    price: "0",
    cost: "0",
    category: "Main Course",
    minimumQty: 5,
    imageUrl: "" // <-- new field
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
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState([]);
  const [categoryOptions, setCategoryOptions] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [bulkRestockOpen, setBulkRestockOpen] = useState(false);
  const [bulkRestockAmount, setBulkRestockAmount] = useState(0);

  const symbol = localStorage.getItem("currencySymbol") || "$";

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
      
      const menuData = res.data;
      setMenus(menuData);

      // Format unique categories as react-select options
      const uniqueCats = [...new Set(menuData.map(menu => menu.category).filter(Boolean))];
      const options = uniqueCats.map(cat => ({ value: cat, label: cat }));
      
      // Ensure at least one default option
      if (options.length === 0) {
        setCategoryOptions([{ value: "Main Course", label: "Main Course" }]);
      } else {
        setCategoryOptions(options);
      }
      
    } catch (err) {
      console.error("Failed to load menus:", err.message);
    }
  };

  // Filter menus by search term and selected category
  const filteredMenus = menus.filter((menu) => {
    const matchesSearch = menu.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = !selectedCategory || menu.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Get flat list of categories for filtering (not for react-select)
  const allCategories = [...new Set(menus.map(menu => menu.category).filter(Boolean))];

  // Calculate net profit
  const calculateNetProfit = (price, cost) => {
    return (parseFloat(price || 0) - parseFloat(cost || 0)).toFixed(2);
  };

  // Handle create input change
  const handleChange = (e) => {
    const { name, value } = e.target;
    
    setNewMenu((prev) => ({ ...prev, [name]: value }));
  };

  // Handle edit input change
  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditData((prev) => ({ ...prev, [name]: value }));
  };

  // Image preview for create
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImage(file);
      setPreview(URL.createObjectURL(file));
      setNewMenu(prev => ({ ...prev, imageUrl: "" }));
    }
  };

  // Image preview for edit
  const handleEditImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setEditImage(file);
      setEditPreview(URL.createObjectURL(file));
      setEditData(prev => ({ ...prev, imageUrl: "" }));
    }
  };

  // Add new menu
  const handleCreate = async (e) => {
    e.preventDefault();

    if (!newMenu.name || !newMenu.price) {
      toast.warn("Name and price are required");
      return;
    }

    setLoading(true);
    const formData = new FormData();
    Object.entries(newMenu).forEach(([key, value]) => {
      if (value !== "" && value != null) {
        formData.append(key, value);
      }
    });

    if (image) {
      formData.append("image", image);
    }

    // Auto-set currentQty if not provided
    if (!newMenu.currentQty) {
      formData.append("currentQty", newMenu.minimumQty);
    }

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
      toast.success("Menu item added successfully!");
    } catch (err) {
      console.error("Add failed:", err.response?.data || err.message);
      toast.error(err.response?.data?.error || "Failed to add menu item");
    } finally {
      setLoading(false);
    }
  };

  // Reset form after create
  const resetForm = () => {
    setNewMenu({
      name: "",
      description: "",
      price: "0",
      cost: "0",
      category: "Main Course",
      minimumQty: 5,
      menuImage: "",
      imageUrl: ""
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
      currentQty: menu.currentQty,
      imageUrl: menu.imageUrl || "" // ✅ include imageUrl
    });
    setEditImage(null);
    setEditPreview(menu.imageUrl?.startsWith("http") ? "" : "");
  };

  // Submit edit
  const handleUpdate = async (e) => {
    e.preventDefault();
    setLoading(true);

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
      setEditingMenu(null);
      toast.success("Menu updated successfully!");
    } catch (err) {
      console.error("Update failed:", err.response?.data || err.message);
      toast.error(err.response?.data?.error || "Failed to update menu");
    } finally {
      setLoading(false);
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

      setMenus(menus.filter((m) => m._id !== id));
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

  const handleRestockSubmit = async () => {
    if (restockAmount <= 0) {
      toast.warn("Please enter a valid amount");
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
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      setMenus(menus.map((m) => (m._id === restockMenu._id ? res.data : m)));
      closeRestockModal();
      toast.success("Menu restocked successfully!");
    } catch (err) {
      console.error("Restock failed:", err.response?.data || err.message);
      toast.error("Failed to restock");
    }
  };

  const handleBulkRestock = async () => {
    if (bulkRestockAmount <= 0) {
      toast.warn("Please enter a valid amount");
      return;
    }

    try {
      const token = localStorage.getItem("token");
      const res = await axios.post(
        "https://projectnuckels.onrender.com/api/auth/menu/restock-all",
        { amount: bulkRestockAmount },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      setMenus(res.data); // Update all menus at once
      setBulkRestockOpen(false);
      setBulkRestockAmount(0);
      toast.success(`All items restocked by ${bulkRestockAmount} units!`);
    } catch (err) {
      console.error("Bulk restock failed:", err.response?.data || err.message);
      toast.error(err.response?.data?.error || "Failed to restock all items");
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

  const convertGoogleDriveUrl = (url) => {
    const regex = /\/file\/d\/([^\/]+)/;
    const match = url.match(regex);
    if (match) {
      return `https://drive.google.com/uc?export=view&id=${match[1]}`;
    }
    return url; // return original if not a Drive link
  };

  return (
    <div className="container my-4">
      <h2 className="mb-2 fw-bold text-primary"> Menu Management</h2>
      <p className="mb-4 text-muted border-bottom pb-2">Add, edit, or restock menu items</p>

      {/* Create Form */}
      <form onSubmit={handleCreate} className="mb-4 p-3 border rounded bg-light">
        <div className="row g-3">
          <div className="col-md-6">
            <label className="form-label">Category</label>
            <CreatableSelect
              value={categoryOptions.find(option => option.value === newMenu.category) || null}
              onChange={(selectedOption) => {
                const value = selectedOption ? selectedOption.value : "Main Course";
                setNewMenu(prev => ({ ...prev, category: value }));
                
                // Auto-add new category to options if it's not there
                if (selectedOption && !categoryOptions.some(opt => opt.value === value)) {
                  setCategoryOptions(prev => [...prev, { value, label: value }]);
                }
              }}
              onCreateOption={(inputValue) => {
                const newOption = { value: inputValue, label: inputValue };
                setCategoryOptions(prev => [...prev, newOption]);
                setNewMenu(prev => ({ ...prev, category: inputValue }));
              }}
              options={categoryOptions}
              placeholder="Select or create category..."
              className="basic-single"
              classNamePrefix="select"
              isClearable={false}
              components={makeAnimated()}
            />
          </div>

          <div className="col-md-6">
            <label className="form-label">Menu Name *</label>
            <input
              type="text"
              name="name"
              value={newMenu.name}
              onChange={handleChange}
              className="form-control"
              placeholder="e.g., Spaghetti Bolognese"
              required
            />
          </div>

          <div className="col-md-4">
            <label className="form-label">Price *</label>
            <input
              type="number"
              name="price"
              step="0.01"
              min="0"
              onFocus={(e) => e.target.select()}
              onWheel={(e) => e.target.blur()}
              value={newMenu.price}
              onChange={handleChange}
              className="form-control"
              placeholder="Enter price"
              required
            />
          </div>

          <div className="col-md-4">
            <label className="form-label">Cost</label>
            <input
              type="number"
              name="cost"
              step="0.01"
              min="0"
              onFocus={(e) => e.target.select()}
              onWheel={(e) => e.target.blur()}
              value={newMenu.cost}
              onChange={handleChange}
              className="form-control"
              placeholder="Enter cost"
              required
            />
          </div>

          <div className="col-md-4">
            <label className="form-label">Minimum Stock Quantity *</label>
            <input
              type="number"
              name="minimumQty"
              min="1"
              onFocus={(e) => e.target.select()}
              onWheel={(e) => e.target.blur()}
              value={newMenu.minimumQty}
              onChange={handleChange}
              className="form-control"
              required
            />
          </div>

          <div className="col-12">
            <label className="form-label">Description</label>
            <textarea
              name="description"
              value={newMenu.description}
              onChange={handleChange}
              className="form-control"
              rows="2"
              placeholder="Optional description..."
            ></textarea>
          </div>

          <div className="col-12">
            <label className="form-label">Paste an image URL</label>
            <input
              type="url"
              className="form-control"
              placeholder="https://example.com/image.jpg"
              value={newMenu.imageUrl}
              onChange={(e) => setNewMenu(prev => ({ ...prev, imageUrl: e.target.value }))}
            />
          </div>

          {/* <div className="col-12">
            <label className="form-label">Image Upload *</label>
            <input
              type="file"
              name="menuImage"
              accept="image/*"
              onChange={handleImageChange}
              className="form-control"
              disabled={!!(newMenu.imageUrl?.trim())} // ✅ safe check
            />
          </div> */}

          {preview && (
            <div className="col-12 mt-2">
              <img
                src={preview}
                alt="Preview"
                style={{ width: "100%", maxHeight: "200px", objectFit: "cover" }}
              />
            </div>
          )}

          <div className="col-12 mt-2">
            <label className="form-label">Net Profit</label>
            <input
              type="text"
              value={`${symbol}${calculateNetProfit(newMenu.price, newMenu.cost)}`}
              readOnly
              className={`${calculateNetProfit(newMenu.price, newMenu.cost)}` >= 0 ? `form-control bg-light fw-bold text-success` : `form-control fw-bold bg-light text-danger`}
            />
          </div>

          <div className="col-12 mt-3">
            <button type="submit" className="btn btn-success w-100" disabled={loading}>
              {loading ? "Uploading..." : "Add Menu Item"}
            </button>
          </div>
        </div>
      </form>

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
                  <div className="row g-3">
                    <div className="col-12">
                      <label className="form-label">Name *</label>
                      <input
                        type="text"
                        name="name"
                        value={editData.name}
                        onChange={handleEditChange}
                        className="form-control"
                        required
                      />
                    </div>

                    <div className="col-12">
                      <label className="form-label">Price *</label>
                      <input
                        type="number"
                        name="price"
                        step="0.01"
                        min="0"
                        onFocus={(e) => e.target.select()}
                        onWheel={(e) => e.target.blur()}
                        value={editData.price}
                        onChange={handleEditChange}
                        className="form-control"
                        required
                      />
                    </div>

                    <div className="col-12">
                      <label className="form-label">Cost</label>
                      <input
                        type="number"
                        name="cost"
                        step="0.01"
                        min="0"
                        onFocus={(e) => e.target.select()}
                        onWheel={(e) => e.target.blur()}
                        value={editData.cost}
                        onChange={handleEditChange}
                        className="form-control"
                        required
                      />
                    </div>

                    <div className="col-12">
                      <label className="form-label">Minimum Qty *</label>
                      <input
                        type="number"
                        name="minimumQty"
                        min="1"
                        onFocus={(e) => e.target.select()}
                        onWheel={(e) => e.target.blur()}
                        value={editData.minimumQty}
                        onChange={handleEditChange}
                        className="form-control"
                        required
                      />
                    </div>

                    <div className="col-12">
                      <label className="form-label">Current Stock</label>
                      <input
                        type="number"
                        name="currentQty"
                        onFocus={(e) => e.target.select()}
                        onWheel={(e) => e.target.blur()}
                        value={editData.currentQty = editData.minimumQty}
                        readOnly
                        className="form-control"
                      />
                    </div>

                    <div className="col-12">
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

                    {/* Edit: Image URL */}
                    <div className="col-12">
                      <label>Paste image URL</label>
                      <input
                        type="url"
                        className="form-control"
                        placeholder="https://example.com/image.jpg"
                        value={editData.imageUrl || ""}
                        onChange={(e) => {
                          setEditData(prev => ({ ...prev, imageUrl: e.target.value }));
                          setEditImage(null);
                          setEditPreview("");
                        }}
                      />
                    </div>
                    
                    {/* <div className="col-12">
                      <label className="form-label">Image Upload</label>
                      <input
                        type="file"
                        name="menuImage" 
                        accept="image/*"
                        onChange={handleEditImageChange}
                        className="form-control"
                        disabled={!!(editData.imageUrl?.trim())}
                      />
                    </div> */}

                    {editPreview && (
                      <div className="col-12 mt-2">
                        <img
                          src={editPreview}
                          alt="Edit Preview"
                          style={{ width: "100%", maxHeight: "200px", objectFit: "cover" }}
                        />
                      </div>
                    )}
                  </div>

                  <div className="mt-3">
                    <button type="submit" className="btn btn-primary w-100" disabled={loading}>
                      {loading ? "Updating..." : "Update Menu"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Restock Modal */}
      {restockModalOpen && restockMenu && (
        <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: "rgba(0,0,0,0.5)" }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Restock "{restockMenu.name}"</h5>
                <button className="btn-close" onClick={closeRestockModal}></button>
              </div>
              <div className="modal-body">
                <label>Quantity to Add</label>
                <input
                  type="number"
                  value={restockAmount}
                  onFocus={(e) => e.target.select()}
                  onWheel={(e) => e.target.blur()}
                  onChange={(e) => setRestockAmount(parseInt(e.target.value))}
                  className="form-control"
                  min="1"
                />
              </div>
              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={closeRestockModal}>Cancel</button>
                <button className="btn btn-success" onClick={handleRestockSubmit}>
                  Add Stock
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Restock Modal */}
      {bulkRestockOpen && (
        <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: "rgba(0,0,0,0.5)" }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Restock All Menu Items</h5>
                <button className="btn-close" onClick={() => setBulkRestockOpen(false)}></button>
              </div>
              <div className="modal-body">
                <p>Enter the quantity to add to <strong>all</strong> menu items:</p>
                <input
                  type="number"
                  className="form-control"
                  onFocus={(e) => e.target.select()}
                  onWheel={(e) => e.target.blur()}
                  value={bulkRestockAmount}
                  onChange={(e) => setBulkRestockAmount(parseInt(e.target.value) || 0)}
                  min="1"
                  placeholder="e.g., 10"
                  autoFocus
                />
              </div>
              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={() => setBulkRestockOpen(false)}>
                  Cancel
                </button>
                <button
                  className="btn btn-success"
                  onClick={handleBulkRestock}
                  disabled={bulkRestockAmount <= 0}
                >
                  Apply to All Items
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Restock Button */}
      <div className="d-flex justify-content-end mb-3">
        <button
          className="btn btn-outline-success"
          onClick={() => setBulkRestockOpen(true)}
        >
          📦 Restock All Menu Items
        </button>
      </div>

      {/* Search & Filter Controls */}
      <div className="mb-4 p-3 bg-white rounded shadow-sm">
        <div className="row g-3">
          <div className="col-md-4">
            <label className="form-label">Filter by Category</label>
            <select
              className="form-select"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
            >
              <option value="">All Categories</option>
              {allCategories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </div>
          <div className="col-md-8">
            <label className="form-label">Search Menu</label>
            <input
              type="text"
              className="form-control"
              placeholder="Search by name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Menu List */}
      <div className="row g-3">
        {filteredMenus.map((menu) => {
          const status = calculateMenuStatus(menu.currentQty);
          return (
            <div key={menu._id} className="col-md-3 mb-3">
              <div className="card shadow-sm h-100 position-relative">
                <img
                  // src={
                  //   menu.imageUrl.startsWith("https")
                  //     ? menu.imageUrl
                  //     : `https://projectnuckels.onrender.com${menu.imageUrl}`
                  // }
                  src={
                    menu.imageUrl.startsWith("https")
                      ? convertGoogleDriveUrl(menu.imageUrl)
                      : `${menu.imageUrl}`
                  }
                  alt={menu.name}
                  className="card-img-top"
                  style={{ height: "100px", objectFit: "contain" }}
                />
                <div className="card-body d-flex flex-column">
                  <><h5>{menu.name}</h5><h6>({menu.category})</h6></>
                  <p className="card-text">
                    Price: {symbol}
                    {menu.price.toFixed(2)}
                    <br />
                    <span>Cost: </span> 
                    <span className={`${calculateNetProfit(menu.price, menu.cost)}` >= 0 ? `bg-light fw-bold text-success` : `fw-bold bg-light text-danger`}>
                      {symbol}{(menu.cost || 0).toFixed(2)}
                    </span>
                    <br />
                    Ava: {menu.currentQty || 0} / Min: {menu.minimumQty || 5}
                    <br />
                    <span className={`badge ${getStatusLabelClass(status)}`}>{status}</span>
                  </p>
                  <div className="d-flex gap-2 mt-auto">
                    <button className="btn btn-primary btn-sm" onClick={() => openEditModal(menu)}>
                      Edit
                    </button>
                    <button className="btn btn-danger btn-sm" onClick={() => handleDelete(menu._id)}>
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

      <ToastContainer />
    </div>
  );
};

export default MenuManagement;