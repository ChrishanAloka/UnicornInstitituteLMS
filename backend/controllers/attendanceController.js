const Attendance = require("../models/Attendance");
const User = require("../models/Employee");

// GET /api/auth/admin/attendance/monthly-summary?month=7&year=2025
exports.getMonthlySummary = async (req, res) => {
  const { month, year } = req.query;

  if (!month || !year) {
    return res.status(400).json({ error: "Month and Year are required" });
  }

  try {
    // Build start and end of selected month
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59); // End of month

    // Log what we're querying
    // console.log("Querying from:", startDate.toISOString());
    // console.log("To:", endDate.toISOString()); 

    const punchData = await Attendance.find({
      date: {
        $gte: startDate,
        $lte: endDate
      }
    }).populate("employeeId", "name role id");

    // console.log("Raw Punch Data Found:", punchData); // 👈 LOG FOUND DATA

    if (!punchData.length) {
      return res.json([]); // Return empty list but don't crash
    }

    const employeeMap = {};

    punchData.forEach(entry => {
      if (!entry.employeeId) return; // Skip invalid entries

      const empId = entry.employeeId._id.toString();
      const empName = entry.employeeId.name;
      const empRole = entry.employeeId.role;

      if (!employeeMap[empId]) {
        employeeMap[empId] = {
          employeeId: empId,
          name: empName,
          role: empRole,
          dates: [],
          totalMinutes: 0
        };
      }

      const day = entry.date.toISOString().split("T")[0];
      if (!employeeMap[empId].dates.includes(day)) {
        employeeMap[empId].dates.push(day);
      }

      let dailyMinutes = 0;

      // Loop through punches in pairs (In → Break In / Break Out → Out)
      for (let i = 0; i < entry.punches.length - 1; i++) {
        const curr = entry.punches[i];
        const next = entry.punches[i + 1];

        if (
          (curr.type === "In" && next.type === "Break In") ||
          (curr.type === "Break Out" && next.type === "Out")
        ) {
          const inTime = parseTime(curr.time);
          const outTime = parseTime(next.time);

          if (!inTime || !outTime) {
            console.warn("Invalid time format:", curr.time, next.time);
            continue;
          }

          const inTotal = inTime.hours * 60 + inTime.minutes;
          const outTotal = outTime.hours * 60 + outTime.minutes;

          if (outTotal > inTotal) {
            dailyMinutes += outTotal - inTotal;
            console.log(`Added ${outTotal - inTotal} mins for ${curr.type} → ${next.type}`);
          } else {
            console.warn("Out time is before In time", curr.time, next.time);
          }
  }
      }

      employeeMap[empId].totalMinutes += dailyMinutes;
    });

    // Get all cashier/admin users
    const allEmployees = await User.find({
      role: { $in: ["admin", "cashier"] 
    }});

    // Build final output
    const summary = allEmployees.map(emp => {
      const record = Object.values(employeeMap).find(e => e.employeeId === emp._id.toString());

      const totalHours = record ? (record.totalMinutes / 60).toFixed(2) : "0.00";
      const totalDays = record?.dates.length || 0;
      const otHours =  totalHours - (totalDays * 8);

      let status = "On Time";
      if (totalDays * 8 < parseFloat(totalHours)) {
        status = "Overtime";
      } else if (totalDays * 8 > parseFloat(totalHours)) {
        status = "Undertime";
      }

      return {
        name: emp.name,
        employeeId: emp._id,
        firstPunch: record?.dates[0] || "-",
        lastPunch: record?.dates[record.dates.length - 1] || "-",
        totalDays,
        totalHours,
        otHours,
        status
      };
    });

    // console.log("Final Summary:", summary); // 👀 Final output
    res.json(summary);
  } catch (err) {
    console.error("Failed to load monthly summary:", err.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

function parseTime(timeStr) {
  const match = timeStr.match(/(\d+):(\d+)\s*([APap][Mm])/i);
  if (!match) return null;

  let hours = parseInt(match[1]);
  const minutes = parseInt(match[2]);
  const period = match[3].toUpperCase();

  // Convert to 24-hour format
  if (period === "AM" && hours === 12) {
    hours = 0;
  } else if (period === "PM" && hours < 12) {
    hours += 12;
  }

  return { hours, minutes };
}

// Helper function to parse both ISO and legacy time formats
function parseLegacyTime(timeStr) {
  if (typeof timeStr === "string" && timeStr.includes(":")) {
    const d = new Date();
    const [hourStr, minuteStr, period] = timeStr.match(/(\d+):(\d+) (AM|PM)/i)?.slice(1) || [];
    
    if (hourStr && minuteStr && period) {
      let hour = parseInt(hourStr);
      const min = parseInt(minuteStr);
      if (period.toUpperCase() === "PM" && hour !== 12) hour += 12;
      if (period.toUpperCase() === "AM" && hour === 12) hour = 0;

      const date = new Date();
      date.setHours(hour, min, 0, 0);
      return date;
    }

    // If already a full date string
    const parsedDate = new Date(timeStr);
    if (!isNaN(parsedDate.getTime())) {
      return parsedDate;
    }
  }

  return null;
}

// GET /api/auth/attendance/summary?_id=...&month=...&year=...
exports.getSummary = async (req, res) => {
  const { _id, month, year } = req.query;

  if (!_id || !month || !year) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  try {
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month - 1, 31);

    const punches = await Attendance.find({
      employeeId: _id,
      date: { $gte: start, $lte: end }
    }).sort({ date: 1 });

    const daily = [];

    punches.forEach(entry => {
      const entryDate = new Date(entry.date);
      const dateKey = entryDate.toISOString().split("T")[0];

      const existing = daily.find(d => d.date === dateKey);
      if (existing) {
        existing.punches.push(...entry.punches);
      } else {
        daily.push({
          date: dateKey,
          punches: [...entry.punches]
        });
      }
    });

    // Calculate total working hours per day
    daily.forEach(day => {
      let totalMinutes = 0;
      let dailyMinutes =0;
      // Pair valid punch entries and calculate working time
      for (let i = 0; i < day.punches.length; i++) {
        const curr = day.punches[i];
        const next = day.punches[i + 1];

        // Only calculate between valid punch types
        if (!next) continue;

        const isWorkStart = curr.type === "In" && next.type === "Break In";
        const isWorkEnd = curr.type === "Break Out" && next.type === "Out";

        if (isWorkStart || isWorkEnd) {
          const [inHr, inMin] = curr.time.split(":").map(Number);
          const [outHr, outMin] = next.time.split(":").map(Number);

          const inTime = parseTime(curr.time);
          const outTime = parseTime(next.time);

          const inTotal = inTime.hours * 60 + inTime.minutes;
          const outTotal = outTime.hours * 60 + outTime.minutes;

          // const inTotal = inHr * 60 + inMin;
          // const outTotal = outHr * 60 + outMin;

          if (outTotal > inTotal) {
            dailyMinutes += outTotal - inTotal;
          } else {
            console.warn("Invalid punch order:", curr.time, curr.type, "→", next.time, next.type);
          }
        }
      }

      day.totalHours = (dailyMinutes / 60).toFixed(2);
    });

    res.json({ daily });
  } catch (err) {
    console.error("Failed to load punches:", err.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

// POST /api/auth/attendance/punch
exports.recordPunch = async (req, res) => {
  const { employeeId, punchType } = req.body;

  if (!employeeId || !punchType) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const punchTime = new Date().toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit"
    });

    const existing = await Attendance.findOne({
      employeeId,
      date: {
        $gte: today,
        $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000)
      }
    });

    if (existing) {
      existing.punches.push({ time: punchTime, type: punchType });
      await existing.save();
    } else {
      const newPunch = new Attendance({
        employeeId,
        punches: [{ time: punchTime, type: punchType }]
      });

      await newPunch.save();
    }

    res.json(punchTime);
  } catch (err) {
    console.error("Failed to record punch:", err.message);
    res.status(500).json({ error: "Internal server error" });
  }
};