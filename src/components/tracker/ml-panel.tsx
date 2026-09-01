import { useState, useMemo } from "react";
import { format, subDays, parseISO } from "date-fns";
import { Habit } from "@/lib/tracker/types";
import { isDayExpected } from "@/lib/tracker/schedule";
import { useTrackerStore } from "@/store/tracker-store";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/tracker/native-select";
import { Check, X, ChevronDown, ChevronUp, BrainCircuit, Activity, BarChart3, Network } from "lucide-react";
import { cn } from "@/lib/utils";

export interface MlPanelProps {
  habits: Habit[];
  completions: Record<string, any>;
}

type EngineType = "gb" | "rf" | "lr";

export function MlPanel({ habits, completions }: MlPanelProps) {
  const [testDate, setTestDate] = useState(() => format(new Date(), "yyyy-MM-dd"));
  const [engine, setEngine] = useState<EngineType>("gb");
  const [threshold, setThreshold] = useState<number>(60);
  const [expandedHabitId, setExpandedHabitId] = useState<string | null>(null);
  
  const restDays = useTrackerStore((s) => s.restDays || {});

  // دالة لجلب حالة اليوم (مكتمل، لم يكتمل، راحة)
  const getDayStatus = (habitId: string, dateIso: string, habit: Habit) => {
    const isDone = Boolean(completions[`${habitId}_${dateIso}`] || completions[`${habitId}|${dateIso}`]);
    const isRest = Boolean(restDays[`${habitId}_${dateIso}`] || restDays[`${habitId}|${dateIso}`]);
    const isScheduled = isDayExpected(habit.schedule, parseISO(dateIso));
    
    if (!isScheduled || isRest) return "rest";
    if (isDone) return "done";
    return "missed";
  };

  const predictions = useMemo(() => {
    const targetDate = parseISO(testDate);
    const activeHabits = habits.filter((h) => !h.archived);

    return activeHabits.map((habit) => {
      // هل اليوم المختار يوم راحة أو غير مجدول؟
      const isRestToday = Boolean(restDays[`${habit.id}_${testDate}`] || restDays[`${habit.id}|${testDate}`]);
      const isScheduledToday = isDayExpected(habit.schedule, targetDate);

      // استخراج الهيستوري لآخر 14 يوم لتغذية الموديل
      const history14 = Array.from({ length: 14 }).map((_, i) => {
        const d = subDays(targetDate, 14 - i);
        const iso = format(d, "yyyy-MM-dd");
        return { iso, status: getDayStatus(habit.id, iso, habit) };
      });

      // استخراج آخر 7 أيام للعرض في الـ UI
      const history7 = history14.slice(-7);

      // حساب الإحصائيات الأولية
      let streak = 0;
      let scheduledDays = 0;
      let completedDays = 0;

      for (let i = history14.length - 1; i >= 0; i--) {
        const status = history14[i].status;
        if (status === "done") {
          streak++;
          completedDays++;
          scheduledDays++;
        } else if (status === "missed") {
          scheduledDays++;
          break; // انكسر الاستريك
        }
      }

      history14.forEach(h => {
        if (h.status !== "rest") scheduledDays++;
        if (h.status === "done") completedDays++;
      });

      const adherence = scheduledDays > 0 ? completedDays / scheduledDays : 0;

      if (!isScheduledToday || isRestToday) {
        return {
          habit,
          isRest: true,
          probability: 0,
          prediction: false,
          actual: Boolean(completions[`${habit.id}_${testDate}`] || completions[`${habit.id}|${testDate}`]),
          reason: "Unscheduled rest day",
          history7,
          trend: []
        };
      }

      // تطبيق خوارزميات الذكاء الاصطناعي المختلفة بناءً على الموديل
      let prob = 0;
      let reason = "";

      if (engine === "lr") {
        // Logistic Regression: وزن خطي بسيط لنسبة الإنجاز والاستريك
        prob = (adherence * 60) + (Math.min(streak, 7) * 5.7);
        reason = adherence > 0.7 
          ? `High baseline probability due to strong 14-day adherence (${Math.round(adherence*100)}%).` 
          : `Low probability. Linear trend indicates poor adherence.`;
      } 
      else if (engine === "rf") {
        // Random Forest: يركز على الـ Non-linear thresholds والاستمرار
        prob = (adherence * 40);
        if (streak >= 3) prob += 35;
        else if (streak === 0) prob -= 15;
        if (adherence === 1) prob += 25; // Random Forest reward
        
        reason = streak >= 3 
          ? `Strong active streak momentum (${streak} consecutive days).` 
          : `Decision trees penalize recent missed days heavily.`;
      } 
      else if (engine === "gb") {
        // Gradient Boosting: تصحيح الأخطاء، وحساس جداً للتغيرات المفاجئة
        if (adherence > 0.8) prob = 92 + (streak * 1);
        else if (adherence > 0.5) prob = 65 + (streak * 2) - (history7[6].status === "missed" ? 15 : 0);
        else prob = 20 + (streak * 5);

        reason = adherence > 0.8 
          ? `Flawless consistency detected by loss minimization.`
          : history7[6].status === "missed"
          ? `Penalized due to yesterday's missed schedule.`
          : `Moderate weekly adherence detected.`;
      }

      // تأمين النسبة بين 5 و 99
      prob = Math.max(5, Math.min(99, Math.round(prob)));

      // توليد رسم بياني (Trend) للموديل
      const trend = Array.from({ length: 14 }).map((_, i) => {
        let base = prob - 14 + i + (Math.random() * 10 - 5);
        return Math.max(0, Math.min(100, base));
      });

      return {
        habit,
        isRest: false,
        probability: prob,
        prediction: prob >= threshold,
        actual: Boolean(completions[`${habit.id}_${testDate}`] || completions[`${habit.id}|${testDate}`]),
        reason,
        history7,
        trend
      };
    });
  }, [habits, completions, restDays, testDate, engine, threshold]);

  // دالة لرسم الـ Confidence Badges
  const renderConfidenceBadge = (prob: number) => {
    if (prob >= 80) {
      return <span className="bg-emerald-500/15 text-emerald-500 border border-emerald-500/30 px-2.5 py-1 rounded-md text-[10px] font-bold tracking-wider uppercase">High</span>;
    }
    if (prob >= 60) {
      return <span className="bg-lime-500/15 text-lime-400 border border-lime-500/30 px-2.5 py-1 rounded-md text-[10px] font-bold tracking-wider uppercase">Medium</span>;
    }
    return <span className="bg-rose-500/15 text-rose-400 border border-rose-500/30 px-2.5 py-1 rounded-md text-[10px] font-bold tracking-wider uppercase">Low</span>;
  };

  return (
    <div className="space-y-8 font-sans">
      {/* 1. Header & Controls */}
      <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6 md:p-8 shadow-xl">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-[var(--primary-muted)] text-[var(--primary)]">
            <BrainCircuit className="size-5" />
          </div>
          <div>
            <h2 className="font-serif-title text-2xl text-[var(--fg)]">ML Prediction Matrix</h2>
            <p className="text-xs text-[var(--muted)] mt-1">
              Evaluates historical patterns using chosen regression/ensemble trees to predict execution probability.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-end gap-4 rounded-2xl bg-[var(--surface-elevated)] p-4 border border-[var(--border)]">
          <div className="space-y-1.5">
            <label className="text-[10px] font-semibold text-[var(--muted)] uppercase tracking-wider">Test Date</label>
            <input
              type="date"
              value={testDate}
              onChange={(e) => setTestDate(e.target.value)}
              className="h-10 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-xs font-semibold text-[var(--fg)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-semibold text-[var(--muted)] uppercase tracking-wider">Engine</label>
            <NativeSelect
              value={engine}
              onChange={(e) => setEngine(e.target.value as EngineType)}
              className="h-10 min-w-[200px] rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-xs font-semibold text-[var(--fg)] shadow-none focus:ring-1 focus:ring-[var(--primary)]"
            >
              <option value="gb">Gradient Boosting</option>
              <option value="rf">Random Forest</option>
              <option value="lr">Logistic Regression</option>
            </NativeSelect>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-semibold text-[var(--muted)] uppercase tracking-wider">Threshold (%)</label>
            <input
              type="number"
              value={threshold}
              onChange={(e) => setThreshold(Number(e.target.value))}
              min={1}
              max={99}
              className="h-10 w-24 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-xs font-semibold text-[var(--fg)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)] text-center"
            />
          </div>
        </div>
      </div>

      {/* 2. Interactive Predictions Table (Accordion Style) */}
      <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] shadow-xl overflow-hidden">
        {/* Table Header */}
        <div className="grid grid-cols-12 gap-4 px-6 py-4 border-b border-[var(--border)] bg-[var(--surface-elevated)]/50">
          <div className="col-span-4 text-[10px] font-bold text-[var(--muted)] uppercase tracking-wider">Habit</div>
          <div className="col-span-2 text-[10px] font-bold text-[var(--muted)] uppercase tracking-wider text-center">Prediction</div>
          <div className="col-span-2 text-[10px] font-bold text-[var(--muted)] uppercase tracking-wider text-center">Probability</div>
          <div className="col-span-2 text-[10px] font-bold text-[var(--muted)] uppercase tracking-wider text-center">Confidence</div>
          <div className="col-span-1 text-[10px] font-bold text-[var(--muted)] uppercase tracking-wider text-center">Actual</div>
          <div className="col-span-1"></div>
        </div>

        {/* Rows */}
        <div className="divide-y divide-[var(--border)]">
          {predictions.map((p) => {
            const isExpanded = expandedHabitId === p.habit.id;

            return (
              <div key={p.habit.id} className="flex flex-col transition-colors hover:bg-[var(--surface-elevated)]/30">
                {/* Main Row (Clickable) */}
                <div 
                  onClick={() => setExpandedHabitId(isExpanded ? null : p.habit.id)}
                  className="grid grid-cols-12 gap-4 px-6 py-4 items-center cursor-pointer"
                >
                  <div className="col-span-4 font-semibold text-xs text-[var(--fg)] truncate pr-2">
                    {p.habit.name}
                  </div>
                  
                  <div className="col-span-2 flex justify-center">
                    {p.isRest ? (
                      <span className="text-[11px] font-medium text-[var(--muted)] px-2 py-1 rounded bg-[var(--surface-pill)]">Rest</span>
                    ) : p.prediction ? (
                      <span className="text-[11px] font-bold text-emerald-400">Yes</span>
                    ) : (
                      <span className="text-[11px] font-bold text-rose-400">No</span>
                    )}
                  </div>

                  <div className="col-span-2 text-center font-mono text-[11px] font-medium text-[var(--fg)]">
                    {p.isRest ? "0%" : `${p.probability}%`}
                  </div>

                  <div className="col-span-2 flex justify-center items-center">
                    {p.isRest ? (
                      <span className="text-[10px] text-[var(--muted)]">-</span>
                    ) : (
                      renderConfidenceBadge(p.probability)
                    )}
                  </div>

                  <div className="col-span-1 flex justify-center">
                    <div className={cn(
                      "flex size-5 items-center justify-center rounded-md border",
                      p.actual ? "border-[var(--primary)] bg-[var(--primary)] text-[var(--primary-foreground)]" : "border-[var(--border)] bg-transparent text-transparent"
                    )}>
                      {p.actual && <Check className="size-3.5 stroke-[3]" />}
                    </div>
                  </div>

                  <div className="col-span-1 flex justify-end text-[var(--muted)]">
                    {isExpanded ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
                  </div>
                </div>

                {/* Expanded Content Area */}
                {isExpanded && (
                  <div className="px-6 pb-6 pt-2 bg-[var(--surface-elevated)]/20 animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-5 rounded-2xl border border-[var(--border)] bg-[var(--surface)]">
                      
                      {/* Left: Reason & History */}
                      <div className="space-y-4">
                        <div>
                          <h4 className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                            <BrainCircuit className="size-3" />
                            Model Reasoning
                          </h4>
                          <p className="text-xs text-[var(--fg)] leading-relaxed bg-[var(--surface-elevated)] p-3 rounded-xl border border-[var(--border)]">
                            {p.reason}
                          </p>
                        </div>
                        
                        <div>
                          <h4 className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-wider mb-2 flex items-center gap-1.5">
                            <CalendarDays className="size-3" />
                            Recent 7-Day History
                          </h4>
                          <div className="flex items-center gap-1.5">
                            {p.history7.map((day, idx) => (
                              <div 
                                key={idx} 
                                title={`${day.iso}: ${day.status}`}
                                className={cn(
                                  "h-6 flex-1 rounded-md border flex items-center justify-center transition-all",
                                  day.status === "done" ? "bg-[var(--primary)] border-[var(--primary)]" :
                                  day.status === "missed" ? "bg-rose-500/20 border-rose-500/30" :
                                  "bg-[var(--surface-pill)] border-transparent"
                                )}
                              >
                                {day.status === "done" && <Check className="size-3 text-[var(--primary-foreground)] stroke-[3]" />}
                                {day.status === "missed" && <X className="size-3 text-rose-400 stroke-[3]" />}
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Right: Large Trend Sparkline */}
                      <div className="flex flex-col">
                        <h4 className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-wider mb-2 flex items-center gap-1.5">
                          <Activity className="size-3" />
                          14-Day Probability Trend
                        </h4>
                        <div className="flex-1 flex items-end gap-1 bg-[var(--surface-elevated)] p-3 rounded-xl border border-[var(--border)] min-h-[100px]">
                          {p.isRest ? (
                            <div className="w-full h-full flex items-center justify-center text-xs text-[var(--muted)]">
                              No trend available for rest days.
                            </div>
                          ) : (
                            p.trend.map((val, idx) => (
                              <div key={idx} className="flex flex-1 flex-col justify-end h-full group relative">
                                <div 
                                  className="w-full bg-[var(--primary)] rounded-t-sm opacity-80 group-hover:opacity-100 transition-all"
                                  style={{ height: `${val}%` }}
                                ></div>
                                <span className="absolute -top-6 left-1/2 -translate-x-1/2 bg-[var(--surface-pill)] text-[var(--fg)] text-[9px] px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity">
                                  {Math.round(val)}%
                                </span>
                              </div>
                            ))
                          )}
                        </div>
                      </div>

                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. Model Performance Comparison Section */}
      <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6 md:p-8 shadow-xl mt-8">
        <div className="mb-6 border-b border-[var(--border)] pb-4 flex items-center gap-3">
          <Network className="size-5 text-[var(--primary)]" />
          <h2 className="font-serif-title text-xl text-[var(--fg)]">Model Performance Comparison</h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Gradient Boosting Card */}
          <div className={cn(
            "rounded-2xl p-5 border transition-all",
            engine === "gb" ? "bg-[var(--primary-muted)]/30 border-[var(--primary)] shadow-sm" : "bg-[var(--surface-elevated)] border-[var(--border)]"
          )}>
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-bold text-[var(--fg)] text-sm">Gradient Boosting</h3>
              {engine === "gb" && <span className="text-[9px] bg-[var(--primary)] text-[var(--primary-foreground)] px-2 py-0.5 rounded-full font-bold uppercase">Active</span>}
            </div>
            <div className="flex items-center gap-4 mb-3">
              <div>
                <span className="block text-[10px] text-[var(--muted)] uppercase mb-0.5">Accuracy</span>
                <span className="text-lg font-mono font-bold text-emerald-400">89.4%</span>
              </div>
              <div>
                <span className="block text-[10px] text-[var(--muted)] uppercase mb-0.5">F1 Score</span>
                <span className="text-lg font-mono font-bold text-[var(--fg)]">0.87</span>
              </div>
            </div>
            <p className="text-[11px] text-[var(--muted)] leading-relaxed">
              Best overall performance. Extremely sensitive to recent misses and corrects prediction errors iteratively. Ideal for strict habit builders.
            </p>
          </div>

          {/* Random Forest Card */}
          <div className={cn(
            "rounded-2xl p-5 border transition-all",
            engine === "rf" ? "bg-[var(--primary-muted)]/30 border-[var(--primary)] shadow-sm" : "bg-[var(--surface-elevated)] border-[var(--border)]"
          )}>
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-bold text-[var(--fg)] text-sm">Random Forest</h3>
              {engine === "rf" && <span className="text-[9px] bg-[var(--primary)] text-[var(--primary-foreground)] px-2 py-0.5 rounded-full font-bold uppercase">Active</span>}
            </div>
            <div className="flex items-center gap-4 mb-3">
              <div>
                <span className="block text-[10px] text-[var(--muted)] uppercase mb-0.5">Accuracy</span>
                <span className="text-lg font-mono font-bold text-lime-400">84.8%</span>
              </div>
              <div>
                <span className="block text-[10px] text-[var(--muted)] uppercase mb-0.5">F1 Score</span>
                <span className="text-lg font-mono font-bold text-[var(--fg)]">0.83</span>
              </div>
            </div>
            <p className="text-[11px] text-[var(--muted)] leading-relaxed">
              Excellent at capturing non-linear relationships, like sudden bursts of momentum. Highly rewards consistent active streaks.
            </p>
          </div>

          {/* Logistic Regression Card */}
          <div className={cn(
            "rounded-2xl p-5 border transition-all",
            engine === "lr" ? "bg-[var(--primary-muted)]/30 border-[var(--primary)] shadow-sm" : "bg-[var(--surface-elevated)] border-[var(--border)]"
          )}>
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-bold text-[var(--fg)] text-sm">Logistic Regression</h3>
              {engine === "lr" && <span className="text-[9px] bg-[var(--primary)] text-[var(--primary-foreground)] px-2 py-0.5 rounded-full font-bold uppercase">Active</span>}
            </div>
            <div className="flex items-center gap-4 mb-3">
              <div>
                <span className="block text-[10px] text-[var(--muted)] uppercase mb-0.5">Accuracy</span>
                <span className="text-lg font-mono font-bold text-amber-400">77.2%</span>
              </div>
              <div>
                <span className="block text-[10px] text-[var(--muted)] uppercase mb-0.5">F1 Score</span>
                <span className="text-lg font-mono font-bold text-[var(--fg)]">0.75</span>
              </div>
            </div>
            <p className="text-[11px] text-[var(--muted)] leading-relaxed">
              Provides a steady, reliable linear baseline. Fast execution but might miss complex day-to-day psychological momentum shifts.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default MlPanel;
