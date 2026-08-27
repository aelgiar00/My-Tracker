import { useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Maximize2, Minimize2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { ProgressRing } from "@/components/tracker/progress-ring";
import { scoreFill } from "@/lib/tracker/stats";
import type { MonthStats } from "@/lib/tracker/types";
import { cn } from "@/lib/utils";

function ChartTip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { value: number }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-md bg-fg px-2.5 py-1.5 text-xs text-bg">
      <div className="font-medium">{label}</div>
      <div>{Number(payload[0].value).toFixed(0)}%</div>
    </div>
  );
}

export function AnalyticsPanel({ stats }: { stats: MonthStats }) {
  const [expanded, setExpanded] = useState(false);
  const recurring = stats.habits.filter((h) => h.recurring && h.habit.name.trim());
  const radarTasks = recurring.filter((h) => h.expected > 0);
  const dailyData = stats.daily.map((d) => ({
    label: String(d.date.getDate()),
    score: Math.round(d.score),
    name: d.label,
  }));
  const taskData = [...recurring]
    .sort((a, b) => a.score - b.score)
    .map((h) => ({ name: h.habit.name, score: Math.round(h.score) }));

  const weeks: { iso: string; score: number; label: string }[][] = [];
  let week: { iso: string; score: number; label: string }[] = [];
  const pad = stats.daily[0] ? stats.daily[0].weekday : 0;
  for (let i = 0; i < pad; i += 1) week.push({ iso: `pad-${i}`, score: -1, label: "" });
  for (const d of stats.daily) {
    week.push({ iso: d.iso, score: d.expected > 0 ? d.score : -1, label: d.label });
    if (week.length === 7) {
      weeks.push(week);
      week = [];
    }
  }
  if (week.length) {
    while (week.length < 7) week.push({ iso: `end-${week.length}`, score: -1, label: "" });
    weeks.push(week);
  }

  const compactHabitHeight = Math.max(280, Math.min(360, taskData.length * 30));
  const expandedHabitHeight = Math.max(520, taskData.length * 42);

  return (
    <div className={cn("flex flex-col gap-5", expanded && "analytics-expanded")}>
      <div className="flex items-center justify-between gap-3 rounded-xl bg-surface px-4 py-3 shadow-[var(--shadow-border)]">
        <div>
          <p className="text-sm font-medium text-fg">Chart view</p>
          <p className="text-xs text-subtle">Compact keeps charts contained. Full view gives every chart its own large canvas and shows every habit label.</p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={expanded}
          onClick={() => setExpanded((value) => !value)}
          className={cn(
            "flex shrink-0 items-center gap-2 rounded-md px-3 py-2 text-xs font-medium transition-colors",
            expanded ? "bg-accent text-accent-fg" : "bg-surface-2 text-muted hover:text-fg",
          )}
        >
          {expanded ? <Minimize2 className="size-3.5" /> : <Maximize2 className="size-3.5" />}
          {expanded ? "Compact charts" : "Full-screen charts"}
        </button>
      </div>
      {stats.bestWeekday && stats.bestWeekday.score > 0 && (
        <div className="rounded-lg bg-accent/10 px-4 py-3 text-sm text-accent">
          <span className="font-medium">Insight.</span> Highest weekday is typically{" "}
          <span className="font-medium">{stats.bestWeekday.abbr}</span> (
          {Math.round(stats.bestWeekday.score * 100)}% through today)
          {stats.weakestHabit ? (
            <>
              . Weakest recurring habit: {stats.weakestHabit.name} (
              {Math.round(stats.weakestHabit.score)}%).
            </>
          ) : null}
        </div>
      )}

      <div className="stagger-in grid grid-cols-2 gap-3 xl:grid-cols-5">
        <Card className="col-span-2 xl:col-span-1">
          <CardContent>
            <ProgressRing percentage={stats.paceScore} label="Pace" />
          </CardContent>
        </Card>
        <Metric
          title="Through today"
          value={`${stats.completedThroughToday} / ${stats.expectedThroughToday}`}
          desc="Completed vs scheduled up to today. Future days are not counted against you."
        />
        <Metric
          title="Tracked habits"
          value={String(stats.trackedCount)}
          desc="Active habit rows in the matrix, including single-day habits."
        />
        <Metric
          title="Perfect streak"
          value={String(stats.currentStreak)}
          desc={`Consecutive 100% days, skipping an in-progress today. Best this month: ${stats.longestStreak}.`}
        />
        <Card className="col-span-2 xl:col-span-1">
          <CardContent>
            <ProgressRing percentage={stats.todayScore} label={stats.todayLabel} />
          </CardContent>
        </Card>
      </div>

      <div className={cn("grid gap-4", expanded ? "grid-cols-1" : "xl:grid-cols-2")}>
        <Card>
          <CardContent>
            <h3 className="mb-3 font-display text-lg tracking-tight">Daily execution</h3>
            <div className={cn(expanded ? "h-[70vh] min-h-[32rem]" : "h-64")}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dailyData} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                  <CartesianGrid stroke="color-mix(in oklab, var(--color-fg) 8%, transparent)" vertical={false} />
                  <XAxis dataKey="label" tick={{ fill: "var(--color-muted)", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis domain={[0, 100]} tick={{ fill: "var(--color-muted)", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip content={<ChartTip />} cursor={{ fill: "color-mix(in oklab, var(--color-fg) 6%, transparent)" }} />
                  <Bar dataKey="score" radius={[4, 4, 0, 0]} isAnimationActive={false}>
                    {dailyData.map((d) => (
                      <Cell key={d.name} fill={scoreFill(d.score)} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <h3 className="mb-3 font-display text-lg tracking-tight">Habit completion</h3>
            {taskData.length === 0 ? (
              <p className="text-sm text-muted">Add a recurring habit to see rates.</p>
            ) : (
              <div className={cn(expanded ? "overflow-visible" : "h-[22rem] overflow-y-auto pr-1")}>
                <div style={{ height: expanded ? expandedHabitHeight : compactHabitHeight }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={taskData}
                      layout="vertical"
                      margin={{ top: 8, right: 12, left: 8, bottom: 0 }}
                    >
                      <CartesianGrid stroke="color-mix(in oklab, var(--color-fg) 8%, transparent)" horizontal={false} />
                      <XAxis type="number" domain={[0, 100]} tick={{ fill: "var(--color-muted)", fontSize: 11 }} axisLine={false} tickLine={false} />
                      <YAxis type="category" dataKey="name" width={expanded ? 190 : 145} interval={0} tick={{ fill: "var(--color-fg)", fontSize: 11 }} axisLine={false} tickLine={false} />
                      <Tooltip content={<ChartTip />} cursor={{ fill: "color-mix(in oklab, var(--color-fg) 6%, transparent)" }} />
                      <Bar dataKey="score" radius={[0, 4, 4, 0]} isAnimationActive={false}>
                        {taskData.map((d) => (
                          <Cell key={d.name} fill={scoreFill(d.score)} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className={cn("grid gap-4", expanded ? "grid-cols-1" : "xl:grid-cols-2")}>
        <Card>
          <CardContent>
            <h3 className="mb-3 font-display text-lg tracking-tight">Mastery radar</h3>
            {radarTasks.length < 3 ? (
              <p className="text-sm text-muted">
                Add at least three recurring habits to see the radar.
              </p>
            ) : (
              <div className={cn(expanded ? "h-[70vh] min-h-[32rem]" : "h-72")}>
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart
                    data={radarTasks.map((h) => ({
                      name: h.habit.name,
                      score: Math.round(h.score),
                    }))}
                  >
                    <PolarGrid stroke="color-mix(in oklab, var(--color-fg) 12%, transparent)" />
                    <PolarAngleAxis dataKey="name" tick={{ fill: "var(--color-fg)", fontSize: 11 }} />
                    <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
                    <Radar
                      dataKey="score"
                      stroke="var(--color-accent)"
                      fill="var(--color-accent)"
                      fillOpacity={0.28}
                      isAnimationActive={false}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <h3 className="mb-3 font-display text-lg tracking-tight">Month heatmap</h3>
            <div className="grid grid-cols-7 gap-1.5">
              {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
                <div key={d} className="text-center text-[0.65rem] tracking-wide text-muted">
                  {d}
                </div>
              ))}
              {weeks.flat().map((cell) => (
                <div
                  key={cell.iso}
                  title={cell.label ? `${cell.label}: ${cell.score < 0 ? "rest" : `${Math.round(cell.score)}%`}` : undefined}
                  className={cn(
                    "aspect-square rounded-sm",
                    cell.score < 0 ? "bg-surface-2" : "",
                  )}
                  style={cell.score >= 0 ? { background: scoreFill(cell.score) } : undefined}
                />
              ))}
            </div>
            <p className="mt-3 text-xs text-subtle">
              Month remaining is {Math.round(stats.monthScore)}% if empty future days stay empty.
              Pace through today is {Math.round(stats.paceScore)}%.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Metric({ title, value, desc }: { title: string; value: string; desc: string }) {
  return (
    <Card>
      <CardContent className="flex h-full flex-col justify-between gap-3">
        <p className="text-xs font-medium tracking-wide text-muted uppercase">{title}</p>
        <p className="font-display text-3xl tracking-tight tabular-nums">{value}</p>
        <p className="text-xs leading-snug text-subtle">{desc}</p>
      </CardContent>
    </Card>
  );
}
