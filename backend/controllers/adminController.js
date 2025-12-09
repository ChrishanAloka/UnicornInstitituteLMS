const Order = require("../models/Order");
const Expense = require("../models/Expense");
const KitchenBill = require("../models/KitchenBill");
const Salary = require("../models/Salary");
const OtherIncome = require("../models/OtherIncome");
const OtherExpense = require("../models/OtherExpense");

exports.getAdminSummary = async (req, res) => {
  const { startDate, endDate } = req.query;

  try {
    let query = {};
    if (startDate && endDate) {
      query = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    // Fetch all data sources — ✅ ADDED OtherIncome & OtherExpense
    const [orders, expenses, bills, salaries, otherIncomes, otherExpenses] = await Promise.all([
      Order.find({ createdAt: query }),
      Expense.find({ date: query }).select("amount"),
      KitchenBill.find({ date: query }).select("amount"),
      Salary.find({ date: query }).select("total"),
      OtherIncome.find({ date: query }).select("amount"),
      OtherExpense.find({ date: query }).select("amount")
    ]);

    // ✅ Calculate totals
    
    const totalOtherIncome = otherIncomes.reduce((sum, i) => sum + i.amount, 0);
    const totalSupplierExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
    const totalBills = bills.reduce((sum, b) => sum + b.amount, 0);
    const totalSalaries = salaries.reduce((sum, s) => sum + s.total, 0);
    const totalOtherExpenses = otherExpenses.reduce((sum, e) => sum + e.amount, 0);
    const totalOrdersIncome = orders.reduce((sum, o) => sum + o.totalPrice, 0);
    const totaldeliveryOrdersIncome = orders.reduce((sum, o) => sum + o.deliveryCharge, 0);
    
    // ✅ Calculate totalOrdersNetIncome: sum of (item.netProfit * item.quantity) for all items in all orders
    const totalOrdersNetIncome = orders.reduce((sum, order) => {
      const orderNetProfit = order.items.reduce((itemSum, item) => {
        // Ensure netProfit exists and is a number
        const profitPerUnit = item.netProfit || 0;
        return itemSum + (profitPerUnit * item.quantity);
      }, 0);
      return sum + orderNetProfit;
    }, 0);

    const totalIncome = totalOrdersIncome + totalOtherIncome;

    const totalCost =
      totalSupplierExpenses +
      totalBills +
      totalSalaries +
      totalOtherExpenses;

    const netProfit = totalIncome - totalCost;

    // ✅ Count orders
    const totaldeliveryOrders = orders.filter((item) => item.deliveryType === "Delivery Service").length;

    const totalOrders= orders.length;

    const totalServiceChargeIncome = orders.reduce((sum, order) => sum + (order.serviceCharge || 0), 0);

    // ✅ Count by status
    const statusCounts = orders.reduce((acc, order) => {
      acc[order.status] = (acc[order.status] || 0) + 1;
      return acc;
    }, {});

    const delayedOrders = orders.filter(order => {
      // Skip if statusUpdatedAt is not set (shouldn't happen if you always set it)
      if (!order.statusUpdatedAt) return false;

      const diffMs = new Date(order.statusUpdatedAt) - new Date(order.createdAt);
      const diffMinutes = diffMs / (1000 * 60);
      console.log("Diff Minute", diffMinutes);
      return diffMinutes > 30;
      
    }).length;

    const nextDayStatusUpdates = orders.filter(order => {

      const created = new Date(order.createdAt);
      const updated = (!Date(order.statusUpdatedAt)) && order.status !== "Pending" ? new Date(order.statusUpdatedAt) : new Date(order.createdAt);
        
      console.log("order.statusupdates", order.invoiceNo,new Date(order.statusUpdatedAt));
      console.log("Created date and updated", created.getDate(), updated.getDate());
      // Compare YEAR, MONTH, and DAY (ignore time)
      return (
        created.getFullYear() !== updated.getFullYear() ||
        created.getMonth() !== updated.getMonth() ||
        created.getDate() !== updated.getDate()
      );
    }).length;
    
    // ✅ Payment breakdown
    const paymentBreakdown = orders.reduce(
      (acc, order) => {
        acc.cash += order.payment?.cash || 0;
        acc.cashdue += order.payment?.changeDue || 0;
        acc.card += order.payment?.card || 0;
        acc.bank += order.payment?.bankTransfer || 0;
        return acc;
      },
      { cash: 0, cashdue: 0, card: 0, bank: 0 }
    );

    // ✅ Top Ordered Menu Items
    const menuItemCount = {};
    orders.forEach(order => {
      order.items.forEach(item => {
        menuItemCount[item.name] = (menuItemCount[item.name] || 0) + item.quantity;
      });
    });

    const topMenus = Object.entries(menuItemCount)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10); // Top 10

    // ✅ Waiter Service Charge Earnings (only for dine-in orders with waiterName)
    const waiterEarnings = {};
    orders.forEach(order => {
      // Only include orders with a waiter and service charge > 0
      if (order.waiterName && order.serviceCharge > 0) {
        waiterEarnings[order.waiterName] = (waiterEarnings[order.waiterName] || 0) + order.serviceCharge;
      }
    });

    const waiterServiceEarnings = Object.entries(waiterEarnings)
      .map(([waiterName, totalServiceCharge]) => ({ waiterName, totalServiceCharge }))
      .sort((a, b) => b.totalServiceCharge - a.totalServiceCharge);

    // ✅ 1. Total Dine-In (Table) Orders
    const totalTableOrders = orders.filter(order => 
      order.tableNo && order.tableNo !== "Takeaway"
    ).length;

    // ✅ 2. Delivery Places Stats
    const deliveryPlaceStats = {};
    orders.forEach(order => {
      if (
        order.deliveryType === "Delivery Service" &&
        order.deliveryPlaceName &&
        order.deliveryCharge > 0
      ) {
        const name = order.deliveryPlaceName;
        if (!deliveryPlaceStats[name]) {
          deliveryPlaceStats[name] = { count: 0, totalCharge: 0 };
        }
        deliveryPlaceStats[name].count += 1;
        deliveryPlaceStats[name].totalCharge += order.deliveryCharge;
      }
    });

    const deliveryPlacesBreakdown = Object.entries(deliveryPlaceStats)
      .map(([placeName, { count, totalCharge }]) => ({
        placeName,
        count,
        totalCharge
      }))
      .sort((a, b) => b.count - a.count); // or sort by totalCharge if preferred

    const orderTypeBreakdown = {
      "Dine-In": { count: 0, total: 0 },
      "Takeaway": { count: 0, total: 0 },
      "Delivery": { count: 0, total: 0, byPlace: {} }
    };

    orders.forEach(order => {
      const totalPrice = order.totalPrice || 0;

      if (order.deliveryType === "Delivery Service") {
        orderTypeBreakdown["Delivery"].count += 1;
        orderTypeBreakdown["Delivery"].total += totalPrice;

        const place = order.deliveryPlaceName || "Unknown";
        if (!orderTypeBreakdown["Delivery"].byPlace[place]) {
          orderTypeBreakdown["Delivery"].byPlace[place] = { count: 0, total: 0 };
        }
        orderTypeBreakdown["Delivery"].byPlace[place].count += 1;
        orderTypeBreakdown["Delivery"].byPlace[place].total += totalPrice;
      } else if (order.tableNo === "Takeaway") {
        orderTypeBreakdown["Takeaway"].count += 1;
        orderTypeBreakdown["Takeaway"].total += totalPrice;
      } else {
        // Assume Dine-In
        orderTypeBreakdown["Dine-In"].count += 1;
        orderTypeBreakdown["Dine-In"].total += totalPrice;
      }
    });

    // Order types summary
    let dineInCount = 0, dineInTotal = 0;
    let takeawayCount = 0, takeawayTotal = 0;
    let deliveryCount = 0, deliveryTotal = 0;

    orders.forEach(order => {
      const total = order.totalPrice || 0;

      if (order.deliveryType === "Delivery Service") {
        deliveryCount += 1;
        deliveryTotal += total;
      } else if (order.tableNo === "Takeaway") {
        takeawayCount += 1;
        takeawayTotal += total;
      } else {
        // Assume Dine-In (has tableNo and not Takeaway)
        dineInCount += 1;
        dineInTotal += total;
      }
    });

    const orderTypeSummary = {
      dineIn: { count: dineInCount, total: dineInTotal },
      takeaway: { count: takeawayCount, total: takeawayTotal },
      delivery: { count: deliveryCount, total: deliveryTotal }
    };

    res.json({
      totalIncome,
      totalOtherIncome,
      totalSupplierExpenses,
      totalBills,
      totalSalaries,
      totalOtherExpenses, 
      totalCost,
      netProfit,
      totalOrders,
      totaldeliveryOrders,
      totaldeliveryOrdersIncome,
      totalOrdersIncome,
      totalOrdersNetIncome,
      totalServiceChargeIncome,
      totalTableOrders,              // 👈 NEW
      deliveryPlacesBreakdown, 
      statusCounts,
      delayedOrders,           // ✅ new
      nextDayStatusUpdates,    // ✅ new
      paymentBreakdown,
      topMenus,
      waiterServiceEarnings,
      orderTypeBreakdown,
      orderTypeSummary
    });
  } catch (err) {
    console.error("Failed to fetch admin summary:", err.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

// GET /api/auth/admin/trend?filter=daily&year=2024&month=7
exports.getMonthlyTrend = async (req, res) => {
  const { year } = req.query || {};

  try {
    const selectedYear = parseInt(year) || new Date().getFullYear();

    // Fetch all data for that year
     const [orders, expenses, bills, salaries, otherIncomes, otherExpenses] = await Promise.all([
      Order.find({
        createdAt: {
          $gte: new Date(`${selectedYear}-01-01`),
          $lte: new Date(`${selectedYear}-12-31`)
        }
      }).select("totalPrice createdAt"),

      Expense.find({
        date: {
          $gte: new Date(`${selectedYear}-01-01`),
          $lte: new Date(`${selectedYear}-12-31`)
        }
      }).select("amount date"),

      KitchenBill.find({
        date: {
          $gte: new Date(`${selectedYear}-01-01`),
          $lte: new Date(`${selectedYear}-12-31`)
        }
      }).select("amount date"),

      Salary.find({
        date: {
          $gte: new Date(`${selectedYear}-01-01`),
          $lte: new Date(`${selectedYear}-12-31`)
        }
      }).select("total date"),

      OtherIncome.find({
        date: {
          $gte: new Date(`${selectedYear}-01-01`),
          $lte: new Date(`${selectedYear}-12-31`)
        }
      }).select("amount date"),

      OtherExpense.find({
        date: {
          $gte: new Date(`${selectedYear}-01-01`),
          $lte: new Date(`${selectedYear}-12-31`)
        }
      }).select("amount date")
    ]);

    // Helper to group by month
    const groupByMonth = (data, dateKey, valueKey) => {
      const result = Array(12).fill(0);
      data.forEach((item) => {
        const date = new Date(item[dateKey]);
        if (date.getFullYear() === selectedYear) {
          const monthIndex = date.getMonth(); // 0-based
          result[monthIndex] += item[valueKey];
        }
      });
      return result;
    };

    const incomeData = groupByMonth(orders, "createdAt", "totalPrice");
    const expenseData = groupByMonth(expenses, "date", "amount");
    const billData = groupByMonth(bills, "date", "amount");
    const salaryData = groupByMonth(salaries, "date", "total");
    const otherIncomeData = groupByMonth(otherIncomes, "date", "amount"); // ✅ NEW
    const otherExpenseData = groupByMonth(otherExpenses, "date", "amount"); // ✅ NEW

    // Group orders by month
    const orderCountByMonth = Array(12).fill(0);
    orders.forEach(order => {
      const date = new Date(order.createdAt);
      if (date.getFullYear() === selectedYear) {
        const monthIndex = date.getMonth();
        orderCountByMonth[monthIndex]++;
      }
    });

    res.json({
      months: [
        "Jan",
        "Feb",
        "Mar",
        "Apr",
        "May",
        "Jun",
        "Jul",
        "Aug",
        "Sep",
        "Oct",
        "Nov",
        "Dec"
      ],
      income: incomeData,
      otherIncome: otherIncomeData,
      supplierExpenses: expenseData,
      utilityBills: billData,
      salaries: salaryData,
      otherExpenses: otherExpenseData,
      orderCounts: orderCountByMonth
    });
  } catch (err) {
    console.error("Failed to fetch monthly trend:", err.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

exports.getExpenseSummary = async (req, res) => {
  const { month, year } = req.query;

  if (!month || !year) {
    return res.status(400).json({ error: "Month and year are required" });
  }

  try {
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month - 1, 31);

    // ✅ Fetch data — ADDED OtherExpense
    const [expenses, bills, salaries, otherExpenses] = await Promise.all([
      Expense.find({ date: { $gte: start, $lte: end } }),
      KitchenBill.find({ date: { $gte: start, $lte: end } }),
      Salary.find({ date: { $gte: start, $lte: end } }),
      OtherExpense.find({ date: { $gte: start, $lte: end } }) // ✅ NEW
    ]);

    // Helper: sum field across array
    const sumField = (arr, field) => arr.reduce((sum, item) => sum + item[field], 0);

    res.json({
      totalSupplierExpenses: sumField(expenses, "amount"),
      totalBills: sumField(bills, "amount"),
      totalSalaries: sumField(salaries, "total"),
      totalOtherExpenses: sumField(otherExpenses, "amount"), // ✅ NEW
      breakdown: {
        supplierExpenses: expenses.map(e => ({ date: e.date, amount: e.amount })),
        utilityBills: bills.map(b => ({ date: b.date, amount: b.amount })),
        salaries: salaries.map(s => ({ date: s.date, total: s.total })),
        otherExpenses: otherExpenses.map(e => ({ date: e.date, amount: e.amount })) // ✅ NEW
      }
    });
  } catch (err) {
    console.error("Failed to load expense summary:", err.message);
    res.status(500).json({ error: "Internal server error" });
  }
};