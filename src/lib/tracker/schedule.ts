import { format, parseISO } from "date-fns";
import type { Habit, Schedule } from "./types";

export const WEEKDAY_ABBR = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function isoDate(d: Date): string {
  return format(d, "yyyy-MM-dd");
}

export function monthKey(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, "0")}`;
}

export function completionKey(habitId: string, iso: string): string {
  return `${habitId}|${iso}`;
}

export function dayLabel(d: Date): string {
  return format(d, "EEE d");
}

export function mondayIndex(d: Date): number {
  const day = d.getDay(); // 0 is Sun, 1 is Mon, ...
  return (day + 6) % 7; // 0 for Mon, 6 for Sun
}

export function isSingleDay(schedule: Schedule): boolean {
  if (schedule.type === "weekly") {
    return schedule.days.length === 1;
  }
  if (schedule.type === "preset") {
    return ["mon", "tue", "wed", "thu", "fri", "sat", "sun"].includes(schedule.id);
  }
  if (schedule.type === "only" || schedule.type === "monthlyDate") {
    return true;
  }
  return false;
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

  // 1. المستهدف الشهري بالعدد (مثلاً 20 مرة في الشهر) - متاح للتسجيل في كل أيام الشهر
  if (schedule.type === "monthlyTarget") {
    return true;
  }

  // 2. يوم محدد في الشهر
  if (schedule.type === "monthlyDate") {
    return date.getDate() === schedule.day;
  }

  if (schedule.type === "only") {
    return date.getDate() === schedule.day;
  }

  // 3. أيام الأسبوع المخصصة
  if (schedule.type === "custom") {
    const monIdx = mondayIndex(date);
    return schedule.days.includes(monIdx as any);
  }

  if (schedule.type === "weekly") {
    return schedule.days.includes(day);
  }

  // 4. القوالب الجاهزة (Presets)
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

  return true;
}

export function isRestDay(habit: Habit, iso: string): boolean {
  return Boolean(habit.restDays && habit.restDays[iso]);
}
