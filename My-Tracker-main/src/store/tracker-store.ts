import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { parseISO } from "date-fns";
import type { Completion, DailyTask, Habit, Schedule, TrackerSnapshot } from "@/lib/tracker/types";
import { createSeedSnapshot } from "@/lib/tracker/seed";
import { completionKey, isDayExpected, isRestDay, monthKey, scheduleForMonth } from "@/lib/tracker/schedule";

const UNDO_LIMIT = 30;

export type ThemeId = "default" | "ocean" | "forest" | "amber" | "rose";
type UndoSnap = Pick<TrackerSnapshot, "habits" | "completions" | "dailyTasks">;

type TrackerState = TrackerSnapshot & {
  undoStack: UndoSnap[];
  selectedYear: number;
  selectedMonth: number;
  inspectIso: string | null;
  theme: ThemeId;
  setTheme: (theme: ThemeId) => void;
  hydrateDefaults: (today: Date) => void;
  setMonth: (year: number, month: number) => void;
  setHidePast: (value: boolean) => void;
  setTrackingStart: (iso: string) => void;
  setInspectIso: (iso: string | null) => void;
  addHabit: (name: string, schedule: Schedule, options?: { monthKey?: string; monthlyOnly?: boolean }) => string;
  addHabits: (names: string[], schedule?: Schedule, options?: { monthKey?: string; monthlyOnly?: boolean }) => number;
  renameHabit: (id: string, name: string) => void;
  setSchedule: (id: string, schedule: Schedule) => void;
  setScheduleForMonth: (id: string, year: number, month: number, schedule: Schedule | null) => void;
  setRestDay: (id: string, iso: string, rest: boolean) => void;
  addTask: (iso: string, name: string) => string;
  toggleTask: (iso: string, taskId: string) => void;
  deleteTask: (iso: string, taskId: string) => void;
  archiveHabit: (id: string, archived: boolean) => void;
  deleteHabit: (id: string) => void;
  reorderHabits: (fromId: string, toId: string) => void;
  captureUndo: () => void;
  toggleCompletion: (habitId: string, iso: string) => void;
  setCompletion: (habitId: string, iso: string, done: boolean) => void;
  setNote: (habitId: string, iso: string, note: string) => void;
  bulkSet: (habitIds: string[], isos: string[], done: boolean) => number;
  markAllToday: (iso: string, done: boolean) => number;
  undo: () => boolean;
  importSnapshot: (raw: unknown) => string | null;
  resetToSeed: () => void;
};

function newId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return `habit-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function pushUndo(state: TrackerState): Partial<TrackerState> {
  const snap: UndoSnap = {
    habits: state.habits.map((h) => ({ ...h })),
    completions: { ...state.completions },
    dailyTasks: Object.fromEntries(Object.entries(state.dailyTasks).map(([iso, tasks]) => [iso, tasks.map((task) => ({ ...task }))])),
  };
  return { undoStack: [...state.undoStack, snap].slice(-UNDO_LIMIT) };
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function parseImported(raw: unknown): TrackerSnapshot | null {
  if (!isRecord(raw)) return null;
  if (!Array.isArray(raw.habits) || !isRecord(raw.completions)) return null;
  const habits: Habit[] = [];
  for (const item of raw.habits) {
    if (!isRecord(item)) continue;
    if (typeof item.id !== "string" || typeof item.name !== "string") continue;
    if (!isRecord(item.schedule)) continue;
    habits.push({
      id: item.id,
      name: item.name,
      schedule: item.schedule as Schedule,
      archived: Boolean(item.archived),
      createdAt: typeof item.createdAt === "string" ? item.createdAt : new Date().toISOString(),
      monthOverrides: isRecord(item.monthOverrides) ? (item.monthOverrides as Record<string, Schedule | null>) : undefined,
      monthlyOnly: Boolean(item.monthlyOnly),
      restDays: isRecord(item.restDays) ? Object.fromEntries(Object.entries(item.restDays).filter(([, value]) => value === true).map(([iso]) => [iso, true])) : undefined,
    });
  }
  const completions: Record<string, Completion> = {};
  for (const [key, value] of Object.entries(raw.completions)) {
    if (!isRecord(value) || typeof value.at !== "string") continue;
    completions[key] = {
      at: value.at,
      note: typeof value.note === "string" ? value.note : undefined,
    };
  }
  const dailyTasks: Record<string, DailyTask[]> = {};
  if (isRecord(raw.dailyTasks)) {
    for (const [iso, rawTasks] of Object.entries(raw.dailyTasks)) {
      if (!Array.isArray(rawTasks)) continue;
      dailyTasks[iso] = rawTasks.flatMap((task) => {
        if (!isRecord(task) || typeof task.id !== "string" || typeof task.name !== "string") return [];
        return [{ id: task.id, name: task.name, done: Boolean(task.done), createdAt: typeof task.createdAt === "string" ? task.createdAt : new Date().toISOString() }];
      });
    }
  }
  return {
    habits,
    completions,
    dailyTasks,
    trackingStart:
      typeof raw.trackingStart === "string" ? raw.trackingStart : createSeedSnapshot().trackingStart,
    hidePast: Boolean(raw.hidePast),
    seeded: true,
  };
}

const seed = createSeedSnapshot();

export const useTrackerStore = create<TrackerState>()(
  persist(
    (set, get) => ({
      ...seed,
      undoStack: [],
      selectedYear: 2026,
      selectedMonth: 8,
      inspectIso: null,
      theme: "default",

      hydrateDefaults: (today) => {
        const state = get();
        if (state.selectedYear && state.selectedMonth) return;
        set({ selectedYear: today.getFullYear(), selectedMonth: today.getMonth() + 1 });
      },

      setMonth: (year, month) => set({ selectedYear: year, selectedMonth: month, inspectIso: null }),
      setHidePast: (value) => set({ hidePast: value }),
      setTrackingStart: (iso) => set({ trackingStart: iso }),
      setInspectIso: (iso) => set({ inspectIso: iso }),
      setTheme: (theme) => set({ theme }),

      addHabit: (name, schedule, options) => {
        const id = newId();
        const trimmed = name.trim() || "New habit";
        set((s) => ({
          ...pushUndo(s),
          habits: [
            ...s.habits,
            {
              id,
              name: trimmed,
              schedule,
              archived: false,
              createdAt: new Date().toISOString(),
              monthlyOnly: Boolean(options?.monthlyOnly),
              monthOverrides: options?.monthKey ? { [options.monthKey]: schedule } : undefined,
            },
          ],
        }));
        return id;
      },

      addHabits: (names, schedule = { type: "preset", id: "daily" }, options) => {
        const existing = new Set(get().habits.map((h) => h.name.trim().toLowerCase()));
        const toAdd = names.filter((n) => n.trim() && !existing.has(n.trim().toLowerCase()));
        if (toAdd.length === 0) return 0;
        set((s) => ({
          ...pushUndo(s),
          habits: [
            ...s.habits,
            ...toAdd.map((name) => ({
              id: newId(),
              name: name.trim(),
              schedule,
              archived: false,
              createdAt: new Date().toISOString(),
              monthlyOnly: Boolean(options?.monthlyOnly),
              monthOverrides: options?.monthKey ? { [options.monthKey]: schedule } : undefined,
            })),
          ],
        }));
        return toAdd.length;
      },

      renameHabit: (id, name) => {
        const trimmed = name.trim();
        if (!trimmed) return;
        set((s) => ({
          ...pushUndo(s),
          habits: s.habits.map((h) => (h.id === id ? { ...h, name: trimmed } : h)),
        }));
      },

      setSchedule: (id, schedule) => {
        set((s) => ({
          ...pushUndo(s),
          habits: s.habits.map((h) => (h.id === id ? { ...h, schedule } : h)),
        }));
      },

      setScheduleForMonth: (id, year, month, schedule) => {
        const key = monthKey(year, month);
        set((s) => ({
          ...pushUndo(s),
          habits: s.habits.map((h) => {
            if (h.id !== id) return h;
            const monthOverrides = { ...(h.monthOverrides ?? {}) };
            monthOverrides[key] = schedule;
            return { ...h, monthOverrides };
          }),
        }));
      },

      setRestDay: (id, iso, rest) => {
        set((s) => {
          const habit = s.habits.find((h) => h.id === id);
          if (!habit) return s;
          const restDays = { ...(habit.restDays ?? {}) };
          if (rest) restDays[iso] = true;
          else delete restDays[iso];
          const completions = { ...s.completions };
          if (rest) delete completions[completionKey(id, iso)];
          return {
            ...pushUndo(s),
            habits: s.habits.map((h) => (h.id === id ? { ...h, restDays } : h)),
            completions,
          };
        });
      },

      addTask: (iso, name) => {
        const id = newId();
        const task: DailyTask = { id, name: name.trim() || "New task", done: false, createdAt: new Date().toISOString() };
        set((s) => ({
          ...pushUndo(s),
          dailyTasks: { ...s.dailyTasks, [iso]: [...(s.dailyTasks[iso] ?? []), task] },
        }));
        return id;
      },

      toggleTask: (iso, taskId) => {
        set((s) => ({
          ...pushUndo(s),
          dailyTasks: {
            ...s.dailyTasks,
            [iso]: (s.dailyTasks[iso] ?? []).map((task) => task.id === taskId ? { ...task, done: !task.done } : task),
          },
        }));
      },

      deleteTask: (iso, taskId) => {
        set((s) => ({
          ...pushUndo(s),
          dailyTasks: {
            ...s.dailyTasks,
            [iso]: (s.dailyTasks[iso] ?? []).filter((task) => task.id !== taskId),
          },
        }));
      },

      archiveHabit: (id, archived) => {
        set((s) => ({
          ...pushUndo(s),
          habits: s.habits.map((h) => (h.id === id ? { ...h, archived } : h)),
        }));
      },

      deleteHabit: (id) => {
        set((s) => {
          const completions = { ...s.completions };
          for (const key of Object.keys(completions)) {
            if (key.startsWith(`${id}|`)) delete completions[key];
          }
          return {
            ...pushUndo(s),
            habits: s.habits.filter((h) => h.id !== id),
            completions,
          };
        });
      },

      reorderHabits: (fromId, toId) => {
        if (fromId === toId) return;
        set((s) => {
          const next = [...s.habits];
          const from = next.findIndex((h) => h.id === fromId);
          const to = next.findIndex((h) => h.id === toId);
          if (from < 0 || to < 0) return s;
          const [item] = next.splice(from, 1);
          next.splice(to, 0, item);
          return { habits: next };
        });
      },

      captureUndo: () => set((s) => pushUndo(s)),

      toggleCompletion: (habitId, iso) => {
        const key = completionKey(habitId, iso);
        set((s) => {
          const completions = { ...s.completions };
          if (completions[key]) delete completions[key];
          else completions[key] = { at: new Date().toISOString() };
          return { ...pushUndo(s), completions };
        });
      },

      setCompletion: (habitId, iso, done) => {
        const key = completionKey(habitId, iso);
        set((s) => {
          const exists = Boolean(s.completions[key]);
          if (exists === done) return s;
          const completions = { ...s.completions };
          if (done) completions[key] = { at: new Date().toISOString() };
          else delete completions[key];
          return { ...pushUndo(s), completions };
        });
      },

      setNote: (habitId, iso, note) => {
        const key = completionKey(habitId, iso);
        set((s) => {
          const current = s.completions[key];
          if (!current) return s;
          return {
            ...pushUndo(s),
            completions: {
              ...s.completions,
              [key]: { ...current, note: note.trim() || undefined },
            },
          };
        });
      },

      bulkSet: (habitIds, isos, done) => {
        const s = get();
        const completions = { ...s.completions };
        const idSet = new Set(habitIds);
        let applied = 0;
        for (const habit of s.habits) {
          if (!idSet.has(habit.id) || habit.archived) continue;
          for (const iso of isos) {
            const date = parseISO(iso);
            const schedule = scheduleForMonth(habit, date.getFullYear(), date.getMonth() + 1);
            if (!schedule || !isDayExpected(schedule, date) || isRestDay(habit, iso)) continue;
            const key = completionKey(habit.id, iso);
            const exists = Boolean(completions[key]);
            if (done && !exists) {
              completions[key] = { at: new Date().toISOString() };
              applied += 1;
            } else if (!done && exists) {
              delete completions[key];
              applied += 1;
            }
          }
        }
        if (applied === 0) return 0;
        set({ ...pushUndo(s), completions });
        return applied;
      },

      markAllToday: (iso, done) => {
        const { habits } = get();
        return get().bulkSet(
          habits.filter((h) => !h.archived).map((h) => h.id),
          [iso],
          done,
        );
      },

      undo: () => {
        const stack = get().undoStack;
        if (stack.length === 0) return false;
        const prev = stack[stack.length - 1];
        set({
          habits: prev.habits,
          completions: prev.completions,
          dailyTasks: prev.dailyTasks,
          undoStack: stack.slice(0, -1),
        });
        return true;
      },

      importSnapshot: (raw) => {
        const parsed = parseImported(raw);
        if (!parsed) return "That file is not a valid matrix export.";
        if (parsed.habits.length === 0) return "No habits found in that file.";
        set((s) => ({
          ...pushUndo(s),
          ...parsed,
          seeded: true,
        }));
        return null;
      },

      resetToSeed: () => {
        const next = createSeedSnapshot();
        set((s) => ({
          ...pushUndo(s),
          ...next,
        }));
      },
    }),
    {
      name: "performance-matrix-v1",
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
      merge: (persisted, current) => ({
        ...current,
        ...(persisted as Partial<TrackerState>),
        dailyTasks: (persisted as Partial<TrackerState>)?.dailyTasks ?? current.dailyTasks ?? {},
      }),
      partialize: (s) => ({
        habits: s.habits,
        completions: s.completions,
        dailyTasks: s.dailyTasks,
        trackingStart: s.trackingStart,
        hidePast: s.hidePast,
        seeded: s.seeded,
        selectedYear: s.selectedYear,
        selectedMonth: s.selectedMonth,
        theme: s.theme,
      }),
    },
  ),
);

export function exportSnapshot(): string {
  const s = useTrackerStore.getState();
  return JSON.stringify(
    {
      version: 2,
      exportedAt: new Date().toISOString(),
      habits: s.habits,
      completions: s.completions,
      dailyTasks: s.dailyTasks,
      trackingStart: s.trackingStart,
      hidePast: s.hidePast,
    },
    null,
    2,
  );
}
