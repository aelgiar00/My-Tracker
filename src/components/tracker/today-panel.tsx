import { useState, useMemo, useEffect } from "react";
import { format } from "date-fns";
import { Habit } from "@/lib/tracker/types";
import { isDayExpected, completionKey } from "@/lib/tracker/schedule";
import { useTrackerStore } from "@/store/tracker-store";
import { Pencil } from "lucide-react";
import { cn } from "@/lib/utils";

interface TodayPanelProps {
  habits: Habit[];
  stats: any;
  todayDate: Date;
}

function getHabitSpecs(habit: Habit) {
  const durationMinutes = typeof habit.durationMinutes === "number" && habit.durationMinutes > 0
    ? habit.durationMinutes
    : 30;

  const isCritical = habit.priority === "critical";

  let durationLabel = `${durationMinutes}m`;
  if (durationMinutes >= 60) {
    const hours = durationMinutes / 60;
    durationLabel = Number.isInteger(hours) ? `${hours}h` : `${hours.toFixed(1)}h`;
  }

  return {
    durationMinutes,
    durationLabel,
    priority: isCritical ? 1 : 2,
    priorityLabel: isCritical ? "Important" : "Standard",
    baseFriction: Math.min(0.85, durationMinutes / 180),
  };
}

export function TodayPanel({ habits, todayDate }: TodayPanelProps) {
  const [sleepHours, setSleepHours] = useState(8);
  const [collegeHours, setCollegeHours] = useState(4);
  const [workHours, setWorkHours] = useState(0);
  const [showDetails, setShowDetails] = useState(true);

  // حالة ديناميكية لأسماء السلايدرز يتم حفظها في المتصفح
  const [labels, setLabels] = useState(() => {
    try {
      const saved = localStorage.getItem("personal_ai_labels");
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return ["Sleep", "College", "Work"];
  });

  // حفظ الأسماء تلقائياً عند تغييرها
  useEffect(() => {
    localStorage.setItem("personal_ai_labels", JSON.stringify(labels));
  }, [labels]);

  const updateLabel = (idx: number, val: string) => {
    const newLabels = [...labels];
    newLabels[idx] = val;
    setLabels(newLabels);
  };

  const completions = useTrackerStore((s) => s.completions);
  const todayIso = format(todayDate, "yyyy-MM-dd");

  const totalOccupied = sleepHours + collegeHours + workHours;
  const availableHours = Math.max(0, 24 - totalOccupied);
  const availableMinutes = availableHours * 60;

  const readinessScore = useMemo(() => {
    if (availableHours <= 0) return 15;
    const sleepFactor = sleepHours >= 7 && sleepHours <= 9 ? 1.0 : sleepHours < 6 ? 0.7 : 0.85;
    const loadFactor = Math.min(1.0, availableHours / 12);
    return Math.round(Math.min(100, (loadFactor * 0.65 + sleepFactor * 0.35) * 100));
  }, [availableHours, sleepHours]);

  const todayHabits = useMemo(() => {
    return habits
      .filter((h) => !h.archived)
      .filter((h) => isDayExpected(h.schedule, todayDate));
  }, [habits, todayDate]);

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

  const sleepPercent = ((sleepHours - 4) / (12 - 4)) * 100;
  const collegePercent = (collegeHours / 10) * 100;
  const workPercent = (workHours / 12) * 100;

  return (
    <div className="flex flex-col gap-4 text-left font-sans">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[var(--border)] pb-3.5">
        <div className="flex items-center gap-2.5">
          <span className="size-2.5 rounded-full bg-[var(--primary)] shadow-sm animate-pulse"></span>
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

      {/* Sliders with Editable Dynamic Labels */}
      <div className="grid grid-cols-3 gap-2">
        {/* Slider 1 (Sleep by default) */}
        <div className="rounded-2xl bg-[var(--surface-elevated)] p-2.5 border border-[var(--border)] shadow-xs flex flex-col justify-between">
          <div className="flex justify-between text-[11px] text-[var(--fg)] font-semibold mb-1">
            <div className="flex items-center gap-1 group relative">
              <input
                type="text"
                value={labels[0]}
                onChange={(e) => updateLabel(0, e.target.value)}
                className="w-14 bg-transparent text-[var(--muted)] font-medium outline-none focus:text-[var(--fg)] focus:border-[var(--primary)] border-b border-transparent transition-colors"
                title="Edit name"
              />
              <Pencil className="size-2.5 opacity-0 group-hover:opacity-100 transition-opacity text-[var(--muted)] absolute -right-3 pointer-events-none" />
            </div>
            <span className="font-mono text-[var(--primary)] shrink-0">{sleepHours}h</span>
          </div>
          <div className="py-1">
            <input
              type="range"
              min="4"
              max="12"
              step="1"
              value={sleepHours}
              onChange={(e) => setSleepHours(Number(e.target.value))}
              style={{ background: `linear-gradient(to right, var(--primary) 0%, var(--primary) ${sleepPercent}%, var(--surface-pill) ${sleepPercent}%, var(--surface-pill) 100%)` }}
              className="h-1.5 w-full appearance-none rounded-lg border border-[var(--border)] accent-[var(--primary)] cursor-pointer"
            />
          </div>
          <div className="flex justify-between text-[8.5px] font-mono text-[var(--muted)]/70 px-0.5 select-none">
            <span>4h</span>
            <span>8h</span>
            <span>12h</span>
          </div>
        </div>

        {/* Slider 2 (College by default) */}
        <div className="rounded-2xl bg-[var(--surface-elevated)] p-2.5 border border-[var(--border)] shadow-xs flex flex-col justify-between">
          <div className="flex justify-between text-[11px] text-[var(--fg)] font-semibold mb-1">
            <div className="flex items-center gap-1 group relative">
              <input
                type="text"
                value={labels[1]}
                onChange={(e) => updateLabel(1, e.target.value)}
                className="w-14 bg-transparent text-[var(--muted)] font-medium outline-none focus:text-[var(--fg)] focus:border-[var(--primary)] border-b border-transparent transition-colors"
                title="Edit name"
              />
              <Pencil className="size-2.5 opacity-0 group-hover:opacity-100 transition-opacity text-[var(--muted)] absolute -right-3 pointer-events-none" />
            </div>
            <span className="font-mono text-[var(--primary)] shrink-0">{collegeHours}h</span>
          </div>
          <div className="py-1">
            <input
              type="range"
              min="0"
              max="10"
              step="1"
              value={collegeHours}
              onChange={(e) => setCollegeHours(Number(e.target.value))}
              style={{ background: `linear-gradient(to right, var(--primary) 0%, var(--primary) ${collegePercent}%, var(--surface-pill) ${collegePercent}%, var(--surface-pill) 100%)` }}
              className="h-1.5 w-full appearance-none rounded-lg border border-[var(--border)] accent-[var(--primary)] cursor-pointer"
            />
          </div>
          <div className="flex justify-between text-[8.5px] font-mono text-[var(--muted)]/70 px-0.5 select-none">
            <span>0h</span>
            <span>5h</span>
            <span>10h</span>
          </div>
        </div>

        {/* Slider 3 (Work by default) */}
        <div className="rounded-2xl bg-[var(--surface-elevated)] p-2.5 border border-[var(--border)] shadow-xs flex flex-col justify-between">
          <div className="flex justify-between text-[11px] text-[var(--fg)] font-semibold mb-1">
            <div className="flex items-center gap-1 group relative">
              <input
                type="text"
                value={labels[2]}
                onChange={(e) => updateLabel(2, e.target.value)}
                className="w-14 bg-transparent text-[var(--muted)] font-medium outline-none focus:text-[var(--fg)] focus:border-[var(--primary)] border-b border-transparent transition-colors"
                title="Edit name"
              />
              <Pencil className="size-2.5 opacity-0 group-hover:opacity-100 transition-opacity text-[var(--muted)] absolute -right-3 pointer-events-none" />
            </div>
            <span className="font-mono text-[var(--primary)] shrink-0">{workHours}h</span>
          </div>
          <div className="py-1">
            <input
              type="range"
              min="0"
              max="12"
              step="1"
              value={workHours}
              onChange={(e) => setWorkHours(Number(e.target.value))}
              style={{ background: `linear-gradient(to right, var(--primary) 0%, var(--primary) ${workPercent}%, var(--surface-pill) ${workPercent}%, var(--surface-pill) 100%)` }}
              className="h-1.5 w-full appearance-none rounded-lg border border-[var(--border)] accent-[var(--primary)] cursor-pointer"
            />
          </div>
          <div className="flex justify-between text-[8.5px] font-mono text-[var(--muted)]/70 px-0.5 select-none">
            <span>0h</span>
            <span>6h</span>
            <span>12h</span>
          </div>
        </div>
      </div>

      {/* Available Time Summary */}
      <div className="flex items-center justify-between text-xs text-[var(--muted)] px-0.5">
        <span>
          Net Available: <strong className="text-[var(--fg)] font-mono text-sm">{availableHours}h</strong>
        </span>
        <button
          type="button"
          onClick={() => setShowDetails(!showDetails)}
          className="text-[11px] font-medium text-[var(--primary)] hover:underline cursor-pointer"
        >
          {showDetails ? "Hide Focus" : "Show Focus"}
        </button>
      </div>

      {/* Non-Negotiables Focus Card */}
      {showDetails && (
        <div className="rounded-2xl bg-[var(--surface-elevated)] p-3 border border-[var(--border)] text-xs shadow-xs">
          <p className="font-semibold text-[var(--fg)] mb-2 flex items-center gap-1.5 text-[11px]">
            🎯 Important Today:
          </p>
          {nonNegotiables.length === 0 ? (
            <p className="text-[10px] text-[var(--muted)]">No important habits scheduled today.</p>
          ) : (
            <ul className="space-y-1.5 text-[11px] text-[var(--fg)]">
              {nonNegotiables.map(({ habit, specs }) => (
                <li
                  key={habit.id}
                  className="flex justify-between items-center pr-1 border-b border-[var(--border)] pb-1.5 last:border-0 last:pb-0"
                >
                  <span className="truncate max-w-[140px] font-medium">• {habit.name}</span>
                  <span className="text-[9.5px] font-mono text-[var(--primary)] bg-[var(--primary-muted)] px-1.5 py-0.5 rounded-md border border-[var(--primary)]/20 font-semibold">
                    {specs.durationLabel}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Individual Habit Predictions List */}
      <div className="space-y-1.5 pt-0.5">
        {habitPredictions.length === 0 ? (
          <p className="text-xs text-[var(--muted)] text-center py-4">No habits added yet.</p>
        ) : (
          habitPredictions.map(({ habit, chance, isDone, feasible, statusLabel }) => (
            <div
              key={habit.id}
              className={cn(
                "flex items-center justify-between rounded-2xl px-3.5 py-2.5 border transition-all duration-150",
                isDone
                  ? "bg-[var(--primary-muted)]/25 border-[var(--primary)]/40 text-[var(--primary)] shadow-xs"
                  : feasible
                  ? "bg-[var(--surface-elevated)] border-[var(--border)] text-[var(--fg)] hover:border-[var(--muted)]"
                  : "bg-[var(--surface-elevated)]/50 border-[var(--border)] text-[var(--muted)] opacity-60"
              )}
            >
              <div>
                <p className={cn("text-xs font-semibold truncate max-w-[140px]", isDone && "line-through opacity-70")}>
                  {habit.name}
                </p>
                <span className="text-[9.5px] text-[var(--muted)] block mt-0.5">{statusLabel}</span>
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
