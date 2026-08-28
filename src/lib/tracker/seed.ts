import type { TrackerSnapshot } from "@/lib/tracker/types";

export interface HabitPack {
  id: string;
  name: string;
  description: string;
  habits: string[];
}

export const HABIT_PACKS: HabitPack[] = [
  {
    id: "core-pipeline",
    name: "Engineering & Learning Core",
    description: "Daily engineering, DEPI track, and technical discipline",
    habits: [
      "Pray",
      "Touch Typing",
      "Technical Depi 1",
      "Technical Depi",
      "Nti Notebooks",
      "Ml Learning",
    ],
  },
];

export function createSeedSnapshot(): TrackerSnapshot {
  return {
    trackingStart: "2026-08-26",
    hidePast: false,
    seeded: true,
    habits: [
      {
        id: "habit-pray",
        name: "Pray",
        schedule: { type: "preset", id: "daily" },
        archived: false,
        createdAt: "2026-08-26T00:00:00.000Z",
      },
      {
        id: "habit-typing",
        name: "Touch Typing",
        schedule: { type: "preset", id: "daily" },
        archived: false,
        createdAt: "2026-08-26T00:00:00.000Z",
      },
      {
        id: "habit-depi-1",
        name: "Technical Depi 1",
        schedule: { type: "days_of_week", days: [2] }, // Tuesdays
        archived: false,
        createdAt: "2026-08-26T00:00:00.000Z",
      },
      {
        id: "habit-depi-2",
        name: "Technical Depi",
        schedule: { type: "days_of_week", days: [5] }, // Fridays
        archived: false,
        createdAt: "2026-08-26T00:00:00.000Z",
      },
      {
        id: "habit-nti",
        name: "Nti Notebooks",
        schedule: { type: "preset", id: "daily" },
        archived: false,
        createdAt: "2026-08-26T00:00:00.000Z",
      },
      {
        id: "habit-ml",
        name: "Ml Learning",
        schedule: { type: "preset", id: "daily" },
        archived: false,
        createdAt: "2026-08-26T00:00:00.000Z",
      },
    ],
    completions: {},
    dailyTasks: {},
  };
}
