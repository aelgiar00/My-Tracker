import { useState, useMemo, useEffect } from "react";
import { format, isFuture } from "date-fns";
import {
  Check,
  X,
  GripVertical,
  Trash2,
  Archive,
  CalendarOff,
  PauseCircle,
  PlayCircle,
} from "lucide-react";
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
  { id: "paused", label: "⏸️ Paused (This Month)" },
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
  const setScheduleForMonth = useTrackerStore((s) => s.setScheduleForMonth);
  const archiveHabit = useTrackerStore((s) => s.archiveHabit);
  const deleteHabit = useTrackerStore((s) => s.deleteHabit);
  const matrixView = useTrackerStore((s) => s.matrixView);
  const setMatrixView = useTrackerStore((s) => s.setMatrixView);
  const setHidePast = useTrackerStore((s) => s.setHidePast);

  // تخزين الترتيب في المتصفح عشان ميروحش مع الرفريش
  const [customOrder, setCustomOrder] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem('habit_order') || '[]'); }
    catch { return []; }
  });
  
  const [draggingId, setDraggingId] = useState<string | null>(null);

  useEffect(() => {
    localStorage.setItem('habit_order', JSON.stringify(customOrder));
  }, [customOrder]);

  const activeHabits = useMemo(() => {
    const filtered = habits
      .filter((h) => !h.archived)
      .filter((h) => h.name.toLowerCase().includes(filterText.toLowerCase()));

    if (customOrder.length > 0) {
      filtered.sort((a, b) => {
        const indexA = customOrder.indexOf(a.id);
        const indexB = customOrder.indexOf(b.id);
        if (indexA === -1 && indexB === -1) return 0;
        if (indexA === -1) return 1;
        if (indexB === -1) return -1;
        return indexA - indexB;
      });
    }
    return filtered;
  }, [habits, filterText, customOrder]);

  const handleScheduleChange = (habit: Habit, value: string) => {
    if (value === "paused") {
      setScheduleForMonth(habit.id, selectedYear, selectedMonth, null);
      toast.info(`Paused "${habit.name}" for this month`);
      return;
    }

    let newSchedule: Schedule;
    const dayMap: Record<string, number> = {
      mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6, sun: 0,
    };

    if (dayMap[value] !== undefined) {
      newSchedule = { type: "weekly", days: [dayMap[value]] };
    } else {
      newSchedule = { type: "preset", id: value as any };
    }

    setScheduleForMonth(habit.id, selectedYear, selectedMonth, newSchedule);
    toast.success("Schedule updated for this month");
  };

  const getSelectedScheduleValue = (schedule: Schedule | null) => {
    if (schedule === null) return "paused";
    if (schedule.type === "preset") return schedule.id;
    if (schedule.type === "weekly" && schedule.days && schedule.days.length === 1) {
      const revMap: Record<number, string> = {
        1: "mon", 2: "tue", 3: "wed", 4: "thu", 5: "fri", 6: "sat", 0: "sun",
      };
      return revMap[schedule.days[0]] || "daily";
    }
    return "daily";
  };

  const visibleDays = useMemo(() => {
    if (!hidePast) return days;
    return days.filter((d) => !isFuture(d) || format(d, "yyyy-MM-dd") >= todayIso);
  }, [days, hidePast, todayIso]);

  // دوال السحب والإفلات
  const handleDragStart = (e: React.DragEvent<HTMLTableRowElement>, id: string) => {
    e.dataTransfer.setData('text/plain', id);
    e.dataTransfer.effectAllowed = 'move';
    setDraggingId(id);
  };

  const handleDragEnd = () => {
    setDraggingId(null);
  };

  const handleDragOver = (e: React.DragEvent<HTMLTableRowElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent<HTMLTableRowElement>, targetId: string) => {
    e.preventDefault();
    const draggedId = e.dataTransfer.getData('text/plain');
    if (draggedId === targetId || !draggedId) return;

    const currentOrder = activeHabits.map(h => h.id);
    const baseOrder = customOrder.length > 0 ? customOrder : currentOrder;
    const uniqueOrder = Array.from(new Set([...baseOrder, ...currentOrder]));

    const oldIndex = uniqueOrder.indexOf(draggedId);
    const newIndex = uniqueOrder.indexOf(targetId);

    if (oldIndex !== -1 && newIndex !== -1) {
      const newOrder = [...uniqueOrder];
      newOrder.splice(oldIndex, 1);
      newOrder.splice(newIndex, 0, draggedId);
      setCustomOrder(newOrder);
    }
    setDraggingId(null);
  };

  return (
    <div className="w-full">
      {/* Header & Controls */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold tracking-tight text-[var(--fg)]">Matrix</h2>
        <p className="mt-1 text-xs text-[var(--muted)]">
          Dashes are rest days. When monthly targets are met, remaining days automatically turn into rest. You can drag and drop habits to reorder them.
        </p>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <div className="flex h-9 items-center rounded-xl bg-[var(--surface-elevated)] p-1 border border-[var(--border)]">
            <button
              type="button"
              onClick={() => setMatrixView("week")}
              className={cn(
                "rounded-lg px-3 py-1 text-xs font-medium transition-all cursor-pointer",
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
                "rounded-lg px-3 py-1 text-xs font-medium transition-all cursor-pointer",
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
              <th className="min-w-[140px] px-3 font-normal">Schedule</th>
              {visibleDays.map((date) => (
                <th key={date.toISOString()} className="px-1 text-center font-normal">
                  <div className="flex flex-col items-center justify-center">
                    <span className="text-[10px] text-[var(--muted)] leading-tight">{format(date, "EEE")}</span>
                    <span className="text-[12px] font-semibold text-[var(--fg)]">{format(date, "d")}</span>
                  </div>
                </th>
              ))}
              <th className="min-w-[110px] px-3 text-center font-normal">Actions</th>
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
                const schedule = scheduleForMonth(habit, selectedYear, selectedMonth);
                const isPausedThisMonth = schedule === null;
                const currentScheduleValue = getSelectedScheduleValue(schedule);
                const isTodayRest = isRestDay(habit, todayIso);

                const monthDoneCount = visibleDays.reduce((acc, date) => {
                  const iso = format(date, "yyyy-MM-dd");
                  return acc + (completions[completionKey(habit.id, iso)] ? 1 : 0);
                }, 0);

                const isMonthlyTargetReached =
                  schedule &&
                  schedule.type === "monthlyTarget" &&
                  monthDoneCount >= schedule.targetDays;

                return (
                  <tr
                    key={habit.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, habit.id)}
                    onDragEnd={handleDragEnd}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, habit.id)}
                    className={cn(
                      "group transition-all cursor-move",
                      draggingId === habit.id ? "opacity-30 bg-[var(--surface-elevated)] scale-[0.98]" : "",
                      isPausedThisMonth ? "opacity-50 hover:opacity-75" : "hover:bg-[var(--surface-elevated)]/20"
                    )}
                  >
                    <td className="px-1 text-[var(--muted)] opacity-30 group-hover:opacity-100">
                      <GripVertical className="size-4" />
                    </td>

                    <td className="px-3">
                      <div className="flex items-center gap-2">
                        <span className={cn("text-sm font-medium", isPausedThisMonth ? "text-[var(--muted)] line-through" : "text-[var(--fg)]")}>
                          {habit.name}
                        </span>
                        {isPausedThisMonth && (
                          <span className="text-[9px] bg-[var(--muted)]/10 text-[var(--muted)] border border-[var(--border)] px-1.5 py-0.5 rounded font-mono">
                            Paused
                          </span>
                        )}
                        {isMonthlyTargetReached && !isPausedThisMonth && (
                          <span className="text-[9px] bg-[var(--primary)]/10 text-[var(--primary)] border border-[var(--primary)]/20 px-1.5 py-0.5 rounded font-mono font-medium">
                            Target Met ({monthDoneCount}/{schedule.targetDays})
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="px-3">
                      <NativeSelect
                        className={cn(
                          "h-8 w-36 rounded-lg border border-[var(--border)] bg-[var(--surface-elevated)] px-2 text-xs text-[var(--fg)] shadow-none focus:ring-1 focus:ring-[var(--primary)]",
                          isPausedThisMonth && "border-[var(--muted)]/40 text-[var(--muted)]"
                        )}
                        value={currentScheduleValue}
                        onChange={(e) => handleScheduleChange(habit, e.target.value)}
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
                      const expected = schedule ? isDayExpected(schedule, date) : false;
                      const isPast = iso < todayIso;
                      const isCurrentToday = iso === todayIso;

                      if (isPausedThisMonth) {
                        return (
                          <td key={iso} className="px-1 text-center">
                            <div
                              title="Paused for this month"
                              className="flex size-7 items-center justify-center text-xs text-[var(--muted)]/20 select-none"
                            >
                              —
                            </div>
                          </td>
                        );
                      }

                      if (isMonthlyTargetReached && !isDone) {
                        return (
                          <td key={iso} className="px-1 text-center">
                            <div
                              title={`Target achieved (${schedule.targetDays}/${schedule.targetDays})! Auto-rest for remainder of month.`}
                              className="flex size-7 items-center justify-center text-xs font-bold text-[var(--primary)]/50 bg-[var(--primary)]/5 rounded-lg border border-[var(--primary)]/10 select-none cursor-default"
                            >
                              —
                            </div>
                          </td>
                        );
                      }

                      if (isRest) {
                        return (
                          <td key={iso} className="px-1 text-center">
                            <button
                              type="button"
                              onClick={() => {
                                setRestDay(habit.id, iso, false);
                                toast.info(`Activated "${habit.name}" for ${iso}`);
                              }}
                              title="Rest day (Click to activate)"
                              className="flex size-7 items-center justify-center rounded-lg text-xs font-bold text-[var(--muted)] bg-[var(--surface-elevated)] border border-[var(--border)] hover:border-[var(--muted)] transition-all cursor-pointer"
                            >
                              —
                            </button>
                          </td>
                        );
                      }

                      if (!expected) {
                        return (
                          <td key={iso} className="px-1 text-center">
                            <div
                              title="Unscheduled day"
                              className="flex size-7 items-center justify-center text-xs text-[var(--muted)] opacity-30 select-none"
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

                    {/* 4 Action Buttons on the Right */}
                    <td className="px-3 text-center">
                      <div className="flex items-center justify-center gap-1.5 opacity-80 group-hover:opacity-100 transition-opacity">
                        <button
                          type="button"
                          onClick={() => {
                            if (isPausedThisMonth) {
                              setScheduleForMonth(habit.id, selectedYear, selectedMonth, habit.schedule);
                              toast.success(`Resumed "${habit.name}" for this month`);
                            } else {
                              setScheduleForMonth(habit.id, selectedYear, selectedMonth, null);
                              toast.info(`Paused "${habit.name}" for this month`);
                            }
                          }}
                          title={isPausedThisMonth ? "Resume for this month" : "Pause for this month"}
                          className={cn(
                            "flex size-7 items-center justify-center rounded-lg border transition-colors cursor-pointer",
                            isPausedThisMonth
                              ? "border-[var(--primary)]/30 text-[var(--primary)] bg-[var(--primary)]/10 hover:bg-[var(--primary)]/20"
                              : "border-[var(--border)] text-[var(--muted)] hover:bg-[var(--surface-elevated)] hover:text-[var(--fg)] hover:border-[var(--muted)]"
                          )}
                        >
                          {isPausedThisMonth ? <PlayCircle className="size-3.5" /> : <PauseCircle className="size-3.5" />}
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setRestDay(habit.id, todayIso, !isTodayRest);
                            if (isTodayRest) {
                              toast.info(`Activated "${habit.name}" for today`);
                            } else {
                              toast.success(`Set rest day for "${habit.name}" today`);
                            }
                          }}
                          title={isTodayRest ? "Cancel Today's Rest" : "Set Rest Today"}
                          className={cn(
                            "flex size-7 items-center justify-center rounded-lg border transition-colors cursor-pointer",
                            isTodayRest
                              ? "border-[var(--primary)]/30 text-[var(--primary)] bg-[var(--primary)]/10 hover:bg-[var(--primary)]/20"
                              : "border-[var(--border)] text-[var(--muted)] hover:bg-[var(--surface-elevated)] hover:text-[var(--fg)] hover:border-[var(--muted)]"
                          )}
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
                          className="flex size-7 items-center justify-center rounded-lg border border-[var(--border)] text-[var(--muted)] hover:bg-[var(--surface-elevated)] hover:text-[var(--fg)] hover:border-[var(--muted)] transition-colors cursor-pointer"
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
                          className="flex size-7 items-center justify-center rounded-lg border border-[var(--border)] text-rose-400 hover:bg-rose-500/10 hover:border-rose-500/30 transition-colors cursor-pointer"
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
