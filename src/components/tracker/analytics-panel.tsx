import { StatsResult } from "@/lib/tracker/types";
import { cn } from "@/lib/utils";

interface AnalyticsPanelProps {
  stats: StatsResult;
}

export function AnalyticsPanel({ stats }: AnalyticsPanelProps) {
  const { habitsBreakdown = [], daysBreakdown = [] } = stats;

  return (
    <div className="space-y-6">
      {/* Top 4 Stat Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold tracking-wider text-[var(--muted)] uppercase">Pace</span>
            <div className="flex size-12 items-center justify-center rounded-full border-2 border-[var(--primary)] bg-[var(--primary-muted)] text-sm font-bold text-[var(--fg)] font-serif-title">
              {Math.round(stats.paceScore)}%
            </div>
          </div>
          <p className="mt-4 text-xs text-[var(--muted)]">Current monthly velocity</p>
        </div>

        <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-lg">
          <span className="text-[11px] font-semibold tracking-wider text-[var(--muted)] uppercase">To Target Date</span>
          <p className="mt-2 font-serif-title text-3xl font-bold text-[var(--fg)]">
            {stats.completedThroughToday}/{stats.expectedThroughToday}
          </p>
          <p className="mt-1 text-xs text-[var(--muted)]">Completed vs scheduled</p>
        </div>

        <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-lg">
          <span className="text-[11px] font-semibold tracking-wider text-[var(--muted)] uppercase">Tracked Habits</span>
          <p className="mt-2 font-serif-title text-3xl font-bold text-[var(--fg)]">
            {habitsBreakdown.length}
          </p>
          <p className="mt-1 text-xs text-[var(--muted)]">Active rows in matrix</p>
        </div>

        <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-lg">
          <span className="text-[11px] font-semibold tracking-wider text-[var(--muted)] uppercase">Perfect Streak</span>
          <p className="mt-2 font-serif-title text-3xl font-bold text-[var(--fg)]">
            {stats.currentStreak}
          </p>
          <p className="mt-1 text-xs text-[var(--muted)]">Consecutive 100% execution days</p>
        </div>
      </div>

      {/* Breakdown Charts Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Habit Completion Progress Bars */}
        <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-lg">
          <h3 className="font-serif-title text-lg font-normal text-[var(--fg)]">Habit completion</h3>
          <p className="mt-1 text-xs text-[var(--muted)]">Individual completion percentages</p>

          <div className="mt-6 space-y-4">
            {habitsBreakdown.length === 0 ? (
              <p className="text-xs text-[var(--muted)]">No active habits.</p>
            ) : (
              habitsBreakdown.map((item: any) => {
                const pct = Math.round(item.rate || 0);
                return (
                  <div key={item.habit.id} className="space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="font-medium text-[var(--fg)]">{item.habit.name}</span>
                      <span className="font-mono text-[var(--muted)]">{pct}%</span>
                    </div>
                    <div className="h-2.5 w-full overflow-hidden rounded-full bg-[var(--surface-elevated)]">
                      <div
                        className="h-full rounded-full bg-[var(--primary)] transition-all duration-300"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Month Heatmap */}
        <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-lg">
          <h3 className="font-serif-title text-lg font-normal text-[var(--fg)]">Month Heatmap</h3>
          <p className="mt-1 text-xs text-[var(--muted)]">Daily completion density</p>

          <div className="mt-6">
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
    </div>
  );
}

export default AnalyticsPanel;
