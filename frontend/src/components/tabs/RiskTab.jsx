import { useRef, useState } from "react";
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid
} from "recharts";
import { InfoTooltip } from "../shared/InfoTooltip.jsx";
import { ChartExportButton } from "../shared/ChartExportButton.jsx";
import { riskMetricHelp } from "../../constants.jsx";
import {
  formatMetricValue,
  formatChartPercent,
  getCorrelationCellClass,
  getCorrelationCellStyle,
  getCorrelationScaleBounds,
} from "../../utils/formatters.js";

export function RiskTab({ analysis, isLoading, riskInterpretation }) {
  const [correlationScaleMode, setCorrelationScaleMode] = useState("absolute");
  const rollingVolatilityChartRef = useRef(null);
  const rollingBetaChartRef = useRef(null);
  const correlationChartRef = useRef(null);
  const drawdownChartRef = useRef(null);
  const riskMetricCards = analysis?.metrics
    ? [
        ["Sharpe Ratio", analysis.metrics.sharpe_ratio],
        ["Sortino Ratio", analysis.metrics.sortino_ratio],
        ["Beta vs Benchmark", analysis.metrics.beta_vs_benchmark],
        ["Downside Deviation", analysis.metrics.downside_deviation],
        ["VaR (95%)", analysis.metrics.var_95],
        ["CVaR (95%)", analysis.metrics.cvar_95]
      ]
    : [];

  const concentrationMetricCards = analysis?.metrics
    ? [
        ["Top Holding Weight", analysis.metrics.top_holding_weight],
        ["Top 3 Holdings", analysis.metrics.top_three_weight],
        ["Effective Holdings", analysis.metrics.effective_number_of_holdings],
        ["Herfindahl Index", analysis.metrics.herfindahl_index]
      ]
    : [];

  const rollingVolatilityData = analysis?.charts?.rolling_volatility || [];
  const rollingBetaData = analysis?.charts?.rolling_beta || [];
  const correlationData = analysis?.charts?.correlation_matrix || [];
  const riskContributionData = analysis?.charts?.risk_contribution || [];
  const worstDrawdownPeriods = analysis?.charts?.worst_drawdown_periods || [];
  const drawdownData = analysis?.charts?.drawdown || [];
  const correlationBounds = getCorrelationScaleBounds(correlationData);
  const relativeScaleLabel = `${correlationBounds.min.toFixed(2)} to ${correlationBounds.max.toFixed(2)}`;

  return (
    <>
      <section className="grid grid-cols-2 gap-5 xl:grid-cols-3 2xl:grid-cols-6">
        {isLoading ? (
          Array.from({ length: 6 }).map((_, index) => (
            <article key={index} className="animate-pulse rounded-[28px] bg-white p-4 shadow-panel ring-1 ring-mist sm:p-6">
              <div className="h-4 w-24 rounded bg-slate-200" />
              <div className="mt-4 h-8 w-28 rounded bg-slate-200" />
            </article>
          ))
        ) : riskMetricCards.length ? (
          riskMetricCards.map(([label, value]) => (
            <article key={label} className="rounded-[28px] bg-white p-4 shadow-panel ring-1 ring-mist sm:p-6">
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm text-slate">{label}</p>
                <InfoTooltip text={riskMetricHelp[label]} />
              </div>
              <p className="mt-3 text-2xl font-semibold sm:text-3xl">{formatMetricValue(label, value)}</p>
            </article>
          ))
        ) : (
          <article className="col-span-2 rounded-[28px] bg-white p-6 shadow-panel ring-1 ring-mist xl:col-span-3 2xl:col-span-6">
            <p className="text-sm text-slate">No risk analytics loaded yet. Submit the form to render live results.</p>
          </article>
        )}
      </section>

      <section className="grid grid-cols-2 gap-6 2xl:grid-cols-4">
        {concentrationMetricCards.map(([label, value]) => (
          <article key={label} className="rounded-[28px] bg-white p-4 shadow-panel ring-1 ring-mist sm:p-6">
            <p className="text-sm text-slate">{label}</p>
            <p className="mt-3 text-2xl font-semibold sm:text-3xl">{formatMetricValue(label, value)}</p>
          </article>
        ))}
      </section>

      <section className="grid gap-6 2xl:grid-cols-[1fr_1fr]">
        <article className="rounded-[32px] bg-[#101828] p-6 text-white shadow-panel">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-white/60">Interpretation Layer</p>
          <h2 className="mt-3 text-2xl font-semibold">What The Risk Metrics Suggest</h2>
          <p className="mt-4 text-sm leading-7 text-white/85">{riskInterpretation}</p>
        </article>
        <article className="rounded-[32px] border border-[#D0D5DD] bg-white p-6 shadow-panel">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate">How To Read It</p>
          <h2 className="mt-3 text-2xl font-semibold">Risk Does Not Mean Good Or Bad By Itself</h2>
          <p className="mt-4 text-sm leading-7 text-slate">
            A higher-risk portfolio is not automatically bad, and a lower-risk portfolio is not automatically good. The key question is whether the return, drawdown, and tail-risk profile match the type of investor the portfolio is meant for.
          </p>
        </article>
      </section>

      <section className="grid gap-6 2xl:grid-cols-[1fr_1fr]">
        <article ref={rollingVolatilityChartRef} className="rounded-[32px] bg-white p-6 shadow-panel ring-1 ring-mist">
          <div className="mb-4 flex items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold">Rolling Volatility</h2>
              <p className="text-sm text-slate">21-day annualized volatility shows how risk changes through time.</p>
            </div>
            <ChartExportButton targetRef={rollingVolatilityChartRef} filename="rolling-volatility" />
          </div>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={rollingVolatilityData}>
                <CartesianGrid stroke="#EAECF0" vertical={false} />
                <XAxis dataKey="date" stroke="#667085" />
                <YAxis stroke="#667085" tickFormatter={(value) => `${value.toFixed(0)}%`} />
                <Tooltip formatter={(value) => formatChartPercent(value)} />
                <Line type="monotone" dataKey="portfolio" stroke="#D4B483" strokeWidth={3} dot={false} />
                <Line type="monotone" dataKey="benchmark" stroke="#B5C0CF" strokeWidth={3} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </article>
        <article ref={rollingBetaChartRef} className="rounded-[32px] bg-white p-6 shadow-panel ring-1 ring-mist">
          <div className="mb-4 flex items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold">Rolling Beta</h2>
              <p className="text-sm text-slate">Rolling beta shows how benchmark sensitivity changes through time.</p>
            </div>
            <ChartExportButton targetRef={rollingBetaChartRef} filename="rolling-beta" />
          </div>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={rollingBetaData}>
                <CartesianGrid stroke="#EAECF0" vertical={false} />
                <XAxis dataKey="date" stroke="#667085" />
                <YAxis stroke="#667085" />
                <Tooltip formatter={(value) => Number(value).toFixed(2)} />
                <Line type="monotone" dataKey="beta" stroke="#BFA2D8" strokeWidth={3} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </article>
      </section>

      <section className="grid gap-6 2xl:grid-cols-[1fr_1fr]">
        <article className="rounded-[32px] bg-white p-6 shadow-panel ring-1 ring-mist">
          <div className="mb-4">
            <h2 className="text-xl font-semibold">Risk Contribution by Asset</h2>
            <p className="text-sm text-slate">This table shows which holdings contribute the most to total portfolio volatility.</p>
          </div>
          <div className="-mx-2 overflow-x-auto px-2 sm:mx-0 sm:px-0">
            <table className="min-w-[32rem] text-xs sm:min-w-full sm:text-sm">
              <thead>
                <tr className="border-b border-mist text-left text-slate">
                  <th className="pb-3 pr-4">Ticker</th>
                  <th className="pb-3 pr-4">Weight</th>
                  <th className="pb-3 pr-4">Vol Contribution</th>
                  <th className="pb-3">Risk Share</th>
                </tr>
              </thead>
              <tbody>
                {riskContributionData.map((item) => (
                  <tr key={item.ticker} className="border-b border-mist/70 text-ink last:border-b-0">
                    <td className="py-3 pr-4 font-semibold">{item.ticker}</td>
                    <td className="py-3 pr-4">{formatChartPercent(item.weight)}</td>
                    <td className="py-3 pr-4">{formatChartPercent(item.volatility_contribution)}</td>
                    <td className="py-3 text-[#D9BB88]">{formatChartPercent(item.risk_contribution_pct)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>
        <article className="rounded-[32px] bg-white p-6 shadow-panel ring-1 ring-mist">
          <div className="mb-4">
            <h2 className="text-xl font-semibold">Worst Drawdown Periods</h2>
            <p className="text-sm text-slate">The most severe peak-to-trough drawdown episodes in the selected window.</p>
          </div>
          <div className="-mx-2 overflow-x-auto px-2 sm:mx-0 sm:px-0">
            <table className="min-w-[34rem] text-xs sm:min-w-full sm:text-sm">
              <thead>
                <tr className="border-b border-mist text-left text-slate">
                  <th className="pb-3 pr-4">Start</th>
                  <th className="pb-3 pr-4">Trough</th>
                  <th className="pb-3 pr-4">Recovery</th>
                  <th className="pb-3 pr-4">Drawdown</th>
                  <th className="pb-3">Days</th>
                </tr>
              </thead>
              <tbody>
                {worstDrawdownPeriods.map((item) => (
                  <tr key={`${item.start_date}-${item.trough_date}`} className="border-b border-mist/70 text-ink last:border-b-0">
                    <td className="py-3 pr-4">{item.start_date}</td>
                    <td className="py-3 pr-4">{item.trough_date}</td>
                    <td className="py-3 pr-4">{item.recovery_date || "Not recovered"}</td>
                    <td className="py-3 pr-4 text-[#F1B0A3]">{formatChartPercent(item.drawdown)}</td>
                    <td className="py-3">{item.duration_days}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>
      </section>

      <section className="grid gap-6 2xl:grid-cols-[1.05fr_0.95fr]">
        <article ref={correlationChartRef} className="rounded-[32px] bg-white p-6 shadow-panel ring-1 ring-mist">
          <div className="mb-4 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h2 className="text-xl font-semibold">Correlation Heatmap</h2>
              <p className="text-sm text-slate">High correlation suggests that holdings may move together during stress periods.</p>
            </div>
            <div className="flex items-start gap-3">
              {correlationData.length ? (
                <div
                  data-html2canvas-ignore="true"
                  className="inline-flex rounded-full border border-mist bg-[#F8F5EF] p-1 text-xs font-semibold text-slate"
                >
                  {[
                    { key: "absolute", label: "Absolute Scale" },
                    { key: "relative", label: "Relative Scale" },
                  ].map((option) => (
                    <button
                      key={option.key}
                      type="button"
                      onClick={() => setCorrelationScaleMode(option.key)}
                      className={`rounded-full px-3 py-1.5 transition ${
                        correlationScaleMode === option.key
                          ? "bg-[#101828] text-white shadow-sm"
                          : "text-slate hover:bg-white"
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              ) : null}
              <ChartExportButton targetRef={correlationChartRef} filename="correlation-heatmap" />
            </div>
          </div>
          {correlationData.length ? (
            <>
              <div className="mb-4 flex flex-col gap-3">
                <div className="relative h-3 overflow-hidden rounded-full bg-white/5 ring-1 ring-white/10">
                  <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(142,125,176,0.95)_0%,rgba(142,125,176,0.28)_35%,rgba(44,49,63,1)_50%,rgba(212,180,131,0.28)_65%,rgba(212,180,131,0.95)_100%)]" />
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate sm:text-xs">
                  {correlationScaleMode === "absolute" ? (
                    <>
                      <span>-1.00</span><span>-0.50</span><span>0.00</span><span>0.50</span><span>1.00</span>
                    </>
                  ) : (
                    <>
                      <span>{correlationBounds.min.toFixed(2)}</span>
                      <span>{((correlationBounds.min + correlationBounds.max) / 2).toFixed(2)}</span>
                      <span>{correlationBounds.max.toFixed(2)}</span>
                    </>
                  )}
                </div>
              </div>
              <p className="mb-3 text-xs text-slate">
                {correlationScaleMode === "absolute"
                  ? "Absolute scale anchors the palette at -1 to +1, so the same shade always means the same raw correlation."
                  : `Relative scale stretches the palette across this matrix's observed range (${relativeScaleLabel}) to reveal smaller differences.`}
              </p>
              <p className="mb-3 text-xs text-slate sm:hidden">Scroll sideways to inspect all pairwise correlations.</p>
              <div className="-mx-2 overflow-x-auto px-2 pb-2 sm:mx-0 sm:px-0">
                <table className="min-w-[34rem] border-separate border-spacing-1.5 text-xs sm:min-w-full sm:border-spacing-2 sm:text-sm">
                  <thead>
                    <tr>
                      <th className="px-2 py-2 text-left text-slate sm:px-3">Ticker</th>
                      {correlationData.map((column) => (
                        <th key={column.ticker} className="px-2 py-2 text-left text-slate sm:px-3">{column.ticker}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {correlationData.map((row) => (
                      <tr key={row.ticker}>
                        <td className="px-2 py-2 font-semibold text-ink sm:px-3">{row.ticker}</td>
                        {correlationData.map((column) => {
                          const value = row.values[column.ticker];
                          return (
                            <td
                              key={`${row.ticker}-${column.ticker}`}
                              className={`rounded-xl px-2 py-2 font-medium sm:px-3 ${getCorrelationCellClass(value, correlationScaleMode, correlationBounds)}`}
                              style={getCorrelationCellStyle(value, correlationScaleMode, correlationBounds)}
                            >
                              {value.toFixed(2)}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <p className="text-sm text-slate">No correlation data available yet.</p>
          )}
        </article>
        <article ref={drawdownChartRef} className="rounded-[32px] bg-white p-6 shadow-panel ring-1 ring-mist">
          <div className="mb-4 flex items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold">Drawdown Chart</h2>
              <p className="text-sm text-slate">Historical drawdown shown as percentage below the running portfolio peak.</p>
            </div>
            <ChartExportButton targetRef={drawdownChartRef} filename="drawdown-chart" />
          </div>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={drawdownData}>
                <CartesianGrid stroke="#EAECF0" vertical={false} />
                <XAxis dataKey="date" stroke="#667085" />
                <YAxis stroke="#667085" tickFormatter={(value) => `${value.toFixed(0)}%`} />
                <Tooltip formatter={(value) => formatChartPercent(value)} />
                <Line type="monotone" dataKey="drawdown" stroke="#C88C7A" strokeWidth={3} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </article>
      </section>
    </>
  );
}
