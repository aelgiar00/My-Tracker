import { useEffect, useMemo, useState } from "react";
import { format, startOfWeek, addDays, parseISO } from "date-fns";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Plus,
  Settings,
  Undo2,
  Check,
  X,
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
import { isoDate, completionKey, isDayExpected, scheduleForMonth } from "@/lib/tracker/schedule";
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

  const [selectedInspectDate, setSelectedInspectDate] = useState(() => format(new Date(), "yyyy-MM-dd"));
  const [newCustomTask, setNewCustomTask] = useState("");

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
  const toggleCompletion = useTrackerStore((s) => s.toggleCompletion);
  const addTask = useTrackerStore((s) => s.addTask);
  const toggleTask = useTrackerStore((s) => s.toggleTask);
  const deleteTask = useTrackerStore((s) => s.deleteTask);
  const markAllToday = useTrackerStore((s) => s.markAllToday);
  const importSnapshot = useTrackerStore((s) => s.importSnapshot);
  const resetToSeed = useTrackerStore((s) => s.resetToSeed);
  const restDays = useTrackerStore((s) => s.restDays || {});

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

  const inspectDateObj = parseISO(selectedInspectDate);
  
  const activeHabitsForDay = useMemo(() => {
    return habits
      .filter((h) => !h.archived)
      .filter((h) => {
        const sched = scheduleForMonth(h, inspectDateObj.getFullYear(), inspectDateObj.getMonth() + 1) || h.schedule;
        const isRest = restDays[`${h.id}_${selectedInspectDate}`];
        return isDayExpected(sched, inspectDateObj) && !isRest;
      });
  }, [habits, inspectDateObj, restDays, selectedInspectDate]);

  const currentDayTasks = dailyTasks[selectedInspectDate] || [];
  
  const inspectDayDoneCount = activeHabitsForDay.filter(
    (h) => Boolean(completions[completionKey(h.id, selectedInspectDate)])
  ).length;
  
  const completedTasksCount = currentDayTasks.filter((t) => t.done).length;

  const totalDailyItems = activeHabitsForDay.length + currentDayTasks.length;
  const totalDailyCompleted = inspectDayDoneCount + completedTasksCount;

  const inspectDayScore = totalDailyItems > 0
    ? Math.round((totalDailyCompleted / totalDailyItems) * 100)
    : 0;

  const restingHabitsForDay = habits
    .filter((h) => !h.archived)
    .filter((h) => {
      const sched = scheduleForMonth(h, inspectDateObj.getFullYear(), inspectDateObj.getMonth() + 1) || h.schedule;
      const isRest = restDays[`${h.id}_${selectedInspectDate}`];
      return (!isDayExpected(sched, inspectDateObj) || isRest);
    });

  if (loadingAuth) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--bg)] text-[var(--muted)]">
        Loading Tracker...
      </div>
    );
  }

  return (
    <div className="mx-auto min-h-screen max-w-7xl px-4 py-8 sm:px-6 font-sans">
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
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          {/* Inline SVG Logo تماماً زي الصورة الأصلية */}
          <div className="flex items-center bg-[var(--surface)] p-2.5 rounded-2xl border border-[var(--border)] shadow-md">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 520 160" className="h-10 sm:h-12 w-auto">
              {/* Checkbox Icon */}
              <g transform="translate(10, 45)">
                <rect x="0" y="0" width="22" height="22" rx="4" fill="none" stroke="#b794f4" stroke-width="3.5"/>
                <path d="M 5 11 L 9 15 L 17 7" fill="none" stroke="#b794f4" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>
              </g>
              {/* MyTracker Text */}
              <text x="42" y="65" style={{ fontFamily: "inherit", fontWeight: 800, fontSize: "64px", fill: "#b794f4" }}>
                My<tspan style={{ fontWeight: 700, fill: "var(--fg)" }}>Tracker</tspan>
              </text>
              {/* Accent slash */}
              <polygon points="340,15 358,3 365,15 348,27" fill="#b794f4" />
              {/* Slogan */}
              <text x="140" y="95" style={{ fontFamily: "inherit", fontWeight: 400, fontSize: "14px", fill: "var(--muted)", letterSpacing: "0.5px" }}>
                Track it <tspan style={{ fill: "#b794f4", fontWeight: 700 }}>-</tspan> Build it <tspan style={{ fill: "#b794f4", fontWeight: 700 }}>-</tspan> Achieve it
              </text>
            </svg>
          </div>

          <div>
            <p className="text-[11px] font-semibold tracking-[0.25em] text-[var(--muted)] uppercase">
              EXECUTION LOG
            </p>
            <h1 className="font-serif-title mt-0.5 text-3xl sm:text-4xl font-normal tracking-tight text-[var(--fg)]">
              {MONTHS[selectedMonth - 1]} {selectedYear}
            </h1>
            <p className="text-xs text-[var(--muted)]">
              Pace {Math.round(stats.paceScore)}% through today · {stats.currentStreak} day streak ·{" "}
              {stats.completedThroughToday}/{stats.expectedThroughToday} scheduled
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex h-10 items-center rounded-xl bg-[var(--surface)] p-1 border border-[var(--border)]">
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => shiftMonth(-1)}
              className="h-8 w-8 text-[var(--muted)] hover:text-[var(--fg)] cursor-pointer"
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
              className="h-8 w-8 text-[var(--muted)] hover:text-[var(--fg)] cursor-pointer"
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setMonth(today.getFullYear(), today.getMonth() + 1);
              setSelectedInspectDate(format(today, "yyyy-MM-dd"));
            }}
            className="h-10 rounded-xl border border-[var(--primary)]/30 bg-[var(--surface)] px-3.5 text-xs text-[var(--fg)] hover:border-[var(--primary)] cursor-pointer"
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
            className="h-10 w-10 rounded-xl border-[var(--border)] bg-[var(--surface)] text-[var(--fg)] cursor-pointer"
          >
            <Undo2 className="size-4" />
          </Button>
          <Button
            variant="outline"
            size="icon-sm"
            onClick={() => setSettingsOpen(true)}
            className="h-10 w-10 rounded-xl border-[var(--border)] bg-[var(--surface)] text-[var(--fg)] cursor-pointer"
          >
            <Settings className="size-4" />
          </Button>
          <Button
            size="sm"
            onClick={() => setNewOpen(true)}
            className="h-10 rounded-xl bg-[var(--surface-elevated)] px-4 text-xs font-semibold text-[var(--fg)] border border-[var(--border)] hover:border-[var(--primary)]/50 cursor-pointer"
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
              className="h-10 w-10 rounded-xl hover:bg-rose-500/10 text-rose-400 cursor-pointer"
            >
              <LogOut className="size-4" />
            </Button>
          )}
        </div>
      </header>

      {/* Main Single Switcher Tab */}
      <div className="mb-6">
        <div className="grid grid-cols-3 rounded-2xl bg-[var(--surface)] p-1.5 border border-[var(--border)]">
          {(["daily", "matrix", "stats"] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setMainTab(tab)}
              className={cn(
                "flex items-center justify-center rounded-xl py-2.5 text-xs font-medium capitalize transition-all duration-200 cursor-pointer",
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
        {/* Daily View */}
        {mainTab === "daily" && (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[22rem_minmax(0,1fr)]">
            <section className="min-w-0">
              <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-xl">
                <TodayPanel habits={habits} stats={stats} todayDate={today} />
              </div>
            </section>

            <section className="min-w-0">
              <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-xl space-y-6">
                
                {/* Week Day Header Navigation */}
                <div className="grid grid-cols-7 gap-2 pb-5 border-b border-[var(--border)]">
                  {weekDaysList.map((d) => {
                    const dIso = format(d, "yyyy-MM-dd");
                    const isSelected = dIso === selectedInspectDate;
                    return (
                      <button
                        key={dIso}
                        type="button"
                        onClick={() => setSelectedInspectDate(dIso)}
                        className={cn(
                          "flex flex-col items-center justify-center rounded-2xl py-3 border transition-all cursor-pointer relative",
                          isSelected
                            ? "border-[var(--primary)] bg-[var(--surface-elevated)] text-[var(--fg)] font-semibold shadow-xs"
                            : "border-[var(--border)] bg-[var(--surface-elevated)]/50 text-[var(--muted)] hover:text-[var(--fg)]"
                        )}
                      >
                        <span className="text-[10px] uppercase font-mono tracking-wider">{format(d, "EEE").slice(0, 2)}</span>
                        <span className="text-sm font-bold mt-0.5">{format(d, "d")}</span>
                        {isSelected && (
                          <span className="absolute bottom-1.5 w-5 h-0.5 rounded-full bg-[var(--primary)]" />
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* EXCLUSIVE ENLARGED DAILY PROGRESS GAUGE */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-6 bg-[var(--surface-elevated)]/20 p-6 rounded-3xl border border-[var(--border)]">
                  <div className="text-center sm:text-left flex-1">
                    <span className="text-[11px] font-bold text-[var(--muted)] uppercase tracking-[0.2em]">
                      {selectedInspectDate === format(today, "yyyy-MM-dd") ? "TODAY" : "SELECTED DAY"}
                    </span>
                    <h3 className="font-serif-title text-4xl sm:text-5xl font-normal text-[var(--fg)] mt-1">
                      {format(inspectDateObj, "d EEE")}
                    </h3>
                    <p className="text-sm text-[var(--muted)] mt-2 max-w-sm">
                      {totalDailyCompleted === totalDailyItems && totalDailyItems > 0
                        ? "All scheduled habits and tasks completed! Outstanding."
                        : `${totalDailyItems - totalDailyCompleted} items remaining to check off.`}
                    </p>
                  </div>

                  <div className="relative flex size-36 sm:size-40 items-center justify-center select-none shrink-0">
                    <svg className="size-full -rotate-90 p-2" viewBox="0 0 120 120">
                      <circle
                        cx="60"
                        cy="60"
                        r="50"
                        stroke="currentColor"
                        className="text-[var(--surface-pill)] opacity-40"
                        strokeWidth="8"
                        fill="none"
                      />
                      {inspectDayScore > 0 && (
                        <circle
                          cx="60"
                          cy="60"
                          r="50"
                          stroke="var(--primary)"
                          strokeWidth="8"
                          strokeDasharray={2 * Math.PI * 50}
                          strokeDashoffset={2 * Math.PI * 50 * (1 - inspectDayScore / 100)}
                          strokeLinecap="round"
                          fill="none"
                          style={{ filter: "drop-shadow(0 0 8px var(--glow))" }}
                        />
                      )}
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none mt-1">
                      <span
                        className="text-4xl sm:text-5xl font-normal text-[var(--fg)] tracking-tight leading-none"
                        style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                      >
                        {inspectDayScore}%
                      </span>
                      <span className="text-[10px] sm:text-xs font-semibold font-mono tracking-[0.25em] text-[var(--muted)] uppercase mt-2 leading-none">
                        DAILY
                      </span>
                    </div>
                  </div>
                </div>

                {/* Scheduled Habits Cards */}
                <div className="space-y-2.5">
                  {activeHabitsForDay.length === 0 ? (
                    <p className="text-xs text-[var(--muted)] py-4 text-center">No habits scheduled on this day.</p>
                  ) : (
                    activeHabitsForDay.map((h) => {
                      const isDone = Boolean(completions[completionKey(h.id, selectedInspectDate)]);
                      return (
                        <div
                          key={h.id}
                          onClick={() => toggleCompletion(h.id, selectedInspectDate)}
                          className={cn(
                            "flex items-center justify-between rounded-2xl p-4 border transition-all cursor-pointer",
                            isDone
                              ? "border-[var(--primary)]/40 bg-[var(--primary-muted)]/20 shadow-xs"
                              : "border-[var(--border)] bg-[var(--surface-elevated)] hover:border-[var(--muted)]"
                          )}
                        >
                          <div className="flex items-center gap-3.5">
                            <div
                              className={cn(
                                "flex size-5 items-center justify-center rounded-lg border transition-colors",
                                isDone
                                  ? "border-[var(--primary)] bg-[var(--primary)] text-[var(--primary-foreground)]"
                                  : "border-[var(--border)] bg-transparent"
                              )}
                            >
                              {isDone && <Check className="size-3.5 stroke-[3]" />}
                            </div>
                            <div>
                              <p className={cn("text-xs font-semibold text-[var(--fg)]", isDone && "line-through opacity-70")}>
                                {h.name}
                              </p>
                              <span className="text-[10px] text-[var(--muted)] capitalize">
                                {h.schedule.type === "preset" ? h.schedule.id : "Scheduled"}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* One-off Tasks Section */}
                <div className="pt-4 border-t border-[var(--border)] space-y-3">
                  <span className="text-[10px] font-semibold text-[var(--muted)] uppercase tracking-wider block">
                    ONE-OFF TASKS
                  </span>

                  {currentDayTasks.map((task) => (
                    <div
                      key={task.id}
                      className="flex items-center justify-between rounded-xl bg-[var(--surface-elevated)] p-3 border border-[var(--border)]"
                    >
                      <div
                        onClick={() => toggleTask(selectedInspectDate, task.id)}
                        className="flex items-center gap-3 cursor-pointer flex-1"
                      >
                        <div
                          className={cn(
                            "flex size-4 items-center justify-center rounded-md border",
                            task.done ? "border-[var(--primary)] bg-[var(--primary)] text-[var(--primary-foreground)]" : "border-[var(--border)]"
                          )}
                        >
                          {task.done && <Check className="size-3 stroke-[3]" />}
                        </div>
                        <span className={cn("text-xs text-[var(--fg)]", task.done && "line-through text-[var(--muted)]")}>
                          {task.name}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => deleteTask(selectedInspectDate, task.id)}
                        className="text-[var(--muted)] hover:text-rose-400 p-1 cursor-pointer"
                      >
                        <X className="size-3.5" />
                      </button>
                    </div>
                  ))}

                  {/* Add Task Input */}
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Add a task for this day..."
                      value={newCustomTask}
                      onChange={(e) => setNewCustomTask(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && newCustomTask.trim()) {
                          addTask(selectedInspectDate, newCustomTask.trim());
                          setNewCustomTask("");
                        }
                      }}
                      className="h-10 flex-1 rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] px-3 text-xs text-[var(--fg)] placeholder:text-[var(--muted)]/50 focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
                    />
                    <Button
                      type="button"
                      onClick={() => {
                        if (newCustomTask.trim()) {
                          addTask(selectedInspectDate, newCustomTask.trim());
                          setNewCustomTask("");
                        }
                      }}
                      className="h-10 rounded-xl bg-[var(--surface-elevated)] border border-[var(--border)] px-4 text-xs font-semibold text-[var(--fg)] hover:border-[var(--primary)] cursor-pointer"
                    >
                      <Plus className="size-4" />
                    </Button>
                  </div>

                  {/* Rest Section */}
                  {restingHabitsForDay.length > 0 && (
                    <div className="pt-2 space-y-1 text-xs text-[var(--muted)]">
                      <span className="text-[10px] font-semibold uppercase tracking-wider block mb-1.5">REST</span>
                      {restingHabitsForDay.map((h) => (
                        <div key={h.id} className="flex justify-between py-1 border-b border-[var(--border)]/40 last:border-0">
                          <span>{h.name}</span>
                          <span className="font-mono text-[10px] capitalize">
                            {h.schedule.type === "preset" ? h.schedule.id : "Scheduled"}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  <Button
                    type="button"
                    onClick={() => {
                      markAllToday(selectedInspectDate, true);
                      toast.success("Completed all habits for this day!");
                    }}
                    className="mt-4 h-11 w-full rounded-2xl bg-[var(--primary)] text-xs font-semibold text-[var(--primary-foreground)] hover:opacity-90 cursor-pointer"
                  >
                    Complete this day
                  </Button>
                </div>
              </div>
            </section>
          </div>
        )}

        {/* Matrix View Tab */}
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

        {/* Stats View Tab */}
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
                    "rounded-xl px-4 py-2 text-xs font-medium transition-all duration-150 border cursor-pointer",
                    statsSubTab === id
                      ? "border-[var(--primary)] bg-[var(--surface)] text-[var(--fg)] shadow-sm font-semibold ring-1 ring-[var(--primary)]/30"
                      : "border-[var(--border)] bg-[var(--surface)] text-[var(--muted)] hover:text-[var(--fg)]"
                  )}
                >
                  {label}
                </button>
              ))}
            </div>

            {statsSubTab === "analytics" && <AnalyticsPanel />}
            {statsSubTab === "audit" && <AuditPanel habits={habits} stats={stats} />}
            {statsSubTab === "ml" && <MlPanel habits={habits} completions={completions} />}
            {statsSubTag === "manage" && (
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
