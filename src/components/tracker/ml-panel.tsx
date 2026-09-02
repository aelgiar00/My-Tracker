import { useState, useEffect } from "react";
import { format } from "date-fns";
import { useTrackerStore } from "@/store/tracker-store";
import { scheduleForMonth } from "@/lib/tracker/schedule";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "./native-select";
import { Brain, Sparkles, ChevronDown, ChevronUp, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface MLPanelProps {
  habits: any[];
  completions: Record<string, boolean>;
}

export function MlPanel({ habits }: MLPanelProps) {
  const [modelType, setModelType] = useState("Random Forest");
  const [threshold, setThreshold] = useState(70);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>(null);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  const selectedYear = useTrackerStore((s) => s.selectedYear);
  const selectedMonth = useTrackerStore((s) => s.selectedMonth);
  const trackingStart = useTrackerStore((s) => s.trackingStart);
  const restDays = useTrackerStore((s) => s.restDays || {});
  const completions = useTrackerStore((s) => s.completions);

  const todayStr = format(new Date(), "yyyy-MM-dd");

  const fetchInsights = async () => {
    setLoading(true);
    try {
      const records: any[] = [];
      habits.forEach((h) => {
        if (h.archived) return;
        const sched = scheduleForMonth(h, selectedYear, selectedMonth) || h.schedule;
        
        for (let d = 1; d <= 31; d++) {
          const dt = new Date(selectedYear, selectedMonth - 1, d);
          if (dt.getMonth() !== selectedMonth - 1) break;
          const iso = format(dt, "yyyy-MM-dd");

          const isScheduled = sched ? (sched.type === "preset" || sched.type === "weekly" ? true : true) : true;
          const isRest = restDays[`${h.id}_${iso}`];
          const completed = Boolean(completions[`${h.id}_${iso}`]);

          records.push({
            date: iso,
            habitId: h.id,
            habitName: h.name,
            scheduled: !isRest && isScheduled,
            completed: completed,
          });
        }
      });

      const res = await fetch("http://127.0.0.1:8080/api/ml-insights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetDate: todayStr,
          trackingStart,
          records,
          modelType,
          threshold,
        }),
      });

      const json = await res.json();
      if (json.status === "success") {
        setData(json);
        toast.success("ML Predictions updated successfully!");
      } else {
        toast.error(json.message || "Failed to fetch ML insights");
      }
    } catch (err) {
      toast.error("Could not connect to ML backend server (Port 8080).");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInsights();
  }, [modelType, threshold]);

  return (
    // القاعدة الأساسية للنصوص Arial Bold
    <div className="space-y-6 text-left font-['Arial'] font-bold">
      
      {/* Top Banner / Controls */}
      <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="flex size-10 items-center justify-center rounded-2xl bg-[var(--primary-muted)] text-[var(--primary)] shadow-sm">
            <Brain className="size-5" />
          </div>
          <div>
            <h3 className="text-xl text-[var(--fg)]">Machine Learning Engine</h3>
            <p className="text-xs text-[var(--muted)] mt-0.5">
              Predicting execution probability using historical momentum and behavioral features.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <div className="flex flex-col gap-1">
            <span className="text-[10px] text-[var(--muted)] uppercase tracking-wider">Model Type</span>
            <NativeSelect
              className="h-9 w-40 rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] px-3 text-xs text-[var(--fg)] font-['Arial'] font-bold"
              value={modelType}
              onChange={(e) => setModelType(e.target.value)}
            >
              <option value="Random Forest">Random Forest</option>
              <option value="Gradient Boosting">Gradient Boosting</option>
              <option value="Logistic Regression">Logistic Regression</option>
            </NativeSelect>
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-[10px] text-[var(--muted)] uppercase tracking-wider">Threshold: <span className="font-['Merriweather']">{threshold}%</span></span>
            <input
              type="range"
              min="30"
              max="90"
              step="5"
              value={threshold}
              onChange={(e) => setThreshold(Number(e.target.value))}
              className="h-2 w-32 appearance-none rounded-lg border border-[var(--border)] bg-[var(--surface-elevated)] accent-[var(--primary)] cursor-pointer mt-2"
            />
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={fetchInsights}
            disabled={loading}
            className="h-9 rounded-xl border-[var(--border)] bg-[var(--surface-elevated)] px-4 text-xs text-[var(--fg)] hover:border-[var(--primary)] cursor-pointer mt-5"
          >
            <RefreshCw className={cn("mr-1.5 size-3.5 text-[var(--primary)]", loading && "animate-spin")} />
            {loading ? "Analyzing..." : "Refresh"}
          </Button>
        </div>
      </div>

      {/* Stats Overview */}
      {data?.stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-md">
            <span className="text-[10px] text-[var(--muted)] uppercase tracking-widest block mb-1">Validation Accuracy</span>
            <p className="text-sm text-[var(--fg)]">{data.stats.accuracy_text}</p>
          </div>
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-md">
            <span className="text-[10px] text-[var(--muted)] uppercase tracking-widest block mb-1">Decision Logic</span>
            <p className="text-sm text-[var(--fg)]">{data.stats.why_this_model}</p>
          </div>
        </div>
      )}

      {/* Predictions Table (تم ضبط المساحات والأعمدة عشان تبقي منسقة ومش واسعة بزيادة) */}
      <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden shadow-xl">
        <div className="p-5 border-b border-[var(--border)] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="size-4 text-[var(--primary)]" />
            <h4 className="text-sm text-[var(--fg)]">Target Date Predictions: <span className="font-['Merriweather'] font-normal">{todayStr}</span></h4>
          </div>
          <span className="text-[11px] text-[var(--muted)]">Evaluated against active schedule</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[var(--border)] text-[11px] text-[var(--muted)] bg-[var(--surface-elevated)]/40">
                <th className="py-3.5 px-6 font-normal w-[45%]">HABIT</th>
                <th className="py-3.5 px-4 font-normal text-center w-[20%]">PREDICTION</th>
                <th className="py-3.5 px-4 font-normal text-right w-[20%]">PROBABILITY</th>
                <th className="py-3.5 px-6 font-normal text-center w-[15%]">DETAILS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {!data || !data.predictions || data.predictions.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-12 text-center text-xs text-[var(--muted)]">
                    {loading ? "Running ML pipeline..." : "No prediction records available."}
                  </td>
                </tr>
              ) : (
                data.predictions.map((item: any, idx: number) => {
                  const isExpanded = expandedRow === item.habitName;
                  const isHigh = item.probability >= threshold;

                  return (
                    <>
                      <tr key={idx} className="hover:bg-[var(--surface-elevated)]/20 transition-colors">
                        <td className="py-4 px-6 text-sm text-[var(--fg)] font-medium">
                          {item.habitName}
                        </td>
                        
                        <td className="py-4 px-4 text-center">
                          {item.reason.includes("Rest day") ? (
                            <span className="inline-flex items-center px-3 py-1 rounded-lg text-[10px] bg-[var(--surface-elevated)] text-[var(--muted)] border border-[var(--border)]">
                              Rest
                            </span>
                          ) : (
                            <span className={cn(
                              "inline-flex items-center px-3 py-1 rounded-lg text-[10px] tracking-wider border",
                              isHigh
                                ? "bg-[var(--primary)]/10 text-[var(--primary)] border-[var(--primary)]/30"
                                : "bg-rose-500/10 text-rose-400 border-rose-500/30"
                            )}>
                              {isHigh ? "HIGH" : "LOW"}
                            </span>
                          )}
                        </td>

                        {/* النسب والأرقام بخط Merriweather */}
                        <td className="py-4 px-4 text-right font-['Merriweather'] font-normal text-sm text-[var(--fg)]">
                          {item.probability}%
                        </td>

                        <td className="py-4 px-6 text-center">
                          <button
                            type="button"
                            onClick={() => setExpandedRow(isExpanded ? null : item.habitName)}
                            className="inline-flex items-center justify-center size-8 rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] text-[var(--muted)] hover:text-[var(--fg)] hover:border-[var(--muted)] transition-colors cursor-pointer"
                          >
                            {isExpanded ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
                          </button>
                        </td>
                      </tr>

                      {/* Expanded Row for Drivers / Feature Importance */}
                      {isExpanded && (
                        <tr className="bg-[var(--surface-elevated)]/10">
                          <td colSpan={4} className="px-6 py-4">
                            <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-elevated)]/50 p-4 text-xs space-y-2">
                              <p className="text-[var(--fg)] font-medium">Model Analysis & Reason:</p>
                              <p className="text-[var(--muted)]">{item.reason}</p>

                              {item.importances && (
                                <div className="mt-3 pt-3 border-t border-[var(--border)] grid grid-cols-3 gap-4 text-center">
                                  <div className="p-2 rounded-xl bg-[var(--surface)] border border-[var(--border)]">
                                    <span className="text-[10px] text-[var(--muted)] block">Day Weight</span>
                                    <span className="font-['Merriweather'] text-sm text-[var(--primary)]">{item.importances.Day.toFixed(2)}</span>
                                  </div>
                                  <div className="p-2 rounded-xl bg-[var(--surface)] border border-[var(--border)]">
                                    <span className="text-[10px] text-[var(--muted)] block">Yesterday</span>
                                    <span className="font-['Merriweather'] text-sm text-[var(--primary)]">{item.importances.Yest.toFixed(2)}</span>
                                  </div>
                                  <div className="p-2 rounded-xl bg-[var(--surface)] border border-[var(--border)]">
                                    <span className="text-[10px] text-[var(--muted)] block">Momentum</span>
                                    <span className="font-['Merriweather'] text-sm text-[var(--primary)]">{item.importances.Mom.toFixed(2)}</span>
                                  </div>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default MLPanel;
