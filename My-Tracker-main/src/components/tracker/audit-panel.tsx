import { useMemo, useState } from "react";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/tracker/native-select";
import { ProgressRing } from "@/components/tracker/progress-ring";
import { Textarea } from "@/components/ui/textarea";
import { completionKey, isDayExpected, isRestDay, scheduleForMonth } from "@/lib/tracker/schedule";
import { cellStatus } from "@/lib/tracker/stats";
import type { Habit, MonthStats } from "@/lib/tracker/types";
import { useTrackerStore } from "@/store/tracker-store";

export function AuditPanel({
  habits,
  stats,
}: {
  habits: Habit[];
  stats: MonthStats;
}) {
  const completions = useTrackerStore((s) => s.completions);
  const setNote = useTrackerStore((s) => s.setNote);
  const setRestDay = useTrackerStore((s) => s.setRestDay);
  const inspectIso = useTrackerStore((s) => s.inspectIso);
  const setInspectIso = useTrackerStore((s) => s.setInspectIso);
  const [editing, setEditing] = useState<string | null>(null);

  const defaultIso = stats.daily.some((d) => d.iso === stats.todayIso)
    ? stats.todayIso
    : (stats.daily[stats.daily.length - 1]?.iso ?? stats.todayIso);
  const iso = inspectIso && stats.daily.some((d) => d.iso === inspectIso) ? inspectIso : defaultIso;
  const day = stats.daily.find((d) => d.iso === iso);
  const dayDate = day?.date ?? parseISO(iso);

  const rows = useMemo(() => {
    const active = habits.filter((h) => !h.archived);
    return active.map((habit) => {
      const schedule = scheduleForMonth(habit, dayDate.getFullYear(), dayDate.getMonth() + 1);
      const scheduledByRule = Boolean(schedule && isDayExpected(schedule, dayDate));
      const restDay = scheduledByRule && isRestDay(habit, iso);
      const expected = scheduledByRule && !restDay;
      const entry = completions[completionKey(habit.id, iso)];
      const status = cellStatus(expected, Boolean(entry), iso, stats.todayIso);
      return { habit, expected, scheduledByRule, restDay, entry, status };
    });
  }, [habits, completions, dayDate, iso, stats.todayIso]);

  const scheduled = rows.filter((r) => r.expected);
  const restDays = rows.filter((r) => r.restDay);
  const notScheduled = rows.filter((r) => !r.scheduledByRule);
  const pct = day && day.expected > 0 ? day.score : 0;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="font-display text-xl tracking-tight">Daily audit</h2>
          <p className="text-sm text-muted">
            Future days show as upcoming, not missed. Notes stay attached to the habit ID.
          </p>
        </div>
        <NativeSelect value={iso} onChange={(e) => setInspectIso(e.target.value)}>
          {stats.daily.map((d) => (
            <option key={d.iso} value={d.iso}>
              {d.label}
              {d.iso === stats.todayIso ? " · today" : ""}
            </option>
          ))}
        </NativeSelect>
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        <Card>
          <CardContent>
            <ProgressRing percentage={pct} label={day?.label ?? "Day"} />
          </CardContent>
        </Card>
        <Card className="md:col-span-3">
          <CardContent className="flex h-full flex-col justify-center gap-2">
            <p className="text-xs font-medium tracking-wide text-muted uppercase">Day progress</p>
            <p className="font-display text-3xl tabular-nums">
              {day?.completed ?? 0} / {day?.expected ?? 0}
            </p>
            <p className="text-sm text-subtle">
              Scheduled habits on {day?.label ?? iso}. Pick any day to inspect it.
            </p>
          </CardContent>
        </Card>
      </div>

      <section>
        <h3 className="mb-2 text-sm font-medium text-fg">Scheduled</h3>
        {scheduled.length === 0 ? (
          <p className="text-sm text-muted">No habits are scheduled for this day.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {scheduled.map(({ habit, entry, status }) => (
              <div
                key={habit.id}
                className="flex flex-col gap-2 rounded-lg bg-surface px-4 py-3 shadow-[var(--shadow-border)] transition-transform duration-150 hover:translate-x-1"
              >
                <div className="flex items-center gap-3">
                  <Badge
                    variant={
                      status === "done" ? "done" : status === "miss" ? "miss" : "pending"
                    }
                  >
                    {status === "done"
                      ? "Completed"
                      : status === "miss"
                        ? "Missed"
                        : status === "upcoming"
                          ? "Upcoming"
                          : "Pending"}
                  </Badge>
                  <span className="min-w-0 flex-1 truncate text-sm text-fg">{habit.name}</span>
                  <span className="text-xs tabular-nums text-muted">
                    {entry ? format(parseISO(entry.at), "HH:mm") : "--:--"}
                  </span>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setRestDay(habit.id, iso, true);
                      toast(`${habit.name} is resting on ${day?.label ?? iso}.`);
                    }}
                  >
                    Rest this day
                  </Button>
                </div>
                {status === "done" && (
                  <div>
                    {editing === habit.id ? (
                      <Textarea
                        autoFocus
                        defaultValue={entry?.note ?? ""}
                        placeholder="Add a note"
                        onBlur={(e) => {
                          setNote(habit.id, iso, e.target.value);
                          setEditing(null);
                        }}
                      />
                    ) : (
                      <button
                        type="button"
                        className="text-left text-xs text-muted hover:text-fg"
                        onClick={() => setEditing(habit.id)}
                      >
                        {entry?.note || "Add a note"}
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <h3 className="mb-2 text-sm font-medium text-fg">Rest days</h3>
        {restDays.length === 0 ? (
          <p className="text-sm text-muted">No custom rest days for {day?.label ?? iso}.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {restDays.map(({ habit }) => (
              <div
                key={habit.id}
                className="flex flex-col gap-2 rounded-lg bg-surface px-4 py-3 opacity-85 shadow-[var(--shadow-border)]"
              >
                <div className="flex items-center gap-3">
                  <Badge variant="rest">Rest</Badge>
                  <span className="min-w-0 flex-1 truncate text-sm text-fg">{habit.name}</span>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setRestDay(habit.id, iso, false);
                      toast(`Rest day removed for ${habit.name}.`);
                    }}
                  >
                    Make scheduled
                  </Button>
                </div>
                <span className="text-xs text-muted">This date is excluded from this habit's completion rate and the day's denominator.</span>
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <h3 className="mb-2 text-sm font-medium text-fg">Not scheduled</h3>
        {notScheduled.length === 0 ? (
          <p className="text-sm text-muted">Every tracked habit is scheduled by its normal calendar rule on this day.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {notScheduled.map(({ habit }) => (
              <div
                key={habit.id}
                className="flex items-center gap-3 rounded-lg bg-surface px-4 py-3 opacity-80 shadow-[var(--shadow-border)]"
              >
                <Badge variant="rest">Rest</Badge>
                <span className="min-w-0 flex-1 truncate text-sm text-fg">{habit.name}</span>
                <span className="text-xs text-muted">Not scheduled</span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
