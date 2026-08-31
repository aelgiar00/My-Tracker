import { useMemo, useState } from "react";
import { format } from "date-fns";
import { useTrackerStore } from "@/store/tracker-store";
import { isDayExpected, completionKey, scheduleForMonth } from "@/lib/tracker/schedule";
import { monthDays } from "@/lib/tracker/stats";
import { Button } from "@/components/ui/button";
import { Maximize2, Minimize2 } from "lucide-react";
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

      allMonthDays.forEach((date) => {
        const schedule = scheduleForMonth(habit, selectedYear, selectedMonth) || habit.schedule;
        if (isDayExpected(schedule, date)) {
          expected++;
          const iso = format(date, "yyyy-MM-dd");
          if (completions[completionKey(habit.id, iso)]) completed++;
        }
      });

      const rate = expected > 0 ? (completed / expected) * 100 : 0;
      return { habit, expected, completed, rate };
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

      return { iso, expected, completed };
    });
  }, [allMonthDays, habits, completions, selectedYear, selectedMonth]);

  const totalCompleted = habitsBreakdown.reduce((sum, h) => sum + h.completed, 0);
  const totalExpected = habitsBreakdown.reduce((sum, h) => sum + h.expected, 0);
  const paceScore = totalExpected > 0 ? Math.round((totalCompleted / totalExpected) * 100) : 0;

  // حساب إحداثيات الرادار مع الـ Labels الخارجية
  const radarData = useMemo(() => {
    const list = habitsBreakdown.slice(0, 6);
    const total = Math.max(3, list.length);
    const center = 110;
    const maxRadius = 60;
    const labelRadius = 85;

    const points = list.map((item, i) => {
      const angle = (Math.PI * 2 / total) * i - Math.PI / 2;
      const score = Math.max(0.15, Math.min(1, (item.rate || 10) / 100));
      
      const r = maxRadius * score;
      const x = center + r * Math.cos(angle);
      const y = center + r * Math.sin(angle);

      const labelX = center + labelRadius * Math.cos(angle);
      const labelY = center + labelRadius * Math.sin(angle);

      // تحديد محاذاة النص حسب مكانه حول المركز
      let textAnchor = "middle";
      if (Math.cos(angle) > 0.3) textAnchor = "start";
      else if (Math.cos(angle) < -0.3) textAnchor = "end";

      return {
        x,
        y,
        labelX,
        labelY,
        textAnchor,
        name: item.habit.name,
        rate: Math.round(item.rate),
      };
    });

    const webLevels = [0.33, 0.66, 1].map((level) => {
      return Array.from({ length: total }, (_, i) => {
        const angle = (Math.PI * 2 / total) * i - Math.PI / 2;
        const r = maxRadius * level;
        return `${center + r * Math.cos(angle)},${center + r * Math.sin(angle)}`;
      }).join(" ");
    });

    return {
      points,
      polygonPath: points.map((p) => `${p.x},${p.y}`).join(" "),
      webLevels,
      center,
    };
  }, [habitsBreakdown]);

  return (
    <div className={cn("space-y-6 transition-all", fullScreen && "fixed inset-4 z-50 overflow-y-auto rounded-3xl bg-[var(--bg)] p-6 shadow-2xl border border-[var(--border)]")}>
      <div className="flex items-center justify-between rounded-2xl bg-[var(--surface)] p-4 border border-[var(--border)]">
        <div>
          <h3 className="text-xs font-semibold text-[var(--fg)]">Chart view</h3>
          <p className="text-[11px] text-[var(--muted)]">
            Compact keeps charts contained. Full view gives every chart its own canvas.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setFullScreen(!fullScreen)}
          className="h-8 rounded-xl border-[var(--border)] bg-[var(--surface-elevated)] px-3 text-xs text-[var(--fg)] hover:border-[var(--primary)]/50"
        >
          {fullScreen ? <Minimize2 className="mr-1.5 size-3.5" /> : <Maximize2 className="mr-1.5 size-3.5" />}
          {fullScreen ? "Exit full-screen" : "Full-screen charts"}
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold tracking-wider text-[var(--muted)] uppercase">Pace</span>
            <div className="flex size-14 items-center justify-center rounded-full border-2 border-[var(--primary)] bg-[var(--primary-muted)] text-base font-bold text-[var(--fg)] font-serif-title">
              {paceScore}%
            </div>
          </div>
          <p className="mt-3 text-xs text-[var(--muted)]">Current monthly velocity</p>
        </div>

        <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-lg">
          <span className="text-[11px] font-semibold tracking-wider text-[var(--muted)] uppercase">To Target Date</span>
          <p className="mt-2 font-serif-title text-3xl font-normal text-[var(--fg)]">
            {totalCompleted}/{totalExpected}
          </p>
          <p className="mt-1 text-xs text-[var(--muted)]">Completed vs scheduled</p>
        </div>

        <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-lg">
          <span className="text-[11px] font-semibold tracking-wider text-[var(--muted)] uppercase">Tracked Habits</span>
          <p className="mt-2 font-serif-title text-3xl font-normal text-[var(--fg)]">
            {habits.length}
          </p>
          <p className="mt-1 text-xs text-[var(--muted)]">Active rows in matrix</p>
        </div>

        <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-lg">
          <span className="text-[11px] font-semibold tracking-wider text-[var(--muted)] uppercase">Perfect Streak</span>
          <p className="mt-2 font-serif-title text-3xl font-normal text-[var(--fg)]">
            {totalCompleted > 0 ? "1" : "0"}
          </p>
          <p className="mt-1 text-xs text-[var(--muted)]">Consecutive 100% days</p>
        </div>
      </div>

      {/* Visual Charts Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* 1. Daily Execution Bar Chart */}
        <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-lg">
          <h3 className="text-xs font-semibold text-[var(--fg)]">Daily execution</h3>
          
          <div className="mt-6 flex h-48 gap-2">
            <div className="flex flex-col justify-between text-[9px] font-mono text-[var(--muted)] pr-1 select-none text-right">
              <span>100%</span>
              <span>80%</span>
              <span>60%</span>
              <span>40%</span>
              <span>20%</span>
              <span>0%</span>
            </div>

            <div className="relative flex flex-1 flex-col justify-between">
              <div className="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-10">
                <div className="border-b border-white w-full"></div>
                <div className="border-b border-white w-full"></div>
                <div className="border-b border-white w-full"></div>
                <div className="border-b border-white w-full"></div>
                <div className="border-b border-white w-full"></div>
                <div className="border-b border-white w-full"></div>
              </div>

              <div className="flex h-40 items-end justify-between gap-1 z-10 border-b border-[var(--border)] pb-0.5">
                {daysBreakdown.slice(-14).map((d) => {
                  const pct = d.expected > 0 ? (d.completed / d.expected) * 100 : 0;
                  return (
                    <div key={d.iso} className="flex flex-1 flex-col items-center justify-end h-full">
                      <div
                        className="w-full max-w-[12px] rounded-t bg-[#cbb592] transition-all hover:opacity-80 cursor-pointer"
                        style={{ height: `${Math.max(4, pct)}%` }}
                        title={`${d.iso}: ${Math.round(pct)}% (${d.completed}/${d.expected})`}
                      />
                    </div>
                  );
                })}
              </div>

              <div className="flex justify-between gap-1 pt-1 z-10">
                {daysBreakdown.slice(-14).map((d) => (
                  <span key={d.iso} className="flex-1 text-center text-[9px] font-mono text-[var(--muted)]">
                    {d.iso.slice(8)}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* 2. Habit Completion Bars */}
        <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-lg">
          <h3 className="text-xs font-semibold text-[var(--fg)]">Habit completion</h3>
          <div className="mt-5 space-y-3 max-h-48 overflow-y-auto pr-1">
            {habitsBreakdown.map((item) => {
              const pct = Math.round(item.rate);
              return (
                <div key={item.habit.id} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-[var(--fg)] font-medium truncate max-w-[130px]">{item.habit.name}</span>
                    <span className="text-[var(--muted)] font-mono">{pct}%</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--surface-elevated)]">
                    <div className="h-full rounded-full bg-[#cbb592]" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 3. Mastery Radar With Clear Edge Labels */}
        <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-lg flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold text-[var(--fg)]">Mastery radar</h3>
            <span className="text-[10px] text-[var(--muted)]">Coverage</span>
          </div>

          <div className="relative my-auto flex items-center justify-center py-2">
            <svg viewBox="0 0 220 220" className="size-52 overflow-visible">
              {/* Background Concentric Radar Polygons */}
              {radarData.webLevels.map((poly, idx) => (
                <polygon
                  key={idx}
                  points={poly}
                  fill="none"
                  stroke="rgba(255, 255, 255, 0.08)"
                  strokeWidth="1"
                />
              ))}

              {/* Axis lines from center to outer points */}
              {radarData.points.map((p, idx) => (
                <line
                  key={idx}
                  x1={radarData.center}
                  y1={radarData.center}
                  x2={p.x}
                  y2={p.y}
                  stroke="rgba(255, 255, 255, 0.05)"
                  strokeWidth="1"
                />
              ))}

              {/* Filled Radar Area */}
              {radarData.points.length >= 3 && (
                <polygon
                  points={radarData.polygonPath}
                  fill="rgba(203, 181, 146, 0.22)"
                  stroke="#cbb592"
                  strokeWidth="1.8"
                />
              )}

              {/* Point Dots */}
              {radarData.points.map((p, idx) => (
                <circle
                  key={idx}
                  cx={p.x}
                  cy={p.y}
                  r="3"
                  fill="#cbb592"
                  className="transition-all hover:r-4"
                />
              ))}

              {/* Outer Text Labels with Habit Names & % */}
              {radarData.points.map((p, idx) => (
                <text
                  key={idx}
                  x={p.labelX}
                  y={p.labelY}
                  textAnchor={p.textAnchor}
                  dominantBaseline="central"
                  className="fill-[var(--fg)] text-[9.5px] font-medium select-none"
                >
                  {p.name.length > 11 ? `${p.name.slice(0, 10)}..` : p.name}
                </text>
              ))}
            </svg>
          </div>
        </div>
      </div>

      {/* Month Heatmap */}
      <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-lg">
        <h3 className="text-xs font-semibold text-[var(--fg)]">Month Heatmap</h3>
        <p className="mt-0.5 text-xs text-[var(--muted)]">Daily completion density</p>
        <div className="mt-5">
          <div className="grid grid-cols-7 gap-2 text-center text-[10px] font-medium text-[var(--muted)] uppercase mb-2">
            <span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span><span>Sun</span>
          </div>
          <div className="grid grid-cols-7 gap-2">
            {daysBreakdown.map((d) => {
              const pct = d.expected > 0 ? d.completed / d.expected : 0;
              return (
                <div
                  key={d.iso}
                  title={`${d.iso}: ${Math.round(pct * 100)}%`}
                  className={cn(
                    "aspect-square rounded-xl flex items-center justify-center text-[11px] font-mono transition-all",
                    pct >= 0.8
                      ? "bg-[#cbb592] text-[#111215] font-bold shadow-xs"
                      : pct >= 0.4
                      ? "bg-[#cbb592]/50 text-[var(--fg)]"
                      : pct > 0
                      ? "bg-[#cbb592]/20 text-[var(--muted)]"
                      : "bg-[var(--surface-elevated)] text-[var(--muted)]/40 border border-[var(--border)]"
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
  );
}

export default AnalyticsPanel;
