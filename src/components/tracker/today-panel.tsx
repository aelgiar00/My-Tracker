import { useState, useMemo, useEffect } from "react";
import { format } from "date-fns";
import { Habit } from "@/lib/tracker/types";
import { isDayExpected, completionKey } from "@/lib/tracker/schedule";
import { useTrackerStore } from "@/store/tracker-store";
import { Plus, X } from "lucide-react";
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

interface TimeBlock {
  id: string;
  name: string;
  hours: number;
}

export function TodayPanel({ habits, todayDate }: TodayPanelProps) {
  const [showDetails, setShowDetails] = useState(true);

  const [timeBlocks, setTimeBlocks] = useState<TimeBlock[]>(() => {
    try {
      const saved = localStorage.getItem("personal_ai_blocks");
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return [
      { id: "1", name: "Sleep", hours: 8 },
      { id: "2", name: "College", hours: 4 },
      { id: "3", name: "Work", hours: 0 }
    ];
  });

  useEffect(() => {
    localStorage.setItem("personal_ai_blocks", JSON.stringify(timeBlocks));
  }, [timeBlocks]);

  const updateBlockName = (id: string, name: string) => {
    setTimeBlocks(prev => prev.map(b => b.id === id ? { ...b, name } : b));
  };

  const updateBlockHours = (id: string, hours: number) => {
    setTimeBlocks(prev => prev.map(b => b.id === id ? { ...b, hours } : b));
  };

  const removeBlock = (id: string) => {
    setTimeBlocks(prev => prev.filter(b => b.id !== id));
  };

  const addBlock = () => {
    if (timeBlocks.length >= 6) return;
    const newId = Date.now().toString();
    setTimeBlocks(prev => [...prev, { id: newId, name: "New Activity", hours: 2 }]);
  };

  const completions = useTrackerStore((s) => s.completions);
  const todayIso = format(todayDate, "yyyy-MM-dd");

  const totalOccupied = timeBlocks.reduce((acc, b) => acc + b.hours, 0);
  const availableHours = Math.max(0, 24 - totalOccupied);
  const availableMinutes = availableHours * 60;

  const readinessScore = useMemo(() => {
    if (availableHours <= 0) return 15;
    const sleepBlock = timeBlocks.find(b => b.name.toLowerCase().includes("sleep"));
    const sleepHours = sleepBlock ? sleepBlock.hours : 8;
    const sleepFactor = sleepHours >= 7 && sleepHours <= 9 ? 1.0 : sleepHours < 6 ? 0.7 : 0.85;
    const loadFactor = Math.min(1.0, availableHours / 12);
    return Math.round(Math.min(100, (loadFactor * 0.65 + sleepFactor * 0.35) * 100));
  }, [availableHours, timeBlocks]);

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

  return (
    // زودنا مسافات الجاب عشان ندي تنفس للبانل (gap-6 بدل 4)
    <div className="flex flex-col gap-6 text-left font-['Arial'] font-bold">
      
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[var(--border)] pb-4">
        <div className="flex items-center gap-3">
          <span className="size-3 rounded-full bg-[var(--primary)] shadow-sm animate-pulse"></span>
          <div>
            <h2 className="text-sm tracking-wider uppercase text-[var(--fg)]">
              Personal AI
            </h2>
            <p className="text-xs text-[var(--muted)] mt-0.5">Execution Coach</p>
          </div>
        </div>
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] px-4 py-2 text-right">
          <span className="text-[10px] text-[var(--muted)] uppercase block mb-1">Readiness</span>
          {/* كبرنا نسبة الاستعداد (text-xl) */}
          <span className="text-xl font-['Merriweather'] text-[var(--primary)] leading-none">{readinessScore}%</span>
        </div>
      </div>

      {/* Time Allocation Blocks */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {timeBlocks.map((block) => {
          const percent = (block.hours / 24) * 100;
          
          return (
            <div key={block.id} className="rounded-2xl bg-[var(--surface-elevated)] p-3.5 border border-[var(--border)] shadow-xs flex flex-col justify-between relative group transition-colors hover:border-[var(--muted)]/50">
              <button
                onClick={() => removeBlock(block.id)}
                className="absolute -top-2 -right-2 size-5 flex items-center justify-center rounded-full bg-rose-500/90 text-white opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer shadow-sm z-10 hover:bg-rose-500"
                title="Remove activity"
              >
                <X className="size-3.5" />
              </button>

              <div className="flex justify-between text-xs text-[var(--fg)] mb-2 gap-2">
                <input
                  type="text"
                  value={block.name}
                  onChange={(e) => updateBlockName(block.id, e.target.value)}
                  placeholder="Activity"
                  className="w-[70%] bg-transparent text-[var(--muted)] outline-none focus:text-[var(--fg)] focus:border-b focus:border-[var(--primary)] transition-colors truncate"
                  title="Click to rename"
                />
                <span className="font-['Merriweather'] text-base text-[var(--primary)] shrink-0">{block.hours}h</span>
              </div>

              <div className="py-1.5">
                <input
                  type="range"
                  min="0"
                  max="24"
                  step="1"
                  value={block.hours}
                  onChange={(e) => updateBlockHours(block.id, Number(e.target.value))}
                  style={{ background: `linear-gradient(to right, var(--primary) 0%, var(--primary) ${percent}%, var(--surface-pill) ${percent}%, var(--surface-pill) 100%)` }}
                  className="h-2 w-full appearance-none rounded-lg border border-[var(--border)] accent-[var(--primary)] cursor-pointer"
                />
              </div>
              <div className="flex justify-between font-['Merriweather'] text-[11px] text-[var(--muted)]/80 px-0.5 mt-1 select-none">
                <span>0h</span>
                <span>12h</span>
                <span>24h</span>
              </div>
            </div>
          );
        })}

        {timeBlocks.length < 6 && (
          <button
            onClick={addBlock}
            className="rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface-elevated)]/30 flex flex-col items-center justify-center text-[var(--muted)] hover:text-[var(--primary)] hover:border-[var(--primary)] hover:bg-[var(--primary)]/5 transition-all min-h-[85px] cursor-pointer"
          >
            <Plus className="size-5 mb-1" />
            <span className="text-[10px] uppercase tracking-wider">Add</span>
          </button>
        )}
      </div>

      {/* Available Time Summary */}
      <div className="flex items-center justify-between text-sm text-[var(--muted)] px-1 mt-2">
        <span>
          Net Available: <strong className="text-[var(--fg)] font-['Merriweather'] text-lg">{availableHours}h</strong>
        </span>
        <button
          type="button"
          onClick={() => setShowDetails(!showDetails)}
          className="text-xs text-[var(--primary)] hover:underline cursor-pointer"
        >
          {showDetails ? "Hide Focus" : "Show Focus"}
        </button>
      </div>

      {/* Non-Negotiables Focus Card */}
      {showDetails && (
        <div className="rounded-2xl bg-[var(--surface-elevated)] p-4 border border-[var(--border)] text-sm shadow-xs mt-1">
          <p className="text-[var(--fg)] mb-3 flex items-center gap-1.5 text-xs uppercase tracking-wide">
            Important Today:
          </p>
          {nonNegotiables.length === 0 ? (
            <p className="text-xs text-[var(--muted)]">No important habits scheduled today.</p>
          ) : (
            <ul className="space-y-2.5 text-xs text-[var(--fg)]">
              {nonNegotiables.map(({ habit, specs }) => (
                <li
                  key={habit.id}
                  className="flex justify-between items-center pr-1 border-b border-[var(--border)] pb-2.5 last:border-0 last:pb-0"
                >
                  <span className="truncate max-w-[160px] text-[13px]">• {habit.name}</span>
                  <span className="text-xs font-['Merriweather'] text-[var(--primary)] bg-[var(--primary-muted)] px-2 py-1 rounded-md border border-[var(--primary)]/20">
                    {specs.durationLabel}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Individual Habit Predictions List */}
      <div className="space-y-2.5 pt-1">
        {habitPredictions.length === 0 ? (
          <p className="text-sm text-[var(--muted)] text-center py-6">No habits added yet.</p>
        ) : (
          habitPredictions.map(({ habit, chance, isDone, feasible, statusLabel }) => (
            <div
              key={habit.id}
              className={cn(
                "flex items-center justify-between rounded-2xl px-4 py-3.5 border transition-all duration-150",
                isDone
                  ? "bg-[var(--primary-muted)]/25 border-[var(--primary)]/40 text-[var(--primary)] shadow-xs"
                  : feasible
                  ? "bg-[var(--surface-elevated)] border-[var(--border)] text-[var(--fg)] hover:border-[var(--muted)]"
                  : "bg-[var(--surface-elevated)]/50 border-[var(--border)] text-[var(--muted)] opacity-60"
              )}
            >
              <div className="flex flex-col gap-1">
                <p className={cn("text-sm truncate max-w-[160px]", isDone && "line-through opacity-70")}>
                  {habit.name}
                </p>
                <span className="text-[11px] text-[var(--muted)]">{statusLabel}</span>
              </div>
              <div className="text-lg font-['Merriweather'] text-[var(--fg)]">
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
