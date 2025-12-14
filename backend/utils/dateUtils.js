// Returns array of scheduled dates between start and end (inclusive) that match dayOfWeek
function getScheduledDates(courseStartDate, courseEndDate, dayOfWeek) {
  const dayMap = {
    'Sunday': 0,
    'Monday': 1,
    'Tuesday': 2,
    'Wednesday': 3,
    'Thursday': 4,
    'Friday': 5,
    'Saturday': 6
  };

  const targetDay = dayMap[dayOfWeek];
  if (targetDay === undefined) return [];

  const scheduled = [];
  const current = new Date(courseStartDate);
  const end = new Date(courseEndDate);

  // Set to first occurrence of target day on or after start
  const startDay = current.getDay();
  let offset = (targetDay - startDay + 7) % 7;
  if (offset === 0 && current < courseStartDate) offset = 7; // if start is after the day
  current.setDate(current.getDate() + offset);

  while (current <= end) {
    scheduled.push(new Date(current));
    current.setDate(current.getDate() + 7);
  }

  return scheduled;
}

module.exports = { getScheduledDates };