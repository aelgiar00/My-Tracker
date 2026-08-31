import { useState, useMemo } from "react";
import { format, isFuture } from "date-fns";
import { Check, X, GripVertical, Trash2, Archive, CalendarOff } from "lucide-react";
import { Habit, Schedule } from "@/lib/tracker/types";
import { isDayExpected, isRestDay, completionKey, scheduleForMonth } from "@/lib/tracker/schedule";
import { useTrackerStore } from "@/store/tracker-store";
import { NativeSelect } from "@/components/tracker/native-select";
import { toast } from "sonner";
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

const SCHEDULE_OPTIONS = [
  { id: "daily", label: "Daily" },
  { id: "weekdays", label: "Weekdays" },
  { id: "weekends", label: "Weekends" },
  { id: "mwf", label: "Mon/Wed/Fri" },
  { id: "tuth", label: "Tue/Thu" },
  { id: "mon", label: "Mondays" },
  { id: "tue", label: "Tuesdays" },
  { id: "wed", label: "Wednesdays" },
  { id: "thu", label: "Thursdays" },
  { id: "fri", label: "Fridays" },
  { id: "sat", label: "Saturdays" },
  { id: "sun", label: "Sundays" },
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

  const handleScheduleChange = (habitId: string, value: string) => {
    let newSchedule: Schedule;
    const dayMap: Record<string, number> = {
      mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6, sun: 0,
    };

    if (dayMap[value] !== undefined) {
      newSchedule = { type: "weekly", days: [dayMap[value]] };
    } else {
      newSchedule = { type: "preset", id: value as any };
    }

    setSchedule(habitId, newSchedule);
    toast.success("Schedule updated");
  };

  const getSelectedScheduleValue = (schedule: Schedule) => {
    if (schedule.type === "preset") return schedule.id;
    if (schedule.type === "weekly" && schedule.days && schedule.days.length === 1) {
      const revMap: Record<number, string> = {
        1: "mon", 2: "tue", 3: "wed", 4: "thu", 5: "fri", 6: "sat", 0: "sun",
      };
      return revMap[schedule.days[0]] || "daily";
    }
    return "daily";
  };

  return (
    <div className="w-full">
      {/* Header & Controls */}
      <div className="mb-6">
        <h2 className="font-serif-title text-2xl font-normal tracking-tight text-[var(--fg)]">Matrix</h2>
        <p className="mt-1 text-xs text-[var(--muted)]">
          Dashes are rest days. Past empty cells are misses. Today stays pending until you check it.
        </p>

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

      {/* Matrix Table */}
      <div className="overflow-x-auto pb-4">
        <table className="w-full min-w-max border-separate border-spacing-y-2.5">
          <thead>
            <tr className="text-left text-[11px] font-medium text-[var(--muted)]">
              <th className="w-8 px-1"></th>
              <th className="min-w-[150px] px-3 font-normal">Habit</th>
              <th className="min-w-[120px] px-3 font-normal">Schedule</th>
              {visibleDays.map((date) => (
                <th key={date.toISOString()} className="px-1 text-center font-normal">
                  <div className="flex flex-col items-center justify-center">
                    <span className="text-[10px] text-[var(--muted)] leading-tight">{format(date, "EEE")}</span>
                    <span className="text-[12px] font-semibold text-[var(--fg)]">{format(date, "d")}</span>
                  </div>
                </th>
              ))}
              <th className="min-w-[80px] px-2 text-center font-normal">Actions</th>
            </tr>
          </thead>

          <tbody>
            {activeHabits.length === 0 ? (
              <tr>
                <td colSpan={visibleDays.length + 4} className="py-12 text-center text-xs text-[var(--muted)]">
                  No habits found. Click "+ Habit" above to create one.
                </td>
              </tr>
            ) : (
              activeHabits.map((habit) => {
                const schedule = scheduleForMonth(habit, selectedYear, selectedMonth) || habit.schedule;
                const currentScheduleValue = getSelectedScheduleValue(schedule);

                return (
                  <tr key={habit.id} className="group hover:bg-[var(--surface-elevated)]/20 transition-colors">
                    <td className="px-1 text-[var(--muted)] opacity-30 group-hover:opacity-100">
                      <GripVertical className="size-4 cursor-grab" />
                    </td>

                    <td className="px-3">
                      <span className="text-sm font-medium text-[var(--fg)]">{habit.name}</span>
                    </td>

                    <td className="px-3">
                      <NativeSelect
                        className="h-8 w-32 rounded-lg border border-[var(--border)] bg-[var(--surface-elevated)] px-2 text-xs text-[var(--fg)] shadow-none focus:ring-1 focus:ring-[var(--primary)]"
                        value={currentScheduleValue}
                        onChange={(e) => handleScheduleChange(habit.id, e.target.value)}
                      >
                        {SCHEDULE_OPTIONS.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.label}
                          </option>
                        ))}
                      </NativeSelect>
                    </td>

                    {/* Matrix Day Cells */}
                    {visibleDays.map((date) => {
                      const iso = format(date, "yyyy-MM-dd");
                      const key = completionKey(habit.id, iso);
                      const isDone = Boolean(completions[key]);
                      const isRest = isRestDay(habit, iso);
                      const expected = isDayExpected(schedule, date);
                      const isPast = iso < todayIso;
                      const isCurrentToday = iso === todayIso;

                      // إذا كان يوم راحة أو غير مجدول أصلاً (مثل الإثنين لعادة Fridays) -> نعرض شرطة فقط
                      if (isRest || !expected) {
                        return (
                          <td key={iso} className="px-1 text-center">
                            <div
                              title={isRest ? "Rest day" : "Not scheduled on this day"}
                              className="flex size-7 items-center justify-center text-xs text-[var(--muted)]/40 select-none"
                            >
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
                              "flex size-7 items-center justify-center rounded-lg border transition-all duration-150 cursor-pointer",
                              isDone
                                ? "border-[var(--primary)] bg-[var(--primary)] text-[var(--primary-foreground)] shadow-xs font-bold scale-100"
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

                    <td className="px-2 text-center">
                      <div className="flex items-center justify-center gap-1 opacity-40 group-hover:opacity-100 transition-opacity">
                        <button
                          type="button"
                          onClick={() => {
                            setRestDay(habit.id, todayIso, true);
                            toast.info(`Set rest for "${habit.name}" today`);
                          }}
                          title="Rest Today"
                          className="flex size-7 items-center justify-center rounded-lg text-[var(--muted)] hover:bg-[var(--surface-elevated)] hover:text-[var(--fg)]"
                        >
                          <CalendarOff className="size-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            archiveHabit(habit.id, true);
                            toast.success(`Archived "${habit.name}"`);
                          }}
                          title="Archive Habit"
                          className="flex size-7 items-center justify-center rounded-lg text-[var(--muted)] hover:bg-[var(--surface-elevated)] hover:text-[var(--fg)]"
                        >
                          <Archive className="size-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            deleteHabit(habit.id);
                            toast.error(`Deleted "${habit.name}"`);
                          }}
                          title="Delete Habit"
                          className="flex size-7 items-center justify-center rounded-lg text-rose-400 hover:bg-rose-500/10"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>
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

export default HabitMatrix;
