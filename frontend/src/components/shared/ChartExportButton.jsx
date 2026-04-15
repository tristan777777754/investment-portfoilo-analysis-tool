import { useState } from "react";

function sanitizeFilenamePart(value) {
  return String(value || "chart")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "chart";
}

export function ChartExportButton({ targetRef, filename, label = "Export chart as PNG" }) {
  const [isExporting, setIsExporting] = useState(false);

  async function handleExport() {
    if (!targetRef?.current || isExporting) return;
    setIsExporting(true);

    try {
      const [{ default: html2canvas }] = await Promise.all([
        import("html2canvas"),
        document.fonts?.ready ?? Promise.resolve(),
      ]);

      const canvas = await html2canvas(targetRef.current, {
        backgroundColor: "#0f172a",
        scale: Math.min(window.devicePixelRatio || 1, 2),
        useCORS: true,
        ignoreElements: (element) => element.dataset?.html2canvasIgnore === "true",
      });

      const link = document.createElement("a");
      link.href = canvas.toDataURL("image/png");
      link.download = `${sanitizeFilenamePart(filename)}.png`;
      link.click();
    } catch (error) {
      console.error("Failed to export chart as PNG.", error);
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleExport}
      disabled={isExporting}
      data-html2canvas-ignore="true"
      aria-label={label}
      title={label}
      className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/70 transition hover:bg-white/10 hover:text-white disabled:cursor-wait disabled:opacity-60"
    >
      <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4" aria-hidden="true">
        <path d="M10 3v8m0 0 3-3m-3 3-3-3M4 13.5v1A1.5 1.5 0 0 0 5.5 16h9a1.5 1.5 0 0 0 1.5-1.5v-1" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  );
}
