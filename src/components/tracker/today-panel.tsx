import { useState, useMemo } from "react";
import { format } from "date-fns";
import { Habit } from "@/lib/tracker/types";
import { isDayExpected, completionKey } from "@/lib/tracker/schedule";
import { useTrackerStore } from "@/store/tracker-store";
import { cn } from "@/lib/utils";
import { Sparkles } from "lucide-react";

interface TodayPanelProps {
  habits: Habit[];
  stats: any;
  todayDate: Date;
}

// تقدير الأوقات الافتراضية والأولويات لكل عادة بحسب الاسم
function getHabitMetadata(name: string) {
  const lower = name.toLowerCase();
  if (lower.includes("pray") || lower.includes("صلاة")) {
    return { durationHours: 0.35, priority: 1, priorityLabel: "أولوية قصوى" };
  }
  if (lower.includes("touch") || lower.includes("typing")) {
    return { durationHours: 0.5, priority: 2, priorityLabel: "أولوية متوسطة" };
  }
  if (lower.includes("nti") || lower.includes("notebook")) {
    return { durationHours: 2.0, priority: 1, priorityLabel: "أولوية قصوى" };
  }
  if (lower.includes("ml") || lower.includes("machine") || lower.includes("learning")) {
    return { durationHours: 2.5, priority: 1, priorityLabel: "أولوية قصوى" };
  }
  if (lower.includes("depi")) {
    return { durationHours: 2.0, priority: 1, priorityLabel: "أولوية قصوى" };
  }
  if (lower.includes("deep work") || lower.includes("عمل")) {
    return { durationHours: 1.5, priority: 1, priorityLabel: "أولوية قصوى" };
  }
  return { durationHours: 1.0, priority: 3, priorityLabel: "عادي" };
}

export function TodayPanel({ habits, todayDate }: TodayPanelProps) {
  const [sleepHours, setSleepHours] = useState(8);
  const [collegeHours, setCollegeHours] = useState(4);
  const [workHours, setWorkHours] = useState(0);
  const [showDetails, setShowDetails] = useState(true);

  const completions = useTrackerStore((s) => s.completions);
  const todayIso = format(todayDate, "yyyy-MM-dd");

  // حساب الوقت المتاح الصافي
  const totalOccupied = sleepHours + collegeHours + workHours;
  const availableHours = Math.max(0, 24 - totalOccupied);

  // حساب نسبة الجاهزية الكلية لليوم
  const readinessScore = useMemo(() => {
    if (sleepHours < 6) return Math.max(40, Math.round((availableHours / 16) * 70));
    return Math.min(100, Math.round((availableHours / 14) * 100));
  }, [availableHours, sleepHours]);

  // العادات المجدولة لليوم
  const todayHabits = useMemo(() => {
    return habits
      .filter((h) => !h.archived)
      .filter((h) => isDayExpected(h.schedule, todayDate));
  }, [habits, todayDate]);

  // منطق توزيع الوقت الذكي بالـ Priorities
  const analyzedHabits = useMemo(() => {
    let remainingBudget = availableHours;

    // فرز العادات بالأولوية ثم الوقت الأقل
    const sorted = [...todayHabits].map((h) => ({
      habit: h,
      meta: getHabitMetadata(h.name),
      isDone: Boolean(completions[completionKey(h.id, todayIso)]),
    })).sort((a, b) => a.meta.priority - b.meta.priority || a.meta.durationHours - b.meta.durationHours);

    return sorted.map((item) => {
      let feasible = false;
      let chance = 0;

      if (item.isDone) {
        feasible = true;
        chance = 100;
      } else if (remainingBudget >= item.meta.durationHours) {
        feasible = true;
        remainingBudget -= item.meta.durationHours;
        chance = Math.min(96, Math.max(70, Math.round(readinessScore * 0.95)));
      } else if (remainingBudget > 0) {
        feasible = false;
        chance = Math.round((remainingBudget / item.meta.durationHours) * 60);
        remainingBudget = 0;
      } else {
        feasible = false;
        chance = 25;
      }

      return {
        ...item,
        feasible,
        chance,
      };
    });
  }, [todayHabits, availableHours, completions, todayIso, readinessScore]);

  const nonNegotiables = analyzedHabits.filter((h) => h.meta.priority === 1);

  return (
    <div className="flex flex-col gap-5 text-right font-sans" dir="rtl">
      {/* Header Info */}
      <div className="flex items-center justify-between border-b border-[var(--border)] pb-4" dir="ltr">
        <div className="flex items-center gap-2">
          <span className="size-2 rounded-full bg-blue-500 animate-pulse"></span>
          <h2 className="text-sm font-semibold tracking-wide text-blue-400">
            Personal AI <br />
            <span className="text-[11px] text-[var(--muted)]">Execution Coach</span>
          </h2>
        </div>
        <div className="rounded-xl border border-blue-500/30 bg-blue-500/10 px-3 py-1.5 text-center">
          <span className="text-[10px] text-blue-300 block">جاهزية اليوم:</span>
          <span className="text-base font-bold text-blue-400 font-serif-title">{readinessScore}%</span>
        </div>
      </div>

      {/* Sliders Area */}
      <div className="grid grid-cols-3 gap-2">
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
            className="h-1.5 w-full appearance-none rounded-lg bg-white/10 accent-blue-500"
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
            className="h-1.5 w-full appearance-none rounded-lg bg-white/10 accent-blue-500"
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
            className="h-1.5 w-full appearance-none rounded-lg bg-white/10 accent-blue-500"
          />
        </div>
      </div>

      {/* Summary Stat */}
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

      {/* Non-Negotiable Today List */}
      {showDetails && (
        <div className="rounded-xl bg-[var(--surface-elevated)]/60 p-3.5 border border-[var(--border)] text-xs">
          <p className="font-semibold text-rose-400 mb-2 flex items-center gap-1.5">
            🎯 الحد الأدنى المطلوب اليوم (Non-Negotiables):
          </p>
          <ul className="space-y-1.5 text-[11px] text-[var(--fg)]">
            {nonNegotiables.map(({ habit, meta }) => (
              <li key={habit.id} className="flex justify-between items-center pr-2">
                <span>• {habit.name}</span>
                <span className="text-[10px] text-amber-300/80 bg-amber-400/10 px-1.5 py-0.5 rounded">
                  {meta.durationHours}س ({meta.priorityLabel})
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Habit Predict Cards */}
      <div className="space-y-2 max-h-[300px] overflow-y-auto pl-1">
        {analyzedHabits.map(({ habit, chance, isDone, feasible }) => (
          <div
            key={habit.id}
            className={cn(
              "flex items-center justify-between rounded-xl p-3 border transition-all",
              isDone
                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                : feasible
                ? "bg-[var(--surface-elevated)] border-[var(--border)] text-[var(--fg)]"
                : "bg-rose-500/5 border-rose-500/20 text-[var(--muted)]"
            )}
          >
            <div>
              <p className="text-xs font-medium">{habit.name}</p>
              <span className="text-[10px] opacity-70">
                {isDone ? "تم الإنجاز" : feasible ? "الوقت متاح للإنهاء" : "مزاحم في الوقت"}
              </span>
            </div>
            <div className="text-left font-serif-title text-xs font-semibold">
              {isDone ? "✓" : `${chance}%`}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default TodayPanel;
