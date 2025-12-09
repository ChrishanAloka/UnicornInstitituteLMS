import React, { useState, useEffect } from "react";
import axios from "axios";
import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
} from "chart.js";
import { FaMoneyBillWave, FaTruckLoading, FaFileInvoiceDollar, FaUserTie, FaChartPie, FaBalanceScale,  FaGift,  FaTools } from "react-icons/fa";

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);


const MonthlyReport = () => {
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [month, setMonth] = useState(new Date().getMonth());
  const [year, setYear] = useState(new Date().getFullYear());

  const symbol = localStorage.getItem("currencySymbol") || "$";
  

  // Load report data based on selected month/year
  useEffect(() => {
    const fetchReport = async () => {
      const token = localStorage.getItem("token");
      try {
        const res = await axios.get(
          `https://projectnuckels.onrender.com/api/auth/report/monthly?month=${parseInt(month) + 1}&year=${parseInt(year)}`,
          {
            headers: { Authorization: `Bearer ${token}` }
          }
        );
        setReportData(res.data);
        setLoading(false);
      } catch (err) {
        console.error("Failed to load report:", err.response?.data || err.message);
        alert("Failed to load monthly report");
        setLoading(false);
      }
    };

    fetchReport();
  }, [month, year]);

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center min-vh-100">
        <div className="text-center">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="mt-3">Loading Monthly Report...</p>
        </div>
      </div>
    );
  }

  if (
    !reportData ||
    !reportData.monthlyIncome ||
    !reportData.monthlySupplierExpenses ||
    !reportData.monthlyBills ||
    !reportData.monthlySalaries
  )
  return <div>No data found</div>;

  // Generate dates for chart/table
  const getDatesInMonth = (year, month) => {
    const numDays = new Date(year, month, 0).getDate();
    const dates = [];

    for (let i = 1; i <= numDays; i++) {
      const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(i).padStart(2, "0")}`;
      dates.push(dateStr);
    }

    return dates;
  };

  const allDates = getDatesInMonth(year, parseInt(month) + 1);

  const incomeData = allDates.map(date => reportData.monthlyIncome[date] || 0);
  const supplierExpenseData = allDates.map(date => reportData.monthlySupplierExpenses[date] || 0);
  const billData = allDates.map(date => reportData.monthlyBills[date] || 0);
  const salaryData = allDates.map(date => reportData.monthlySalaries[date] || 0);

  const totalSupplierExpenses = supplierExpenseData.reduce((a, b) => a + b, 0);
  const totalBills = billData.reduce((a, b) => a + b, 0);
  const totalSalaries = salaryData.reduce((a, b) => a + b, 0);

  // ✅ Update summary calculations
  const otherIncomeData = allDates.map(date => reportData.monthlyOtherIncome[date] || 0);
  const otherExpenseData = allDates.map(date => reportData.monthlyOtherExpenses[date] || 0);

  const totalOtherIncome = otherIncomeData.reduce((a, b) => a + b, 0);
  const totalOtherExpenses = otherExpenseData.reduce((a, b) => a + b, 0);

  const totalExpenses =
    totalSupplierExpenses +
    totalBills +
    totalSalaries +
    totalOtherExpenses;

  const totalIncome = incomeData.reduce((a, b) => a + b, 0) + totalOtherIncome;
  const netProfit = totalIncome - totalExpenses;

    

  const chartData = {
    labels: allDates.map(date => date.split("-")[2]),
    datasets: [
      {
        label: `Income (${symbol})`,
        backgroundColor: "rgba(75,192,192,0.6)",
        borderColor: "rgba(75,192,192,1)",
        borderWidth: 1,
        data: incomeData
      },
      {
        label: "Suppliers",
        backgroundColor: "rgba(255,99,132,0.6)",
        borderColor: "rgba(255,99,132,1)",
        borderWidth: 1,
        data: supplierExpenseData
      },
      {
        label: `Other Income (${symbol})`,
        backgroundColor: "rgba(153, 102, 255, 0.6)", // Purple
        borderColor: "rgba(153, 102, 255, 1)",
        borderWidth: 1,
        data: otherIncomeData
      },
      {
        label: "Suppliers",
        backgroundColor: "rgba(255,99,132,0.6)",
        borderColor: "rgba(255,99,132,1)",
        borderWidth: 1,
        data: supplierExpenseData
      },
      {
        label: "Kitchen Bills",
        backgroundColor: "rgba(255,206,86,0.6)",
        borderColor: "rgba(255,206,86,1)",
        borderWidth: 1,
        data: billData
      },
      {
        label: "Salaries",
        backgroundColor: "rgba(54,162,235,0.6)",
        borderColor: "rgba(54,162,235,1)",
        borderWidth: 1,
        data: salaryData
      },
      {
        label: "Other Expenses",
        backgroundColor: "rgba(255, 159, 64, 0.6)", // Orange
        borderColor: "rgba(255, 159, 64, 1)",
        borderWidth: 1,
        data: otherExpenseData
      }
    ]
  };

  const options = {
    responsive: true,
    plugins: {
      legend: { position: "top" },
      title: {
        display: true,
        text: `Monthly Report - ${new Date(year, month).toLocaleString('default', { month: 'long', year: 'numeric' })}`
      }
    }
  };


  return (
    <div className="container my-4">
      <h2 className="text-primary mb-4 fw-bold border-bottom pb-2">
        Monthly Income & Expense Report
      </h2>

      {/* Month/Year Picker */}
      <div className="mb-4 d-flex flex-wrap gap-4 align-items-end">
        <div>
          <label className="form-label fw-semibold">Select Month</label>
          <select
            value={month}
            onChange={(e) => setMonth(parseInt(e.target.value))}
            className="form-select shadow-sm"
          >
            {[...Array(12)].map((_, i) => (
              <option key={i} value={i}>
                {new Date(year, i).toLocaleString("default", { month: "long" })}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="form-label fw-semibold">Select Year</label>
          <input
            type="number"
            value={year}
            onChange={(e) => setYear(parseInt(e.target.value))}
            className="form-control shadow-sm"
            min="2020"
            max="2030"
          />
        </div>
      </div>

      {/* Chart */}
      <div className="mb-5 p-3 border rounded bg-white shadow-sm">
        <Bar data={chartData} options={options} />
      </div>

      {/* Summary Stats */}

<div className="summary-stats my-5">
  <h4 className="mb-4">📊 Summary - {new Date(year, month).toLocaleString('default', { month: 'long', year: 'numeric' })}</h4>

  <div className="row g-4">
    {/* Total Income */}
    <div className="col-md-4">
      <div className="p-4 rounded shadow-sm border-start border-success border-5 bg-light">
        <div className="d-flex align-items-center">
          <FaMoneyBillWave size={30} className="text-success me-3" />
          <div>
            <small className="text-muted">Total Income</small>
            <h5 className="mb-0 text-success">{symbol}{totalIncome.toFixed(2)}</h5>
          </div>
        </div>
      </div>
    </div>

    {/* Total Expenses */}
    <div className="col-md-4">
      <div className="p-4 rounded shadow-sm border-start border-danger border-5 bg-light">
        <div className="d-flex align-items-center">
          <FaChartPie size={30} className="text-danger me-3" />
          <div>
            <small className="text-muted">Total Expenses</small>
            <h5 className="mb-0 text-danger">{symbol}{totalExpenses.toFixed(2)}</h5>
          </div>
        </div>
      </div>
    </div>

    {/* Net Profit */}
    <div className="col-md-4">
      <div className={`p-4 rounded shadow-sm border-start border-5 bg-light ${netProfit >= 0 ? 'border-info' : 'border-danger'}`}>
        <div className="d-flex align-items-center">
          <FaBalanceScale size={30} className={`${netProfit >= 0 ? 'text-info' : 'text-danger'} me-3`} />
          <div>
            <small className="text-muted">Net Profit</small>
            <h5 className={`mb-0 ${netProfit >= 0 ? 'text-info' : 'text-danger'}`}>
              {symbol}{netProfit.toFixed(2)}
            </h5>
          </div>
        </div>
      </div>
    </div>

    {/* Other Income */}
    <div className="col-md-4">
      <div className="p-4 rounded shadow-sm border-start border-purple border-5 bg-light">
        <div className="d-flex align-items-center">
          <FaGift size={30} className="text-purple me-3" style={{ color: "#9966ff" }} />
          <div>
            <small className="text-muted">Other Income</small>
            <h5 className="mb-0" style={{ color: "#9966ff" }}>{symbol}{totalOtherIncome.toFixed(2)}</h5>
          </div>
        </div>
      </div>
    </div>

    {/* Other Expenses */}
    <div className="col-md-4">
      <div className="p-4 rounded shadow-sm border-start border-orange border-5 bg-light">
        <div className="d-flex align-items-center">
          <FaTools size={30} className="text-orange me-3" style={{ color: "#ff9f40" }} />
          <div>
            <small className="text-muted">Other Expenses</small>
            <h5 className="mb-0" style={{ color: "#ff9f40" }}>{symbol}{totalOtherExpenses.toFixed(2)}</h5>
          </div>
        </div>
      </div>
    </div>

    {/* Supplier Expenses */}
    <div className="col-md-4">
      <div className="p-4 rounded shadow-sm border-start border-dark border-5 bg-light">
        <div className="d-flex align-items-center">
          <FaTruckLoading size={30} className="text-dark me-3" />
          <div>
            <small className="text-muted">Supplier Expenses</small>
            <h5 className="mb-0 text-dark">{symbol}{totalSupplierExpenses.toFixed(2)}</h5>
          </div>
        </div>
      </div>
    </div>

    {/* Utility Bills */}
    <div className="col-md-4">
      <div className="p-4 rounded shadow-sm border-start border-warning border-5 bg-light">
        <div className="d-flex align-items-center">
          <FaFileInvoiceDollar size={30} className="text-warning me-3" />
          <div>
            <small className="text-muted">Kitchen Bills</small>
            <h5 className="mb-0 text-warning">{symbol}{totalBills.toFixed(2)}</h5>
          </div>
        </div>
      </div>
    </div>

    {/* Salaries */}
    <div className="col-md-4">
      <div className="p-4 rounded shadow-sm border-start border-primary border-5 bg-light">
        <div className="d-flex align-items-center">
          <FaUserTie size={30} className="text-primary me-3" />
          <div>
            <small className="text-muted">Salaries</small>
            <h5 className="mb-0 text-primary">{symbol}{totalSalaries.toFixed(2)}</h5>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>



      {/* Daily Breakdown Table */}
      <h4 className="mt-4 mb-3">📅 Daily Breakdown</h4>
      <div className="table-responsive shadow-sm border rounded">
        <table className="table table-bordered table-hover align-middle mb-0">
          <thead className="table-light">
            <tr>
              <th>Date</th>
              <th>Income ({symbol})</th>
              <th>Other Income ({symbol})</th> {/* ✅ NEW */}
              <th>Suppliers ({symbol})</th>
              <th>Bills ({symbol})</th>
              <th>Salaries ({symbol})</th>
              <th>Other Expenses ({symbol})</th> {/* ✅ NEW */}
              <th>Total Exp ({symbol})</th>
              <th>Net ({symbol})</th>
            </tr>
          </thead>
          <tbody>
            {allDates.map((date, idx) => {
              const income = incomeData[idx].toFixed(2);
              const otherIncome = otherIncomeData[idx].toFixed(2); // ✅ NEW
              const supplier = supplierExpenseData[idx].toFixed(2);
              const bill = billData[idx].toFixed(2);
              const salary = salaryData[idx].toFixed(2);
              const otherExpense = otherExpenseData[idx].toFixed(2); // ✅ NEW

              const total = (
                parseFloat(supplier) +
                parseFloat(bill) +
                parseFloat(salary) +
                parseFloat(otherExpense) // ✅ NEW
              ).toFixed(2);

              const net = (
                parseFloat(income) +
                parseFloat(otherIncome) - // ✅ NEW
                parseFloat(total)
              ).toFixed(2);

              return (
                <tr key={idx}>
                  <td>{date}</td>
                  <td>{symbol}{income}</td>
                  <td>{symbol}{otherIncome}</td> {/* ✅ NEW */}
                  <td>{symbol}{supplier}</td>
                  <td>{symbol}{bill}</td>
                  <td>{symbol}{salary}</td>
                  <td>{symbol}{otherExpense}</td> {/* ✅ NEW */}
                  <td>{symbol}{total}</td>
                  <td className={net >= 0 ? "text-success" : "text-danger"}>
                    {symbol}{net}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default MonthlyReport;