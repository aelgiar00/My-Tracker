import { useState } from "react";
import type { Habit, Stats } from "@/lib/tracker/types";
import { Card } from "@/components/ui/card";
import { format } from "date-fns";

// 1. تضمين الـ AI Coach مباشرة داخل نفس الملف لضمان الرندر
function EmbeddedAICoach() {
  const [outsideHours, setOutsideHours] = useState(4);
  const [sleepHours, setSleepHours] = useState(7);
  const [showResult, setShowResult] = useState(false);

  const penalty = outsideHours * 7 + (sleepHours < 6 ? 20 : 0);
  const gymProb = Math.max(15, Math.min(95, 90 - penalty));
  const psProb = Math.max(20, Math.min(90, 85 - penalty * 0.8));
  const prayerProb = sleepHours >= 6 ? 95 : 80;

  return (
    <div className="mb-6 rounded-2xl border-2 border-blue-500/30 bg-zinc-950 p-4 text-white shadow-xl">
      <div className="flex items-center justify-between border-b border-zinc-800 pb-3 mb-3">
        <div className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-full bg-blue-500 animate-pulse" />
          <h3 className="font-bold text-sm text-blue-400">AI Coach & Readiness Predictor</h3>
        </div>
        <span className="text-xs bg-blue-900/50 text-blue-300 px-2 py-0.5 rounded border border-blue-700">
          Active ML
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-3 text-xs">
        <div>
          <label className="text-zinc-400 block mb-1">ساعات بالخارج: {outsideHours} س</label>
          <input
            type="range"
            min="0"
            max="12"
            value={outsideHours}
            onChange={(e) => setOutsideHours(Number(e.target.value))}
            className="w-full accent-blue-500 cursor-pointer"
          />
        </div>
        <div>
          <label className="text-zinc-400 block mb-1">ساعات النوم: {sleepHours} س</label>
          <input
            type="range"
            min="4"
            max="10"
            value={sleepHours}
            onChange={(e) => setSleepHours(Number(e.target.value))}
            className="w-full accent-blue-500 cursor-pointer"
          />
        </div>
      </div>

      <button
        onClick={() => setShowResult(!showResult)}
        className="w-full py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-xs font-semibold transition"
      >
        {showResult ? "إخفاء التحليل" : "توقع خطة اليوم بالـ AI"}
      </button>

      {showResult && (
        <div className="mt-3 pt-3 border-t border-zinc-800 space-y-2 text-xs">
          <div className="flex justify-between bg-zinc-900 p-2 rounded">
            <span>الصلوات في وقتها:</span>
            <span className="font-mono text-emerald-400">{prayerProb}%</span>
          </div>
          <div className="flex justify-between bg-zinc-900 p-2 rounded">
            <span>تمرين الجيم / الكارديو:</span>
            <span className="font-mono text-amber-400">{Math.round(gymProb)}%</span>
          </div>
          <div className="flex justify-between bg-zinc-900 p-2 rounded">
            <span>Codeforces / Solving:</span>
            <span className="font-mono text-blue-400">{Math.round(psProb)}%</span>
          </div>
          <p className="text-[11px] text-zinc-400 bg-zinc-900/50 p-2 rounded border border-zinc-800">
            {outsideHours >= 6
              ? "⚠️ ساعات المشاوير طويلة اليوم: أنجز مسائل الـ Problem Solving صباحاً واختصر الكارديو."
              : "✅ يوم متوازن لإنجاز كافة العادات والالتزام بالـ Streak."}
          </p>
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
      {/* ظهور المكون فوراً هنا */}
      <EmbeddedAICoach />

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
