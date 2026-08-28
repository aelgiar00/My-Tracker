import { eachDayOfInterval, parseISO, startOfDay } from "date-fns";
import type { Completion, Habit, MonthStats } from "./types";
import { dayLabel, isDayExpected, isRestDay, isSingleDay, isoDate, mondayIndex, scheduleForMonth, WEEKDAY_ABBR } from "./schedule";

export function monthDays(year: number, month: number, trackingStart: string): Date[] {
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0);
  const track = startOfDay(parseISO(trackingStart));
  const from = start < track ? track : start;
  if (from > end) return [];
  return eachDayOfInterval({ start: from, end });
}

export function scoreFill(pct: number): string {
  if (pct >= 80) return "var(--color-score-5)";
  if (pct >= 60) return "var(--color-score-4)";
  if (pct >= 40) return "var(--color-score-3)";
  if (pct >= 20) return "var(--color-score-2)";
  return "var(--color-score-1)";
}

export function computeStats(
  habits: Habit[],
  completions: Record<string, Completion>,
  days: Date[],
  today: Date,
  dailyTasks: Record<string, { done: boolean }[]> = {},
): MonthStats {
  const active = habits.filter((h) => !h.archived && h.name.trim());
  const todayStart = startOfDay(today);
  const todayIso = isoDate(todayStart);

  const daily = days.map((date) => {
    const iso = isoDate(date);
    let expected = 0;
    let completed = 0;
    for (const habit of active) {
      const schedule = scheduleForMonth(habit, date.getFullYear(), date.getMonth() + 1);
      if (!schedule || !isDayExpected(schedule, date) || isRestDay(habit, isoDate(date))) continue;
      expected += 1;
      if (completions[`${habit.id}|${iso}`]) completed += 1;
    }
    const tasks = dailyTasks[iso] ?? [];
    expected += tasks.length;
    completed += tasks.filter((task) => task.done).length;
    return {
      iso,
      date,
      label: dayLabel(date),
      weekday: mondayIndex(date),
      weekdayAbbr: WEEKDAY_ABBR[mondayIndex(date)],
      expected,
      completed,
      score: expected > 0 ? (completed / expected) * 100 : 0,
    };
  });

  const habitStats = active.map((habit) => {
    let expected = 0;
    let completed = 0;
    for (const date of days) {
      const schedule = scheduleForMonth(habit, date.getFullYear(), date.getMonth() + 1);
      if (!schedule || !isDayExpected(schedule, date) || isRestDay(habit, isoDate(date))) continue;
      expected += 1;
      if (completions[`${habit.id}|${isoDate(date)}`]) completed += 1;
    }
    return {
      habit,
      expected,
      completed,
      score: expected > 0 ? (completed / expected) * 100 : 0,
      recurring: !isSingleDay(habit.schedule),
    };
  });

  let totalExpected = 0;
  let totalCompleted = 0;
  let expectedThroughToday = 0;
  let completedThroughToday = 0;
  for (const d of daily) {
    totalExpected += d.expected;
    totalCompleted += d.completed;
    if (d.date <= todayStart) {
      expectedThroughToday += d.expected;
      completedThroughToday += d.completed;
    }
  }

  const weekdayAgg: Record<string, [number, number]> = {};
  for (const abbr of WEEKDAY_ABBR) weekdayAgg[abbr] = [0, 0];
  for (const d of daily) {
    if (d.date > todayStart) continue;
    weekdayAgg[d.weekdayAbbr][0] += d.completed;
    weekdayAgg[d.weekdayAbbr][1] += d.expected;
  }

  let bestWeekday: { abbr: string; score: number } | null = null;
  for (const abbr of WEEKDAY_ABBR) {
    const [done, exp] = weekdayAgg[abbr];
    if (exp <= 0) continue;
    const score = done / exp;
    if (!bestWeekday || score > bestWeekday.score) bestWeekday = { abbr, score };
  }

  const recurring = habitStats.filter((h) => h.recurring && h.expected > 0);
  let weakestHabit: { name: string; score: number } | null = null;
  for (const h of recurring) {
    if (!weakestHabit || h.score < weakestHabit.score) {
      weakestHabit = { name: h.habit.name, score: h.score };
    }
  }

  const pastOrToday = daily.filter((d) => d.date <= todayStart);
  let longestStreak = 0;
  let run = 0;
  for (const d of pastOrToday) {
    if (d.expected === 0) continue;
    if (d.completed === d.expected) {
      run += 1;
      if (run > longestStreak) longestStreak = run;
    } else {
      run = 0;
    }
  }

  let currentStreak = 0;
  const reverse = [...pastOrToday].reverse();
  for (const d of reverse) {
    if (d.expected === 0) continue;
    if (d.completed === d.expected) {
      currentStreak += 1;
      continue;
    }
    if (d.iso === todayIso) continue;
    break;
  }

  const todayRow = daily.find((d) => d.iso === todayIso);
  const lastRow = daily[daily.length - 1];
  const todayExpected = todayRow?.expected ?? 0;
  const todayCompleted = todayRow?.completed ?? 0;

  return {
    totalExpected,
    totalCompleted,
    expectedThroughToday,
    completedThroughToday,
    monthScore: totalExpected > 0 ? (totalCompleted / totalExpected) * 100 : 0,
    paceScore: expectedThroughToday > 0 ? (completedThroughToday / expectedThroughToday) * 100 : 0,
    todayExpected,
    todayCompleted,
    todayScore: todayExpected > 0 ? (todayCompleted / todayExpected) * 100 : 0,
    todayIso: todayRow?.iso ?? lastRow?.iso ?? todayIso,
    todayLabel: todayRow?.label ?? lastRow?.label ?? dayLabel(todayStart),
    trackedCount: active.length,
    currentStreak,
    longestStreak,
    bestWeekday,
    weakestHabit,
    daily,
    habits: habitStats,
  };
}

export type CellStatus = "rest" | "done" | "miss" | "pending" | "upcoming";

export function cellStatus(
  expected: boolean,
  done: boolean,
  iso: string,
  todayIso: string,
): CellStatus {
  if (!expected) return "rest";
  if (done) return "done";
  if (iso === todayIso) return "pending";
  if (iso > todayIso) return "upcoming";
  return "miss";
}
