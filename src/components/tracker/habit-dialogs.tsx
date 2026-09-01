import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/tracker/native-select";
import { useTrackerStore, exportSnapshot, ThemeId } from "@/store/tracker-store";
import { Schedule, HabitPriority } from "@/lib/tracker/types";
import { toast } from "sonner";
import { Download, Upload, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";

/* =========================================================================
   1. NewHabitDialog (Fully Theme Adaptive Modal)
   ========================================================================= */
export interface NewHabitDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  daysInMonth: number;
  selectedYear: number;
  selectedMonth: number;
}

type ScheduleMode = "daily" | "weekdays" | "onedate" | "monthly";

export function NewHabitDialog({
  open,
  onOpenChange,
  selectedYear,
  selectedMonth,
}: NewHabitDialogProps) {
  const [name, setName] = useState("");
  const [durationMinutes, setDurationMinutes] = useState<number>(30);
  const [priority, setPriority] = useState<HabitPriority>("critical");
  const [bulkText, setBulkText] = useState("");
  const [thisMonthOnly, setThisMonthOnly] = useState(false);
  const [scheduleMode, setScheduleMode] = useState<ScheduleMode>("weekdays");
  const [selectedDays, setSelectedDays] = useState<number[]>([1, 2, 3, 4, 5]); // Default: Mon-Fri
  const [targetDayOfMonth, setTargetDayOfMonth] = useState<number>(20);

  const addHabit = useTrackerStore((s) => s.addHabit);
  const addHabits = useTrackerStore((s) => s.addHabits);

  const monthKeyStr = `${selectedYear}-${String(selectedMonth).padStart(2, "0")}`;

  const weekDays = [
    { label: "S", idx: 0 },
    { label: "M", idx: 1 },
    { label: "T", idx: 2 },
    { label: "W", idx: 3 },
    { label: "T", idx: 4 },
    { label: "F", idx: 5 },
    { label: "S", idx: 6 },
  ];

  const handleModeChange = (mode: ScheduleMode) => {
    setScheduleMode(mode);
    if (mode === "daily") {
      setSelectedDays([0, 1, 2, 3, 4, 5, 6]);
    } else if (mode === "weekdays") {
      setSelectedDays([1, 2, 3, 4, 5]);
    } else if (mode === "onedate" && targetDayOfMonth > 31) {
      setTargetDayOfMonth(1);
    }
  };

  const toggleDay = (dayIdx: number) => {
    setSelectedDays((prev) => {
      const next = prev.includes(dayIdx)
        ? prev.filter((d) => d !== dayIdx)
        : [...prev, dayIdx];

      if (next.length === 7) setScheduleMode("daily");
      else if (next.length === 5 && !next.includes(0) && !next.includes(6)) setScheduleMode("weekdays");

      return next.sort();
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    let schedule: Schedule;
    if (scheduleMode === "daily" || selectedDays.length === 7) {
      schedule = { type: "preset", id: "daily" };
    } else if (
      scheduleMode === "weekdays" &&
      selectedDays.length === 5 &&
      !selectedDays.includes(0) &&
      !selectedDays.includes(6)
    ) {
      schedule = { type: "preset", id: "weekdays" };
    } else if (scheduleMode === "monthly") {
      schedule = { type: "monthlyTarget", targetDays: targetDayOfMonth || 20 };
    } else if (scheduleMode === "onedate") {
      schedule = { type: "monthlyDate", day: targetDayOfMonth || 1 };
    } else {
      schedule = { type: "weekly", days: selectedDays.length > 0 ? selectedDays : [1, 2, 3, 4, 5] };
    }

    const options = {
      durationMinutes,
      priority,
      monthKey: thisMonthOnly ? monthKeyStr : undefined,
      monthlyOnly: thisMonthOnly,
    };

    const bulkLines = bulkText
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);

    if (bulkLines.length > 0) {
      const count = addHabits(bulkLines, schedule, options);
      toast.success(`Added ${count} habits in bulk`);
      setBulkText("");
      setName("");
      onOpenChange(false);
      return;
    }

    const trimmed = name.trim();
    if (!trimmed) {
      toast.error("Please enter a habit name.");
      return;
    }

    addHabit(trimmed, schedule, options);
    toast.success(`Added "${trimmed}"`);
    setName("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6 text-[var(--fg)] shadow-2xl transition-colors">
        <DialogHeader className="space-y-1">
          <DialogTitle className="font-serif-title text-2xl font-normal tracking-tight text-[var(--fg)]">
            New habit
          </DialogTitle>
          <DialogDescription className="text-xs text-[var(--muted)]">
            Set your target habit, estimated duration, and scheduling.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {/* Name */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[var(--fg)] opacity-90">Habit Name</label>
            <input
              type="text"
              placeholder="e.g. Deep work 90m, Pray, ML Learning..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-11 w-full rounded-2xl border border-[var(--border)] bg-[var(--surface-elevated)] px-4 text-xs font-medium text-[var(--fg)] placeholder:text-[var(--muted)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
            />
          </div>

          {/* Time Estimate & Priority */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[var(--fg)] opacity-90">Estimated Duration</label>
              <NativeSelect
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(Number(e.target.value))}
                className="h-11 w-full rounded-2xl border border-[var(--border)] bg-[var(--surface-elevated)] px-3 text-xs font-medium text-[var(--fg)] shadow-none focus:ring-1 focus:ring-[var(--primary)]"
              >
                <option value={15}>15 Minutes</option>
                <option value={20}>20 Minutes</option>
                <option value={30}>30 Minutes</option>
                <option value={45}>45 Minutes</option>
                <option value={60}>1 Hour</option>
                <option value={90}>1.5 Hours</option>
                <option value={120}>2 Hours</option>
                <option value={150}>2.5 Hours</option>
                <option value={180}>3+ Hours</option>
              </NativeSelect>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[var(--fg)] opacity-90">Priority Level</label>
              <NativeSelect
                value={priority}
                onChange={(e) => setPriority(e.target.value as HabitPriority)}
                className="h-11 w-full rounded-2xl border border-[var(--border)] bg-[var(--surface-elevated)] px-3 text-xs font-medium text-[var(--fg)] shadow-none focus:ring-1 focus:ring-[var(--primary)]"
              >
                <option value="critical">🎯 Critical (Non-Negotiable)</option>
                <option value="standard">Standard Habit</option>
              </NativeSelect>
            </div>
          </div>

          {/* Bulk Textarea */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[var(--fg)] opacity-90">Bulk add habits (Optional)</label>
            <textarea
              rows={2}
              placeholder={"One habit per line\nRead 20 pages\nPractice C++\nWorkout"}
              value={bulkText}
              onChange={(e) => setBulkText(e.target.value)}
              className="w-full resize-none rounded-2xl border border-[var(--border)] bg-[var(--surface-elevated)] p-3 text-xs font-medium text-[var(--fg)] placeholder:text-[var(--muted)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
            />
            <p className="text-[10.5px] text-[var(--muted)]">
              Paste multiple habit names at once. Blank lines are ignored.
            </p>
          </div>

          {/* Add to this month only Checkbox */}
          <label className="flex items-center gap-2.5 pt-0.5 text-xs font-medium text-[var(--fg)] cursor-pointer select-none">
            <input
              type="checkbox"
              checked={thisMonthOnly}
              onChange={(e) => setThisMonthOnly(e.target.checked)}
              className="size-4 rounded border-[var(--border)] bg-[var(--surface-elevated)] accent-[var(--primary)] cursor-pointer"
            />
            <span>Add to this month only</span>
          </label>

          {/* Schedule Section */}
          <div className="space-y-2.5 pt-1">
            <label className="text-xs font-semibold text-[var(--fg)] opacity-90">Schedule</label>

            <div className="flex flex-wrap gap-2">
              {(
                [
                  ["daily", "Daily"],
                  ["weekdays", "Weekdays"],
                  ["onedate", "One date"],
                  ["monthly", "Monthly"],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => handleModeChange(id)}
                  className={cn(
                    "rounded-xl px-4 py-2 text-xs font-semibold transition-all cursor-pointer border",
                    scheduleMode === id
                      ? "border-[var(--primary)] bg-[var(--primary-muted)] text-[var(--fg)] shadow-xs"
                      : "border-[var(--border)] bg-[var(--surface-elevated)] text-[var(--muted)] hover:text-[var(--fg)] hover:border-[var(--muted)]"
                  )}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* S M T W T F S Interactive Buttons */}
            {scheduleMode !== "onedate" && scheduleMode !== "monthly" && (
              <div className="flex items-center gap-2 pt-1">
                {weekDays.map((d) => {
                  const isSelected = selectedDays.includes(d.idx);
                  return (
                    <button
                      key={d.idx}
                      type="button"
                      onClick={() => toggleDay(d.idx)}
                      className={cn(
                        "flex size-8 items-center justify-center rounded-xl border text-xs font-bold transition-all cursor-pointer",
                        isSelected
                          ? "border-[var(--primary)] bg-[var(--primary)] text-[var(--primary-foreground)] shadow-xs"
                          : "border-[var(--border)] bg-[var(--surface-elevated)] text-[var(--muted)] hover:text-[var(--fg)] hover:border-[var(--muted)]"
                      )}
                    >
                      {d.label}
                    </button>
                  );
                })}
              </div>
            )}

            {/* One date / Monthly day picker */}
            {(scheduleMode === "onedate" || scheduleMode === "monthly") && (
              <div className="flex items-center gap-2.5 pt-1">
                <span className="text-xs font-medium text-[var(--muted)]">
                  {scheduleMode === "monthly" ? "Target days this month:" : "Day of month:"}
                </span>
                <input
                  type="number"
                  min={1}
                  max={31}
                  value={targetDayOfMonth}
                  onChange={(e) => setTargetDayOfMonth(Number(e.target.value))}
                  className="h-9 w-20 rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] px-2.5 text-center text-xs font-bold text-[var(--fg)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
                />
              </div>
            )}
          </div>

          {/* Footer Buttons */}
          <div className="flex items-center justify-end gap-3 pt-3">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              className="h-10 rounded-2xl px-5 text-xs font-semibold text-[var(--muted)] hover:bg-[var(--surface-elevated)] hover:text-[var(--fg)] cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="h-10 rounded-2xl bg-[var(--primary)] px-6 text-xs font-bold text-[var(--primary-foreground)] hover:opacity-90 transition-opacity cursor-pointer shadow-sm"
            >
              Add habit
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* =========================================================================
   2. BulkUpdatePanel
   ========================================================================= */
export interface BulkUpdatePanelProps {
  days: { iso: string; label: string }[];
  todayIso: string;
}

export function BulkUpdatePanel({ days }: BulkUpdatePanelProps) {
  const habits = useTrackerStore((s) => s.habits.filter((h) => !h.archived));
  const bulkSet = useTrackerStore((s) => s.bulkSet);

  const [selectedHabitIds, setSelectedHabitIds] = useState<string[]>([]);
  const [fromDate, setFromDate] = useState(() => (days[0] ? days[0].iso : ""));
  const [toDate, setToDate] = useState(() => (days[days.length - 1] ? days[days.length - 1].iso : ""));
  const [actionDone, setActionDone] = useState<"done" | "undone">("done");

  const toggleHabitSelect = (id: string) => {
    setSelectedHabitIds((prev) =>
      prev.includes(id) ? prev.filter((h) => h !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    setSelectedHabitIds(habits.map((h) => h.id));
  };

  const handleClearAll = () => {
    setSelectedHabitIds([]);
  };

  const handleApply = () => {
    if (selectedHabitIds.length === 0) {
      toast.error("Please select at least one habit.");
      return;
    }

    if (!fromDate || !toDate || fromDate > toDate) {
      toast.error("Please select a valid date range.");
      return;
    }

    const rangeIsos: string[] = [];
    const curr = new Date(fromDate);
    const end = new Date(toDate);

    while (curr <= end) {
      rangeIsos.push(curr.toISOString().slice(0, 10));
      curr.setDate(curr.getDate() + 1);
    }

    const count = bulkSet(selectedHabitIds, rangeIsos, actionDone === "done");
    toast.success(`Updated ${count} completion records.`);
  };

  return (
    <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-xl">
      <h3 className="font-serif-title text-xl text-[var(--fg)]">Bulk update</h3>
      <p className="mt-1 text-xs text-[var(--muted)]">
        Apply a range without touching unscheduled cells. Unscheduled days stay empty.
      </p>

      <div className="mt-5 space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold text-[var(--fg)] opacity-90">Habits</label>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSelectAll}
              className="text-[11px] font-semibold text-[var(--primary)] hover:underline cursor-pointer"
            >
              Select all
            </button>
            <span className="text-[10px] text-[var(--muted)]">·</span>
            <button
              type="button"
              onClick={handleClearAll}
              className="text-[11px] font-semibold text-[var(--muted)] hover:underline cursor-pointer"
            >
              Clear
            </button>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 pt-1">
          {habits.length === 0 ? (
            <p className="text-xs text-[var(--muted)]">No active habits available.</p>
          ) : (
            habits.map((habit) => {
              const isSelected = selectedHabitIds.includes(habit.id);
              return (
                <button
                  key={habit.id}
                  type="button"
                  onClick={() => toggleHabitSelect(habit.id)}
                  className={cn(
                    "rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-all duration-150 border cursor-pointer",
                    isSelected
                      ? "border-[var(--primary)] bg-[var(--primary-muted)] text-[var(--fg)] shadow-xs"
                      : "border-[var(--border)] bg-[var(--surface-elevated)] text-[var(--muted)] hover:text-[var(--fg)] hover:border-[var(--muted)]"
                  )}
                >
                  {habit.name}
                </button>
              );
            })
          )}
        </div>
      </div>

      <div className="mt-6 flex flex-wrap items-end gap-3 pt-1">
        <div className="space-y-1">
          <label className="text-[11px] font-semibold text-[var(--muted)]">From</label>
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="h-10 rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] px-3 text-xs font-semibold text-[var(--fg)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
          />
        </div>

        <div className="space-y-1">
          <label className="text-[11px] font-semibold text-[var(--muted)]">To</label>
          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="h-10 rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] px-3 text-xs font-semibold text-[var(--fg)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
          />
        </div>

        <div className="space-y-1">
          <label className="text-[11px] font-semibold text-[var(--muted)]">Action</label>
          <NativeSelect
            value={actionDone}
            onChange={(e) => setActionDone(e.target.value as any)}
            className="h-10 rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] px-3 text-xs font-semibold text-[var(--fg)] shadow-none focus:ring-1 focus:ring-[var(--primary)]"
          >
            <option value="done">Set done</option>
            <option value="undone">Set undone</option>
          </NativeSelect>
        </div>

        <Button
          type="button"
          onClick={handleApply}
          className="h-10 rounded-xl bg-[var(--surface-elevated)] border border-[var(--border)] px-5 text-xs font-semibold text-[var(--fg)] hover:border-[var(--primary)]/60 transition-colors cursor-pointer"
        >
          Apply
        </Button>
      </div>
    </div>
  );
}

/* =========================================================================
   3. SettingsDialog (Strict 5 Themes Palette)
   ========================================================================= */
export interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SettingsDialog({ open, onOpenChange }: SettingsDialogProps) {
  const theme = useTrackerStore((s) => s.theme);
  const setTheme = useTrackerStore((s) => s.setTheme);
  const trackingStart = useTrackerStore((s) => s.trackingStart);
  const setTrackingStart = useTrackerStore((s) => s.setTrackingStart);
  const importSnapshot = useTrackerStore((s) => s.importSnapshot);
  const resetToSeed = useTrackerStore((s) => s.resetToSeed);

  const [enableMl, setEnableMl] = useState(true);
  const [serviceUrl, setServiceUrl] = useState("");

  const handleExport = () => {
    const json = exportSnapshot();
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `tracker-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Backup exported successfully.");
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const raw = JSON.parse(event.target?.result as string);
        const err = importSnapshot(raw);
        if (err) toast.error(err);
        else toast.success("Backup imported successfully.");
      } catch {
        toast.error("Invalid JSON file.");
      }
    };
    reader.readAsText(file);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6 text-[var(--fg)] shadow-2xl transition-colors">
        <DialogHeader>
          <DialogTitle className="font-serif-title text-2xl font-normal text-[var(--fg)]">Settings</DialogTitle>
          <DialogDescription className="text-xs text-[var(--muted)]">
            Tracking window, backup, sample data, and theme engine.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4 space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[var(--fg)] opacity-90">Color theme</label>
            <NativeSelect
              value={theme}
              onChange={(e) => setTheme(e.target.value as ThemeId)}
              className="h-10 w-full rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] px-3 text-xs font-semibold text-[var(--fg)] shadow-none focus:ring-1 focus:ring-[var(--primary)]"
            >
              <option value="obsidian">✨ Obsidian Gold</option>
              <option value="ink">Ink</option>
              <option value="paper">Paper</option>
              <option value="slate">Slate</option>
              <option value="lavender">Lavender</option>
            </NativeSelect>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[var(--fg)] opacity-90">Tracking start</label>
            <input
              type="date"
              value={trackingStart}
              onChange={(e) => setTrackingStart(e.target.value)}
              className="h-10 w-full rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] px-3 text-xs font-semibold text-[var(--fg)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
            />
            <p className="text-[10px] text-[var(--muted)]">
              Days before this date are hidden from every month grid.
            </p>
          </div>

          <div className="space-y-2 pt-1">
            <label className="flex items-center gap-2 text-xs font-medium text-[var(--fg)] cursor-pointer select-none">
              <input
                type="checkbox"
                checked={enableMl}
                onChange={(e) => setEnableMl(e.target.checked)}
                className="size-4 rounded border-[var(--border)] bg-[var(--surface-elevated)] accent-[var(--primary)] cursor-pointer"
              />
              Enable ML insights
            </label>

            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-[var(--muted)]">Service URL</label>
              <input
                type="text"
                placeholder="Leave empty for the built-in engine"
                value={serviceUrl}
                onChange={(e) => setServiceUrl(e.target.value)}
                className="h-9 w-full rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] px-3 text-xs text-[var(--fg)] placeholder:text-[var(--muted)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleExport}
              className="h-10 rounded-xl border-[var(--border)] bg-[var(--surface-elevated)] text-xs font-semibold text-[var(--fg)] hover:bg-[var(--surface-pill)] cursor-pointer"
            >
              <Download className="mr-1.5 size-3.5" />
              Export JSON
            </Button>
            <label className="flex h-10 cursor-pointer items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] text-xs font-semibold text-[var(--fg)] hover:bg-[var(--surface-pill)] transition-colors">
              <Upload className="mr-1.5 size-3.5" />
              Import JSON
              <input type="file" accept=".json" onChange={handleImport} className="hidden" />
            </label>
          </div>

          <Button
            type="button"
            onClick={() => {
              resetToSeed();
              toast.success("Sample data restored.");
              onOpenChange(false);
            }}
            className="mt-2 h-11 w-full rounded-xl bg-[var(--primary)] text-xs font-bold text-[var(--primary-foreground)] hover:opacity-90 transition-opacity cursor-pointer shadow-sm"
          >
            <RotateCcw className="mr-1.5 size-3.5" />
            Restore sample data
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
