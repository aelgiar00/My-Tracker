import { useMemo, useState } from "react";
import { format, subDays } from "date-fns";
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { Habit } from "@/lib/tracker/types";
import { Button } from "@/components/ui/button";

export interface HabitMasteryRadarProps {
  habits: Habit[];
  logs: Record<string, { done: boolean } | boolean>;
  restExceptions?: Record<string, boolean>;
  timeWindow?: number; // e.g. 30, 45, 60
}

interface RadarDataPoint {
  subject: string;
  score: number;
  fullMark: number;
}

export function HabitMasteryRadar({
  habits,
  logs,
  restExceptions = {},
  timeWindow = 30,
}: HabitMasteryRadarProps) {
  const [scoringMode, setScoringMode] = useState<"percentage" | "raw">("percentage");
  const [selectedWindow, setSelectedWindow] = useState<number>(timeWindow);

  // الخوارزمية الدقيقة لتحويل البيانات وحساب Mastery Score
  const radarData: RadarDataPoint[] = useMemo(() => {
    const today = new Date();
    const activeHabits = habits.filter((h) => !h.archived);

    // تجهيز قائمة تواريخ النافذة الزمنية المحددة N
    const dateStrings: string[] = [];
    for (let i = 0; i < selectedWindow; i++) {
      const d = subDays(today, i);
      dateStrings.push(format(d, "yyyy-MM-dd"));
    }

    const N = selectedWindow;

    return activeHabits.map((habit) => {
      let E = 0; // استثناءات الراحة
      let C = 0; // مرات الإنجاز

      dateStrings.forEach((dateStr) => {
        // مفتاح السجل: habitId_YYYY-MM-DD
        const logKey = `${habit.id}_${dateStr}`;

        // فحص يوم الراحة / الاستثناء
        if (restExceptions[logKey]) {
          E++;
        }

        // فحص الإنجاز
        const entry = logs[logKey];
        const isDone = typeof entry === "boolean" ? entry : entry?.done;
        if (isDone) {
          C++;
        }
      });

      let calculatedScore = 0;
      let maxMark = 100;

      if (scoringMode === "raw") {
        calculatedScore = C;
        maxMark = Math.max(1, N - E);
      } else {
        const eligibleDays = N - E;
        calculatedScore = eligibleDays > 0 ? Math.round((C / eligibleDays) * 100) : 0;
        maxMark = 100;
      }

      return {
        subject: habit.name,
        score: calculatedScore,
        fullMark: maxMark,
      };
    });
  }, [habits, logs, restExceptions, selectedWindow, scoringMode]);

  return (
    <div className="w-full rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-xl flex flex-col justify-between">
      {/* التحكم في الحساب وزمن النافذة */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] pb-4 mb-4">
        <div>
          <h3 className="font-serif-title text-xl text-[var(--fg)]">Habit Mastery Radar</h3>
          <p className="text-xs text-[var(--muted)]">
            Algorithmic score over the past {selectedWindow} days
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* تبديل النافذة الزمنية */}
          <div className="flex rounded-xl bg-[var(--surface-elevated)] p-1 border border-[var(--border)]">
            {[30, 45, 60].map((w) => (
              <button
                key={w}
                type="button"
                onClick={() => setSelectedWindow(w)}
                className={`rounded-lg px-2.5 py-1 text-[11px] font-mono transition-all ${
                  selectedWindow === w
                    ? "bg-[var(--primary)] text-[var(--primary-foreground)] font-bold shadow-xs"
                    : "text-[var(--muted)] hover:text-[var(--fg)]"
                }`}
              >
                {w}d
              </button>
            ))}
          </div>

          {/* تبديل طريقة الحساب: Raw أو Percentage */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setScoringMode(scoringMode === "percentage" ? "raw" : "percentage")}
            className="h-8 rounded-xl border-[var(--border)] bg-[var(--surface-elevated)] text-[11px] text-[var(--fg)] hover:border-[var(--primary)]"
          >
            {scoringMode === "percentage" ? "Mode: Percentage (%)" : "Mode: Raw Count"}
          </Button>
        </div>
      </div>

      {/* رسم الرادار باستخدام Recharts */}
      <div className="w-full h-80 sm:h-96 min-h-[320px] flex items-center justify-center">
        {radarData.length === 0 ? (
          <p className="text-xs text-[var(--muted)]">No habits available to graph.</p>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart cx="50%" cy="50%" outerRadius="75%" data={radarData}>
              <PolarGrid stroke="var(--border)" strokeOpacity={0.5} />
              <PolarAngleAxis
                dataKey="subject"
                tick={{ fill: "var(--fg)", fontSize: 11, fontFamily: "inherit" }}
              />
              <PolarRadiusAxis
                angle={30}
                domain={[0, scoringMode === "percentage" ? 100 : selectedWindow]}
                stroke="var(--muted)"
                strokeOpacity={0.4}
                tick={{ fill: "var(--muted)", fontSize: 9 }}
              />
              <Radar
                name="Mastery Score"
                dataKey="score"
                stroke="var(--primary)"
                fill="#4F2683"
                fillOpacity={0.6}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "var(--surface-elevated)",
                  borderColor: "var(--border)",
                  borderRadius: "1rem",
                  color: "var(--fg)",
                  fontSize: "12px",
                }}
                formatter={(value: any) => [
                  `${value}${scoringMode === "percentage" ? "%" : " times"}`,
                  "Score",
                ]}
              />
            </RadarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}

export default HabitMasteryRadar;
