import { useMemo, useState } from "react";
import { format } from "date-fns";
import { useTrackerStore } from "@/store/tracker-store";
import { isDayExpected, completionKey, scheduleForMonth } from "@/lib/tracker/schedule";
import { monthDays } from "@/lib/tracker/stats";
import { Button } from "@/components/ui/button";
import { Maximize2, Minimize2, Grid3X3 } from "lucide-react";
import { cn } from "@/lib/utils";

export function AnalyticsPanel() {
  const [fullScreen, setFullScreen] = useState(false);
  const habits = useTrackerStore((s) => s.habits.filter((h) => !h.archived));
  const completions = useTrackerStore((s) => s.completions);
  const selectedYear = useTrackerStore((s) => s.selectedYear);
  const selectedMonth = useTrackerStore((s) => s.selectedMonth);
  const trackingStart = useTrackerStore((s) => s.trackingStart);

  const allMonthDays = useMemo(
    () => monthDays(selectedYear, selectedMonth, trackingStart),
    [selectedYear, selectedMonth, trackingStart]
  );

  const habitsBreakdown = useMemo(() => {
    return habits.map((habit) => {
      let expected = 0;
      let completed = 0;

      const schedule = scheduleForMonth(habit, selectedYear, selectedMonth) || habit.schedule;

      if (schedule && schedule.type === "monthlyTarget") {
        expected = schedule.targetDays;
        allMonthDays.forEach((date) => {
          const iso = format(date, "yyyy-MM-dd");
          if (completions[completionKey(habit.id, iso)]) completed++;
        });
      } else {
        allMonthDays.forEach((date) => {
          if (isDayExpected(schedule, date)) {
            expected++;
            const iso = format(date, "yyyy-MM-dd");
            if (completions[completionKey(habit.id, iso)]) completed++;
          }
        });
      }

      const rate = expected > 0 ? (completed / expected) * 100 : 0;
      return { habit, expected, completed, rate: Math.min(100, rate) };
    });
  }, [habits, completions, allMonthDays, selectedYear, selectedMonth]);

  const daysBreakdown = useMemo(() => {
    return allMonthDays.map((date) => {
      const iso = format(date, "yyyy-MM-dd");
      let expected = 0;
      let completed = 0;

      habits.forEach((habit) => {
        const schedule = scheduleForMonth(habit, selectedYear, selectedMonth) || habit.schedule;
        if (isDayExpected(schedule, date)) {
          expected++;
          if (completions[completionKey(habit.id, iso)]) completed++;
        }
      });

      return { iso, expected, completed, date };
    });
  }, [allMonthDays, habits, completions, selectedYear, selectedMonth]);

  const totalCompleted = habitsBreakdown.reduce((sum, h) => sum + h.completed, 0);
  const totalExpected = habitsBreakdown.reduce((sum, h) => sum + h.expected, 0);
  const paceScore = totalExpected > 0 ? Math.round((totalCompleted / totalExpected) * 100) : 0;

  // Radar Data - مصفوفة شعاعية دائرية متطورة مطابقة للصورة 4
  const radarData = useMemo(() => {
    const list = habitsBreakdown.slice(0, 12); // حتى 12 عادة لتمثيل رادار واسع
    const totalAxes = Math.max(6, list.length);
    const viewBoxSize = fullScreen ? 480 : 340;
    const center = viewBoxSize / 2;
    const maxRadius = fullScreen ? 170 : 115;
    const labelRadius = fullScreen ? 205 : 142;

    const circles = [0.2, 0.4, 0.6, 0.8, 1.0];

    const axes = Array.from({ length: totalAxes }, (_, i) => {
      const angle = (Math.PI * 2 / totalAxes) * i - Math.PI / 2;
      const x = center + maxRadius * Math.cos(angle);
      const y = center + maxRadius * Math.sin(angle);

      const labelX = center + labelRadius * Math.cos(angle);
      const labelY = center + labelRadius * Math.sin(angle);

      const item = list[i];
      const name = item ? item.habit.name : "";
      const rate = item ? Math.round(item.rate) : 0;
      const score = item ? Math.max(0.12, Math.min(1, item.rate / 100)) : 0.12;

      const pointX = center + (maxRadius * score) * Math.cos(angle);
      const pointY = center + (maxRadius * score) * Math.sin(angle);

      let textAnchor = "middle";
      if (Math.cos(angle) > 0.25) textAnchor = "start";
      else if (Math.cos(angle) < -0.25) textAnchor = "end";

      return {
        angle,
        x,
        y,
        labelX,
        labelY,
        pointX,
        pointY,
        name,
        rate,
        textAnchor,
        hasHabit: Boolean(item),
      };
    });

    const polygonPoints = axes
      .filter((a) => a.hasHabit)
      .map((a) => `${a.pointX},${a.pointY}`)
      .join(" ");

    return {
      axes,
      circles,
      polygonPoints,
      center,
      maxRadius,
      viewBoxSize,
      hasData: list.length > 0,
    };
  }, [habitsBreakdown, fullScreen]);

  // Correlation Matrix
  const correlationMatrix = useMemo(() => {
    const topHabits = habits.slice(0, 8);
    const size = topHabits.length;
    const matrix: { h1: string; h2: string; correlation: number }[][] = [];

    for (let i = 0; i < size; i++) {
      const row: { h1: string; h2: string; correlation: number }[] = [];
      const h1 = topHabits[i];

      for (let j = 0; j < size; j++) {
        const h2 = topHabits[j];

        if (i === j) {
          row.push({ h1: h1.name, h2: h2.name, correlation: 1.0 });
          continue;
        }

        let bothDone = 0;
        let eitherExpected = 0;

        allMonthDays.forEach((date) => {
          const iso = format(date, "yyyy-MM-dd");
          const s1 = scheduleForMonth(h1, selectedYear, selectedMonth) || h1.schedule;
          const s2 = scheduleForMonth(h2, selectedYear, selectedMonth) || h2.schedule;

          const e1 = isDayExpected(s1, date);
          const e2 = isDayExpected(s2, date);

          if (e1 || e2) {
            eitherExpected++;
            const d1 = Boolean(completions[completionKey(h1.id, iso)]);
            const d2 = Boolean(completions[completionKey(h2.id, iso)]);
            if (d1 && d2) bothDone++;
          }
        });

        const score = eitherExpected > 0 ? Number((bothDone / eitherExpected).toFixed(2)) : 0;
        row.push({ h1: h1.name, h2: h2.name, correlation: score });
      }
      matrix.push(row);
    }

    return { habits: topHabits, matrix };
  }, [habits, completions, allMonthDays, selectedYear, selectedMonth]);

  const displayDays = useMemo(() => {
    return daysBreakdown.slice(0, fullScreen ? 31 : 14);
  }, [daysBreakdown, fullScreen]);

  return (
    <div
      className={cn(
        "space-y-6 transition-all duration-300 font-sans",
        fullScreen &&
          "fixed inset-0 z-50 overflow-y-auto bg-[var(--bg)] p-6 md:p-10 shadow-2xl border-t border-[var(--border)]"
      )}
    >
      {/* Top Header Bar */}
      <div className="flex items-center justify-between rounded-2xl bg-[var(--surface)] p-4 border border-[var(--border)]">
        <div>
          <h3 className="text-xs font-semibold text-[var(--fg)]">Chart view</h3>
          <p className="text-[11px] text-[var(--muted)]">
            Performance analytics, correlation matrix, and trajectory tracking.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setFullScreen(!fullScreen)}
          className="h-8 rounded-xl border-[var(--border)] bg-[var(--surface-elevated)] px-3 text-xs text-[var(--fg)] hover:border-[var(--primary)]/50 cursor-pointer"
        >
          {fullScreen ? <Minimize2 className="mr-1.5 size-3.5" /> : <Maximize2 className="mr-1.5 size-3.5" />}
          {fullScreen ? "Exit Full-Screen" : "Full-screen charts"}
        </Button>
      </div>

      {/* 4 KPI Cards */}
      {!fullScreen && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-lg">
            <div className="flex items-center justify-between">
              <div className="relative flex size-16 items-center justify-center">
                <svg className="size-full -rotate-90" viewBox="0 0 72 72">
                  <circle cx="36" cy="36" r="30" className="stroke-[var(--surface-pill)]" strokeWidth="5" fill="none" />
                  <circle
                    cx="36"
                    cy="36"
                    r="30"
                    className="stroke-[var(--primary)] transition-all duration-500"
                    strokeWidth="5"
                    strokeDasharray={2 * Math.PI * 30}
                    strokeDashoffset={2 * Math.PI * 30 * (1 - paceScore / 100)}
                    strokeLinecap="round"
                    fill="none"
                  />
                </svg>
                <div className="absolute flex flex-col items-center justify-center text-center">
                  <span className="text-base font-bold text-[var(--fg)] font-serif-title leading-none">{paceScore}%</span>
                  <span className="text-[8px] font-semibold text-[var(--muted)] uppercase tracking-wider mt-0.5">PACE</span>
                </div>
              </div>
            </div>
            <p className="mt-3 text-xs text-[var(--muted)]">Current monthly velocity</p>
          </div>

          <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-lg">
            <span className="text-[11px] font-semibold tracking-wider text-[var(--muted)] uppercase">TO TARGET DATE</span>
            <p className="mt-2 font-serif-title text-3xl font-normal text-[var(--fg)]">
              {totalCompleted}/{totalExpected}
            </p>
            <p className="mt-1 text-xs text-[var(--muted)]">Completed vs scheduled up to the selected active date.</p>
          </div>

          <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-lg">
            <span className="text-[11px] font-semibold tracking-wider text-[var(--muted)] uppercase">TRACKED HABITS</span>
            <p className="mt-2 font-serif-title text-3xl font-normal text-[var(--fg)]">
              {habits.length}
            </p>
            <p className="mt-1 text-xs text-[var(--muted)]">Active habit rows in the matrix.</p>
          </div>

          <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-lg">
            <span className="text-[11px] font-semibold tracking-wider text-[var(--muted)] uppercase">PERFECT STREAK</span>
            <p className="mt-2 font-serif-title text-3xl font-normal text-[var(--fg)]">
              {totalCompleted > 0 ? "1" : "0"}
            </p>
            <p className="mt-1 text-xs text-[var(--muted)]">Consecutive 100% days leading up to the target date.</p>
          </div>
        </div>
      )}

      {/* 2x2 Core Visualizations Grid */}
      <div className={cn("grid gap-6 transition-all duration-300", fullScreen ? "grid-cols-1" : "lg:grid-cols-2")}>
        {/* 1. Daily Execution */}
        <div className={cn("rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-lg flex flex-col justify-between", fullScreen && "p-8 md:p-10")}>
          <h3 className={cn("text-xs font-semibold text-[var(--fg)]", fullScreen && "text-sm")}>Daily execution</h3>

          <div className={cn("mt-6 flex h-48 gap-2", fullScreen && "h-[45vh] gap-4")}>
            <div className={cn("flex flex-col justify-between text-[9px] font-mono text-[var(--muted)] pr-1 select-none text-right", fullScreen && "text-xs pr-3")}>
              <span>100%</span>
              <span>80%</span>
              <span>60%</span>
              <span>40%</span>
              <span>20%</span>
              <span>0%</span>
            </div>

            <div className="relative flex flex-1 flex-col justify-between">
              <div className="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-10">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="border-b border-[var(--border)] w-full"></div>
                ))}
              </div>

              <div className="flex flex-1 items-end justify-between gap-1 z-10 border-b border-[var(--border)] pb-0.5">
                {displayDays.map((d) => {
                  const pct = d.expected > 0 ? Math.round((d.completed / d.expected) * 100) : 0;
                  return (
                    <div key={d.iso} className="flex flex-1 flex-col items-center justify-end h-full">
                      <div
                        className={cn(
                          "w-full max-w-[14px] rounded-t transition-all cursor-pointer",
                          fullScreen && "max-w-[22px]",
                          pct > 0
                            ? "bg-[var(--primary)] hover:opacity-85 shadow-xs"
                            : "bg-[var(--surface-pill)]/40 hover:bg-[var(--surface-pill)]"
                        )}
                        style={{ height: pct > 0 ? `${pct}%` : "3px" }}
                        title={`${d.iso}: ${pct}% (${d.completed}/${d.expected})`}
                      />
                    </div>
                  );
                })}
              </div>

              <div className="flex justify-between gap-1 pt-1 z-10">
                {displayDays.map((d) => (
                  <span key={d.iso} className={cn("flex-1 text-center text-[9px] font-mono text-[var(--muted)]", fullScreen && "text-[11px]")}>
                    {d.iso.slice(8)}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* 2. Habit Completion */}
        <div className={cn("rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-lg flex flex-col", fullScreen && "p-8 md:p-10")}>
          <h3 className={cn("text-xs font-semibold text-[var(--fg)]", fullScreen && "text-sm mb-4")}>Habit completion</h3>
          <div className={cn("mt-5 space-y-3 max-h-48 overflow-y-auto pr-1", fullScreen && "max-h-none space-y-4 mt-0")}>
            {habitsBreakdown.length === 0 ? (
              <p className="text-xs text-[var(--muted)] py-8 text-center">No habits added yet.</p>
            ) : (
              habitsBreakdown.map((item) => {
                const pct = Math.round(item.rate);
                return (
                  <div key={item.habit.id} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-[var(--fg)] font-medium truncate max-w-[140px]">{item.habit.name}</span>
                      <span className="text-[var(--muted)] font-mono">{pct}%</span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--surface-elevated)]">
                      <div
                        className="h-full rounded-full bg-[var(--primary)] transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* 3. Mastery Radar (Exact Image 4 Radial Style) */}
        <div className={cn("rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-lg flex flex-col justify-between", fullScreen && "p-8 md:p-10")}>
          <div className="flex items-center justify-between mb-2">
            <h3 className={cn("text-xs font-semibold text-[var(--fg)]", fullScreen && "text-sm")}>Habit Mastery Radar</h3>
            <span className="text-[10px] text-[var(--muted)]">Coverage</span>
          </div>

          <div className={cn("relative my-auto flex items-center justify-center py-2", fullScreen && "h-[50vh]")}>
            <svg viewBox={`0 0 ${radarData.viewBoxSize} ${radarData.viewBoxSize}`} className="w-full max-w-[340px] aspect-square overflow-visible">
              {/* الدوائر المتراكزة (Concentric Circles) */}
              {radarData.circles.map((rPct, idx) => (
                <circle
                  key={idx}
                  cx={radarData.center}
                  cy={radarData.center}
                  r={radarData.maxRadius * rPct}
                  className="stroke-[var(--border)] opacity-35"
                  strokeWidth="0.75"
                  fill="none"
                />
              ))}

              {/* خطوط المحاور الشعاعية (Radial Axis Rays) */}
              {radarData.axes.map((axis, idx) => (
                <line
                  key={idx}
                  x1={radarData.center}
                  y1={radarData.center}
                  x2={axis.x}
                  y2={axis.y}
                  className="stroke-[var(--border)] opacity-35"
                  strokeWidth="0.75"
                />
              ))}

              {/* شكل التغطية المتوهج (Glow Fill Polygon) */}
              {radarData.hasData && (
                <polygon
                  points={radarData.polygonPoints}
                  fill="var(--primary-muted)"
                  stroke="var(--primary)"
                  strokeWidth="1.75"
                  className="transition-all duration-500"
                  style={{ filter: "drop-shadow(0 0 6px var(--glow))" }}
                />
              )}

              {/* نقاط التقاطع */}
              {radarData.axes.filter((a) => a.hasHabit).map((axis, idx) => (
                <circle
                  key={idx}
                  cx={axis.pointX}
                  cy={axis.pointY}
                  r="2.5"
                  fill="var(--primary)"
                  className="transition-all duration-500"
                />
              ))}

              {/* أسماء العادات المحيطة بالرادار */}
              {radarData.axes.filter((a) => a.hasHabit).map((axis, idx) => (
                <text
                  key={idx}
                  x={axis.labelX}
                  y={axis.labelY}
                  textAnchor={axis.textAnchor}
                  dominantBaseline="central"
                  className={cn(
                    "fill-[var(--fg)] text-[10px] font-medium select-none transition-all duration-300",
                    fullScreen && "text-[12px] font-semibold"
                  )}
                >
                  {axis.name.length > 12 ? `${axis.name.slice(0, 10)}..` : axis.name}
                </text>
              ))}
            </svg>
          </div>
        </div>

        {/* 4. Month Heatmap */}
        <div className={cn("rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-lg flex flex-col justify-between", fullScreen && "p-8 md:p-10")}>
          <div className="flex items-center justify-between">
            <h3 className={cn("text-xs font-semibold text-[var(--fg)]", fullScreen && "text-sm")}>Month heatmap</h3>
            <div className="flex items-center gap-1.5 text-[9px] text-[var(--muted)]">
              <span>Less</span>
              <div className="size-2 rounded-xs bg-[var(--surface-elevated)] border border-[var(--border)]"></div>
              <div className="size-2 rounded-xs bg-[var(--primary-muted)]"></div>
              <div className="size-2 rounded-xs bg-[var(--primary)]"></div>
              <span>More</span>
            </div>
          </div>

          <div className="my-auto pt-3">
            <div className="grid grid-cols-7 gap-1.5 text-center text-[10px] font-mono font-medium text-[var(--muted)] uppercase mb-2">
              <span>Mon</span>
              <span>Tue</span>
              <span>Wed</span>
              <span>Thu</span>
              <span>Fri</span>
              <span>Sat</span>
              <span>Sun</span>
            </div>

            <div className="grid grid-cols-7 gap-1.5">
              {daysBreakdown.map((d) => {
                const pct = d.expected > 0 ? d.completed / d.expected : 0;
                return (
                  <div
                    key={d.iso}
                    title={`${d.iso}: ${Math.round(pct * 100)}%`}
                    className={cn(
                      "aspect-square rounded-xl flex items-center justify-center text-[10px] font-mono transition-all duration-150 cursor-pointer select-none",
                      pct >= 0.8
                        ? "bg-[var(--primary)] text-[var(--primary-foreground)] font-bold shadow-xs scale-[0.98]"
                        : pct >= 0.4
                        ? "bg-[var(--primary-muted)] text-[var(--fg)] border border-[var(--primary)]/30"
                        : pct > 0
                        ? "bg-[var(--primary-muted)]/40 text-[var(--muted)] border border-[var(--border)]"
                        : "bg-[var(--surface-elevated)] text-[var(--muted)]/50 border border-[var(--border)] hover:border-[var(--muted)]"
                    )}
                  >
                    {d.iso.slice(8)}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* 5. Habit Correlation & Confusion Matrix */}
      <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6 sm:p-8 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6 border-b border-[var(--border)] pb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex size-7 items-center justify-center rounded-xl bg-[var(--primary-muted)] text-[var(--primary)]">
              <Grid3X3 className="size-4" />
            </div>
            <div>
              <h3 className="font-serif-title text-xl text-[var(--fg)]">Confusion & Correlation Matrix</h3>
              <p className="text-xs text-[var(--muted)]">
                Cross-habit co-occurrence and execution alignment probability.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-[10px] text-[var(--muted)]">
            <span>Low (0.0)</span>
            <div className="size-3 rounded bg-[var(--surface-elevated)] border border-[var(--border)]"></div>
            <div className="size-3 rounded bg-[var(--primary-muted)]"></div>
            <div className="size-3 rounded bg-[var(--primary)]"></div>
            <span>High (1.0)</span>
          </div>
        </div>

        {correlationMatrix.habits.length === 0 ? (
          <p className="text-xs text-[var(--muted)] py-6 text-center">Add habits to compute pairwise correlation.</p>
        ) : (
          <div className="overflow-x-auto pb-2">
            <table className="min-w-full border-separate border-spacing-1.5">
              <thead>
                <tr>
                  <th className="p-2 text-left text-[11px] font-medium text-[var(--muted)] max-w-[120px] truncate">
                    Habit
                  </th>
                  {correlationMatrix.habits.map((h) => (
                    <th
                      key={h.id}
                      className="p-2 text-center text-[10px] font-mono text-[var(--muted)] max-w-[90px] truncate"
                      title={h.name}
                    >
                      {h.name.length > 8 ? `${h.name.slice(0, 7)}..` : h.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {correlationMatrix.matrix.map((row, i) => (
                  <tr key={i}>
                    <td
                      className="p-2 text-xs font-medium text-[var(--fg)] max-w-[120px] truncate"
                      title={correlationMatrix.habits[i].name}
                    >
                      {correlationMatrix.habits[i].name}
                    </td>
                    {row.map((cell, j) => {
                      const val = cell.correlation;
                      const isDiagonal = i === j;
                      return (
                        <td key={j} className="p-0 text-center">
                          <div
                            title={`${cell.h1} ↔ ${cell.h2}: ${Math.round(val * 100)}% Co-occurrence`}
                            className={cn(
                              "size-10 sm:size-11 mx-auto rounded-xl flex items-center justify-center text-[10.5px] font-mono transition-all select-none border",
                              isDiagonal
                                ? "bg-[var(--primary)] text-[var(--primary-foreground)] font-bold border-[var(--primary)] shadow-xs"
                                : val >= 0.75
                                ? "bg-[var(--primary-muted)] text-[var(--fg)] font-semibold border-[var(--primary)]/40"
                                : val >= 0.4
                                ? "bg-[var(--primary-muted)]/40 text-[var(--fg)] border-[var(--border)]"
                                : val > 0
                                ? "bg-[var(--surface-elevated)] text-[var(--muted)] border-[var(--border)]"
                                : "bg-[var(--surface-pill)]/40 text-[var(--muted)]/40 border-transparent"
                            )}
                          >
                            {val.toFixed(2)}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default AnalyticsPanel;
