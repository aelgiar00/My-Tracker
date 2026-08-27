import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import {
  BarChart3,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  Plus,
  Settings,
  Undo2,
} from "lucide-react";
import { toast } from "sonner";
import { AnalyticsPanel } from "@/components/tracker/analytics-panel";
import { AuditPanel } from "@/components/tracker/audit-panel";
import { BulkUpdatePanel, NewHabitDialog, SettingsDialog } from "@/components/tracker/habit-dialogs";
import { HabitMatrix } from "@/components/tracker/habit-matrix";
import { TodayPanel } from "@/components/tracker/today-panel";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/tracker/native-select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { isoDate } from "@/lib/tracker/schedule";
import { computeStats, monthDays } from "@/lib/tracker/stats";
import { useTrackerStore } from "@/store/tracker-store";
import { cn } from "@/lib/utils";

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

type MobileTab = "today" | "matrix" | "stats";

export function TrackerApp() {
  const [today] = useState(() => new Date());
  const [newOpen, setNewOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [mobileTab, setMobileTab] = useState<MobileTab>("today");

  const habits = useTrackerStore((s) => s.habits);
  const completions = useTrackerStore((s) => s.completions);
  const dailyTasks = useTrackerStore((s) => s.dailyTasks);
  const trackingStart = useTrackerStore((s) => s.trackingStart);
  const hidePast = useTrackerStore((s) => s.hidePast);
  const theme = useTrackerStore((s) => s.theme);
  const selectedYear = useTrackerStore((s) => s.selectedYear);
  const selectedMonth = useTrackerStore((s) => s.selectedMonth);
  const setMonth = useTrackerStore((s) => s.setMonth);
  const undo = useTrackerStore((s) => s.undo);
  const archiveHabit = useTrackerStore((s) => s.archiveHabit);
  const undoCount = useTrackerStore((s) => s.undoStack.length);

  useEffect(() => {
    void useTrackerStore.persist.rehydrate();
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      const typing =
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable);
      if (typing) return;
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (undo()) toast("Undid last change.");
        else toast("Nothing to undo.");
      }
      if (e.key.toLowerCase() === "n" && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        setNewOpen(true);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [undo]);

  const days = useMemo(
    () => monthDays(selectedYear, selectedMonth, trackingStart),
    [selectedYear, selectedMonth, trackingStart],
  );
  const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate();
  const stats = useMemo(
    () => computeStats(habits, completions, days, today, dailyTasks),
    [habits, completions, days, today, dailyTasks],
  );

  const archived = habits.filter((h) => h.archived);

  function shiftMonth(delta: number) {
    const d = new Date(selectedYear, selectedMonth - 1 + delta, 1);
    setMonth(d.getFullYear(), d.getMonth() + 1);
  }

  const years = Array.from({ length: 8 }, (_, i) => 2025 + i);

  return (
    <div className="mx-auto min-h-dvh max-w-[88rem] px-4 pt-8 pb-24 lg:pb-12">
      <header className="mb-8 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="animate-fade-rise">
          <p className="text-xs font-medium tracking-[0.18em] text-muted uppercase">
            Execution log
          </p>
          <h1 className="font-display text-4xl tracking-tight text-fg sm:text-5xl">
            {MONTHS[selectedMonth - 1]} {selectedYear}
          </h1>
          <p className="mt-2 max-w-xl text-sm text-muted">
            Pace {Math.round(stats.paceScore)}% through today · {stats.currentStreak} day streak ·{" "}
            {stats.completedThroughToday}/{stats.expectedThroughToday} scheduled
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 rounded-lg bg-surface p-1 shadow-[var(--shadow-border)]">
            <Button variant="ghost" size="icon-sm" onClick={() => shiftMonth(-1)} aria-label="Previous month">
              <ChevronLeft className="size-4" />
            </Button>
            <NativeSelect
              className="h-8 w-[7.5rem] border-0 bg-transparent shadow-none"
              value={selectedMonth}
              onChange={(e) => setMonth(selectedYear, Number(e.target.value))}
            >
              {MONTHS.map((m, i) => (
                <option key={m} value={i + 1}>
                  {m}
                </option>
              ))}
            </NativeSelect>
            <NativeSelect
              className="h-8 w-[4.5rem] border-0 bg-transparent shadow-none"
              value={selectedYear}
              onChange={(e) => setMonth(Number(e.target.value), selectedMonth)}
            >
              {years.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </NativeSelect>
            <Button variant="ghost" size="icon-sm" onClick={() => shiftMonth(1)} aria-label="Next month">
              <ChevronRight className="size-4" />
            </Button>
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              if (undo()) toast("Undid last change.");
              else toast("Nothing to undo.");
            }}
            disabled={undoCount === 0}
          >
            <Undo2 className="size-3.5" />
            Undo
          </Button>
          <Button variant="secondary" size="icon-sm" onClick={() => setSettingsOpen(true)} aria-label="Settings">
            <Settings className="size-4" />
          </Button>
          <Button size="sm" onClick={() => setNewOpen(true)}>
            <Plus className="size-3.5" />
            Habit
          </Button>
        </div>
      </header>

      <div className="grid gap-4 lg:grid-cols-[20rem_minmax(0,1fr)]">
        <section className={cn("min-w-0", mobileTab !== "today" && "max-lg:hidden")}>
          <TodayPanel habits={habits} stats={stats} todayDate={today} />
        </section>
        <section className={cn("min-w-0", mobileTab !== "matrix" && "max-lg:hidden")}>
          <HabitMatrix
            habits={habits}
            days={days}
            todayIso={isoDate(today)}
            hidePast={hidePast}
            daysInMonth={daysInMonth}
            selectedYear={selectedYear}
            selectedMonth={selectedMonth}
          />
        </section>
      </div>

      <div className={cn("mt-8", mobileTab !== "stats" && "max-lg:hidden")}>
        <Tabs defaultValue="analytics">
          <TabsList>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="audit">Audit</TabsTrigger>
            <TabsTrigger value="manage">Manage</TabsTrigger>
          </TabsList>
          <TabsContent value="analytics">
            <AnalyticsPanel stats={stats} />
          </TabsContent>
          <TabsContent value="audit">
            <AuditPanel habits={habits} stats={stats} />
          </TabsContent>
          <TabsContent value="manage">
            <div className="flex flex-col gap-5">
              <BulkUpdatePanel
                days={days.map((d) => ({ iso: isoDate(d), label: format(d, "EEE d") }))}
                todayIso={isoDate(today)}
              />
              <div className="rounded-xl bg-surface p-4 shadow-[var(--shadow-border)]">
                <h3 className="font-display text-lg tracking-tight">Archived</h3>
                {archived.length === 0 ? (
                  <p className="mt-2 text-sm text-muted">No archived habits.</p>
                ) : (
                  <ul className="mt-3 flex flex-col gap-2">
                    {archived.map((h) => (
                      <li key={h.id} className="flex items-center justify-between gap-3">
                        <span className="text-sm text-fg">{h.name}</span>
                        <Button size="sm" variant="secondary" onClick={() => archiveHabit(h.id, false)}>
                          Restore
                        </Button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-bg/95 px-2 pt-1 pb-[max(0.5rem,env(safe-area-inset-bottom))] lg:hidden">
        <div className="mx-auto grid max-w-md grid-cols-3">
          {(
            [
              ["today", "Today", CalendarDays],
              ["matrix", "Matrix", LayoutGrid],
              ["stats", "Stats", BarChart3],
            ] as const
          ).map(([id, label, Icon]) => (
            <button
              key={id}
              type="button"
              onClick={() => setMobileTab(id)}
              className={cn(
                "flex min-h-12 flex-col items-center justify-center gap-0.5 text-[0.7rem] font-medium",
                mobileTab === id ? "text-fg" : "text-muted",
              )}
            >
              <Icon className="size-4" />
              {label}
            </button>
          ))}
        </div>
      </nav>

      <NewHabitDialog open={newOpen} onOpenChange={setNewOpen} daysInMonth={daysInMonth} selectedYear={selectedYear} selectedMonth={selectedMonth} />
      <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
    </div>
  );
}
