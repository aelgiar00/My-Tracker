import { useState, useMemo } from "react";
import { format, isFuture } from "date-fns";
import { Check, X, GripVertical, MoreHorizontal, Trash2, Archive, CalendarOff } from "lucide-react";
import { Habit } from "@/lib/tracker/types";
import { isDayExpected, isRestDay, completionKey, scheduleForMonth } from "@/lib/tracker/schedule";
import { useTrackerStore } from "@/store/tracker-store";
import { NativeSelect } from "@/components/tracker/native-select";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

interface HabitMatrixProps {
  habits: Habit[];
  days: Date[];
  todayIso: string;
  hidePast: boolean;
  daysInMonth: number;
  selectedYear: number;
  selectedMonth: number;
}

const SCHEDULE_PRESETS = [
  { id: "daily", label: "Daily" },
  { id: "weekdays", label: "Weekdays" },
  { id: "weekends", label: "Weekends" },
  { id: "mwf", label: "Mon/Wed/Fri" },
  { id: "tuth", label: "Tue/Thu" },
];

export function HabitMatrix({
  habits,
  days,
  todayIso,
  hidePast,
  selectedYear,
  selectedMonth,
}: HabitMatrixProps) {
  const [filterText, setFilterText] = useState("");
  const completions = useTrackerStore((s) => s.completions);
  const toggleCompletion = useTrackerStore((s) => s.toggleCompletion);
  const setRestDay = useTrackerStore((s) => s.setRestDay);
  const setSchedule = useTrackerStore((s) => s.setSchedule);
  const archiveHabit = useTrackerStore((s) => s.archiveHabit);
  const deleteHabit = useTrackerStore((s) => s.deleteHabit);
  const matrixView = useTrackerStore((s) => s.matrixView);
  const setMatrixView = useTrackerStore((s) => s.setMatrixView);
  const setHidePast = useTrackerStore((s) => s.setHidePast);

  const activeHabits = useMemo(() => {
    return habits
      .filter((h) => !h.archived)
      .filter((h) => h.name.toLowerCase().includes(filterText.toLowerCase()));
  }, [habits, filterText]);

  const visibleDays = useMemo(() => {
    if (!hidePast) return days;
    return days.filter((d) => !isFuture(d) || format(d, "yyyy-MM-dd") >= todayIso);
  }, [days, hidePast, todayIso]);

  return (
    <div className="w-full">
      {/* Matrix Header */}
      <div className="mb-6">
        <h2 className="font-serif-title text-2xl font-normal tracking-tight text-[var(--fg)]">Matrix</h2>
        <p className="mt-1 text-xs text-[var(--muted)]">
          Dashes are rest days. Past empty cells are misses. Today stays pending until you check it.
        </p>

        {/* Toolbar: Week/Month switcher + Hide past days + Filter */}
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <div className="flex h-9 items-center rounded-xl bg-[var(--surface-elevated)] p-1 border border-[var(--border)]">
            <button
              type="button"
              onClick={() => setMatrixView("week")}
              className={cn(
                "rounded-lg px-3 py-1 text-xs font-medium transition-all",
                matrixView === "week"
                  ? "bg-[var(--surface-pill)] text-[var(--fg)] font-semibold"
                  : "text-[var(--muted)] hover:text-[var(--fg)]"
              )}
            >
              Week
            </button>
            <button
              type="button"
              onClick={() => setMatrixView("month")}
              className={cn(
                "rounded-lg px-3 py-1 text-xs font-medium transition-all",
                matrixView === "month"
                  ? "bg-[var(--surface-pill)] text-[var(--fg)] font-semibold"
                  : "text-[var(--muted)] hover:text-[var(--fg)]"
              )}
            >
              Month
            </button>
          </div>

          <label className="flex items-center gap-2 text-xs text-[var(--muted)] cursor-pointer select-none">
            <input
              type="checkbox"
              checked={hidePast}
              onChange={(e) => setHidePast(e.target.checked)}
              className="size-4 rounded border-[var(--border)] bg-[var(--surface-elevated)] text-[var(--primary)] focus:ring-0"
            />
            Hide past days
          </label>

          <div className="relative flex-1 min-w-[12rem]">
            <input
              type="text"
              placeholder="Filter habits..."
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
              className="h-9 w-full rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] px-3.5 text-xs text-[var(--fg)] placeholder:text-[var(--muted)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
            />
          </div>
        </div>
      </div>

      {/* Grid Table */}
      <div className="overflow-x-auto pb-4">
        <table className="w-full min-w-max border-separate border-spacing-y-2.5">
          <thead>
            <tr className="text-left text-[11px] font-medium text-[var(--muted)]">
              <th className="w-8 px-1"></th>
              <th className="min-w-[150px] px-3 font-normal">Habit</th>
              <th className="min-w-[110px] px-3 font-normal">Schedule</th>
              {visibleDays.map((date) => (
                <th key={date.toISOString()} className="px-1 text-center font-normal">
                  <div className="flex flex-col items-center justify-center">
                    <span className="text-[10px] text-[var(--muted)] leading-tight">{format(date, "EEE")}</span>
                    <span className="text-[12px] font-semibold text-[var(--fg)]">{format(date, "d")}</span>
                  </div>
                </th>
              ))}
              <th className="w-10 px-1"></th>
            </tr>
          </thead>

          <tbody>
            {activeHabits.length === 0 ? (
              <tr>
                <td colSpan={visibleDays.length + 4} className="py-12 text-center text-xs text-[var(--muted)]">
                  No habits found.
                </td>
              </tr>
            ) : (
              activeHabits.map((habit) => {
                const schedule = scheduleForMonth(habit, selectedYear, selectedMonth) || habit.schedule;

                return (
                  <tr key={habit.id} className="group">
                    {/* Drag Handle */}
                    <td className="px-1 text-[var(--muted)] opacity-30 group-hover:opacity-100">
                      <GripVertical className="size-4 cursor-grab" />
                    </td>

                    {/* Habit Name */}
                    <td className="px-3">
                      <span className="text-sm font-medium text-[var(--fg)]">{habit.name}</span>
                    </td>

                    {/* Schedule Selector */}
                    <td className="px-3">
                      <NativeSelect
                        className="h-8 w-28 rounded-lg border border-[var(--border)] bg-[var(--surface-elevated)] px-2 text-xs text-[var(--fg)] shadow-none"
                        value={schedule.type === "preset" ? schedule.id : "custom"}
                        onChange={(e) => {
                          const val = e.target.value;
                          setSchedule(habit.id, { type: "preset", id: val as any });
                        }}
                      >
                        {SCHEDULE_PRESETS.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.label}
                          </option>
                        ))}
                      </NativeSelect>
                    </td>

                    {/* Matrix Cells */}
                    {visibleDays.map((date) => {
                      const iso = format(date, "yyyy-MM-dd");
                      const key = completionKey(habit.id, iso);
                      const isDone = Boolean(completions[key]);
                      const isRest = isRestDay(habit, iso);
                      const expected = isDayExpected(schedule, date);
                      const isPast = iso < todayIso;
                      const isCurrentToday = iso === todayIso;

                      if (isRest) {
                        return (
                          <td key={iso} className="px-1 text-center">
                            <button
                              type="button"
                              onClick={() => setRestDay(habit.id, iso, false)}
                              title="Rest day"
                              className="flex size-7 items-center justify-center rounded-lg text-xs text-[var(--muted)] hover:bg-[var(--surface-elevated)]"
                            >
                              —
                            </button>
                          </td>
                        );
                      }

                      if (!expected) {
                        return (
                          <td key={iso} className="px-1 text-center">
                            <div className="flex size-7 items-center justify-center text-xs text-[var(--muted)]/40">
                              —
                            </div>
                          </td>
                        );
                      }

                      return (
                        <td key={iso} className="px-1 text-center">
                          <button
                            type="button"
                            onClick={() => toggleCompletion(habit.id, iso)}
                            className={cn(
                              "flex size-7 items-center justify-center rounded-lg border transition-all duration-150",
                              isDone
                                ? "border-[var(--primary)] bg-[var(--primary)] text-[var(--primary-foreground)] shadow-sm font-bold scale-100"
                                : isPast
                                ? "border-[var(--border)] bg-[var(--surface-elevated)]/30 text-[var(--muted)] hover:border-[var(--muted)]"
                                : "border-[var(--border)] bg-[var(--surface-elevated)] hover:border-[var(--muted)]",
                              isCurrentToday && !isDone && "ring-1 ring-[var(--primary)]"
                            )}
                          >
                            {isDone ? (
                              <Check className="size-3.5 stroke-[3]" />
                            ) : isPast ? (
                              <X className="size-3 stroke-[2] opacity-60" />
                            ) : null}
                          </button>
                        </td>
                      );
                    })}

                    {/* Actions Menu */}
                    <td className="px-1 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon-sm" className="h-8 w-8 text-[var(--muted)] hover:text-[var(--fg)]">
                            <MoreHorizontal className="size-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-36 rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] p-1 text-[var(--fg)] shadow-xl">
                          <DropdownMenuItem
                            onClick={() => setRestDay(habit.id, todayIso, true)}
                            className="flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs text-[var(--muted)] hover:bg-[var(--surface)] hover:text-[var(--fg)] cursor-pointer"
                          >
                            <CalendarOff className="size-3.5" />
                            Rest Today
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => archiveHabit(habit.id, true)}
                            className="flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs text-[var(--muted)] hover:bg-[var(--surface)] hover:text-[var(--fg)] cursor-pointer"
                          >
                            <Archive className="size-3.5" />
                            Archive
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => deleteHabit(habit.id)}
                            className="flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs text-rose-400 hover:bg-rose-500/10 cursor-pointer"
                          >
                            <Trash2 className="size-3.5" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
