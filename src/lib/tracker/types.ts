export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6; // Monday = 0

export type Schedule =
  | { type: "preset"; id: string }
  | { type: "custom"; days: Weekday[] }
  | { type: "only"; day: number }
  | { type: "weekly"; days: number[] }
  | { type: "monthlyDate"; day: number }
  | { type: "monthlyTarget"; targetDays: number };

export type HabitPriority = "critical" | "standard";

export type Habit = {
  id: string;
  name: string;
  schedule: Schedule;
  archived: boolean;
  createdAt: string;
  /** Estimated execution duration in minutes (e.g., 20, 30, 90, 120) */
  durationMinutes?: number;
  /** Habit execution priority for AI time-budget allocation */
  priority?: HabitPriority;
  /** Per-month schedule overrides. null means the habit is disabled for that month. */
  monthOverrides?: Record<string, Schedule | null>;
  /** New habits can be scoped to the month they were created in. */
  monthlyOnly?: boolean;
  /** Specific dates on which a normally scheduled habit is excused/resting. */
  restDays?: Record<string, boolean>;
};

export type Completion = {
  at: string;
  note?: string;
};

export type DailyTask = {
  id: string;
  name: string;
  done: boolean;
  createdAt: string;
};

export type TrackerSnapshot = {
  habits: Habit[];
  completions: Record<string, Completion>;
  dailyTasks: Record<string, DailyTask[]>;
  trackingStart: string;
  hidePast: boolean;
  seeded: boolean;
};

export type DayStat = {
  iso: string;
  date: Date;
  label: string;
  weekday: Weekday;
  weekdayAbbr: string;
  expected: number;
  completed: number;
  score: number;
};

export type HabitStat = {
  habit: Habit;
  expected: number;
  completed: number;
  score: number;
  recurring: boolean;
};

export type MonthStats = {
  totalExpected: number;
  totalCompleted: number;
  expectedThroughToday: number;
  completedThroughToday: number;
  monthScore: number;
  paceScore: number;
  todayExpected: number;
  todayCompleted: number;
  todayScore: number;
  todayIso: string;
  todayLabel: string;
  trackedCount: number;
  currentStreak: number;
  longestStreak: number;
  bestWeekday: { abbr: string; score: number } | null;
  weakestHabit: { name: string; score: number } | null;
  daily: DayStat[];
  habits: HabitStat[];
};

export type StatsResult = MonthStats & {
  habitsBreakdown?: HabitStat[];
  daysBreakdown?: DayStat[];
};
