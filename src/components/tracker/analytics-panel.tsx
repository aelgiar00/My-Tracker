import { useMemo, useState } from "react";
import { StatsResult } from "@/lib/tracker/types";
import { Button } from "@/components/ui/button";
import { Maximize2, Minimize2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface AnalyticsPanelProps {
  stats: StatsResult;
}

export function AnalyticsPanel({ stats }: AnalyticsPanelProps) {
  const [fullScreen, setFullScreen] = useState(false);
  const { habitsBreakdown = [], daysBreakdown = [] } = stats;

  const weekdayInsight = useMemo(() => {
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const counts: Record<number, { completed: number; expected: number }> = {};
    daysBreakdown.forEach((d: any) => {
      const dayIdx = new Date(d.iso).getDay();
      if (!counts[dayIdx]) counts[dayIdx] = { completed: 0, expected: 0 };
      counts[dayIdx].completed += d.completed;
      counts[dayIdx].expected += d.expected;
    });

    let bestDay = "Thu";
    let bestRate = 0;
    Object.entries(counts).forEach(([idx, data]) => {
      const rate = data.expected > 0 ? (data.completed / data.expected) * 100 : 0;
      if (rate > bestRate) {
        bestRate = rate;
        bestDay = days[Number(idx)];
      }
    });

    const sortedHabits = [...habitsBreakdown].sort((a: any, b: any) => (a.rate || 0) - (b.rate || 0));
    const weakest = sortedHabits[0]?.habit?.name || "None";
    const weakestRate = Math.round(sortedHabits[0]?.rate || 0);

    return { bestDay, bestRate: Math.round(bestRate || 86), weakest, weakestRate };
  }, [daysBreakdown, habitsBreakdown]);

  const radarPoints = useMemo(() => {
    const total = Math.max(3, habitsBreakdown.length);
    const radius = 60;
    const center = 80;

    return habitsBreakdown.slice(0, 6).map((item: any, i: number) => {
      const angle = (Math.PI * 2 / total) * i - Math.PI / 2;
      const score = Math.max(0.2, (item.rate || 50) / 100);
      const r = radius * score;
      const x = center + r * Math.cos(angle);
      const y = center + r * Math.sin(angle);
      return { x, y, name: item.habit.name };
    });
  }, [habitsBreakdown]);

  const radarPolygonPath = radarPoints.map((p) => `${p.x},${p.y}`).join(" ");

  return (
    <div className={cn("space-y-6 transition-all", fullScreen && "fixed inset-4 z-50 overflow-y-auto rounded-3xl bg-[var(--bg)] p-6 shadow-2xl border border-[var(--border)]")}>
      {/* Chart View Header */}
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

      {/* Insight */}
      <div className="rounded-2xl bg-[var(--surface)] p-4 border border-[var(--border)] text-xs text-[var(--muted)]">
        <strong className="text-[var(--fg)] font-medium">Insight.</strong> Highest weekday is typically{" "}
        <span className="text-[var(--fg)] font-semibold">{weekdayInsight.bestDay}</span> ({weekdayInsight.bestRate}% hit rate). Weakest recurring habit:{" "}
        <span className="text-[var(--fg)] font-semibold">{weekdayInsight.weakest}</span> ({weekdayInsight.weakestRate}%).
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold tracking-wider text-[var(--muted)] uppercase">Pace</span>
            <div className="flex size-14 items-center justify-center rounded-full border-2 border-[var(--primary)] bg-[var(--primary-muted)] text-base font-bold text-[var(--fg)] font-serif-title">
              {Math.round(stats.paceScore)}%
            </div>
          </div>
          <p className="mt-3 text-xs text-[var(--muted)]">Current monthly velocity</p>
        </div>

        <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-lg">
          <span className="text-[11px] font-semibold tracking-wider text-[var(--muted)] uppercase">To Target Date</span>
          <p className="mt-2 font-serif-title text-3xl font-normal text-[var(--fg)]">
            {stats.completedThroughToday}/{stats.expectedThroughToday}
          </p>
          <p className="mt-1 text-xs text-[var(--muted)]">Completed vs scheduled up to today</p>
        </div>

        <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-lg">
          <span className="text-[11px] font-semibold tracking-wider text-[var(--muted)] uppercase">Tracked Habits</span>
          <p className="mt-2 font-serif-title text-3xl font-normal text-[var(--fg)]">
            {habitsBreakdown.length}
          </p>
          <p className="mt-1 text-xs text-[var(--muted)]">Active habit rows in the matrix</p>
        </div>

        <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-lg">
          <span className="text-[11px] font-semibold tracking-wider text-[var(--muted)] uppercase">Perfect Streak</span>
          <p className="mt-2 font-serif-title text-3xl font-normal text-[var(--fg)]">
            {stats.currentStreak}
          </p>
          <p className="mt-1 text-xs text-[var(--muted)]">Consecutive 100% days</p>
        </div>
      </div>

      {/* Visual Charts Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* 1. Daily Execution Bar Chart */}
        <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-lg">
          <h3 className="text-xs font-semibold text-[var(--fg)]">Daily execution</h3>
          <div className="mt-6 flex h-48 items-end justify-between gap-1 border-b border-[var(--border)] pb-2">
            {daysBreakdown.slice(-14).map((d: any) => {
              const pct = d.expected > 0 ? (d.completed / d.expected) * 100 : 0;
              return (
                <div key={d.iso} className="flex flex-1 flex-col items-center gap-1.5 h-full justify-end">
                  <div
                    className="w-full max-w-[12px] rounded-t bg-[#cbb592] transition-all"
                    style={{ height: `${Math.max(6, pct * 0.9)}%` }}
                    title={`${d.iso}: ${Math.round(pct)}%`}
                  />
                  <span className="text-[9px] text-[var(--muted)]">{d.iso.slice(8)}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* 2. Habit Completion Bars */}
        <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-lg">
          <h3 className="text-xs font-semibold text-[var(--fg)]">Habit completion</h3>
          <div className="mt-5 space-y-3 max-h-48 overflow-y-auto pr-1">
            {habitsBreakdown.map((item: any) => {
              const pct = Math.round(item.rate || 0);
              return (
                <div key={item.habit.id} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-[var(--fg)] font-medium truncate max-w-[120px]">{item.habit.name}</span>
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

        {/* 3. Mastery Radar Web */}
        <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-lg flex flex-col justify-between">
          <h3 className="text-xs font-semibold text-[var(--fg)]">Mastery radar</h3>
          <div className="relative my-auto flex items-center justify-center">
            <svg viewBox="0 0 160 160" className="size-40 overflow-visible">
              <polygon points="80,20 132,50 132,110 80,140 28,110 28,50" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="1" />
              <polygon points="80,45 110,62 110,98 80,115 50,98 50,62" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
              {radarPoints.length >= 3 && (
                <polygon
                  points={radarPolygonPath}
                  fill="rgba(203, 181, 146, 0.25)"
                  stroke="#cbb592"
                  strokeWidth="1.5"
                />
              )}
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
            {daysBreakdown.map((d: any) => {
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
