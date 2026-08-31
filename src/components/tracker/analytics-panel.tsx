import { useMemo, useState } from "react";
import { format, parseISO } from "date-fns";
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

  // حساب أيام الشهر الحالي
  const allMonthDays = useMemo(
    () => monthDays(selectedYear, selectedMonth, trackingStart),
    [selectedYear, selectedMonth, trackingStart]
  );

  // حساب نسب إنجاز كل عادة
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

  // حساب إحصاءات الأيام الـ 30 للهيتماب والشارت
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

  // إجمالي الإنجاز والـ Pace
  const totalCompleted = habitsBreakdown.reduce((sum, h) => sum + h.completed, 0);
  const totalExpected = habitsBreakdown.reduce((sum, h) => sum + h.expected, 0);
  const paceScore = totalExpected > 0 ? Math.round((totalCompleted / totalExpected) * 100) : 0;

  // نقاط الرادار السداسي
  const radarPoints = useMemo(() => {
    const total = Math.max(3, habitsBreakdown.length);
    const radius = 55;
    const center = 80;

    return habitsBreakdown.slice(0, 6).map((item, i) => {
      const angle = (Math.PI * 2 / total) * i - Math.PI / 2;
      const score = Math.max(0.15, (item.rate || 10) / 100);
      const r = radius * score;
      const x = center + r * Math.cos(angle);
      const y = center + r * Math.sin(angle);
      return { x, y, name: item.habit.name };
    });
  }, [habitsBreakdown]);

  const radarPolygonPath = radarPoints.map((p) => `${p.x},${p.y}`).join(" ");

  return (
    <div className={cn("space-y-6 transition-all", fullScreen && "fixed inset-4 z-50 overflow-y-auto rounded-3xl bg-[var(--bg)] p-6 shadow-2xl border border-[var(--border)]")}>
      {/* Controls Bar */}
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
        {/* Daily Execution Bar Chart */}
        <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-lg">
          <h3 className="text-xs font-semibold text-[var(--fg)]">Daily execution</h3>
          <div className="mt-6 flex h-48 items-end justify-between gap-1 border-b border-[var(--border)] pb-2">
            {daysBreakdown.slice(-14).map((d) => {
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

        {/* Habit Completion Progress Bars */}
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

        {/* Mastery Radar */}
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
