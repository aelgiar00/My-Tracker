import { useState, useMemo } from "react";
import { format, parseISO } from "date-fns";
import { Habit } from "@/lib/tracker/types";
import { isDayExpected, isRestDay, completionKey, scheduleForMonth } from "@/lib/tracker/schedule";
import { useTrackerStore } from "@/store/tracker-store";
import { Calendar, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface AuditPanelProps {
  habits: Habit[];
  stats: any;
}

export function AuditPanel({ habits }: AuditPanelProps) {
  const [inspectDate, setInspectDate] = useState(() => format(new Date(), "yyyy-MM-dd"));
  const completions = useTrackerStore((s) => s.completions);
  const setRestDay = useTrackerStore((s) => s.setRestDay);
  const selectedYear = useTrackerStore((s) => s.selectedYear);
  const selectedMonth = useTrackerStore((s) => s.selectedMonth);

  const dateObj = parseISO(inspectDate);

  const activeHabits = useMemo(() => habits.filter((h) => !h.archived), [habits]);

  // تصنيف العادات ليوم الفحص
  const scheduledHabits = useMemo(() => {
    return activeHabits.filter((h) => {
      const schedule = scheduleForMonth(h, selectedYear, selectedMonth) || h.schedule;
      return isDayExpected(schedule, dateObj) && !isRestDay(h, inspectDate);
    });
  }, [activeHabits, inspectDate, dateObj, selectedYear, selectedMonth]);

  const restHabits = useMemo(() => {
    return activeHabits.filter((h) => isRestDay(h, inspectDate));
  }, [activeHabits, inspectDate]);

  const completedCount = scheduledHabits.filter(
    (h) => Boolean(completions[completionKey(h.id, inspectDate)])
  ).length;

  const totalCount = scheduledHabits.length;
  const score = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  return (
    <div className="space-y-6 font-sans">
      {/* Top Header Card with Date Selector */}
      <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6 sm:p-7 shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-serif-title text-2xl font-normal text-[var(--fg)]">Daily audit</h2>
          <p className="mt-1 text-xs text-[var(--muted)]">
            Future days show as upcoming, not missed. Notes stay attached to the habit ID.
          </p>
        </div>

        {/* Date Selector Pill */}
        <div className="flex items-center gap-2 rounded-2xl bg-[var(--surface-elevated)] border border-[var(--border)] px-4 py-2.5 shadow-xs">
          <input
            type="date"
            value={inspectDate}
            onChange={(e) => setInspectDate(e.target.value)}
            className="bg-transparent text-xs font-semibold text-[var(--fg)] focus:outline-none cursor-pointer"
          />
          <Calendar className="size-4 text-[var(--muted)]" />
        </div>
      </div>

      {/* KPI Cards Row (Progress Gauge & Day Progress Counter) */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        {/* Circular Progress Gauge */}
        <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-lg flex items-center justify-center">
          <div className="relative flex size-28 items-center justify-center">
            <svg className="size-full -rotate-90" viewBox="0 0 80 80">
              <circle
                cx="40"
                cy="40"
                r="32"
                className="stroke-[var(--surface-pill)]"
                strokeWidth="6"
                fill="none"
              />
              <circle
                cx="40"
                cy="40"
                r="32"
                className="stroke-[var(--primary)] transition-all duration-500"
                strokeWidth="6"
                strokeDasharray={2 * Math.PI * 32}
                strokeDashoffset={2 * Math.PI * 32 * (1 - score / 100)}
                strokeLinecap="round"
                fill="none"
              />
            </svg>
            <div className="absolute flex flex-col items-center justify-center text-center">
              <span className="font-serif-title text-2xl font-bold text-[var(--fg)] leading-none">
                {score}%
              </span>
              <span className="text-[9px] font-semibold text-[var(--muted)] uppercase tracking-wider mt-1">
                DAY
              </span>
            </div>
          </div>
        </div>

        {/* Day Progress Numbers */}
        <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6 sm:p-7 shadow-lg flex flex-col justify-center">
          <span className="text-[10px] font-semibold tracking-wider text-[var(--muted)] uppercase">
            DAY PROGRESS
          </span>
          <p className="mt-2 font-serif-title text-4xl font-normal text-[var(--fg)]">
            {completedCount} / {totalCount}
          </p>
          <p className="mt-1.5 text-xs text-[var(--muted)]">
            Scheduled habits on this day. Pick any day to inspect it.
          </p>
        </div>
      </div>

      {/* Scheduled Habits List (Cards Stack matching Image 4) */}
      <div className="space-y-3">
        <span className="text-[11px] font-semibold tracking-wider text-[var(--muted)] uppercase block px-1">
          Scheduled
        </span>

        {scheduledHabits.length === 0 ? (
          <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6 text-center text-xs text-[var(--muted)]">
            No habits scheduled for this day.
          </div>
        ) : (
          scheduledHabits.map((habit) => {
            const isDone = Boolean(completions[completionKey(habit.id, inspectDate)]);
            return (
              <div
                key={habit.id}
                className="flex items-center justify-between rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-xs hover:border-[var(--muted)] transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span
                    className={cn(
                      "rounded-lg px-2.5 py-1 text-[10px] font-mono font-semibold uppercase",
                      isDone
                        ? "bg-[var(--primary)] text-[var(--primary-foreground)]"
                        : "bg-[var(--surface-elevated)] text-[var(--muted)] border border-[var(--border)]"
                    )}
                  >
                    {isDone ? "DONE" : "PENDING"}
                  </span>
                  <span className={cn("text-xs font-medium text-[var(--fg)]", isDone && "line-through opacity-70")}>
                    {habit.name}
                  </span>
                </div>

                <div className="flex items-center gap-4">
                  <button
                    type="button"
                    onClick={() => setRestDay(habit.id, inspectDate, true)}
                    className="text-xs text-[var(--muted)] hover:text-[var(--primary)] underline cursor-pointer"
                  >
                    Rest this day
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Rest Days Section */}
      {restHabits.length > 0 && (
        <div className="space-y-3 pt-2">
          <span className="text-[11px] font-semibold tracking-wider text-[var(--muted)] uppercase block px-1">
            Rest days
          </span>
          {restHabits.map((habit) => (
            <div
              key={habit.id}
              className="flex items-center justify-between rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-xs"
            >
              <div className="flex items-center gap-3">
                <span className="rounded-lg bg-amber-500/10 text-amber-500 border border-amber-500/20 px-2.5 py-1 text-[10px] font-mono font-semibold uppercase">
                  REST
                </span>
                <span className="text-xs font-medium text-[var(--muted)]">{habit.name}</span>
              </div>
              <button
                type="button"
                onClick={() => setRestDay(habit.id, inspectDate, false)}
                className="text-xs text-[var(--primary)] hover:underline cursor-pointer"
              >
                Make scheduled
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default AuditPanel;
