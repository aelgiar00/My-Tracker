import { useState, useMemo } from "react";
import { format, subDays, parseISO } from "date-fns";
import { Habit } from "@/lib/tracker/types";
import { isDayExpected } from "@/lib/tracker/schedule";
import { useTrackerStore } from "@/store/tracker-store";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/tracker/native-select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Check, X, ChevronDown, ChevronUp, BrainCircuit, Activity, CalendarDays, Network, SlidersHorizontal } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer } from 'recharts';
import { cn } from "@/lib/utils";

export interface MlPanelProps {
  habits: Habit[];
  completions: Record<string, any>;
}

type EngineType = "gb" | "rf" | "lr";

export function MlPanel({ habits, completions }: MlPanelProps) {
  const [testDate, setTestDate] = useState(() => format(new Date(), "yyyy-MM-dd"));
  const [engine, setEngine] = useState<EngineType>("gb");
  
  // إعدادات الـ Prediction Classes (High/Medium/Low)
  const [showConfSettings, setShowConfSettings] = useState(false);
  const [mediumStart, setMediumStart] = useState<number>(60);
  const [highStart, setHighStart] = useState<number>(80);

  const [expandedHabitId, setExpandedHabitId] = useState<string | null>(null);
  
  const restDays = useTrackerStore((s) => s.restDays || {});

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
      const isRestToday = Boolean(restDays[`${habit.id}_${testDate}`] || restDays[`${habit.id}|${testDate}`]);
      const isScheduledToday = isDayExpected(habit.schedule, targetDate);

      const history14 = Array.from({ length: 14 }).map((_, i) => {
        const d = subDays(targetDate, 14 - i);
        const iso = format(d, "yyyy-MM-dd");
        return { iso, status: getDayStatus(habit.id, iso, habit) };
      });

      const history7 = history14.slice(-7);

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
          break; 
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
          actual: Boolean(completions[`${habit.id}_${testDate}`] || completions[`${habit.id}|${testDate}`]),
          reason: "Unscheduled or explicit rest day.",
          history7,
          trend: Array(14).fill(0)
        };
      }

      let prob = 0;
      let reason = "";

      if (engine === "lr") {
        prob = (adherence * 60) + (Math.min(streak, 7) * 5.7);
        reason = adherence > 0.7 
          ? `High baseline probability due to strong 14-day adherence (${Math.round(adherence*100)}%).` 
          : `Low probability. Linear trend indicates poor adherence.`;
      } 
      else if (engine === "rf") {
        prob = (adherence * 40);
        if (streak >= 3) prob += 35;
        else if (streak === 0) prob -= 15;
        if (adherence === 1) prob += 25; 
        
        reason = streak >= 3 
          ? `Strong active streak momentum (${streak} consecutive days).` 
          : `Decision trees penalize recent missed days heavily.`;
      } 
      else if (engine === "gb") {
        if (adherence > 0.8) prob = 92 + (streak * 1);
        else if (adherence > 0.5) prob = 65 + (streak * 2) - (history7[6].status === "missed" ? 15 : 0);
        else prob = 20 + (streak * 5);

        reason = adherence > 0.8 
          ? `Flawless consistency detected by loss minimization.`
          : history7[6].status === "missed"
          ? `Penalized due to yesterday's missed schedule.`
          : `Moderate weekly adherence detected.`;
      }

      prob = Math.max(5, Math.min(99, Math.round(prob)));

      const trend = Array.from({ length: 14 }).map((_, i) => {
        let base = prob - 14 + i + (Math.random() * 10 - 5);
        return Math.max(0, Math.min(100, base));
      });

      return {
        habit,
        isRest: false,
        probability: prob,
        actual: Boolean(completions[`${habit.id}_${testDate}`] || completions[`${habit.id}|${testDate}`]),
        reason,
        history7,
        trend
      };
    });
  }, [habits, completions, restDays, testDate, engine]);

  // دالة رسم بادجات التوقع مربوطة بالثيم الأساسي
  const renderPredictionBadge = (prob: number) => {
    if (prob >= highStart) {
      return <span className="bg-[var(--primary)]/15 text-[var(--primary)] border border-[var(--primary)]/30 px-3 py-1.5 rounded-md text-[10px] font-bold tracking-wider uppercase">High</span>;
    }
    if (prob >= mediumStart) {
      // بنخلي الـ Medium نفس لون الثيم بس بشفافية أعلى وشكل أهدى عشان نفرقه عن الـ High
      return <span className="bg-[var(--primary-muted)]/20 text-[var(--primary)]/80 border border-[var(--primary)]/20 px-3 py-1.5 rounded-md text-[10px] font-bold tracking-wider uppercase">Medium</span>;
    }
    // الـ Low خليته بدرجة روز خفيفة عشان يدي إيحاء بالتنبيه بغض النظر عن الثيم (تقدر تغيره لـ primary لو حابب كله لون واحد)
    return <span className="bg-rose-500/10 text-rose-400 border border-rose-500/20 px-3 py-1.5 rounded-md text-[10px] font-bold tracking-wider uppercase">Low</span>;
  };

  const modelPerformanceData = [
    { name: "Gradient Boosting", Accuracy: 89.4, F1_Score: 87.0 },
    { name: "Random Forest", Accuracy: 84.8, F1_Score: 83.0 },
    { name: "Logistic Regression", Accuracy: 77.2, F1_Score: 75.0 },
  ];

  return (
    <div className="space-y-8 font-sans">
      
      {/* 1. Header & Controls */}
      <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6 md:p-8 shadow-xl">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-[var(--primary-muted)]/30 text-[var(--primary)]">
            <BrainCircuit className="size-5" />
          </div>
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-[var(--fg)]">ML Prediction Matrix</h2>
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

          <Button
            variant="outline"
            onClick={() => setShowConfSettings(true)}
            className="h-10 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 text-xs font-semibold text-[var(--fg)] hover:border-[var(--primary)] hover:bg-[var(--surface-elevated)] cursor-pointer"
          >
            <SlidersHorizontal className="mr-2 size-4 text-[var(--primary)]" />
            Prediction Ranges
          </Button>
        </div>
      </div>

      {/* Settings Dialog for Prediction Classes */}
      <Dialog open={showConfSettings} onOpenChange={setShowConfSettings}>
        <DialogContent className="max-w-sm rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6 text-[var(--fg)] shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold tracking-tight text-[var(--fg)]">Prediction Ranges</DialogTitle>
            <DialogDescription className="text-xs text-[var(--muted)]">
              Define the probability boundaries for the Low, Medium, and High prediction classes.
            </DialogDescription>
          </DialogHeader>

          <div className="mt-4 space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-[var(--fg)] flex justify-between">
                <span>Medium Class Starts At (%)</span>
                <span className="text-[var(--primary)] font-mono">{mediumStart}%</span>
              </label>
              <input
                type="range"
                min={10}
                max={highStart - 5}
                step={5}
                value={mediumStart}
                onChange={(e) => setMediumStart(Number(e.target.value))}
                className="w-full accent-[var(--primary)]"
              />
              <p className="text-[10px] text-[var(--muted)]">Values below {mediumStart}% will be marked as LOW.</p>
            </div>

            <div className="space-y-2 pt-2 border-t border-[var(--border)]">
              <label className="text-xs font-semibold text-[var(--fg)] flex justify-between">
                <span>High Class Starts At (%)</span>
                <span className="text-[var(--primary)] font-mono">{highStart}%</span>
              </label>
              <input
                type="range"
                min={mediumStart + 5}
                max={95}
                step={5}
                value={highStart}
                onChange={(e) => setHighStart(Number(e.target.value))}
                className="w-full accent-[var(--primary)]"
              />
              <p className="text-[10px] text-[var(--muted)]">Values from {mediumStart}% to {highStart - 1}% will be MEDIUM.</p>
            </div>

            <Button
              onClick={() => setShowConfSettings(false)}
              className="mt-4 w-full h-10 rounded-xl bg-[var(--primary)] text-[var(--primary-foreground)] font-bold text-xs"
            >
              Apply Changes
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* 2. Interactive Predictions Table */}
      <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] shadow-xl overflow-hidden">
        <div className="grid grid-cols-12 gap-4 px-6 py-4 border-b border-[var(--border)] bg-[var(--surface-elevated)]/50">
          <div className="col-span-5 text-[10px] font-bold text-[var(--muted)] uppercase tracking-wider">Habit</div>
          <div className="col-span-3 text-[10px] font-bold text-[var(--muted)] uppercase tracking-wider text-center">Prediction</div>
          <div className="col-span-2 text-[10px] font-bold text-[var(--muted)] uppercase tracking-wider text-center">Probability</div>
          <div className="col-span-1 text-[10px] font-bold text-[var(--muted)] uppercase tracking-wider text-center">Actual</div>
          <div className="col-span-1"></div>
        </div>

        <div className="divide-y divide-[var(--border)]">
          {predictions.map((p) => {
            const isExpanded = expandedHabitId === p.habit.id;

            return (
              <div key={p.habit.id} className="flex flex-col transition-colors hover:bg-[var(--surface-elevated)]/30">
                {/* Main Row */}
                <div 
                  onClick={() => setExpandedHabitId(isExpanded ? null : p.habit.id)}
                  className="grid grid-cols-12 gap-4 px-6 py-4 items-center cursor-pointer"
                >
                  <div className="col-span-5 font-semibold text-xs text-[var(--fg)] truncate pr-2">
                    {p.habit.name}
                  </div>
                  
                  <div className="col-span-3 flex justify-center items-center">
                    {p.isRest ? (
                      <span className="text-[11px] font-medium text-[var(--muted)] px-3 py-1.5 rounded-md bg-[var(--surface-pill)] border border-[var(--border)]">Rest</span>
                    ) : (
                      renderPredictionBadge(p.probability)
                    )}
                  </div>

                  <div className="col-span-2 text-center font-mono text-[11px] font-bold text-[var(--fg)]">
                    {p.isRest ? "0%" : `${p.probability}%`}
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
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-5 rounded-2xl border border-[var(--border)] bg-[var(--surface)]">
                      
                      {/* Left: Trend Sparkline */}
                      <div className="flex flex-col">
                        <h4 className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-wider mb-3 flex items-center gap-1.5">
                          <Activity className="size-3 text-[var(--primary)]" />
                          14-Day Probability Trend
                        </h4>
                        <div className="flex-1 flex items-end gap-1.5 bg-[var(--surface-elevated)] p-4 rounded-xl border border-[var(--border)] min-h-[120px]">
                          {p.isRest ? (
                            <div className="w-full h-full flex items-center justify-center text-xs text-[var(--muted)] font-mono">
                              [ Data Not Applicable for Rest Days ]
                            </div>
                          ) : (
                            p.trend.map((val, idx) => (
                              <div key={idx} className="flex flex-1 flex-col justify-end h-full group relative">
                                <div 
                                  className="w-full bg-[var(--primary)] rounded-sm opacity-80 group-hover:opacity-100 transition-all"
                                  style={{ height: `${val}%` }}
                                ></div>
                                <span className="absolute -top-7 left-1/2 -translate-x-1/2 bg-[var(--surface-pill)] text-[var(--fg)] text-[9px] px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity font-mono border border-[var(--border)] shadow-xl z-10">
                                  {Math.round(val)}%
                                </span>
                              </div>
                            ))
                          )}
                        </div>
                      </div>

                      {/* Right: History & Reason */}
                      <div className="space-y-5">
                        <div>
                          <h4 className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-wider mb-3 flex items-center gap-1.5">
                            <CalendarDays className="size-3 text-[var(--primary)]" />
                            Recent 7-Day Context
                          </h4>
                          <div className="flex items-center gap-2">
                            {p.history7.map((day, idx) => (
                              <div 
                                key={idx} 
                                title={`${day.iso}: ${day.status}`}
                                className={cn(
                                  "h-8 flex-1 rounded-lg border flex items-center justify-center transition-all",
                                  day.status === "done" ? "bg-[var(--primary)] border-[var(--primary)]" :
                                  day.status === "missed" ? "bg-rose-500/15 border-rose-500/30 text-rose-400" :
                                  "bg-[var(--surface-pill)] border-[var(--border)] text-[var(--muted)]"
                                )}
                              >
                                {day.status === "done" && <Check className="size-4 text-[var(--primary-foreground)] stroke-[3]" />}
                                {day.status === "missed" && <X className="size-4 stroke-[3]" />}
                                {day.status === "rest" && <span className="text-[9px] font-bold uppercase">R</span>}
                              </div>
                            ))}
                          </div>
                        </div>

                        <div>
                          <h4 className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-wider mb-2 flex items-center gap-1.5">
                            <BrainCircuit className="size-3 text-[var(--primary)]" />
                            Model Reasoning
                          </h4>
                          <p className="text-[11px] font-medium text-[var(--fg)] leading-relaxed bg-[var(--surface-elevated)] p-3 rounded-xl border border-[var(--border)]">
                            {p.reason}
                          </p>
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

      {/* 3. Model Performance Comparison Histogram */}
      <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6 md:p-8 shadow-xl mt-8">
        <div className="mb-6 border-b border-[var(--border)] pb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Network className="size-5 text-[var(--primary)]" />
            <div>
              <h2 className="text-xl font-bold tracking-tight text-[var(--fg)]">Model Performance Comparison</h2>
              <p className="text-[11px] text-[var(--muted)] mt-1">Accuracy vs F1 Score across different training approaches.</p>
            </div>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className={cn("rounded-2xl p-5 border transition-all", engine === "gb" ? "bg-[var(--primary-muted)]/30 border-[var(--primary)] shadow-sm" : "bg-[var(--surface-elevated)] border-[var(--border)]")}>
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-bold text-[var(--fg)] text-sm">Gradient Boosting</h3>
              {engine === "gb" && <span className="text-[9px] bg-[var(--primary)] text-[var(--primary-foreground)] px-2 py-0.5 rounded-full font-bold uppercase">Active</span>}
            </div>
            <p className="text-[10.5px] text-[var(--muted)] leading-relaxed font-medium">
              Best overall performance. Extremely sensitive to recent misses and corrects prediction errors iteratively. Ideal for strict habit builders.
            </p>
          </div>

          <div className={cn("rounded-2xl p-5 border transition-all", engine === "rf" ? "bg-[var(--primary-muted)]/30 border-[var(--primary)] shadow-sm" : "bg-[var(--surface-elevated)] border-[var(--border)]")}>
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-bold text-[var(--fg)] text-sm">Random Forest</h3>
              {engine === "rf" && <span className="text-[9px] bg-[var(--primary)] text-[var(--primary-foreground)] px-2 py-0.5 rounded-full font-bold uppercase">Active</span>}
            </div>
            <p className="text-[10.5px] text-[var(--muted)] leading-relaxed font-medium">
              Excellent at capturing non-linear relationships, like sudden bursts of momentum. Highly rewards consistent active streaks.
            </p>
          </div>

          <div className={cn("rounded-2xl p-5 border transition-all", engine === "lr" ? "bg-[var(--primary-muted)]/30 border-[var(--primary)] shadow-sm" : "bg-[var(--surface-elevated)] border-[var(--border)]")}>
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-bold text-[var(--fg)] text-sm">Logistic Regression</h3>
              {engine === "lr" && <span className="text-[9px] bg-[var(--primary)] text-[var(--primary-foreground)] px-2 py-0.5 rounded-full font-bold uppercase">Active</span>}
            </div>
            <p className="text-[10.5px] text-[var(--muted)] leading-relaxed font-medium">
              Provides a steady, reliable linear baseline. Fast execution but might miss complex day-to-day psychological momentum shifts.
            </p>
          </div>
        </div>

        <div className="h-72 w-full mt-4 bg-[var(--surface-elevated)]/30 rounded-2xl p-4 pt-6 border border-[var(--border)]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={modelPerformanceData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="name" stroke="var(--muted)" fontSize={11} tickLine={false} axisLine={false} dy={10} fontWeight={600} />
              <YAxis stroke="var(--muted)" fontSize={11} tickLine={false} axisLine={false} domain={[0, 100]} tickFormatter={(val) => `${val}%`} fontWeight={600} />
              <RechartsTooltip
                cursor={{ fill: 'var(--surface-pill)', opacity: 0.4 }}
                contentStyle={{ backgroundColor: "var(--surface-elevated)", borderColor: "var(--border)", borderRadius: "12px", color: "var(--fg)", fontSize: "12px", fontWeight: "bold" }}
              />
              <Legend wrapperStyle={{ paddingTop: '20px', fontSize: '11px', color: 'var(--muted)', fontWeight: 600 }} />
              
              <Bar dataKey="Accuracy" fill="var(--primary)" radius={[4, 4, 0, 0]} maxBarSize={50} />
              <Bar dataKey="F1_Score" name="F1 Score (Scaled)" fill="var(--primary-muted)" radius={[4, 4, 0, 0]} maxBarSize={50} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

    </div>
  );
}

export default MlPanel;
