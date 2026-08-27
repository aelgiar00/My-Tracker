import { useState } from "react";
import { Archive, Check, GripVertical, MinusCircle, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/tracker/native-select";
import {
  SCHEDULE_PRESETS,
  WEEKDAY_ABBR,
  isDayExpected,
  isRestDay,
  isSingleDay,
  isoDate,
  mondayIndex,
  scheduleLabel,
  scheduleForMonth,
} from "@/lib/tracker/schedule";
import { cellStatus } from "@/lib/tracker/stats";
import type { Habit, Schedule } from "@/lib/tracker/types";
import { useTrackerStore } from "@/store/tracker-store";
import { cn } from "@/lib/utils";

function parseScheduleValue(value: string): Schedule {
  if (value.startsWith("only:")) {
    const day = Number(value.slice(5));
    return { type: "only", day: Number.isFinite(day) ? day : 1 };
  }
  if (value === "custom") return { type: "custom", days: [0, 1, 2, 3, 4] };
  return { type: "preset", id: value };
}

function scheduleValue(schedule: Schedule): string {
  if (schedule.type === "only") return `only:${schedule.day}`;
  if (schedule.type === "custom") return "custom";
  return schedule.id;
}

export function HabitMatrix({
  habits,
  days,
  todayIso,
  hidePast,
  daysInMonth,
  selectedYear,
  selectedMonth,
}: {
  habits: Habit[];
  days: Date[];
  todayIso: string;
  hidePast: boolean;
  daysInMonth: number;
  selectedYear: number;
  selectedMonth: number;
}) {
  const completions = useTrackerStore((s) => s.completions);
  const toggleCompletion = useTrackerStore((s) => s.toggleCompletion);
  const renameHabit = useTrackerStore((s) => s.renameHabit);
  const setScheduleForMonth = useTrackerStore((s) => s.setScheduleForMonth);
  const archiveHabit = useTrackerStore((s) => s.archiveHabit);
  const deleteHabit = useTrackerStore((s) => s.deleteHabit);
  const reorderHabits = useTrackerStore((s) => s.reorderHabits);
  const captureUndo = useTrackerStore((s) => s.captureUndo);
  const setHidePast = useTrackerStore((s) => s.setHidePast);
  const [query, setQuery] = useState("");
  const [dragId, setDragId] = useState<string | null>(null);

  const visibleDays = hidePast ? days.filter((d) => isoDate(d) >= todayIso) : days;
  const shownDays = visibleDays.length > 0 ? visibleDays : days;
  const rows = habits.filter((h) => {
    if (h.archived || !h.name.toLowerCase().includes(query.trim().toLowerCase())) return false;
    return Boolean(scheduleForMonth(h, selectedYear, selectedMonth));
  });

  return (
    <div className="rounded-xl bg-surface shadow-[var(--shadow-border)]">
      <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-display text-xl tracking-tight">Matrix</h2>
          <p className="text-sm text-muted">
            Dashes are rest days. Past empty cells are misses. Today stays pending until you check it.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-xs text-muted">
            <input
              type="checkbox"
              checked={hidePast}
              onChange={(e) => setHidePast(e.target.checked)}
              className="size-4 accent-[var(--color-accent)]"
            />
            Hide past days
          </label>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filter habits"
            className="h-9 w-40 rounded-md bg-surface-2 px-3 text-sm text-fg shadow-[var(--shadow-border)] placeholder:text-subtle"
          />
        </div>
      </div>

      {rows.length === 0 ? (
        <p className="px-4 pb-5 text-sm text-muted">No habits match this view.</p>
      ) : (
        <div className="matrix-scroll overflow-x-auto pb-2">
          <table className="min-w-max border-separate border-spacing-0 text-sm">
            <thead>
              <tr>
                <th className="sticky left-0 z-20 w-44 min-w-44 bg-surface px-4 py-2 text-left text-xs font-medium tracking-wide text-muted">
                  Habit
                </th>
                <th className="sticky left-44 z-20 hidden w-36 min-w-36 bg-surface px-2 py-2 text-left text-xs font-medium tracking-wide text-muted md:table-cell">
                  Schedule
                </th>
                {shownDays.map((d) => {
                  const iso = isoDate(d);
                  const isToday = iso === todayIso;
                  return (
                    <th
                      key={iso}
                      className={cn(
                        "min-w-10 px-1 py-2 text-center text-[0.7rem] font-medium tabular-nums",
                        isToday ? "text-accent" : "text-muted",
                      )}
                    >
                      <div>{d.getDate()}</div>
                      <div className="font-normal">{WEEKDAY_ABBR[mondayIndex(d)]}</div>
                    </th>
                  );
                })}
                <th className="px-2 py-2" />
              </tr>
            </thead>
            <tbody>
              {rows.map((habit) => (
                <tr
                  key={habit.id}
                  onDragOver={(e) => {
                    e.preventDefault();
                    if (dragId && dragId !== habit.id) reorderHabits(dragId, habit.id);
                  }}
                  className="group"
                >
                  <td className="sticky left-0 z-10 w-44 min-w-44 bg-surface px-2 py-1">
                    <div className="flex min-h-11 items-center gap-1">
                      <button
                        type="button"
                        draggable
                        onDragStart={() => {
                          captureUndo();
                          setDragId(habit.id);
                        }}
                        onDragEnd={() => setDragId(null)}
                        className="hidden size-8 shrink-0 items-center justify-center rounded-sm text-subtle hover:text-fg md:flex"
                        aria-label={`Reorder ${habit.name}`}
                      >
                        <GripVertical className="size-4" />
                      </button>
                      <input
                        defaultValue={habit.name}
                        key={habit.name}
                        onBlur={(e) => {
                          const next = e.target.value.trim();
                          if (next && next !== habit.name) renameHabit(habit.id, next);
                          else e.target.value = habit.name;
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                        }}
                        className="h-9 min-w-0 flex-1 bg-transparent px-1 text-sm text-fg outline-none focus:rounded-sm focus:shadow-[var(--shadow-border)]"
                      />
                    </div>
                  </td>
                  <td className="sticky left-44 z-10 hidden w-36 min-w-36 bg-surface px-2 py-1 md:table-cell">
                    <NativeSelect
                      className="h-9 max-w-40 text-xs"
                      value={scheduleValue(scheduleForMonth(habit, selectedYear, selectedMonth) ?? habit.schedule)}
                      onChange={(e) =>
                        setScheduleForMonth(habit.id, selectedYear, selectedMonth, parseScheduleValue(e.target.value))
                      }
                    >
                      {SCHEDULE_PRESETS.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.label}
                        </option>
                      ))}
                      {(scheduleForMonth(habit, selectedYear, selectedMonth) ?? habit.schedule).type === "custom" && (
                        <option value="custom">{scheduleLabel(scheduleForMonth(habit, selectedYear, selectedMonth) ?? habit.schedule)}</option>
                      )}
                      {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((d) => (
                        <option key={d} value={`only:${d}`}>
                          Only {d}
                        </option>
                      ))}
                    </NativeSelect>
                  </td>
                  {shownDays.map((d) => {
                    const iso = isoDate(d);
                    const schedule = scheduleForMonth(habit, selectedYear, selectedMonth);
                    const expected = Boolean(schedule && isDayExpected(schedule, d) && !isRestDay(habit, iso));
                    const done = Boolean(completions[`${habit.id}|${iso}`]);
                    const status = cellStatus(expected, done, iso, todayIso);
                    return (
                      <td key={iso} className="px-1 py-1">
                        <button
                          type="button"
                          disabled={!expected}
                          onClick={() => {
                            if (!expected) return;
                            toggleCompletion(habit.id, iso);
                          }}
                          aria-label={`${habit.name} ${iso} ${status}`}
                          className={cn(
                            "relative mx-auto flex size-9 items-center justify-center rounded-sm transition-colors duration-150",
                            status === "rest" && "text-subtle",
                            status === "done" && "bg-accent text-accent-fg",
                            status === "pending" && "shadow-[inset_0_0_0_1px_var(--color-accent)]",
                            status === "upcoming" && "shadow-[var(--shadow-border)]",
                            status === "miss" && "shadow-[inset_0_0_0_1px_var(--color-miss)]",
                          )}
                        >
                          {status === "done" && <Check className="size-3.5" strokeWidth={2.5} />}
                          {status === "rest" && <span className="text-xs">—</span>}
                        </button>
                      </td>
                    );
                  })}
                  <td className="px-2 py-1">
                    <div className="flex opacity-100 md:opacity-0 md:group-hover:opacity-100">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`Remove ${habit.name} from this month`}
                        title="Remove from this month"
                        onClick={() => {
                          setScheduleForMonth(habit.id, selectedYear, selectedMonth, null);
                          toast(`Removed ${habit.name} from this month.`);
                        }}
                      >
                        <MinusCircle className="size-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`Archive ${habit.name}`}
                        onClick={() => {
                          archiveHabit(habit.id, true);
                          toast(`Archived ${habit.name}.`);
                        }}
                      >
                        <Archive className="size-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`Delete ${habit.name}`}
                        onClick={() => {
                          deleteHabit(habit.id);
                          toast(`Deleted ${habit.name}.`);
                        }}
                      >
                        <Trash2 className="size-3.5 text-danger" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {habits.some((h) => isSingleDay(h.schedule) && !h.archived) && (
        <p className="px-4 pb-4 text-xs text-subtle">
          Single-day habits stay in the grid for that date only. Drag the handle to reorder.
        </p>
      )}
    </div>
  );
}
