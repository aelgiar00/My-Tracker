import type { Completion, Habit, TrackerSnapshot } from "./types";

const HABITS: Habit[] = [
  {
    id: "habit-pray",
    name: "Pray",
    schedule: { type: "preset", id: "daily" },
    archived: false,
    createdAt: "2026-08-22T06:00:00.000Z",
  },
  {
    id: "habit-cardio",
    name: "Treadmill Cardio",
    schedule: { type: "preset", id: "daily" },
    archived: false,
    createdAt: "2026-08-22T06:00:00.000Z",
  },
  {
    id: "habit-cf",
    name: "Codeforces / HackerRank",
    schedule: { type: "preset", id: "sat-tue" },
    archived: false,
    createdAt: "2026-08-22T06:00:00.000Z",
  },
  {
    id: "habit-python",
    name: "Python Pipeline",
    schedule: { type: "preset", id: "sun-thu" },
    archived: false,
    createdAt: "2026-08-22T06:00:00.000Z",
  },
  {
    id: "habit-typing",
    name: "Touch Typing",
    schedule: { type: "preset", id: "daily" },
    archived: false,
    createdAt: "2026-08-22T06:00:00.000Z",
  },
  {
    id: "habit-review",
    name: "Ship weekly review",
    schedule: { type: "only", day: 28 },
    archived: false,
    createdAt: "2026-08-22T06:00:00.000Z",
  },
];

function c(at: string, note?: string): Completion {
  return note ? { at, note } : { at };
}

const COMPLETIONS: Record<string, Completion> = {
  "habit-pray|2026-08-22": c("2026-08-22T06:12:00"),
  "habit-pray|2026-08-23": c("2026-08-23T06:08:00"),
  "habit-pray|2026-08-24": c("2026-08-24T06:15:00"),
  "habit-pray|2026-08-25": c("2026-08-25T06:11:00"),
  "habit-cardio|2026-08-22": c("2026-08-22T07:40:00", "20 min incline walk"),
  "habit-cardio|2026-08-24": c("2026-08-24T07:35:00"),
  "habit-cardio|2026-08-25": c("2026-08-25T07:28:00"),
  "habit-cf|2026-08-22": c("2026-08-22T21:10:00", "Div 2 A–C"),
  "habit-cf|2026-08-25": c("2026-08-25T20:44:00"),
  "habit-python|2026-08-24": c("2026-08-24T19:20:00"),
  "habit-python|2026-08-25": c("2026-08-25T18:55:00", "cleaned ingest job"),
  "habit-typing|2026-08-22": c("2026-08-22T22:05:00"),
  "habit-typing|2026-08-23": c("2026-08-23T21:48:00"),
  "habit-typing|2026-08-24": c("2026-08-24T22:12:00"),
  "habit-typing|2026-08-25": c("2026-08-25T09:16:00"),
};

export const DEFAULT_TRACKING_START = "2026-08-22";

export function createSeedSnapshot(): TrackerSnapshot {
  return {
    habits: HABITS.map((h) => ({ ...h })),
    completions: { ...COMPLETIONS },
    trackingStart: DEFAULT_TRACKING_START,
    hidePast: false,
    dailyTasks: {
      "2026-08-25": [
        { id: "task-25-1", name: "Finish university assignment", done: false, createdAt: "2026-08-25T09:00:00.000Z" },
      ],
    },
    seeded: true,
  };
}

export const HABIT_PACKS: { id: string; label: string; blurb: string; names: string[] }[] = [
  {
    id: "original",
    label: "Core five",
    blurb: "Pray, cardio, problems, pipeline, typing",
    names: ["Pray", "Treadmill Cardio", "Codeforces / HackerRank", "Python Pipeline", "Touch Typing"],
  },
  {
    id: "focus",
    label: "Deep work",
    blurb: "Reading, writing, and a protected block",
    names: ["Deep work block", "Read 20 pages", "Write 300 words"],
  },
  {
    id: "body",
    label: "Body",
    blurb: "Move, lift, and recover",
    names: ["Treadmill Cardio", "Strength session", "Stretch / mobility"],
  },
];
