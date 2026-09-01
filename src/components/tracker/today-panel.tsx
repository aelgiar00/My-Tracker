import { useState, useMemo } from "react";
import { format } from "date-fns";
import { Habit } from "@/lib/tracker/types";
import { isDayExpected, completionKey } from "@/lib/tracker/schedule";
import { useTrackerStore } from "@/store/tracker-store";
import { cn } from "@/lib/utils";

interface TodayPanelProps {
  habits: Habit[];
  stats: any;
  todayDate: Date;
}

// قراءة الوقت الفعلي والأولوية المحددة من قبل المستخدم
function getHabitSpecs(habit: Habit) {
  const durationMinutes = typeof habit.durationMinutes === "number" && habit.durationMinutes > 0
    ? habit.durationMinutes
    : 30;

  const isCritical = habit.priority === "critical";

  // تحويل الدقائق إلى صيغة مقروءة بالإنجليزية
  let durationLabel = `${durationMinutes}m`;
  if (durationMinutes >= 60) {
    const hours = durationMinutes / 60;
    durationLabel = Number.isInteger(hours) ? `${hours}h` : `${hours.toFixed(1)}h`;
  }

  return {
    durationMinutes,
    durationLabel,
    priority: isCritical ? 1 : 2,
    priorityLabel: isCritical ? "Critical" : "Standard",
    baseFriction: Math.min(0.85, durationMinutes / 180),
  };
}

export function TodayPanel({ habits, todayDate }: TodayPanelProps) {
  const [sleepHours, setSleepHours] = useState(8);
  const [collegeHours, setCollegeHours] = useState(4);
  const [workHours, setWorkHours] = useState(0);
  const [showDetails, setShowDetails] = useState(true);

  const completions = useTrackerStore((s) => s.completions);
  const todayIso = format(todayDate, "yyyy-MM-dd");

  const totalOccupied = sleepHours + collegeHours + workHours;
  const availableHours = Math.max(0, 24 - totalOccupied);
  const availableMinutes = availableHours * 60;

  // درجة الجاهزية العامة لليوم
  const readinessScore = useMemo(() => {
    if (availableHours <= 0) return 15;
    const sleepFactor = sleepHours >= 7 && sleepHours <= 9 ? 1.0 : sleepHours < 6 ? 0.7 : 0.85;
    const loadFactor = Math.min(1.0, availableHours / 12);
    return Math.round(Math.min(100, (loadFactor * 0.65 + sleepFactor * 0.35) * 100));
  }, [availableHours, sleepHours]);

  // العادات المجدولة لليوم المختار
  const todayHabits = useMemo(() => {
    return habits
      .filter((h) => !h.archived)
      .filter((h) => isDayExpected(h.schedule, todayDate));
  }, [habits, todayDate]);

  // حساب توزيع الوقت والفرص لكل عادة وفق أولويتها ومدتها الزمنية
  const habitPredictions = useMemo(() => {
    let accumulatedTime = 0;

    const mapped = todayHabits.map((habit) => {
      const specs = getHabitSpecs(habit);
      const isDone = Boolean(completions[completionKey(habit.id, todayIso)]);

      let streakCount = 0;
      for (let i = 1; i <= 7; i++) {
        const d = new Date(todayDate);
        d.setDate(d.getDate() - i);
        const iso = format(d, "yyyy-MM-dd");
        if (completions[completionKey(habit.id, iso)]) streakCount++;
      }

      return { habit, specs, isDone, streakCount };
    }).sort((a, b) => a.specs.priority - b.specs.priority || a.specs.durationMinutes - b.specs.durationMinutes);

    return mapped.map((item, index) => {
      if (item.isDone) {
        return {
          ...item,
          chance: 100,
          statusLabel: "Completed",
          feasible: true,
        };
      }

      const fitsInTime = accumulatedTime + item.specs.durationMinutes <= availableMinutes;
      accumulatedTime += item.specs.durationMinutes;

      let score = Math.round(
        readinessScore * 0.45 +
        (1 - item.specs.baseFriction) * 35 +
        (item.streakCount * 4) +
        (item.specs.durationMinutes <= 30 ? 12 : item.specs.durationMinutes <= 60 ? 4 : -8) -
        (index * 3)
      );

      if (!fitsInTime) {
        score = Math.max(20, score - 35);
      }

      const finalChance = Math.min(97, Math.max(25, score));

      return {
        ...item,
        chance: finalChance,
        feasible: fitsInTime,
        statusLabel: fitsInTime
          ? finalChance >= 85 ? "High Confidence" : "Time Feasible"
          : "Time Constrained",
      };
    });
  }, [todayHabits, availableMinutes, completions, todayIso, readinessScore, todayDate]);

  const nonNegotiables = habitPredictions.filter((h) => h.specs.priority === 1);

  return (
    <div className="flex flex-col gap-4 text-left font-sans">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[var(--border)] pb-3.5">
        <div className="flex items-center gap-2.5">
          <span className="size-2 rounded-full bg-[var(--primary)] animate-pulse"></span>
          <div>
            <h2 className="text-xs font-semibold tracking-wider uppercase text-[var(--fg)]">
              Personal AI
            </h2>
            <p className="text-[10px] text-[var(--muted)]">Execution Coach</p>
          </div>
        </div>
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] px-3 py-1 text-right">
          <span className="text-[9px] font-medium text-[var(--muted)] uppercase block">Readiness</span>
          <span className="text-sm font-bold text-[var(--primary)] font-serif-title">{readinessScore}%</span>
        </div>
      </div>

      {/* Sliders */}
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-xl bg-[var(--surface-elevated)] p-2 border border-[var(--border)]">
          <div className="flex justify-between text-[11px] text-[var(--fg)] font-medium mb-1">
            <span className="text-[var(--muted)]">Sleep</span>
            <span>{sleepHours}h</span>
          </div>
          <input
            type="range"
            min="4"
            max="12"
            value={sleepHours}
            onChange={(e) => setSleepHours(Number(e.target.value))}
            className="h-1 w-full appearance-none rounded-lg bg-white/10 accent-[var(--primary)] cursor-pointer"
          />
        </div>

        <div className="rounded-xl bg-[var(--surface-elevated)] p-2 border border-[var(--border)]">
          <div className="flex justify-between text-[11px] text-[var(--fg)] font-medium mb-1">
            <span className="text-[var(--muted)]">College</span>
            <span>{collegeHours}h</span>
          </div>
          <input
            type="range"
            min="0"
            max="10"
            value={collegeHours}
            onChange={(e) => setCollegeHours(Number(e.target.value))}
            className="h-1 w-full appearance-none rounded-lg bg-white/10 accent-[var(--primary)] cursor-pointer"
          />
        </div>

        <div className="rounded-xl bg-[var(--surface-elevated)] p-2 border border-[var(--border)]">
          <div className="flex justify-between text-[11px] text-[var(--fg)] font-medium mb-1">
            <span className="text-[var(--muted)]">Work</span>
            <span>{workHours}h</span>
          </div>
          <input
            type="range"
            min="0"
            max="12"
            value={workHours}
            onChange={(e) => setWorkHours(Number(e.target.value))}
            className="h-1 w-full appearance-none rounded-lg bg-white/10 accent-[var(--primary)] cursor-pointer"
          />
        </div>
      </div>

      {/* Time Balance Bar */}
      <div className="flex items-center justify-between text-xs text-[var(--muted)] px-0.5">
        <span>Net Available: <strong className="text-[var(--fg)] font-mono">{availableHours}h</strong></span>
        <button
          type="button"
          onClick={() => setShowDetails(!showDetails)}
          className="text-[11px] text-[var(--primary)] hover:underline cursor-pointer"
        >
          {showDetails ? "Hide Focus" : "Show Focus"}
        </button>
      </div>

      {/* Non-Negotiables Focus Card */}
      {showDetails && (
        <div className="rounded-xl bg-[var(--surface-elevated)] p-3 border border-[var(--border)] text-xs">
          <p className="font-semibold text-[var(--fg)] mb-2 flex items-center gap-1.5 text-[11px]">
            🎯 Non-Negotiables Today:
          </p>
          {nonNegotiables.length === 0 ? (
            <p className="text-[10px] text-[var(--muted)]">No critical habits scheduled today.</p>
          ) : (
            <ul className="space-y-1.5 text-[11px] text-[var(--fg)]">
              {nonNegotiables.map(({ habit, specs }) => (
                <li key={habit.id} className="flex justify-between items-center pr-1 border-b border-[var(--border)] pb-1 last:border-0 last:pb-0">
                  <span className="truncate max-w-[140px]">• {habit.name}</span>
                  <span className="text-[9.5px] font-mono text-[var(--primary)] bg-[var(--primary-muted)] px-1.5 py-0.5 rounded border border-[var(--primary)]/20">
                    {specs.durationLabel}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Habit Predictions List */}
      <div className="space-y-1.5 pt-1">
        {habitPredictions.length === 0 ? (
          <p className="text-xs text-[var(--muted)] text-center py-4">No habits added yet.</p>
        ) : (
          habitPredictions.map(({ habit, chance, isDone, feasible, statusLabel }) => (
            <div
              key={habit.id}
              className={cn(
                "flex items-center justify-between rounded-xl px-3 py-2 border transition-all duration-150",
                isDone
                  ? "bg-[var(--primary-muted)]/20 border-[var(--primary)]/40 text-[var(--primary)]"
                  : feasible
                  ? "bg-[var(--surface-elevated)] border-[var(--border)] text-[var(--fg)] hover:border-[var(--muted)]"
                  : "bg-[var(--surface-elevated)]/50 border-[var(--border)] text-[var(--muted)] opacity-60"
              )}
            >
              <div>
                <p className={cn("text-xs font-medium truncate max-w-[140px]", isDone && "line-through opacity-70")}>
                  {habit.name}
                </p>
                <span className="text-[9.5px] text-[var(--muted)] block">{statusLabel}</span>
              </div>
              <div className="font-serif-title text-xs font-bold text-[var(--fg)]">
                {isDone ? "✓" : `${chance}%`}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default TodayPanel;
