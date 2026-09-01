/* =========================================================================
   1. NewHabitDialog (Full Interactive Modal)
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
  const [bulkText, setBulkText] = useState("");
  const [thisMonthOnly, setThisMonthOnly] = useState(false);
  const [scheduleMode, setScheduleMode] = useState<ScheduleMode>("weekdays");
  const [selectedDays, setSelectedDays] = useState<number[]>([1, 2, 3, 4, 5]); // Default: Mon-Fri
  const [targetDayOfMonth, setTargetDayOfMonth] = useState<number>(1);

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

  // مزامنة الأيام عند الضغط على الأنماط السريعة
  const handleModeChange = (mode: ScheduleMode) => {
    setScheduleMode(mode);
    if (mode === "daily") {
      setSelectedDays([0, 1, 2, 3, 4, 5, 6]);
    } else if (mode === "weekdays") {
      setSelectedDays([1, 2, 3, 4, 5]);
    } else if (mode === "monthly") {
      setSelectedDays([1]);
    }
  };

  // تبديل اختيار يوم فردي
  const toggleDay = (dayIdx: number) => {
    setSelectedDays((prev) => {
      const next = prev.includes(dayIdx)
        ? prev.filter((d) => d !== dayIdx)
        : [...prev, dayIdx];
      
      // إذا اختار كل الأيام تلقائياً نجعله Daily، وإذا اختار أيام العمل نجعله Weekdays
      if (next.length === 7) setScheduleMode("daily");
      else if (next.length === 5 && !next.includes(0) && !next.includes(6)) setScheduleMode("weekdays");
      
      return next.sort();
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // 1. تحديد كائن الـ Schedule
    let schedule: Schedule;
    if (scheduleMode === "daily" || selectedDays.length === 7) {
      schedule = { type: "preset", id: "daily" };
    } else if (scheduleMode === "weekdays" && selectedDays.length === 5 && !selectedDays.includes(0) && !selectedDays.includes(6)) {
      schedule = { type: "preset", id: "weekdays" };
    } else if (scheduleMode === "onedate" || scheduleMode === "monthly") {
      schedule = { type: "monthlyDate", day: targetDayOfMonth };
    } else {
      schedule = { type: "weekly", days: selectedDays.length > 0 ? selectedDays : [1, 2, 3, 4, 5] };
    }

    const options = {
      monthKey: thisMonthOnly ? monthKeyStr : undefined,
      monthlyOnly: thisMonthOnly,
    };

    // 2. التحقق من Bulk Add أولاً
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

    // 3. التحقق من العادة الفردية
    const trimmed = name.trim();
    if (!trimmed) {
      toast.error("Please enter a habit name or paste multiple lines.");
      return;
    }

    addHabit(trimmed, schedule, options);
    toast.success(`Added "${trimmed}"`);
    setName("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-3xl border border-[var(--border)] bg-[#100f14] p-6 text-[var(--fg)] shadow-2xl">
        <DialogHeader className="space-y-1">
          <DialogTitle className="font-serif-title text-2xl font-normal tracking-tight text-[var(--fg)]">
            New habit
          </DialogTitle>
          <DialogDescription className="text-xs text-[var(--muted)]">
            Stable IDs keep history if you rename later.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {/* Habit Name Input */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-[var(--muted)]">Name</label>
            <input
              type="text"
              placeholder="e.g. Evening review"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-11 w-full rounded-2xl border border-[var(--border)] bg-[var(--surface-elevated)] px-4 text-xs text-[var(--fg)] placeholder:text-[var(--muted)]/40 focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
            />
          </div>

          {/* Bulk Add Habits Textarea */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-[var(--muted)]">Bulk add habits</label>
            <textarea
              rows={3}
              placeholder={"One habit per line\nRead 20 pages\nPractice C++\nWorkout"}
              value={bulkText}
              onChange={(e) => setBulkText(e.target.value)}
              className="w-full resize-none rounded-2xl border border-[var(--border)] bg-[var(--surface-elevated)] p-3.5 text-xs text-[var(--fg)] placeholder:text-[var(--muted)]/40 focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
            />
            <p className="text-[10.5px] text-[var(--muted)]">
              Paste multiple habit names at once. Blank lines are ignored.
            </p>
          </div>

          {/* Add to this month only Checkbox */}
          <label className="flex items-center gap-2.5 pt-0.5 text-xs text-[var(--fg)] cursor-pointer select-none">
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
            <label className="text-xs font-medium text-[var(--muted)]">Schedule</label>

            {/* Schedule Type Pills */}
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
                    "rounded-xl px-4 py-1.5 text-xs font-medium transition-all cursor-pointer border",
                    scheduleMode === id
                      ? "border-[var(--primary)] bg-[var(--surface-elevated)] text-[var(--fg)] ring-1 ring-[var(--primary)] shadow-sm font-semibold"
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
                        "flex size-8 items-center justify-center rounded-xl border text-xs font-medium transition-all cursor-pointer",
                        isSelected
                          ? "border-[var(--primary)] bg-[var(--primary-muted)] text-[var(--fg)] font-bold shadow-xs"
                          : "border-[var(--border)] bg-[var(--surface-elevated)] text-[var(--muted)] hover:text-[var(--fg)]"
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
                <span className="text-xs text-[var(--muted)]">Day of month:</span>
                <input
                  type="number"
                  min={1}
                  max={31}
                  value={targetDayOfMonth}
                  onChange={(e) => setTargetDayOfMonth(Number(e.target.value))}
                  className="h-9 w-20 rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] px-2.5 text-center text-xs text-[var(--fg)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
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
              className="h-10 rounded-2xl px-5 text-xs text-[var(--muted)] hover:bg-[var(--surface-elevated)] hover:text-[var(--fg)]"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="h-10 rounded-2xl bg-[var(--primary)] px-6 text-xs font-semibold text-[var(--primary-foreground)] hover:opacity-90 transition-opacity"
            >
              Add habit
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
