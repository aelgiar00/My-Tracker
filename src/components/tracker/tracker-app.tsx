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
import { AuthDialog } from "@/components/tracker/auth-dialog";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/tracker/native-select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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

export function TrackerApp() {
  const [today] = useState(() => new Date());
  const [newOpen, setNewOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [mainTab, setMainTab] = useState<MainTab>("daily");
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
    const start = startOfWeek(today, { weekStartsOn: 1 });
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
      <div className="flex min-h-screen items-center justify-center bg-[var(--bg)] text-muted">
        Loading Tracker...
      </div>
    );
  }

  return (
    <div className="mx-auto min-h-screen max-w-7xl px-4 py-8 sm:px-8">
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
      <header className="mb-6">
        <p className="text-[11px] font-semibold tracking-[0.22em] text-[#8b8882] uppercase">
          EXECUTION LOG
        </p>
        <h1 className="font-serif-title mt-1 text-4xl font-bold tracking-tight text-[var(--fg)] sm:text-5xl">
          {MONTHS[selectedMonth - 1]} {selectedYear}
        </h1>
        <p className="mt-2 text-xs text-[#8b8882]">
          Pace {Math.round(stats.paceScore)}% through today · {stats.currentStreak} day streak ·{" "}
          {stats.completedThroughToday}/{stats.expectedThroughToday} scheduled
        </p>

        {/* Action Controls Bar */}
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center rounded-xl bg-[var(--surface)] p-1 border border-[var(--border)]">
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => shiftMonth(-1)}
                className="h-8 w-8 text-[#8b8882] hover:text-[var(--fg)]"
              >
                <ChevronLeft className="size-4" />
              </Button>
              <NativeSelect
                className="h-8 border-0 bg-transparent text-xs font-medium text-[var(--fg)] shadow-none focus:ring-0"
                value={selectedMonth}
                onChange={(e) => setMonth(selectedYear, Number(e.target.value))}
              >
                {MONTHS.map((m, i) => (
                  <option key={m} value={i + 1} className="bg-[var(--surface)] text-[var(--fg)]">
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
                  <option key={y} value={y} className="bg-[var(--surface)] text-[var(--fg)]">
                    {y}
                  </option>
                ))}
              </NativeSelect>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => shiftMonth(1)}
                className="h-8 w-8 text-[#8b8882] hover:text-[var(--fg)]"
              >
                <ChevronRight className="size-4" />
              </Button>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setMonth(today.getFullYear(), today.getMonth() + 1)}
              className="h-10 rounded-xl border-[var(--border)] bg-[var(--surface)] px-3.5 text-xs text-[var(--fg)] hover:border-[#cbb592]/50 hover:bg-[var(--surface-elevated)]"
            >
              <CalendarDays className="mr-1.5 size-3.5 text-[#cbb592]" />
              Today
            </Button>
          </div>

          <div className="flex items-center gap-2">
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
              className="h-10 rounded-xl bg-[var(--surface)] px-4 text-xs font-medium text-[var(--fg)] border border-[var(--border)] hover:border-[#cbb592]/50"
            >
              <Plus className="mr-1.5 size-4 text-[#cbb592]" />
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
                className="h-10 w-10 rounded-xl hover:bg-rose-500/10"
              >
                <LogOut className="size-4 text-rose-400" />
              </Button>
            )}
          </div>
        </div>

        {/* Central Switcher Tabs (Daily / Matrix / Stats) */}
        <div className="mt-6">
          <div className="grid grid-cols-3 rounded-2xl bg-[var(--surface)] p-1.5 border border-[var(--border)]">
            {(["daily", "matrix", "stats"] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setMainTab(tab)}
                className={cn(
                  "flex items-center justify-center rounded-xl py-2.5 text-xs font-medium capitalize transition-all duration-200",
                  mainTab === tab
                    ? "bg-[#25252b] text-[var(--fg)] shadow-sm font-semibold"
                    : "text-[#8b8882] hover:text-[var(--fg)]"
                )}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Main Views */}
      <main className="mt-6">
        {mainTab === "daily" && (
          <div className="rounded-3xl bg-[var(--surface)] p-5 sm:p-7 border border-[var(--border)] shadow-xl">
            <TodayPanel habits={habits} stats={stats} todayDate={today} />
          </div>
        )}

        {mainTab === "matrix" && (
          <div className="rounded-3xl bg-[var(--surface)] p-5 sm:p-7 border border-[var(--border)] shadow-xl">
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

        {mainTab === "stats" && (
          <div className="space-y-6">
            <Tabs defaultValue="analytics" className="w-full">
              <TabsList className="mb-4 h-11 rounded-xl bg-[var(--surface)] p-1 border border-[var(--border)]">
                <TabsTrigger value="analytics" className="rounded-lg text-xs data-[state=active]:bg-[#25252b]">
                  Analytics
                </TabsTrigger>
                <TabsTrigger value="audit" className="rounded-lg text-xs data-[state=active]:bg-[#25252b]">
                  Audit
                </TabsTrigger>
                <TabsTrigger value="manage" className="rounded-lg text-xs data-[state=active]:bg-[#25252b]">
                  Manage
                </TabsTrigger>
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
                    days={activeDays.map((d) => ({ iso: isoDate(d), label: format(d, "EEE d") }))}
                    todayIso={isoDate(today)}
                  />
                  <div className="rounded-2xl bg-[var(--surface)] p-5 border border-[var(--border)]">
                    <h3 className="font-serif-title text-lg">Archived Habits</h3>
                    {archived.length === 0 ? (
                      <p className="mt-2 text-xs text-[#8b8882]">No archived habits.</p>
                    ) : (
                      <ul className="mt-3 flex flex-col gap-2">
                        {archived.map((h) => (
                          <li key={h.id} className="flex items-center justify-between gap-3">
                            <span className="text-sm text-[var(--fg)]">{h.name}</span>
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
        )}
      </main>

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
