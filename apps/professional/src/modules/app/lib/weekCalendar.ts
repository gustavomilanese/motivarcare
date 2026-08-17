/** Monday 00:00 local of the week that contains `date`. */
export function getStartOfWeek(date: Date): Date {
  const start = new Date(date);
  const weekday = (start.getDay() + 6) % 7;
  start.setDate(start.getDate() - weekday);
  start.setHours(0, 0, 0, 0);
  return start;
}

export function getWeekCalendarDays(viewDate: Date): Date[] {
  const startDate = getStartOfWeek(viewDate);
  return Array.from({ length: 7 }, (_, index) => {
    const day = new Date(startDate);
    day.setDate(startDate.getDate() + index);
    return day;
  });
}

export function getCalendarDayKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function getMonthCalendarDays(monthDate: Date): Date[] {
  const start = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
  const end = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0);
  const days: Date[] = [];
  for (let current = new Date(start); current <= end; current.setDate(current.getDate() + 1)) {
    days.push(new Date(current));
  }
  return days;
}
