import { useState } from "react";
import { formatMetricPercent } from "../utils/formatters.js";

const HISTORY_KEY = "portfolio_analysis_history";
const MAX_HISTORY = 10;

export function saveAnalysisToHistory(form, analysis) {
  if (!analysis?.metrics) return;
  try {
    const entry = {
      id: Date.now(),
      savedAt: new Date().toISOString(),
      form: JSON.parse(JSON.stringify(form)),
      analysis: JSON.parse(JSON.stringify(analysis)),
      summary: {
        assets: form.assets.map((a) => `${a.ticker.toUpperCase()} (${a.weight}%)`).join(", "),
        benchmark: form.benchmark,
        lookbackPeriod: form.lookbackPeriod,
        cumulativeReturn: analysis.metrics.cumulative_return,
        sharpeRatio: analysis.metrics.sharpe_ratio,
        maxDrawdown: analysis.metrics.max_drawdown,
      },
    };
    const existing = loadHistory();
    const updated = [entry, ...existing.filter((e) => e.id !== entry.id)].slice(0, MAX_HISTORY);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
  } catch {
    // localStorage may be unavailable or full; fail silently.
  }
}

function loadHistory() {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");
  } catch {
    return [];
  }
}

export function AnalysisHistoryPanel({ onRestore }) {
  const [open, setOpen] = useState(false);
  const [history, setHistory] = useState(loadHistory);

  function handleRestore(entry) {
    onRestore(entry.form, entry.analysis);
    setOpen(false);
  }

  function handleDelete(id) {
    const updated = history.filter((e) => e.id !== id);
    setHistory(updated);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
  }

  function refresh() {
    setHistory(loadHistory());
    setOpen(true);
  }

  if (history.length === 0 && !open) {
    return (
      <button
        type="button"
        onClick={refresh}
        className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white/60 transition hover:bg-white/10"
      >
        History (0)
      </button>
    );
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => { setHistory(loadHistory()); setOpen((o) => !o); }}
        className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white/80 transition hover:bg-white/10"
      >
        History ({history.length})
      </button>

      {open && (
        <div className="absolute right-0 top-12 z-30 w-[22rem] rounded-[24px] border border-white/10 bg-[#12141B] p-4 shadow-xl">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/50">Analysis History</p>
            <button type="button" onClick={() => setOpen(false)} className="text-xs text-white/40 hover:text-white/70">Close</button>
          </div>
          {history.length === 0 ? (
            <p className="text-sm text-white/40">No saved analyses yet.</p>
          ) : (
            <div className="max-h-80 space-y-2 overflow-y-auto pr-1">
              {history.map((entry) => (
                <div key={entry.id} className="rounded-2xl border border-white/10 bg-white/5 p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-xs font-semibold text-white/80">{entry.summary.assets}</p>
                      <p className="mt-0.5 text-xs text-white/40">
                        vs {entry.summary.benchmark} · {entry.summary.lookbackPeriod} ·{" "}
                        {new Date(entry.savedAt).toLocaleString()}
                      </p>
                      <div className="mt-1.5 flex gap-3 text-xs">
                        <span className={entry.summary.cumulativeReturn >= 0 ? "text-[#E7CDA0]" : "text-[#F1B0A3]"}>
                          {formatMetricPercent(entry.summary.cumulativeReturn)}
                        </span>
                        <span className="text-white/50">Sharpe {entry.summary.sharpeRatio.toFixed(2)}</span>
                        <span className="text-[#F1B0A3]">DD {formatMetricPercent(entry.summary.maxDrawdown)}</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDelete(entry.id)}
                      className="shrink-0 text-xs text-white/30 hover:text-red-300"
                    >
                      ✕
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRestore(entry)}
                    className="mt-2 w-full rounded-xl border border-[#D4B483]/20 bg-[#D4B483]/10 py-1.5 text-xs font-semibold text-[#E7CDA0] transition hover:bg-[#D4B483]/20"
                  >
                    Restore
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
