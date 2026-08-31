import { useEffect, useMemo, useState } from "react";
import { format, startOfWeek, addDays } from "date-fns";
import {
  BarChart3,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  LogOut,
  Plus,
  Settings,
  Undo2,
  CalendarRange,
  Palette,
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
import { useTrackerStore, exportSnapshot, ThemeMode } from "@/store/tracker-store";
import { supabase } from "@/lib/supabase";
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

const THEMES: { id: ThemeMode; label: string }[] = [
  { id: "dark", label: "Studio Dark" },
  { id: "oled", label: "OLED Pitch Black" },
  { id: "midnight", label: "Midnight Blue" },
  { id: "nord", label: "Nordic Frost" },
  { id: "emerald", label: "Emerald Matrix" },
  { id: "cyberpunk", label: "Cyber Neon" },
  { id: "sunset", label: "Sunset Amber" },
  { id: "light", label: "Minimal Light" },
];

type MobileTab = "today" | "matrix" | "stats";

export function TrackerApp() {
  const [today] = useState(() => new Date());
  const [newOpen, setNewOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [mobileTab, setMobileTab] = useState<MobileTab>("today");
  const [session, setSession] = useState<any>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [viewMode, setViewMode] = useState<"month" | "week">("month");

  const habits = useTrackerStore((s) => s.habits);
  const completions = useTrackerStore((s) => s.completions);
  const dailyTasks = useTrackerStore((s) => s.dailyTasks);
  const trackingStart = useTrackerStore((s) => s.trackingStart);
  const hidePast = useTrackerStore((s) => s.hidePast);
  const theme = useTrackerStore((s) => s.theme);
  const setTheme = useTrackerStore((s) => s.setTheme);
  const selectedYear = useTrackerStore((s) => s.selectedYear);
  const selectedMonth = useTrackerStore((s) => s.selectedMonth);
  const setMonth = useTrackerStore((s) => s.setMonth);
  const undo = useTrackerStore((s) => s.undo);
  const archiveHabit = useTrackerStore((s) => s.archiveHabit);
  const undoCount = useTrackerStore((s) => s.undoStack.length);
  const importSnapshot = useTrackerStore((s) => s.importSnapshot);
  const resetToSeed = useTrackerStore((s) => s.resetToSeed);

  // تحقق الجلسة والمزامنة السحابية
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoadingAuth(false);
      if (session) {
        fetchCloudData(session.user.id);
      } else {
        resetToSeed();
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        fetchCloudData(session.user.id);
      } else {
        resetToSeed();
      }
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

  // مزامنة التغييرات المحلية
  useEffect(() => {
    if (!session?.user?.id) return;
    const saveToCloud = async () => {
      try {
        const rawJson = JSON.parse(exportSnapshot());
        await supabase.from("user_tracker_data").upsert({
          user_id: session.user.id,
          snapshot: rawJson,
          updated_at: new Date().toISOString(),
        });
      } catch {
        // Handle silently
      }
    };
    const timer = setTimeout(saveToCloud, 1000);
    return () => clearTimeout(timer);
  }, [habits, completions, dailyTasks, session]);

  useEffect(() => {
    void useTrackerStore.persist.rehydrate();
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  // حساب الأيام لشهر كامل أو أسبوع محدد
  const monthDaysList = useMemo(
    () => monthDays(selectedYear, selectedMonth, trackingStart),
    [selectedYear, selectedMonth, trackingStart],
  );

  const weekDaysList = useMemo(() => {
    const start = startOfWeek(today, { weekStartsOn: 6 }); // يبدأ من السبت
    return Array.from({ length: 7 }, (_, i) => addDays(start, i));
  }, [today]);

  const activeDays = viewMode === "month" ? monthDaysList : weekDaysList;
  const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate();

  const stats = useMemo(
    () => computeStats(habits, completions, monthDaysList, today, dailyTasks),
    [habits, completions, monthDaysList, today, dailyTasks],
  );

  const archived = habits.filter((h) => h.archived);

  function shiftMonth(delta: number) {
    const d = new Date(selectedYear, selectedMonth - 1 + delta, 1);
    setMonth(d.getFullYear(), d.getMonth() + 1);
  }

  const years = Array.from({ length: 8 }, (_, i) => 2025 + i);

  if (loadingAuth) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg text-muted">
        Loading Tracker...
      </div>
    );
  }

  return (
    <div className="mx-auto min-h-dvh max-w-[88rem] px-4 pt-8 pb-24 lg:pb-12">
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

      {/* Header Bar */}
      <header className="mb-8 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="animate-fade-rise">
          <div className="flex items-center gap-3">
            <p className="text-xs font-semibold tracking-[0.2em] text-muted uppercase">
              Execution Log
            </p>
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary uppercase">
              {viewMode} View
            </span>
          </div>
          <h1 className="mt-1 font-display text-4xl tracking-tight text-fg sm:text-5xl">
            {MONTHS[selectedMonth - 1]} {selectedYear}
          </h1>
          <p className="mt-2 max-w-xl text-sm text-muted">
            Pace {Math.round(stats.paceScore)}% through today · {stats.currentStreak} day streak ·{" "}
            {stats.completedThroughToday}/{stats.expectedThroughToday} scheduled
          </p>
        </div>

        {/* Action Controls & Toolbar */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Week / Month Toggle */}
          <div className="flex items-center rounded-lg bg-surface p-1 shadow-[var(--shadow-border)]">
            <button
              type="button"
              onClick={() => setViewMode("month")}
              className={cn(
                "flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                viewMode === "month"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted hover:text-fg",
              )}
            >
              <CalendarRange className="size-3.5" />
              Month
            </button>
            <button
              type="button"
              onClick={() => setViewMode("week")}
              className={cn(
                "flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                viewMode === "week"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted hover:text-fg",
              )}
            >
              <CalendarDays className="size-3.5" />
              Week
            </button>
          </div>

          {/* Month / Year Selector */}
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

          {/* Theme Selector */}
          <div className="flex items-center rounded-lg bg-surface px-2 shadow-[var(--shadow-border)]">
            <Palette className="mr-1.5 size-3.5 text-muted" />
            <NativeSelect
              className="h-8 w-[7.5rem] border-0 bg-transparent text-xs shadow-none"
              value={theme}
              onChange={(e) => setTheme(e.target.value as ThemeMode)}
            >
              {THEMES.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
            </NativeSelect>
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
          <Button size="sm" onClick={() => setNewOpen(true)} className="bg-primary hover:bg-primary/90">
            <Plus className="size-3.5" />
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
              title="تسجيل الخروج"
            >
              <LogOut className="size-4 text-rose-400" />
            </Button>
          )}
        </div>
      </header>

      {/* Main Grid: Today Panel + Matrix */}
      <div className="grid gap-4 lg:grid-cols-[20rem_minmax(0,1fr)]">
        <section className={cn("min-w-0", mobileTab !== "today" && "max-lg:hidden")}>
          <TodayPanel habits={habits} stats={stats} todayDate={today} />
        </section>
        <section className={cn("min-w-0", mobileTab !== "matrix" && "max-lg:hidden")}>
          <HabitMatrix
            habits={habits}
            days={activeDays}
            todayIso={isoDate(today)}
            hidePast={hidePast}
            daysInMonth={daysInMonth}
            selectedYear={selectedYear}
            selectedMonth={selectedMonth}
          />
        </section>
      </div>

      {/* Analytics, Audit, & Management Tabs */}
      <div className={cn("mt-8", mobileTab !== "stats" && "max-lg:hidden")}>
        <Tabs defaultValue="analytics">
          <TabsList>
            <TabsTrigger value="analytics">Analytics & ML</TabsTrigger>
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
                days={activeDays.map((d) => ({ iso: isoDate(d), label: format(d, "EEE d") }))}
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

      {/* Mobile Bottom Navigation */}
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-bg/95 px-2 pt-1 pb-[max(0.5rem,env(safe-area-inset-bottom))] lg:hidden backdrop-blur-md">
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
                "flex min-h-12 flex-col items-center justify-center gap-0.5 text-[0.7rem] font-medium transition-colors",
                mobileTab === id ? "text-primary" : "text-muted",
              )}
            >
              <Icon className="size-4" />
              {label}
            </button>
          ))}
        </div>
      </nav>

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
