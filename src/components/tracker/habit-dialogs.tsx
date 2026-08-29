import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { NativeSelect } from "@/components/tracker/native-select";
import { HABIT_PACKS } from "@/lib/tracker/seed";
import {
  SCHEDULE_PRESETS,
  WEEKDAY_ABBR,
  type Weekday,
  scheduleForMonth,
} from "@/lib/tracker/schedule";
import type { Schedule } from "@/lib/tracker/types";
import { exportSnapshot, type ThemeId, useTrackerStore } from "@/store/tracker-store";
import { cn } from "@/lib/utils";

function buildSchedule(
  mode: string,
  customDays: Weekday[],
  onlyDay: number,
): Schedule {
  if (mode === "custom") return { type: "custom", days: [...customDays].sort((a, b) => a - b) as Weekday[] };
  if (mode === "only") return { type: "only", day: onlyDay };
  return { type: "preset", id: mode };
}

export function NewHabitDialog({
  open,
  onOpenChange,
  daysInMonth,
  selectedYear,
  selectedMonth,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  daysInMonth: number;
  selectedYear: number;
  selectedMonth: number;
}) {
  const addHabits = useTrackerStore((s) => s.addHabits);
  const habits = useTrackerStore((s) => s.habits);
  const setScheduleForMonth = useTrackerStore((s) => s.setScheduleForMonth);
  const [name, setName] = useState("");
  const [mode, setMode] = useState("daily");
  const [customDays, setCustomDays] = useState<Weekday[]>([0, 1, 2, 3, 4]);
  const [onlyDay, setOnlyDay] = useState(1);
  const [bulkNames, setBulkNames] = useState("");
  const [monthlyOnly, setMonthlyOnly] = useState(false);

  function reset() {
    setName("");
    setMode("daily");
    setCustomDays([0, 1, 2, 3, 4]);
    setOnlyDay(1);
    setBulkNames("");
    setMonthlyOnly(false);
  }

  function submit() {
    const schedule = buildSchedule(mode, customDays, onlyDay);
    const names = [
      ...(name.trim() ? [name.trim()] : []),
      ...bulkNames.split(/\r?\n/).map((line) => line.trim()).filter(Boolean),
    ];
    const uniqueNames = [...new Set(names)];
    if (uniqueNames.length === 0) {
      toast("Add at least one habit name.");
      return;
    }
    const month = `${selectedYear}-${String(selectedMonth).padStart(2, "0")}`;
    const count = addHabits(uniqueNames, schedule, { monthKey: month, monthlyOnly });
    toast(`Added ${count} habit${count === 1 ? "" : "s"}.`);
    reset();
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New habit</DialogTitle>
          <DialogDescription>Add recurring or scheduled habits to your performance matrix.</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="habit-name">Name</Label>
            <Input
              id="habit-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Deep Work / Training"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") submit();
              }}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="habit-bulk">Bulk add habits</Label>
            <Textarea
              id="habit-bulk"
              value={bulkNames}
              onChange={(e) => setBulkNames(e.target.value)}
              placeholder={"One habit per line\nDeep Learning practice\nMorning Workout\nReading research papers"}
              className="min-h-24"
            />
            <p className="text-xs text-subtle">Paste multiple habit names at once. Blank lines are ignored.</p>
          </div>
          <label className="flex items-center gap-2 text-xs text-muted">
            <input
              type="checkbox"
              checked={monthlyOnly}
              onChange={(e) => setMonthlyOnly(e.target.checked)}
              className="size-4 accent-[var(--color-accent)]"
            />
            Add to this month only
          </label>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="habit-sched">Schedule</Label>
            <NativeSelect
              id="habit-sched"
              value={mode}
              onChange={(e) => setMode(e.target.value)}
            >
              {SCHEDULE_PRESETS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
              <option value="custom">Custom weekdays</option>
              <option value="only">Single day this month</option>
            </NativeSelect>
          </div>
          {mode === "custom" && (
            <div className="flex flex-wrap gap-1.5">
              {WEEKDAY_ABBR.map((abbr, i) => {
                const day = i as Weekday;
                const on = customDays.includes(day);
                return (
                  <button
                    key={abbr}
                    type="button"
                    onClick={() =>
                      setCustomDays((prev) =>
                        on ? prev.filter((d) => d !== day) : [...prev, day],
                      )
                    }
                    className={cn(
                      "h-9 min-w-11 rounded-md px-2 text-xs font-medium transition-colors",
                      on ? "bg-fg text-bg" : "bg-surface-2 text-muted",
                    )}
                  >
                    {abbr}
                  </button>
                );
              })}
            </div>
          )}
          {mode === "only" && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="only-day">Day of month</Label>
              <NativeSelect
                id="only-day"
                value={onlyDay}
                onChange={(e) => setOnlyDay(Number(e.target.value))}
              >
                {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </NativeSelect>
            </div>
          )}
          {habits.some((h) => !h.archived && !scheduleForMonth(h, selectedYear, selectedMonth)) && (
            <div>
              <p className="mb-2 text-xs font-medium tracking-wide text-muted">Add existing habit to this month</p>
              <div className="flex max-h-28 flex-wrap gap-1.5 overflow-y-auto">
                {habits.filter((h) => !h.archived && !scheduleForMonth(h, selectedYear, selectedMonth)).map((habit) => (
                  <button
                    key={habit.id}
                    type="button"
                    className="rounded-md bg-surface-2 px-2.5 py-1.5 text-xs text-muted hover:text-fg"
                    onClick={() => {
                      setScheduleForMonth(habit.id, selectedYear, selectedMonth, habit.schedule);
                      toast(`Added ${habit.name} to this month.`);
                    }}
                  >
                    {habit.name}
                  </button>
                ))}
              </div>
            </div>
          )}
          <div>
            <p className="mb-2 text-xs font-medium tracking-wide text-muted">Quick packs</p>
            <div className="flex flex-col gap-2">
              {HABIT_PACKS.map((pack) => (
                <button
                  key={pack.id}
                  type="button"
                  className="flex items-start justify-between gap-3 rounded-md bg-surface-2 px-3 py-2.5 text-left shadow-[var(--shadow-border)] transition-colors hover:bg-surface-2/80"
                  onClick={() => {
                    const n = addHabits(pack.names, { type: "preset", id: "daily" }, { monthKey: `${selectedYear}-${String(selectedMonth).padStart(2, "0")}`, monthlyOnly: false });
                    toast(n ? `Added ${n} from ${pack.label}.` : "Those habits are already in the matrix.");
                    onOpenChange(false);
                  }}
                >
                  <span>
                    <span className="block text-sm text-fg">{pack.label}</span>
                    <span className="block text-xs text-muted">{pack.blurb}</span>
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={submit}>Add habit</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function SettingsDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const trackingStart = useTrackerStore((s) => s.trackingStart);
  const theme = useTrackerStore((s) => s.theme);
  const setTheme = useTrackerStore((s) => s.setTheme);
  const setTrackingStart = useTrackerStore((s) => s.setTrackingStart);
  const resetToSeed = useTrackerStore((s) => s.resetToSeed);
  const importSnapshot = useTrackerStore((s) => s.importSnapshot);
  const fileRef = useRef<HTMLInputElement>(null);

  function download() {
    const blob = new Blob([exportSnapshot()], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `performance-matrix-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast("Export downloaded.");
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
          <DialogDescription>Tracking window, backup, and environment management.</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="theme-select">Color theme</Label>
            <NativeSelect
              id="theme-select"
              value={theme}
              onChange={(e) => setTheme(e.target.value as ThemeId)}
            >
              <option value="default">Default · Lavender</option>
              <option value="ocean">Ocean · Blue</option>
              <option value="forest">Forest · Green</option>
              <option value="amber">Amber · Gold</option>
              <option value="rose">Rose · Pink</option>
            </NativeSelect>
            <p className="text-xs text-subtle">Your current theme stays the default until you choose another.</p>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="track-start">Tracking start</Label>
            <Input
              id="track-start"
              type="date"
              value={trackingStart}
              onChange={(e) => setTrackingStart(e.target.value || trackingStart)}
            />
            <p className="text-xs text-subtle">
              Days before this date are hidden from every month grid.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={download}>
              Export JSON
            </Button>
            <Button variant="secondary" onClick={() => fileRef.current?.click()}>
              Import JSON
            </Button>
            <input
              ref={fileRef}
              type="file"
              accept="application/json"
              className="hidden"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                if (!file) return;
                try {
                  const raw = JSON.parse(await file.text());
                  const err = importSnapshot(raw);
                  toast(err ?? "Import complete.");
                } catch {
                  toast("Could not read that file.");
                }
              }}
            />
          </div>
          <Button
            variant="outline"
            onClick={() => {
              resetToSeed();
              toast("Matrix cleared. Ready for new habits.");
            }}
          >
            Clear all data (Reset to blank)
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function BulkUpdatePanel({
  days,
  todayIso,
}: {
  days: { iso: string; label: string }[];
  todayIso: string;
}) {
  const habits = useTrackerStore((s) => s.habits);
  const bulkSet = useTrackerStore((s) => s.bulkSet);
  const active = useMemo(() => habits.filter((h) => !h.archived), [habits]);
  const [selected, setSelected] = useState<string[]>([]);
  const [from, setFrom] = useState(days[0]?.iso ?? "");
  const [to, setTo] = useState(days[days.length - 1]?.iso ?? "");
  const [action, setAction] = useState<"done" | "pending">("done");

  if (days.length === 0) return null;

  const fromIso = from || days[0].iso;
  const toIso = to || days[days.length - 1].iso;

  return (
    <div className="rounded-xl bg-surface p-4 shadow-[var(--shadow-border)]">
      <h3 className="font-display text-lg tracking-tight">Bulk update</h3>
      <p className="mt-1 text-sm text-muted">
        Apply a range without touching unscheduled cells. Unscheduled days stay empty.
      </p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="flex flex-col gap-1.5 sm:col-span-2">
          <Label>Habits</Label>
          <div className="flex max-h-28 flex-wrap gap-1.5 overflow-y-auto">
            {active.map((h) => {
              const on = selected.includes(h.id);
              return (
                <button
                  key={h.id}
                  type="button"
                  onClick={() =>
                    setSelected((prev) =>
                      on ? prev.filter((id) => id !== h.id) : [...prev, h.id],
                    )
                  }
                  className={cn(
                    "h-8 rounded-md px-2.5 text-xs font-medium transition-colors",
                    on ? "bg-fg text-bg" : "bg-surface-2 text-muted",
                  )}
                >
                  {h.name}
                </button>
              );
            })}
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="bulk-from">From</Label>
          <NativeSelect id="bulk-from" value={fromIso} onChange={(e) => setFrom(e.target.value)}>
            {days.map((d) => (
              <option key={d.iso} value={d.iso}>
                {d.label}
                {d.iso === todayIso ? " · today" : ""}
              </option>
            ))}
          </NativeSelect>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="bulk-to">To</Label>
          <NativeSelect id="bulk-to" value={toIso} onChange={(e) => setTo(e.target.value)}>
            {days.map((d) => (
              <option key={d.iso} value={d.iso}>
                {d.label}
              </option>
            ))}
          </NativeSelect>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <NativeSelect
          value={action}
          onChange={(e) => setAction(e.target.value as "done" | "pending")}
        >
          <option value="done">Set done</option>
          <option value="pending">Set pending</option>
        </NativeSelect>
        <Button
          size="sm"
          onClick={() => {
            if (selected.length === 0) {
              toast("Pick at least one habit.");
              return;
            }
            const a = fromIso <= toIso ? fromIso : toIso;
            const b = fromIso <= toIso ? toIso : fromIso;
            const isos = days.filter((d) => d.iso >= a && d.iso <= b).map((d) => d.iso);
            const n = bulkSet(selected, isos, action === "done");
            toast(n ? `Updated ${n} cells.` : "Nothing to change for that range.");
          }}
        >
          Apply
        </Button>
      </div>
    </div>
  );
}
