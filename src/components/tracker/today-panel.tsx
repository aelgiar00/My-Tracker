import { useState, useMemo, useEffect } from "react";
import type { Habit, Stats } from "@/lib/tracker/types";
import { Card } from "@/components/ui/card";
import { format } from "date-fns";

function EmbeddedAICoach({ habits, todayDate }: { habits: Habit[]; todayDate: Date }) {
  const dateKey = format(todayDate, "yyyy-MM-dd");
  const dayOfWeek = todayDate.getDay(); // 0 = Sun, 2 = Tue, 5 = Fri, ...

  const [sleepHours, setSleepHours] = useState<number>(7);
  const [collegeHours, setCollegeHours] = useState<number>(4);
  const [workHours, setWorkHours] = useState<number>(3);
  const [showResult, setShowResult] = useState<boolean>(true);
  const [isMounted, setIsMounted] = useState<boolean>(false);

  // استرجاع الساعات المخزنة بأمان بعد تحميل المتصفح فقط
  useEffect(() => {
    setIsMounted(true);
    try {
      const savedSleep = localStorage.getItem(`tracker_sleep_${dateKey}`);
      const savedCollege = localStorage.getItem(`tracker_college_${dateKey}`);
      const savedWork = localStorage.getItem(`tracker_work_${dateKey}`);

      if (savedSleep) setSleepHours(Number(savedSleep));
      if (savedCollege) setCollegeHours(Number(savedCollege));
      if (savedWork) setWorkHours(Number(savedWork));
    } catch {
      // Ignore SSR errors
    }
  }, [dateKey]);

  // حفظ التعديلات في المتصفح
  useEffect(() => {
    if (!isMounted) return;
    try {
      localStorage.setItem(`tracker_sleep_${dateKey}`, String(sleepHours));
      localStorage.setItem(`tracker_college_${dateKey}`, String(collegeHours));
      localStorage.setItem(`tracker_work_${dateKey}`, String(workHours));
    } catch {
      // Ignore
    }
  }, [sleepHours, collegeHours, workHours, dateKey, isMounted]);

  const analysis = useMemo(() => {
    const totalCommitted = sleepHours + collegeHours + workHours;
    const freeHours = Math.max(0, 24 - totalCommitted);

    const sleepPenalty = Math.max(0, 7 - sleepHours) * 14;
    const fatiguePenalty = collegeHours * 4.5 + workHours * 5;
    const readiness = Math.max(15, Math.min(100, Math.round(100 - sleepPenalty - fatiguePenalty)));

    const myHabitsList = [
      { id: "1", name: "Pray", type: "daily", isCore: true },
      { id: "2", name: "Touch Typing", type: "daily", isCore: false },
      { id: "3", name: "Technical Depi 1", type: "weekly", scheduledDay: 2, isCore: true },
      { id: "4", name: "Technical Depi", type: "weekly", scheduledDay: 5, isCore: true },
      { id: "5", name: "Nti Notebooks", type: "daily", isCore: false },
      { id: "6", name: "Ml Learning", type: "daily", isCore: false },
    ];

    const habitForecasts = myHabitsList.map((h) => {
      const isScheduledToday = h.type === "daily" || h.scheduledDay === dayOfWeek;
      let prob = readiness;
      let note = "مجدولة اليوم";

      if (!isScheduledToday) {
        return {
          name: h.name,
          probability: 0,
          status: "يوم راحة / غير مجدولة",
          isScheduledToday: false,
          isCore: h.isCore,
          note: "راحة",
        };
      }

      if (h.name === "Pray") {
        prob = sleepHours >= 5 ? 98 : 88;
        note = "واجب أساسي";
      } else if (h.name.includes("Depi")) {
        prob = Math.max(20, Math.min(96, Math.round(readiness * 0.95 + (freeHours >= 4 ? 8 : -15))));
        note = "جلسة تقنية هامة";
      } else if (h.name.includes("Ml") || h.name.includes("Nti")) {
        prob = Math.max(15, Math.min(92, Math.round(readiness * 0.88 + (sleepHours >= 6 ? 10 : -18))));
        note = "مذاكرة وتطبيق";
      } else if (h.name === "Touch Typing") {
        prob = Math.max(35, Math.min(98, Math.round(readiness * 0.75 + 30)));
        note = "تمرين سريع";
      }

      return {
        name: h.name,
        probability: prob,
        status: prob >= 70 ? "آمن" : prob >= 45 ? "متوسط" : "معرض للتعثر",
        isScheduledToday: true,
        isCore: h.isCore,
        note,
      };
    });

    const todaysActiveHabits = habitForecasts.filter((h) => h.isScheduledToday);
    const nonNegotiables = todaysActiveHabits.filter((h) => h.isCore || h.probability >= 60);

    return {
      readiness,
      freeHours,
      habitForecasts,
      nonNegotiables,
      isHighPressure: readiness < 50 || freeHours < 4,
    };
  }, [sleepHours, collegeHours, workHours, dayOfWeek]);

  return (
    <div className="mb-6 rounded-2xl border-2 border-blue-500/30 bg-zinc-950 p-4 text-white shadow-xl">
      <div className="flex items-center justify-between border-b border-zinc-800 pb-3 mb-3">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-blue-500 animate-pulse" />
          <h3 className="font-bold text-sm text-blue-400">Personal AI Execution Coach</h3>
        </div>
        <span className="text-xs bg-blue-900/40 text-blue-300 px-2.5 py-0.5 rounded-full border border-blue-600/40 font-mono">
          جاهزية اليوم: {analysis.readiness}%
        </span>
      </div>

      <div className="grid grid-cols-3 gap-2 mb-3 text-xs">
        <div className="bg-zinc-900/90 p-2 rounded-lg border border-zinc-800">
          <label className="text-zinc-400 block mb-1">
            نوم: <span className="text-white font-bold">{sleepHours}س</span>
          </label>
          <input
            type="range"
            min="3"
            max="11"
            value={sleepHours}
            onChange={(e) => setSleepHours(Number(e.target.value))}
            className="w-full accent-blue-500 cursor-pointer"
          />
        </div>
        <div className="bg-zinc-900/90 p-2 rounded-lg border border-zinc-800">
          <label className="text-zinc-400 block mb-1">
            كلية: <span className="text-white font-bold">{collegeHours}س</span>
          </label>
          <input
            type="range"
            min="0"
            max="10"
            value={collegeHours}
            onChange={(e) => setCollegeHours(Number(e.target.value))}
            className="w-full accent-blue-500 cursor-pointer"
          />
        </div>
        <div className="bg-zinc-900/90 p-2 rounded-lg border border-zinc-800">
          <label className="text-zinc-400 block mb-1">
            شغل: <span className="text-white font-bold">{workHours}س</span>
          </label>
          <input
            type="range"
            min="0"
            max="10"
            value={workHours}
            onChange={(e) => setWorkHours(Number(e.target.value))}
            className="w-full accent-blue-500 cursor-pointer"
          />
        </div>
      </div>

      <div className="flex items-center justify-between text-[11px] text-zinc-400 mb-3 px-1">
        <span>
          الوقت المتاح الصافي: <strong className="text-white">{analysis.freeHours} ساعات</strong>
        </span>
        <button
          type="button"
          onClick={() => setShowResult(!showResult)}
          className="text-blue-400 hover:underline cursor-pointer"
        >
          {showResult ? "إخفاء التفاصيل" : "عرض خطة اليوم"}
        </button>
      </div>

      {showResult && (
        <div className="space-y-3 pt-2 border-t border-zinc-800 text-xs">
          <div className="rounded-xl bg-blue-950/30 border border-blue-800/40 p-2.5">
            <p className="text-[11px] font-semibold text-blue-300 mb-1">
              🎯 الحد الأدنى المطلوب اليوم (Non-Negotiable):
            </p>
            <ul className="list-disc list-inside space-y-0.5 text-zinc-300 text-[11px]">
              {analysis.nonNegotiables.map((item, i) => (
                <li key={i}>
                  <strong className="text-white">{item.name}</strong> ({item.note})
                </li>
              ))}
            </ul>
          </div>

          <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
            {analysis.habitForecasts.map((habit, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between bg-zinc-900/90 p-2 rounded-lg border border-zinc-800 text-[11px]"
              >
                <div className="flex flex-col">
                  <span className="text-zinc-200 font-medium">{habit.name}</span>
                  <span className="text-[10px] text-zinc-500">{habit.status}</span>
                </div>
                <span
                  className={`font-mono font-bold ${
                    !habit.isScheduledToday
                      ? "text-zinc-600"
                      : habit.probability >= 70
                      ? "text-emerald-400"
                      : habit.probability >= 45
                      ? "text-amber-400"
                      : "text-rose-400"
                  }`}
                >
                  {habit.isScheduledToday ? `${habit.probability}%` : "—"}
                </span>
              </div>
            ))}
          </div>

          <div className="text-[11px] bg-zinc-900 p-2.5 rounded-lg border border-zinc-800 text-zinc-300">
            {analysis.isHighPressure
              ? "⚡ يوم مضغوط: أنجز Pray والحد الأدنى من DEPI/NTI ولا تضغط نفسك في المهام الجانبية."
              : "🚀 يوم مثالي: طاقتك كافية لإكمال NTI Notebooks و ML ومتابعة جلسات DEPI بالكامل."}
          </div>
        </div>
      )}
    </div>
  );
}

interface TodayPanelProps {
  habits: Habit[];
  stats: Stats;
  todayDate: Date;
}

export function TodayPanel({ habits, stats, todayDate }: TodayPanelProps) {
  return (
    <div className="flex flex-col gap-4">
      <EmbeddedAICoach habits={habits} todayDate={todayDate} />

      <Card className="p-4 bg-surface shadow-[var(--shadow-border)]">
        <h2 className="font-display text-lg font-semibold tracking-tight">
          Today · {format(todayDate, "EEE, MMM d")}
        </h2>
        <p className="text-xs text-muted mt-1">
          {stats.completedThroughToday} of {stats.expectedThroughToday} habits completed today
        </p>
      </Card>
    </div>
  );
}
