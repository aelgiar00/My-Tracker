import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/tracker/native-select";
import { useTrackerStore, exportSnapshot, ThemeId } from "@/store/tracker-store";
import { Schedule } from "@/lib/tracker/types";
import { toast } from "sonner";
import { Download, Upload, RotateCcw, Plus, Check } from "lucide-react";
import { cn } from "@/lib/utils";

/* =========================================================================
   1. NewHabitDialog
   ========================================================================= */
interface NewHabitDialogProps {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  daysInMonth: number;
  selectedYear: number;
  selectedMonth: number;
}

const PRESET_OPTIONS: { id: "daily" | "weekdays" | "weekends" | "mwf" | "tuth"; label: string }[] = [
  { id: "daily", label: "Daily (Every day)" },
  { id: "weekdays", label: "Weekdays (Mon-Fri)" },
  { id: "weekends", label: "Weekends (Sat-Sun)" },
  { id: "mwf", label: "Mon / Wed / Fri" },
  { id: "tuth", label: "Tue / Thu" },
];

export function NewHabitDialog({ open, onOpenChange }: NewHabitDialogProps) {
  const [name, setName] = useState("");
  const [scheduleType, setScheduleType] = useState<"daily" | "weekdays" | "weekends" | "mwf" | "tuth">("daily");
  const addHabit = useTrackerStore((s) => s.addHabit);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      toast.error("Please enter a habit name.");
      return;
    }

    const schedule: Schedule = {
      type: "preset",
      id: scheduleType,
    };

    addHabit(trimmed, schedule);
    toast.success(`Added "${trimmed}"`);
    setName("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-3xl border border-[var(--border)] bg-[#111215] p-6 text-[var(--fg)] shadow-2xl">
        <DialogHeader>
          <DialogTitle className="font-serif-title text-2xl">Create New Habit</DialogTitle>
          <DialogDescription className="text-xs text-[var(--muted)]">
            Define a habit name and its target recurring schedule.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-[var(--muted)]">Habit Name</label>
            <input
              type="text"
              placeholder="e.g., Read 20 pages, Deep work 90m..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
              className="h-10 w-full rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] px-3 text-xs text-[var(--fg)] placeholder:text-[var(--muted)]/50 focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-[var(--muted)]">Schedule</label>
            <NativeSelect
              value={scheduleType}
              onChange={(e) => setScheduleType(e.target.value as any)}
              className="h-10 w-full rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] px-3 text-xs text-[var(--fg)] shadow-none"
            >
              {PRESET_OPTIONS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </NativeSelect>
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="submit"
              className="h-10 w-full rounded-xl bg-[var(--primary)] text-xs font-semibold text-[var(--primary-foreground)] hover:opacity-90"
            >
              <Plus className="mr-1.5 size-4" />
              Add Habit
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* =========================================================================
   2. BulkUpdatePanel
   ========================================================================= */
interface BulkUpdatePanelProps {
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

    // تجميع التواريخ في النطاق المحدد
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

      {/* Habit Selection Chips */}
      <div className="mt-4 space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-xs font-medium text-[var(--muted)]">Habits</label>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSelectAll}
              className="text-[11px] text-[var(--primary)] hover:underline"
            >
              Select all
            </button>
            <span className="text-[10px] text-[var(--muted)]">·</span>
            <button
              type="button"
              onClick={handleClearAll}
              className="text-[11px] text-[var(--muted)] hover:underline"
            >
              Clear
            </button>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 pt-1">
          {habits.map((habit) => {
            const isSelected = selectedHabitIds.includes(habit.id);
            return (
              <button
                key={habit.id}
                type="button"
                onClick={() => toggleHabitSelect(habit.id)}
                className={cn(
                  "rounded-xl px-3.5 py-1.5 text-xs font-medium transition-all duration-150 border",
                  isSelected
                    ? "border-[var(--primary)] bg-[var(--primary-muted)] text-[var(--fg)]"
                    : "border-[var(--border)] bg-[var(--surface-elevated)] text-[var(--muted)] hover:text-[var(--fg)]"
                )}
              >
                {habit.name}
              </button>
            );
          })}
        </div>
      </div>

      {/* Controls Bar: From - To - Action - Apply */}
      <div className="mt-5 flex flex-wrap items-end gap-3 pt-2">
        <div className="space-y-1">
          <label className="text-[11px] text-[var(--muted)]">From</label>
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="h-9 rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] px-3 text-xs text-[var(--fg)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
          />
        </div>

        <div className="space-y-1">
          <label className="text-[11px] text-[var(--muted)]">To</label>
          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="h-9 rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] px-3 text-xs text-[var(--fg)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
          />
        </div>

        <div className="space-y-1">
          <label className="text-[11px] text-[var(--muted)]">Action</label>
          <NativeSelect
            value={actionDone}
            onChange={(e) => setActionDone(e.target.value as any)}
            className="h-9 rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] px-3 text-xs text-[var(--fg)]"
          >
            <option value="done">Set done</option>
            <option value="undone">Set undone</option>
          </NativeSelect>
        </div>

        <Button
          type="button"
          onClick={handleApply}
          className="h-9 rounded-xl bg-[var(--surface-elevated)] border border-[var(--border)] px-4 text-xs font-medium text-[var(--fg)] hover:border-[var(--primary)]/50"
        >
          Apply
        </Button>
      </div>
    </div>
  );
}

/* =========================================================================
   3. SettingsDialog
   ========================================================================= */
export function SettingsDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
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
    toast("Backup exported successfully.");
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
        else toast("Backup imported successfully.");
      } catch {
        toast.error("Invalid JSON file.");
      }
    };
    reader.readAsText(file);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-3xl border border-[var(--border)] bg-[#111215] p-6 text-[var(--fg)] shadow-2xl">
        <DialogHeader>
          <DialogTitle className="font-serif-title text-2xl">Settings</DialogTitle>
          <DialogDescription className="text-xs text-[var(--muted)]">
            Tracking window, backup, sample data, and the ML hook.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4 space-y-4">
          {/* Color theme selector */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-[var(--muted)]">Color theme</label>
            <NativeSelect
              value={theme}
              onChange={(e) => setTheme(e.target.value as ThemeId)}
              className="h-10 w-full rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] px-3 text-xs text-[var(--fg)] shadow-none"
            >
              <option value="default">Default · Lavender</option>
              <option value="ocean">Ocean · Blue</option>
              <option value="forest">Forest · Green</option>
              <option value="amber">Amber · Gold</option>
              <option value="rose">Rose · Pink</option>
              <option value="oled">OLED · Pure Black</option>
              <option value="midnight">Midnight · Indigo</option>
              <option value="nord">Nord · Arctic</option>
            </NativeSelect>
          </div>

          {/* Tracking start date */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-[var(--muted)]">Tracking start</label>
            <input
              type="date"
              value={trackingStart}
              onChange={(e) => setTrackingStart(e.target.value)}
              className="h-10 w-full rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] px-3 text-xs text-[var(--fg)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
            />
            <p className="text-[10px] text-[var(--muted)]">Days before this date are hidden from every month grid.</p>
          </div>

          {/* ML Option */}
          <div className="space-y-2 pt-2">
            <label className="flex items-center gap-2 text-xs text-[var(--fg)] cursor-pointer select-none">
              <input
                type="checkbox"
                checked={enableMl}
                onChange={(e) => setEnableMl(e.target.checked)}
                className="size-4 rounded border-[var(--border)] bg-[var(--surface-elevated)] text-[var(--primary)]"
              />
              Enable ML insights
            </label>

            <div className="space-y-1">
              <label className="text-[11px] text-[var(--muted)]">Service URL</label>
              <input
                type="text"
                placeholder="Leave empty for the built-in engine"
                value={serviceUrl}
                onChange={(e) => setServiceUrl(e.target.value)}
                className="h-9 w-full rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] px-3 text-xs text-[var(--fg)] placeholder:text-[var(--muted)]/50 focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
              />
            </div>
          </div>

          {/* JSON Export / Import buttons */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleExport}
              className="h-10 rounded-xl border-[var(--border)] bg-[var(--surface-elevated)] text-xs text-[var(--fg)]"
            >
              <Download className="mr-1.5 size-3.5" />
              Export JSON
            </Button>
            <label className="flex h-10 cursor-pointer items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] text-xs font-medium text-[var(--fg)] hover:bg-[var(--surface-pill)]">
              <Upload className="mr-1.5 size-3.5" />
              Import JSON
              <input type="file" accept=".json" onChange={handleImport} className="hidden" />
            </label>
          </div>

          {/* Restore sample data */}
          <Button
            type="button"
            onClick={() => {
              resetToSeed();
              toast("Sample data restored.");
              onOpenChange(false);
            }}
            className="mt-2 h-11 w-full rounded-xl bg-[#cbb592] text-xs font-semibold text-[#111215] hover:bg-[#cbb592]/90"
          >
            <RotateCcw className="mr-1.5 size-3.5" />
            Restore sample data
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
