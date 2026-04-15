import { useState } from "react";
import { formatMetricPercent, formatMetricValue, formatFactorValue } from "../utils/formatters.js";

export function PdfExportButton({ analysis, form }) {
  const [isGenerating, setIsGenerating] = useState(false);

  async function exportPdf() {
    if (!analysis) return;
    setIsGenerating(true);

    try {
      // Dynamically import heavy libraries so they don't increase initial bundle size.
      const [{ default: jsPDF }, { default: html2canvas }] = await Promise.all([
        import("jspdf"),
        import("html2canvas"),
      ]);

      const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 15;
      const contentWidth = pageWidth - margin * 2;
      let y = margin;

      function checkPageBreak(neededHeight = 20) {
        if (y + neededHeight > pageHeight - margin) {
          doc.addPage();
          y = margin;
        }
      }

      function addSectionHeader(text) {
        checkPageBreak(15);
        doc.setFontSize(13);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(30, 20, 10);
        doc.text(text, margin, y);
        y += 2;
        doc.setDrawColor(212, 180, 131);
        doc.setLineWidth(0.5);
        doc.line(margin, y, pageWidth - margin, y);
        y += 7;
        doc.setTextColor(60, 60, 60);
      }

      function addKV(label, value) {
        checkPageBreak(8);
        doc.setFontSize(9);
        doc.setFont("helvetica", "bold");
        doc.text(label + ":", margin, y);
        doc.setFont("helvetica", "normal");
        doc.text(String(value), margin + 55, y);
        y += 6;
      }

      function addText(text, fontSize = 9, bold = false) {
        checkPageBreak(10);
        doc.setFontSize(fontSize);
        doc.setFont("helvetica", bold ? "bold" : "normal");
        const lines = doc.splitTextToSize(text, contentWidth);
        for (const line of lines) {
          checkPageBreak(6);
          doc.text(line, margin, y);
          y += 5;
        }
      }

      // ── Cover Page ──────────────────────────────────────────────────────
      doc.setFillColor(9, 10, 15);
      doc.rect(0, 0, pageWidth, pageHeight, "F");

      doc.setTextColor(232, 212, 175);
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text("PORTFOLIO INTELLIGENCE WORKSPACE", margin, 35);

      doc.setTextColor(255, 255, 255);
      doc.setFontSize(26);
      doc.setFont("helvetica", "bold");
      doc.text("Portfolio Analysis Report", margin, 55);

      doc.setFontSize(11);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(200, 200, 200);
      const assetList = form.assets.map((a) => `${a.ticker.toUpperCase()} (${a.weight}%)`).join(", ");
      doc.text(`Assets: ${assetList}`, margin, 72);
      doc.text(`Benchmark: ${form.benchmark}  |  Lookback: ${form.lookbackPeriod}`, margin, 80);
      doc.text(`Generated: ${new Date().toLocaleDateString()}`, margin, 88);

      doc.setFontSize(8);
      doc.setTextColor(120, 120, 120);
      const disclaimer = "This report is for informational purposes only and does not constitute financial advice. Past performance is not indicative of future results.";
      const disclaimerLines = doc.splitTextToSize(disclaimer, contentWidth);
      doc.text(disclaimerLines, margin, pageHeight - 25);

      // ── Page 2: Key Metrics ─────────────────────────────────────────────
      doc.addPage();
      doc.setFillColor(255, 255, 255);
      doc.rect(0, 0, pageWidth, pageHeight, "F");
      doc.setTextColor(30, 20, 10);
      y = margin;

      addSectionHeader("Portfolio Summary");
      addKV("Assets", assetList);
      addKV("Benchmark", form.benchmark);
      addKV("Lookback Period", form.lookbackPeriod);
      y += 4;

      addSectionHeader("Performance Metrics");
      const m = analysis.metrics;
      addKV("Cumulative Return", formatMetricPercent(m.cumulative_return));
      addKV("Benchmark Return", formatMetricPercent(m.benchmark_cumulative_return));
      addKV("Relative Performance", formatMetricPercent(m.relative_performance));
      addKV("Annualized Return", formatMetricPercent(m.annualized_return));
      addKV("Annualized Volatility", formatMetricPercent(m.annualized_volatility));
      addKV("Max Drawdown", formatMetricPercent(m.max_drawdown));
      y += 4;

      addSectionHeader("Risk Metrics");
      addKV("Sharpe Ratio", m.sharpe_ratio.toFixed(2));
      addKV("Sortino Ratio", m.sortino_ratio.toFixed(2));
      addKV("Beta vs Benchmark", m.beta_vs_benchmark.toFixed(2));
      addKV("Downside Deviation", formatMetricPercent(m.downside_deviation));
      addKV("VaR (95%)", formatMetricPercent(m.var_95));
      addKV("CVaR (95%)", formatMetricPercent(m.cvar_95));
      y += 4;

      addSectionHeader("Concentration");
      addKV("Top Holding Weight", formatMetricPercent(m.top_holding_weight));
      addKV("Top 3 Holdings", formatMetricPercent(m.top_three_weight));
      addKV("Effective Holdings", m.effective_number_of_holdings.toFixed(2));
      addKV("Herfindahl Index", m.herfindahl_index.toFixed(4));

      // ── Scenarios ────────────────────────────────────────────────────────
      if (analysis.scenarios) {
        checkPageBreak(30);
        y += 4;
        addSectionHeader("Scenario Analysis");
        for (const scenario of [analysis.scenarios.market_shock, analysis.scenarios.sector_shock].filter(Boolean)) {
          addText(scenario.scenario_name, 10, true);
          addKV("Portfolio Impact", formatMetricPercent(scenario.portfolio_estimated_return));
          if (scenario.benchmark_estimated_return != null) {
            addKV("Benchmark Impact", formatMetricPercent(scenario.benchmark_estimated_return));
          }
          if (scenario.relative_impact_vs_benchmark != null) {
            addKV("Relative vs Benchmark", formatMetricPercent(scenario.relative_impact_vs_benchmark));
          }
          y += 3;
        }
      }

      // ── Factor Model ─────────────────────────────────────────────────────
      if (analysis.factor_model?.is_available) {
        const fm = analysis.factor_model;
        checkPageBreak(30);
        y += 4;
        addSectionHeader("Factor Model — " + fm.model_name);
        addKV("Alpha (Annualized)", formatMetricPercent(fm.alpha_annualized));
        addKV("R-Squared", fm.r_squared.toFixed(2));
        addKV("Residual Volatility", formatMetricPercent(fm.residual_volatility));
        addKV("Observations", String(fm.observations));
        addKV("Window", `${fm.start_date} to ${fm.end_date}`);
        y += 3;
        for (const exp of fm.exposures) {
          addKV(exp.factor + " Beta", exp.beta.toFixed(2));
        }
      }

      // ── Monte Carlo ───────────────────────────────────────────────────────
      if (analysis.monte_carlo) {
        const mc = analysis.monte_carlo;
        checkPageBreak(30);
        y += 4;
        addSectionHeader(`Monte Carlo Simulation (${mc.n_simulations.toLocaleString()} paths, ${mc.horizon_days} days)`);
        const ts = mc.terminal_stats;
        addKV("Median 1Y Return", formatMetricPercent(ts.median_return));
        addKV("Mean 1Y Return", formatMetricPercent(ts.mean_return));
        addKV("Probability of Loss", `${(ts.prob_loss * 100).toFixed(1)}%`);
        addKV("Prob > +5%", `${(ts.prob_above_5pct * 100).toFixed(1)}%`);
        addKV("5% VaR (1Y)", formatMetricPercent(ts.var["5%"]));
        addKV("5% CVaR (1Y)", formatMetricPercent(ts.cvar["5%"]));
      }

      // ── AI Summary ────────────────────────────────────────────────────────
      if (analysis.summary) {
        checkPageBreak(30);
        y += 4;
        addSectionHeader("AI Analysis Summary");
        addText(analysis.summary);
      }

      // ── Disclaimer ────────────────────────────────────────────────────────
      doc.addPage();
      y = margin;
      addSectionHeader("Disclaimer");
      addText(
        "This report is generated automatically from historical market data and quantitative models. " +
        "All figures represent past performance and are not guaranteed to be accurate or complete. " +
        "Nothing in this report constitutes investment advice or a recommendation to buy or sell any security. " +
        "Past performance is not indicative of future results. You should consult a qualified financial " +
        "professional before making any investment decisions. The authors of this tool accept no liability " +
        "for any financial losses arising from the use of this report."
      );

      const filename = `portfolio_report_${form.benchmark}_${new Date().toISOString().slice(0, 10)}.pdf`;
      doc.save(filename);
    } catch (err) {
      console.error("PDF export error:", err);
      alert("PDF export failed: " + err.message);
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <button
      type="button"
      onClick={exportPdf}
      disabled={!analysis || isGenerating}
      className="rounded-full border border-[#D4B483]/30 bg-[#D4B483]/10 px-4 py-2 text-sm font-semibold text-[#C8A96A] transition hover:bg-[#D4B483]/20 disabled:cursor-not-allowed disabled:opacity-40"
    >
      {isGenerating ? "Generating PDF..." : "Export PDF"}
    </button>
  );
}
