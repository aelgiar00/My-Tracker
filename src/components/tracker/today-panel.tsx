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

interface HabitWeight {
  durationMinutes: number;
  durationLabel: string;
  baseFriction: number;
  priority: number;
  priorityLabel: string;
}

function parseHabitSpecs(name: string): HabitWeight {
  const lower = name.toLowerCase();

  if (lower.includes("pray") || lower.includes("صلاة")) {
    return { durationMinutes: 20, durationLabel: "20 دقيقة", baseFriction: 0.1, priority: 1, priorityLabel: "أولوية قصوى" };
  }
  if (lower.includes("touch") || lower.includes("typing")) {
    return { durationMinutes: 30, durationLabel: "30 دقيقة", baseFriction: 0.25, priority: 2, priorityLabel: "أولوية متوسطة" };
  }
  if (lower.includes("nti") || lower.includes("notebook")) {
    return { durationMinutes: 120, durationLabel: "ساعتان", baseFriction: 0.7, priority: 1, priorityLabel: "أولوية قصوى" };
  }
  if (lower.includes("ml") || lower.includes("machine") || lower.includes("learning")) {
    return { durationMinutes: 150, durationLabel: "ساعتان ونصف", baseFriction: 0.85, priority: 1, priorityLabel: "أولوية قصوى" };
  }
  if (lower.includes("depi")) {
    return { durationMinutes: 120, durationLabel: "ساعتان", baseFriction: 0.65, priority: 1, priorityLabel: "أولوية قصوى" };
  }
  if (lower.includes("deep") || lower.includes("work")) {
    return { durationMinutes: 90, durationLabel: "ساعة ونصف", baseFriction: 0.75, priority: 1, priorityLabel: "أولوية قصوى" };
  }
  if (lower.includes("read") || lower.includes("قراءة")) {
    return { durationMinutes: 30, durationLabel: "30 دقيقة", baseFriction: 0.3, priority: 2, priorityLabel: "أولوية متوسطة" };
  }
  if (lower.includes("workout") || lower.includes("تمرين")) {
    return { durationMinutes: 45, durationLabel: "45 دقيقة", baseFriction: 0.5, priority: 2, priorityLabel: "أولوية متوسطة" };
  }

  return { durationMinutes: 45, durationLabel: "45 دقيقة", baseFriction: 0.4, priority: 3, priorityLabel: "عادي" };
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

  // الجاهزية الكلية لليوم بناءً على النوم وضغط الوقت
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

  // حساب دقيق وغير متكرر لكل عادة
  const habitPredictions = useMemo(() => {
    let accumulatedTime = 0;

    const mapped = todayHabits.map((habit) => {
      const specs = parseHabitSpecs(habit.name);
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
          statusLabel: "تم الإنجاز",
          feasible: true,
        };
      }

      const fitsInTime = accumulatedTime + item.specs.durationMinutes <= availableMinutes;
      accumulatedTime += item.specs.durationMinutes;

      // حساب النسبة الفردية الخاصة بالعادة
      let score = Math.round(
        readinessScore * 0.5 +
        (1 - item.specs.baseFriction) * 35 +
        (item.streakCount * 4) +
        (item.specs.durationMinutes <= 30 ? 12 : item.specs.durationMinutes <= 60 ? 4 : -8) -
        (index * 3) // ترتيب الحمل اليومي
      );

      if (!fitsInTime) {
        score = Math.max(20, score - 35);
      }

      const finalChance = Math.min(96, Math.max(25, score));

      return {
        ...item,
        chance: finalChance,
        feasible: fitsInTime,
        statusLabel: fitsInTime
          ? finalChance >= 85 ? "جاهزية مرتفعة جداً" : "الوقت متاح للإنجاز"
          : "ضغط وقت ومزاحمة",
      };
    });
  }, [todayHabits, availableMinutes, completions, todayIso, readinessScore, todayDate]);

  const nonNegotiables = habitPredictions.filter((h) => h.specs.priority === 1);

  return (
    <div className="flex flex-col gap-5 font-sans" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[var(--border)] pb-4" dir="ltr">
        <div className="flex items-center gap-2">
          <span className="size-2 rounded-full bg-blue-500 animate-pulse"></span>
          <h2 className="text-sm font-semibold tracking-wide text-blue-400">
            Personal AI <br />
            <span className="text-[11px] text-[var(--muted)]">Execution Coach</span>
          </h2>
        </div>
        <div className="rounded-xl border border-blue-500/30 bg-blue-500/10 px-3.5 py-1.5 text-center">
          <span className="text-[10px] text-blue-300 block">جاهزية اليوم:</span>
          <span className="text-lg font-bold text-blue-400 font-serif-title">{readinessScore}%</span>
        </div>
      </div>

      {/* Sliders */}
      <div className="grid grid-cols-3 gap-2.5">
        <div className="rounded-xl bg-[var(--surface-elevated)] p-2.5 border border-[var(--border)]">
          <div className="flex justify-between text-xs text-[var(--fg)] font-medium mb-1.5">
            <span>نوم:</span>
            <span>{sleepHours}س</span>
          </div>
          <input
            type="range"
            min="4"
            max="12"
            value={sleepHours}
            onChange={(e) => setSleepHours(Number(e.target.value))}
            className="h-1.5 w-full appearance-none rounded-lg bg-white/10 accent-blue-500 cursor-pointer"
          />
        </div>

        <div className="rounded-xl bg-[var(--surface-elevated)] p-2.5 border border-[var(--border)]">
          <div className="flex justify-between text-xs text-[var(--fg)] font-medium mb-1.5">
            <span>كلية:</span>
            <span>{collegeHours}س</span>
          </div>
          <input
            type="range"
            min="0"
            max="10"
            value={collegeHours}
            onChange={(e) => setCollegeHours(Number(e.target.value))}
            className="h-1.5 w-full appearance-none rounded-lg bg-white/10 accent-blue-500 cursor-pointer"
          />
        </div>

        <div className="rounded-xl bg-[var(--surface-elevated)] p-2.5 border border-[var(--border)]">
          <div className="flex justify-between text-xs text-[var(--fg)] font-medium mb-1.5">
            <span>شغل:</span>
            <span>{workHours}س</span>
          </div>
          <input
            type="range"
            min="0"
            max="12"
            value={workHours}
            onChange={(e) => setWorkHours(Number(e.target.value))}
            className="h-1.5 w-full appearance-none rounded-lg bg-white/10 accent-blue-500 cursor-pointer"
          />
        </div>
      </div>

      {/* Available Time */}
      <div className="flex items-center justify-between text-xs text-[var(--muted)] px-1">
        <span>الوقت المتاح الصافي: <strong className="text-[var(--fg)]">{availableHours} ساعات</strong></span>
        <button
          type="button"
          onClick={() => setShowDetails(!showDetails)}
          className="text-[11px] text-blue-400 hover:underline"
        >
          {showDetails ? "إخفاء التفاصيل" : "عرض التفاصيل"}
        </button>
      </div>

      {/* Non-Negotiables Box */}
      {showDetails && (
        <div className="rounded-xl bg-[var(--surface-elevated)]/70 p-3.5 border border-[var(--border)] text-xs">
          <p className="font-semibold text-rose-400 mb-2 flex items-center gap-1.5">
            🎯 الحد الأدنى المطلوب اليوم (Non-Negotiables):
          </p>
          <ul className="space-y-2 text-[11px] text-[var(--fg)]">
            {nonNegotiables.map(({ habit, specs }) => (
              <li key={habit.id} className="flex justify-between items-center pr-1 border-b border-white/5 pb-1">
                <span>• {habit.name}</span>
                <span className="text-[10px] text-amber-300 bg-amber-400/10 px-2 py-0.5 rounded-md border border-amber-400/20">
                  {specs.durationLabel} ({specs.priorityLabel})
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Habit Individual Score Cards */}
      <div className="space-y-2 max-h-[320px] overflow-y-auto pl-1">
        {habitPredictions.map(({ habit, chance, isDone, feasible, statusLabel }) => (
          <div
            key={habit.id}
            className={cn(
              "flex items-center justify-between rounded-xl p-3 border transition-all duration-150",
              isDone
                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                : feasible
                ? "bg-[var(--surface-elevated)] border-[var(--border)] text-[var(--fg)] hover:border-[var(--muted)]"
                : "bg-rose-500/5 border-rose-500/20 text-[var(--muted)]"
            )}
          >
            <div>
              <p className="text-xs font-semibold">{habit.name}</p>
              <span className="text-[10px] opacity-70 block mt-0.5">{statusLabel}</span>
            </div>
            <div className="text-left font-serif-title text-sm font-bold">
              {isDone ? "✓" : `${chance}%`}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default TodayPanel;
