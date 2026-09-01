import { useMemo, useState } from "react";
import { format } from "date-fns";
import { useTrackerStore } from "@/store/tracker-store";
import { isDayExpected, completionKey, scheduleForMonth } from "@/lib/tracker/schedule";
import { monthDays } from "@/lib/tracker/stats";
import { Button } from "@/components/ui/button";
import { Maximize2, Minimize2 } from "lucide-react";
import { cn } from "@/lib/utils";

export function AnalyticsPanel() {
  const [fullScreen, setFullScreen] = useState(false);
  const habits = useTrackerStore((s) => s.habits.filter((h) => !h.archived));
  const completions = useTrackerStore((s) => s.completions);
  const selectedYear = useTrackerStore((s) => s.selectedYear);
  const selectedMonth = useTrackerStore((s) => s.selectedMonth);
  const trackingStart = useTrackerStore((s) => s.trackingStart);

  const allMonthDays = useMemo(
    () => monthDays(selectedYear, selectedMonth, trackingStart),
    [selectedYear, selectedMonth, trackingStart]
  );

  const habitsBreakdown = useMemo(() => {
    return habits.map((habit) => {
      let expected = 0;
      let completed = 0;

      const schedule = scheduleForMonth(habit, selectedYear, selectedMonth) || habit.schedule;

      if (schedule && schedule.type === "monthlyTarget") {
        expected = schedule.targetDays;
        allMonthDays.forEach((date) => {
          const iso = format(date, "yyyy-MM-dd");
          if (completions[completionKey(habit.id, iso)]) completed++;
        });
      } else {
        allMonthDays.forEach((date) => {
          if (isDayExpected(schedule, date)) {
            expected++;
            const iso = format(date, "yyyy-MM-dd");
            if (completions[completionKey(habit.id, iso)]) completed++;
          }
        });
      }

      const rate = expected > 0 ? (completed / expected) * 100 : 0;
      return { habit, expected, completed, rate: Math.min(100, rate) };
    });
  }, [habits, completions, allMonthDays, selectedYear, selectedMonth]);

  const daysBreakdown = useMemo(() => {
    return allMonthDays.map((date) => {
      const iso = format(date, "yyyy-MM-dd");
      let expected = 0;
      let completed = 0;

      habits.forEach((habit) => {
        const schedule = scheduleForMonth(habit, selectedYear, selectedMonth) || habit.schedule;
        if (isDayExpected(schedule, date)) {
          expected++;
          if (completions[completionKey(habit.id, iso)]) completed++;
        }
      });

      return { iso, expected, completed };
    });
  }, [allMonthDays, habits, completions, selectedYear, selectedMonth]);

  const totalCompleted = habitsBreakdown.reduce((sum, h) => sum + h.completed, 0);
  const totalExpected = habitsBreakdown.reduce((sum, h) => sum + h.expected, 0);
  const paceScore = totalExpected > 0 ? Math.round((totalCompleted / totalExpected) * 100) : 0;

  // Radar Data - تكييف الأبعاد بناءً على وضع ملء الشاشة
  const radarData = useMemo(() => {
    const list = habitsBreakdown.slice(0, 6);
    const total = Math.max(3, list.length);
    
    // أبعاد ديناميكية: أكبر بكثير في وضع ملء الشاشة
    const viewBoxSize = fullScreen ? 400 : 220;
    const center = viewBoxSize / 2;
    const maxRadius = fullScreen ? 140 : 60;
    const labelRadius = fullScreen ? 175 : 85;

    const points = list.map((item, i) => {
      const angle = (Math.PI * 2 / total) * i - Math.PI / 2;
      const score = Math.max(0.15, Math.min(1, (item.rate || 10) / 100));

      const r = maxRadius * score;
      const x = center + r * Math.cos(angle);
      const y = center + r * Math.sin(angle);

      const labelX = center + labelRadius * Math.cos(angle);
      const labelY = center + labelRadius * Math.sin(angle);

      let textAnchor = "middle";
      if (Math.cos(angle) > 0.3) textAnchor = "start";
      else if (Math.cos(angle) < -0.3) textAnchor = "end";

      return {
        x,
        y,
        labelX,
        labelY,
        textAnchor,
        name: item.habit.name,
        rate: Math.round(item.rate),
      };
    });

    const webLevels = [0.33, 0.66, 1].map((level) => {
      return Array.from({ length: total }, (_, i) => {
        const angle = (Math.PI * 2 / total) * i - Math.PI / 2;
        const r = maxRadius * level;
        return `${center + r * Math.cos(angle)},${center + r * Math.sin(angle)}`;
      }).join(" ");
    });

    return {
      points,
      polygonPath: points.map((p) => `${p.x},${p.y}`).join(" "),
      webLevels,
      center,
      viewBoxSize,
    };
  }, [habitsBreakdown, fullScreen]); // إعادة الحساب عند تغيير fullScreen

  return (
    <div className={cn(
      "space-y-6 transition-all duration-300", 
      fullScreen && "fixed inset-0 z-50 overflow-y-auto bg-[var(--bg)] p-6 md:p-10 shadow-2xl border-t border-[var(--border)]"
    )}>
      {/* Top Controls */}
      <div className="flex items-center justify-between rounded-2xl bg-[var(--surface)] p-4 border border-[var(--border)] sticky top-0 z-20 shadow-sm">
        <div>
          <h3 className="text-xs font-semibold text-[var(--fg)]">Chart View</h3>
          <p className="text-[11px] text-[var(--muted)]">
            Performance analytics and completion trajectory.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setFullScreen(!fullScreen)}
          className="h-8 rounded-xl border-[var(--border)] bg-[var(--surface-elevated)] px-3 text-xs text-[var(--fg)] hover:border-[var(--primary)]/50 cursor-pointer"
        >
          {fullScreen ? <Minimize2 className="mr-1.5 size-3.5" /> : <Maximize2 className="mr-1.5 size-3.5" />}
          {fullScreen ? "Exit Full-Screen" : "Full-Screen Charts"}
        </Button>
      </div>

      {/* 4 KPI Cards - نخفيها في وضع ملء الشاشة للتركيز على التشارتس */}
      {!fullScreen && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-lg hover:shadow-var(--primary)/10 transition-shadow">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold tracking-wider text-[var(--muted)] uppercase">Pace</span>
              <div className="flex size-14 items-center justify-center rounded-full border-2 border-[var(--primary)] bg-[var(--primary-muted)] text-base font-bold text-[var(--fg)] font-serif-title shadow-inner">
                {paceScore}%
              </div>
            </div>
            <p className="mt-3 text-xs text-[var(--muted)]">Current monthly velocity</p>
          </div>

          <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-lg hover:shadow-var(--primary)/10 transition-shadow">
            <span className="text-[11px] font-semibold tracking-wider text-[var(--muted)] uppercase">To Target Date</span>
            <p className="mt-2 font-serif-title text-3xl font-normal text-[var(--fg)]">
              {totalCompleted}/{totalExpected}
            </p>
            <p className="mt-1 text-xs text-[var(--muted)]">Completed vs scheduled</p>
          </div>

          <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-lg hover:shadow-var(--primary)/10 transition-shadow">
            <span className="text-[11px] font-semibold tracking-wider text-[var(--muted)] uppercase">Tracked Habits</span>
            <p className="mt-2 font-serif-title text-3xl font-normal text-[var(--fg)]">
              {habits.length}
            </p>
            <p className="mt-1 text-xs text-[var(--muted)]">Active rows in matrix</p>
          </div>

          <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-lg hover:shadow-var(--primary)/10 transition-shadow">
            <span className="text-[11px] font-semibold tracking-wider text-[var(--muted)] uppercase">Perfect Streak</span>
            <p className="mt-2 font-serif-title text-3xl font-normal text-[var(--fg)]">
              {totalCompleted > 0 ? "1" : "0"}
            </p>
            <p className="mt-1 text-xs text-[var(--muted)]">Consecutive 100% days</p>
          </div>
        </div>
      )}

      {/* Charts Grid - التعديل الجوهري هنا */}
      <div className={cn(
        "grid gap-6 transition-all duration-300",
        fullScreen ? "grid-cols-1" : "lg:grid-cols-3" // عمود واحد في الفول سكرين، 3 في العادي
      )}>
        
        {/* 1. Daily Execution Bar Chart */}
        <div className={cn("rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-lg transition-all", fullScreen && "p-8 md:p-10")}>
          <h3 className={cn("text-xs font-semibold text-[var(--fg)]", fullScreen && "text-sm")}>Daily execution</h3>
          
          {/* زيادة الارتفاع بشكل كبير في وضع ملء الشاشة */}
          <div className={cn("mt-6 flex h-48 gap-2", fullScreen && "h-[60vh] gap-4")}>
            <div className={cn("flex flex-col justify-between text-[9px] font-mono text-[var(--muted)] pr-1 select-none text-right", fullScreen && "text-xs pr-3")}>
              <span>100%</span>
              <span>80%</span>
              <span>60%</span>
              <span>40%</span>
              <span>20%</span>
              <span>0%</span>
            </div>

            <div className="relative flex flex-1 flex-col justify-between">
              {/* Grid Lines */}
              <div className="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-10">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="border-b border-[var(--border)] w-full"></div>
                ))}
              </div>

              {/* Bars */}
              <div className="flex flex-1 items-end justify-between gap-1 z-10 border-b border-[var(--border)] pb-0.5 relative">
                {/* Current Time Indicator في وضع ملء الشاشة */}
                {fullScreen && <div className="absolute left-0 right-0 h-px bg-[var(--primary)] opacity-40 top-0" style={{top: `${100 - paceScore}%`}} title={`Pace: ${paceScore}%`}></div>}
                
                {/* عرض آخر 14 يوم في العادي، وآخر 30 يوم في الفول سكرين */}
                {daysBreakdown.slice(fullScreen ? -30 : -14).map((d) => {
                  const pct = d.expected > 0 ? (d.completed / d.expected) * 100 : 0;
                  return (
                    <div key={d.iso} className="flex flex-1 flex-col items-center justify-end h-full group">
                      <div
                        className={cn(
                          "w-full max-w-[12px] rounded-t bg-[var(--primary)] transition-all hover:opacity-80 cursor-pointer relative",
                          fullScreen && "max-w-[24px] rounded-t-md", // قضبان أعرض في الفول سكرين
                          pct === 100 && "bg-emerald-500", // لون مختلف للكمال
                          pct === 0 && d.expected > 0 && "bg-rose-500/60" // لون مختلف للصفر
                        )}
                        style={{ height: `${Math.max(2, pct)}%` }} // حد أدنى للارتفاع للرؤية
                      >
                        {/* Tooltip محسن في وضع ملء الشاشة */}
                        <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 min-w-max rounded-md bg-[var(--fg)] p-2 text-[10px] text-[var(--bg)] opacity-0 group-hover:opacity-100 transition-opacity z-30 pointer-events-none shadow-xl font-mono">
                          {format(new Date(d.iso), "eee, MMM d")}<br/>
                          <span className="font-bold text-base">{Math.round(pct)}%</span><br/>
                          ({d.completed}/{d.expected} habits)
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* X-Axis Labels */}
              <div className="flex justify-between gap-1 pt-1 z-10">
                {daysBreakdown.slice(fullScreen ? -30 : -14).map((d) => (
                  <span key={d.iso} className={cn("flex-1 text-center text-[9px] font-mono text-[var(--muted)]", fullScreen && "text-[11px]")}>
                    {d.iso.slice(8)}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* 2. Habit Completion Bars */}
        <div className={cn("rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-lg transition-all", fullScreen && "p-8 md:p-10")}>
          <h3 className={cn("text-xs font-semibold text-[var(--fg)]", fullScreen && "text-sm mb-6")}>Habit completion</h3>
          {/* زيادة الارتفاع الأقصى وجعل الشبكة تتكيف في ملء الشاشة */}
          <div className={cn(
            "mt-5 space-y-3 max-h-48 overflow-y-auto pr-1 flex-1", 
            fullScreen && "max-h-none space-y-5 mt-0 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-5" // تقسيم لعمودين في الشاشات الواسعة للفول سكرين
          )}>
            {habitsBreakdown.map((item) => {
              const pct = Math.round(item.rate);
              return (
                <div key={item.habit.id} className={cn("space-y-1", fullScreen && "space-y-2 mt-0")}>
                  <div className={cn("flex justify-between text-xs", fullScreen && "text-sm")}>
                    <span className="text-[var(--fg)] font-medium truncate max-w-[130px] md:max-w-[200px]">{item.habit.name}</span>
                    <span className="text-[var(--muted)] font-mono">{pct}%</span>
                  </div>
                  <div className={cn("h-2 w-full overflow-hidden rounded-full bg-[var(--surface-elevated)]", fullScreen && "h-3")}>
                    <div 
                      className={cn(
                        "h-full rounded-full bg-[var(--primary)] transition-all duration-500",
                        pct === 100 && "bg-emerald-500"
                      )} 
                      style={{ width: `${pct}%` }} 
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 3. Mastery Radar */}
        <div className={cn(
          "rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-lg flex flex-col transition-all",
          fullScreen ? "p-8 md:p-10" : "justify-between"
        )}>
          <div className="flex items-center justify-between mb-4">
            <h3 className={cn("text-xs font-semibold text-[var(--fg)]", fullScreen && "text-sm")}>Mastery radar</h3>
            <span className="text-[10px] text-[var(--muted)]">Top 6 Habits Coverage</span>
          </div>

          <div className={cn(
            "relative my-auto flex items-center justify-center py-2 flex-1",
            fullScreen && "h-[70vh]" // جعل الرادار ضخماً في وضع ملء الشاشة
          )}>
            <svg 
              viewBox={`0 0 ${radarData.viewBoxSize} ${radarData.viewBoxSize}`} 
              className={cn("size-52 overflow-visible transition-all duration-300", fullScreen && "size-[90%]")}
            >
              {/* Web Levels */}
              {radarData.webLevels.map((poly, idx) => (
                <polygon
                  key={idx}
                  points={poly}
                  fill="none"
                  stroke="currentColor"
                  className="text-[var(--border)] opacity-60"
                  strokeWidth="1"
                />
              ))}

              {/* Axis Lines */}
              {radarData.points.map((p, idx) => (
                <line
                  key={idx}
                  x1={radarData.center}
                  y1={radarData.center}
                  x2={p.x}
                  y2={p.y}
                  stroke="currentColor"
                  className="text-[var(--border)] opacity-40"
                  strokeWidth="1"
                />
              ))}

              {/* Data Polygon */}
              {radarData.points.length >= 3 && (
                <polygon
                  points={radarData.polygonPath}
                  fill="var(--primary-muted)"
                  stroke="var(--primary)"
                  strokeWidth={fullScreen ? "2.5" : "1.8"}
                  className="transition-all duration-500"
                />
              )}

              {/* Data Points */}
              {radarData.points.map((p, idx) => (
                <circle
                  key={idx}
                  cx={p.x}
                  cy={p.y}
                  r={fullScreen ? "4.5" : "3"}
                  fill="var(--primary)"
                  className="transition-all duration-500"
                />
              ))}

              {/* Labels - تكبير الخط وتحسين التموضع في وضع ملء الشاشة */}
              {radarData.points.map((p, idx) => (
                <text
                  key={idx}
                  x={p.labelX}
                  y={p.labelY}
                  textAnchor={p.textAnchor}
                  dominantBaseline="central"
                  className={cn(
                    "fill-[var(--fg)] text-[9.5px] font-medium select-none transition-all duration-300",
                    fullScreen && "text-[14px] font-semibold" // خط أكبر وأوضح
                  )}
                >
                  {fullScreen ? p.name : (p.name.length > 11 ? `${p.name.slice(0, 10)}..` : p.name)}
                </text>
              ))}
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AnalyticsPanel;
