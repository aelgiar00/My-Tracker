import { format } from "date-fns";
import type { Schedule, Weekday } from "./types";

export type { Weekday };

export const WEEKDAY_ABBR = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;
export const WEEKDAY_FULL = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
] as const;

export type PresetDef = {
  id: string;
  label: string;
  days: Weekday[];
};

export const SCHEDULE_PRESETS: PresetDef[] = [
  { id: "daily", label: "Daily", days: [0, 1, 2, 3, 4, 5, 6] },
  { id: "weekdays", label: "Weekdays", days: [0, 1, 2, 3, 4] },
  { id: "weekends", label: "Weekends", days: [5, 6] },
  { id: "sun-thu", label: "Sun–Thu", days: [6, 0, 1, 2, 3] },
  { id: "sat-tue", label: "Sat/Tue", days: [5, 1] },
  { id: "sun-wed", label: "Sun/Wed", days: [6, 2] },
  { id: "mon-thu", label: "Mon/Thu", days: [0, 3] },
  { id: "mondays", label: "Mondays", days: [0] },
  { id: "tuesdays", label: "Tuesdays", days: [1] },
  { id: "wednesdays", label: "Wednesdays", days: [2] },
  { id: "thursdays", label: "Thursdays", days: [3] },
  { id: "fridays", label: "Fridays", days: [4] },
  { id: "saturdays", label: "Saturdays", days: [5] },
  { id: "sundays", label: "Sundays", days: [6] },
];

export const PRESET_BY_ID = Object.fromEntries(
  SCHEDULE_PRESETS.map((p) => [p.id, p]),
) as Record<string, PresetDef>;

export function mondayIndex(date: Date): Weekday {
  const d = date.getDay();
  return (d === 0 ? 6 : d - 1) as Weekday;
}

export function isoDate(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

export function dayLabel(date: Date): string {
  return `${WEEKDAY_ABBR[mondayIndex(date)]} ${date.getDate()}`;
}

export function scheduleDays(schedule: Schedule): Weekday[] | null {
  if (schedule.type === "only") return null;
  if (schedule.type === "custom") return schedule.days;
  return PRESET_BY_ID[schedule.id]?.days ?? [0, 1, 2, 3, 4, 5, 6];
}

export function isDayExpected(schedule: Schedule, date: Date): boolean {
  if (schedule.type === "only") return date.getDate() === schedule.day;
  const days = scheduleDays(schedule);
  if (!days || days.length === 0) return false;
  return days.includes(mondayIndex(date));
}

export function isSingleDay(schedule: Schedule): boolean {
  return schedule.type === "only";
}

export function scheduleLabel(schedule: Schedule): string {
  if (schedule.type === "only") return `Only ${schedule.day}`;
  if (schedule.type === "custom") {
    if (schedule.days.length === 7) return "Daily";
    if (schedule.days.length === 0) return "Never";
    return schedule.days.map((d) => WEEKDAY_ABBR[d]).join("/");
  }
  return PRESET_BY_ID[schedule.id]?.label ?? "Daily";
}

export function isRestDay(habit: { restDays?: Record<string, boolean> }, iso: string): boolean {
  return habit.restDays?.[iso] === true;
}

export function completionKey(habitId: string, iso: string): string {
  return `${habitId}|${iso}`;
}

export function parseCompletionKey(key: string): { habitId: string; iso: string } | null {
  const i = key.indexOf("|");
  if (i <= 0) return null;
  return { habitId: key.slice(0, i), iso: key.slice(i + 1) };
}


export function monthKey(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, "0")}`;
}

export function scheduleForMonth(
  habit: { schedule: Schedule; monthOverrides?: Record<string, Schedule | null>; monthlyOnly?: boolean },
  year: number,
  month: number,
): Schedule | null {
  const key = monthKey(year, month);
  if (habit.monthOverrides && Object.prototype.hasOwnProperty.call(habit.monthOverrides, key)) {
    return habit.monthOverrides[key] ?? null;
  }
  if (habit.monthlyOnly) return null;
  return habit.schedule;
}
