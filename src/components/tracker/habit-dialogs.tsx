import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/tracker/native-select";
import { useTrackerStore, exportSnapshot, ThemeId } from "@/store/tracker-store";
import { toast } from "sonner";
import { Download, Upload, RotateCcw } from "lucide-react";

export function SettingsDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const theme = useTrackerStore((s) => s.theme);
  const setTheme = useTrackerStore((s) => s.setTheme);
  const trackingStart = useTrackerStore((s) => s.trackingStart);
  const setTrackingStart = useTrackerStore((s) => s.setTrackingStart);
  const importSnapshot = useTrackerStore((s) => s.importSnapshot);
  const resetToSeed = useTrackerStore((s) => s.resetToSeed);

  const [enableMl, setEnableMl] = useState(true);
  const [serviceUrl, setServiceUrl] = useState("");

  const handleExport = () => {
    const json = exportSnapshot();
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `tracker-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast("Backup exported successfully.");
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const raw = JSON.parse(event.target?.result as string);
        const err = importSnapshot(raw);
        if (err) toast.error(err);
        else toast("Backup imported successfully.");
      } catch {
        toast.error("Invalid JSON file.");
      }
    };
    reader.readAsText(file);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-3xl border border-[var(--border)] bg-[#111215] p-6 text-[var(--fg)] shadow-2xl">
        <DialogHeader>
          <DialogTitle className="font-serif-title text-2xl">Settings</DialogTitle>
          <DialogDescription className="text-xs text-[var(--muted)]">
            Tracking window, backup, sample data, and the ML hook.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4 space-y-4">
          {/* Color theme selector */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-[var(--muted)]">Color theme</label>
            <NativeSelect
              value={theme}
              onChange={(e) => setTheme(e.target.value as ThemeId)}
              className="h-10 w-full rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] px-3 text-xs text-[var(--fg)] shadow-none"
            >
              <option value="default">Default · Lavender</option>
              <option value="ocean">Ocean · Blue</option>
              <option value="forest">Forest · Green</option>
              <option value="amber">Amber · Gold</option>
              <option value="rose">Rose · Pink</option>
              <option value="oled">OLED · Pure Black</option>
              <option value="midnight">Midnight · Indigo</option>
              <option value="nord">Nord · Arctic</option>
            </NativeSelect>
          </div>

          {/* Tracking start date */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-[var(--muted)]">Tracking start</label>
            <input
              type="date"
              value={trackingStart}
              onChange={(e) => setTrackingStart(e.target.value)}
              className="h-10 w-full rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] px-3 text-xs text-[var(--fg)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
            />
            <p className="text-[10px] text-[var(--muted)]">Days before this date are hidden from every month grid.</p>
          </div>

          {/* ML Option */}
          <div className="space-y-2 pt-2">
            <label className="flex items-center gap-2 text-xs text-[var(--fg)] cursor-pointer">
              <input
                type="checkbox"
                checked={enableMl}
                onChange={(e) => setEnableMl(e.target.checked)}
                className="size-4 rounded border-[var(--border)] bg-[var(--surface-elevated)] text-[var(--primary)]"
              />
              Enable ML insights
            </label>

            <div className="space-y-1">
              <label className="text-[11px] text-[var(--muted)]">Service URL</label>
              <input
                type="text"
                placeholder="Leave empty for the built-in engine"
                value={serviceUrl}
                onChange={(e) => setServiceUrl(e.target.value)}
                className="h-9 w-full rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] px-3 text-xs text-[var(--fg)] placeholder:text-[var(--muted)]/50 focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
              />
            </div>
          </div>

          {/* JSON Export / Import buttons */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleExport}
              className="h-10 rounded-xl border-[var(--border)] bg-[var(--surface-elevated)] text-xs text-[var(--fg)]"
            >
              <Download className="mr-1.5 size-3.5" />
              Export JSON
            </Button>
            <label className="flex h-10 cursor-pointer items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] text-xs font-medium text-[var(--fg)] hover:bg-[var(--surface-pill)]">
              <Upload className="mr-1.5 size-3.5" />
              Import JSON
              <input type="file" accept=".json" onChange={handleImport} className="hidden" />
            </label>
          </div>

          {/* Restore sample data */}
          <Button
            type="button"
            onClick={() => {
              resetToSeed();
              toast("Sample data restored.");
              onOpenChange(false);
            }}
            className="mt-2 h-11 w-full rounded-xl bg-[#cbb592] text-xs font-semibold text-[#111215] hover:bg-[#cbb592]/90"
          >
            <RotateCcw className="mr-1.5 size-3.5" />
            Restore sample data
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
