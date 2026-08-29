import type { TrackerSnapshot } from "@/lib/tracker/types";

export interface HabitPack {
  id: string;
  name: string;
  description: string;
  habits: string[];
}

// مصفوفة فارغة تماماً
export const HABIT_PACKS: HabitPack[] = [];

export function createSeedSnapshot(): TrackerSnapshot {
  return {
    trackingStart: new Date().toISOString().slice(0, 10),
    hidePast: false,
    seeded: true,
    habits: [], // لا توجد أي عادات إطلاقاً
    completions: {},
    dailyTasks: {},
  };
}
