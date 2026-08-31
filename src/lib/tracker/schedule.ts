import { format, parseISO } from "date-fns";
import type { Habit, Schedule } from "./types";

export function isoDate(d: Date): string {
  return format(d, "yyyy-MM-dd");
}

export function monthKey(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, "0")}`;
}

export function completionKey(habitId: string, iso: string): string {
  return `${habitId}|${iso}`;
}

export function scheduleForMonth(habit: Habit, year: number, month: number): Schedule | null {
  const key = monthKey(year, month);
  if (habit.monthOverrides && habit.monthOverrides[key] !== undefined) {
    return habit.monthOverrides[key];
  }
  return habit.schedule;
}

export function isDayExpected(schedule: Schedule, date: Date): boolean {
  if (!schedule) return false;
  const day = date.getDay(); // 0 = Sun, 1 = Mon, ..., 5 = Fri, 6 = Sat

  if (schedule.type === "preset") {
    switch (schedule.id) {
      case "daily":
        return true;
      case "weekdays":
        return day >= 1 && day <= 5; // Mon-Fri
      case "weekends":
        return day === 0 || day === 6; // Sat-Sun
      case "mwf":
        return day === 1 || day === 3 || day === 5; // Mon, Wed, Fri
      case "tuth":
        return day === 2 || day === 4; // Tue, Thu
      case "mon":
        return day === 1;
      case "tue":
        return day === 2;
      case "wed":
        return day === 3;
      case "thu":
        return day === 4;
      case "fri":
        return day === 5;
      case "sat":
        return day === 6;
      case "sun":
        return day === 0;
      default:
        return true;
    }
  }

  if (schedule.type === "weekly") {
    return schedule.days.includes(day);
  }

  return true;
}

export function isRestDay(habit: Habit, iso: string): boolean {
  return Boolean(habit.restDays && habit.restDays[iso]);
}
