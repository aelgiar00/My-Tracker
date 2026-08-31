import { useEffect, useMemo, useState } from "react";
import { format, startOfWeek, addDays } from "date-fns";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  LogOut,
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
import { MlPanel } from "@/components/tracker/ml-panel";
import { AuthDialog } from "@/components/tracker/auth-dialog";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/tracker/native-select";
import { isoDate } from "@/lib/tracker/schedule";
import { computeStats, monthDays } from "@/lib/tracker/stats";
import { useTrackerStore, exportSnapshot } from "@/store/tracker-store";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

type MainTab = "daily" | "matrix" | "stats";
type StatsSubTab = "analytics" | "audit" | "manage" | "ml";

export function TrackerApp() {
  const [today] = useState(() => new Date());
  const [newOpen, setNewOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [mainTab, setMainTab] = useState<MainTab>("daily");
  const [statsSubTab, setStatsSubTab] = useState<StatsSubTab>("analytics");
  const [session, setSession] = useState<any>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);

  const habits = useTrackerStore((s) => s.habits);
  const completions = useTrackerStore((s) => s.completions);
  const dailyTasks = useTrackerStore((s) => s.dailyTasks);
  const trackingStart = useTrackerStore((s) => s.trackingStart);
  const hidePast = useTrackerStore((s) => s.hidePast);
  const theme = useTrackerStore((s) => s.theme);
  const matrixView = useTrackerStore((s) => s.matrixView);
  const selectedYear = useTrackerStore((s) => s.selectedYear);
  const selectedMonth = useTrackerStore((s) => s.selectedMonth);
  const setMonth = useTrackerStore((s) => s.setMonth);
  const undo = useTrackerStore((s) => s.undo);
  const archiveHabit = useTrackerStore((s) => s.archiveHabit);
  const undoCount = useTrackerStore((s) => s.undoStack.length);
  const importSnapshot = useTrackerStore((s) => s.importSnapshot);
  const resetToSeed = useTrackerStore((s) => s.resetToSeed);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoadingAuth(false);
      if (session) fetchCloudData(session.user.id);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) fetchCloudData(session.user.id);
    });

    return () => subscription.unsubscribe();
  }, []);

  async function fetchCloudData(userId: string) {
    try {
      const { data } = await supabase
        .from("user_tracker_data")
        .select("snapshot")
        .eq("user_id", userId)
        .maybeSingle();

      if (data && data.snapshot) {
        importSnapshot(data.snapshot);
      } else {
        resetToSeed();
        const rawJson = JSON.parse(exportSnapshot());
        await supabase.from("user_tracker_data").upsert({
          user_id: userId,
          snapshot: rawJson,
          updated_at: new Date().toISOString(),
        });
      }
    } catch {
      resetToSeed();
    }
  }

  useEffect(() => {
    if (!session?.user?.id) return;
    const timer = setTimeout(async () => {
      try {
        const rawJson = JSON.parse(exportSnapshot());
        await supabase.from("user_tracker_data").upsert({
          user_id: session.user.id,
          snapshot: rawJson,
          updated_at: new Date().toISOString(),
        });
      } catch {}
    }, 1000);
    return () => clearTimeout(timer);
  }, [habits, completions, dailyTasks, session]);

  useEffect(() => {
    void useTrackerStore.persist.rehydrate();
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  const monthDaysList = useMemo(
    () => monthDays(selectedYear, selectedMonth, trackingStart),
    [selectedYear, selectedMonth, trackingStart]
  );

  const weekDaysList = useMemo(() => {
    const start = startOfWeek(today, { weekStartsOn: 6 });
    return Array.from({ length: 7 }, (_, i) => addDays(start, i));
  }, [today]);

  const activeDays = matrixView === "week" ? weekDaysList : monthDaysList;
  const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate();

  const stats = useMemo(
    () => computeStats(habits, completions, monthDaysList, today, dailyTasks),
    [habits, completions, monthDaysList, today, dailyTasks]
  );

  const archived = habits.filter((h) => h.archived);

  function shiftMonth(delta: number) {
    const d = new Date(selectedYear, selectedMonth - 1 + delta, 1);
    setMonth(d.getFullYear(), d.getMonth() + 1);
  }

  const years = Array.from({ length: 8 }, (_, i) => 2025 + i);

  if (loadingAuth) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--bg)] text-[var(--muted)]">
        Loading Tracker...
      </div>
    );
  }

  return (
    <div className="mx-auto min-h-screen max-w-7xl px-4 py-8 sm:px-6">
      {!session && (
        <AuthDialog
          onSuccess={() => {
            supabase.auth.getSession().then(({ data: { session } }) => {
              setSession(session);
              if (session) fetchCloudData(session.user.id);
            });
          }}
        />
      )}

      {/* Header */}
      <header className="mb-6 flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
        <div>
          <p className="text-[11px] font-semibold tracking-[0.25em] text-[var(--muted)] uppercase">
            EXECUTION LOG
          </p>
          <h1 className="font-serif-title mt-1 text-4xl font-normal tracking-tight text-[var(--fg)] sm:text-5xl">
            {MONTHS[selectedMonth - 1]} {selectedYear}
          </h1>
          <p className="mt-1.5 text-xs text-[var(--muted)]">
            Pace {Math.round(stats.paceScore)}% through today · {stats.currentStreak} day streak ·{" "}
            {stats.completedThroughToday}/{stats.expectedThroughToday} scheduled
          </p>
        </div>

        {/* Action Controls Bar */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex h-10 items-center rounded-xl bg-[var(--surface)] p-1 border border-[var(--border)]">
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => shiftMonth(-1)}
              className="h-8 w-8 text-[var(--muted)] hover:text-[var(--fg)]"
            >
              <ChevronLeft className="size-4" />
            </Button>
            <NativeSelect
              className="h-8 border-0 bg-transparent text-xs font-medium text-[var(--fg)] shadow-none focus:ring-0"
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
              className="h-8 border-0 bg-transparent text-xs font-medium text-[var(--fg)] shadow-none focus:ring-0"
              value={selectedYear}
              onChange={(e) => setMonth(Number(e.target.value), selectedMonth)}
            >
              {years.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </NativeSelect>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => shiftMonth(1)}
              className="h-8 w-8 text-[var(--muted)] hover:text-[var(--fg)]"
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setMonth(today.getFullYear(), today.getMonth() + 1)}
            className="h-10 rounded-xl border border-[var(--primary)]/30 bg-[var(--surface)] px-3.5 text-xs text-[var(--fg)] hover:border-[var(--primary)]"
          >
            <CalendarDays className="mr-1.5 size-3.5 text-[var(--primary)]" />
            Today
          </Button>

          <Button
            variant="outline"
            size="icon-sm"
            onClick={() => {
              if (undo()) toast("Undid last change.");
              else toast("Nothing to undo.");
            }}
            disabled={undoCount === 0}
            className="h-10 w-10 rounded-xl border-[var(--border)] bg-[var(--surface)] text-[var(--fg)]"
          >
            <Undo2 className="size-4" />
          </Button>
          <Button
            variant="outline"
            size="icon-sm"
            onClick={() => setSettingsOpen(true)}
            className="h-10 w-10 rounded-xl border-[var(--border)] bg-[var(--surface)] text-[var(--fg)]"
          >
            <Settings className="size-4" />
          </Button>
          <Button
            size="sm"
            onClick={() => setNewOpen(true)}
            className="h-10 rounded-xl bg-[var(--surface-elevated)] px-4 text-xs font-medium text-[var(--fg)] border border-[var(--border)] hover:border-[var(--primary)]/50"
          >
            <Plus className="mr-1.5 size-4 text-[var(--primary)]" />
            Habit
          </Button>
          {session && (
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={async () => {
                await supabase.auth.signOut();
                resetToSeed();
                setSession(null);
                toast("تم تسجيل الخروج");
              }}
              className="h-10 w-10 rounded-xl hover:bg-rose-500/10 text-rose-400"
            >
              <LogOut className="size-4" />
            </Button>
          )}
        </div>
      </header>

      {/* Main Switcher Tabs */}
      <div className="mb-6">
        <div className="grid grid-cols-3 rounded-2xl bg-[var(--surface)] p-1.5 border border-[var(--border)]">
          {(["daily", "matrix", "stats"] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setMainTab(tab)}
              className={cn(
                "flex items-center justify-center rounded-xl py-2.5 text-xs font-medium capitalize transition-all duration-200",
                mainTab === tab
                  ? "bg-[var(--surface-pill)] text-[var(--fg)] font-semibold shadow-sm"
                  : "text-[var(--muted)] hover:text-[var(--fg)]"
              )}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content Area */}
      <main>
        {/* Daily View: Side-by-Side (AI Coach on Left, Matrix on Right) */}
        {mainTab === "daily" && (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[22rem_minmax(0,1fr)]">
            <section className="min-w-0">
              <div className="rounded-3xl border border-blue-500/25 bg-[var(--surface)] p-5 shadow-xl">
                <TodayPanel habits={habits} stats={stats} todayDate={today} />
              </div>
            </section>

            <section className="min-w-0">
              <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-xl">
                <HabitMatrix
                  habits={habits}
                  days={activeDays}
                  todayIso={isoDate(today)}
                  hidePast={hidePast}
                  daysInMonth={daysInMonth}
                  selectedYear={selectedYear}
                  selectedMonth={selectedMonth}
                />
              </div>
            </section>
          </div>
        )}

        {/* Matrix Only View */}
        {mainTab === "matrix" && (
          <div className="rounded-3xl bg-[var(--surface)] p-6 sm:p-8 border border-[var(--border)] shadow-xl">
            <HabitMatrix
              habits={habits}
              days={activeDays}
              todayIso={isoDate(today)}
              hidePast={hidePast}
              daysInMonth={daysInMonth}
              selectedYear={selectedYear}
              selectedMonth={selectedMonth}
            />
          </div>
        )}

        {/* Stats View with 4 Sub-Tabs */}
        {mainTab === "stats" && (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center gap-2">
              {(
                [
                  ["analytics", "Analytics"],
                  ["audit", "Audit"],
                  ["manage", "Manage"],
                  ["ml", "✨ ML"],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setStatsSubTab(id)}
                  className={cn(
                    "rounded-xl px-4 py-2 text-xs font-medium transition-all duration-150 border",
                    statsSubTab === id
                      ? "border-[var(--primary)] bg-[var(--surface)] text-[var(--fg)] shadow-sm font-semibold ring-1 ring-[var(--primary)]/30"
                      : "border-[var(--border)] bg-[var(--surface)] text-[var(--muted)] hover:text-[var(--fg)]"
                  )}
                >
                  {label}
                </button>
              ))}
            </div>

            {statsSubTab === "analytics" && <AnalyticsPanel stats={stats} />}
            {statsSubTab === "audit" && <AuditPanel habits={habits} stats={stats} />}
            {statsSubTab === "ml" && <MlPanel habits={habits} completions={completions} />}
            {statsSubTab === "manage" && (
              <div className="flex flex-col gap-6">
                <BulkUpdatePanel
                  days={activeDays.map((d) => ({ iso: isoDate(d), label: format(d, "EEE d") }))}
                  todayIso={isoDate(today)}
                />
                <div className="rounded-3xl bg-[var(--surface)] p-6 border border-[var(--border)]">
                  <h3 className="font-serif-title text-xl text-[var(--fg)]">Archived</h3>
                  {archived.length === 0 ? (
                    <p className="mt-2 text-xs text-[var(--muted)]">No archived habits.</p>
                  ) : (
                    <ul className="mt-4 flex flex-col gap-2.5">
                      {archived.map((h) => (
                        <li key={h.id} className="flex items-center justify-between rounded-xl bg-[var(--surface-elevated)] p-3.5 border border-[var(--border)]">
                          <span className="text-sm font-medium text-[var(--fg)]">{h.name}</span>
                          <Button size="sm" variant="secondary" onClick={() => archiveHabit(h.id, false)}>
                            Restore
                          </Button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Bottom Switcher Nav */}
      <footer className="mt-12 mb-4">
        <div className="grid grid-cols-3 rounded-2xl bg-[var(--surface)] p-1.5 border border-[var(--border)]">
          {(["daily", "matrix", "stats"] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setMainTab(tab)}
              className={cn(
                "flex items-center justify-center rounded-xl py-2.5 text-xs font-medium capitalize transition-all duration-200",
                mainTab === tab
                  ? "bg-[var(--surface-pill)] text-[var(--fg)] font-semibold shadow-sm"
                  : "text-[var(--muted)] hover:text-[var(--fg)]"
              )}
            >
              {tab}
            </button>
          ))}
        </div>
      </footer>

      <NewHabitDialog
        open={newOpen}
        onOpenChange={setNewOpen}
        daysInMonth={daysInMonth}
        selectedYear={selectedYear}
        selectedMonth={selectedMonth}
      />
      <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
    </div>
  );
}

export default TrackerApp;
