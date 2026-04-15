import { useMemo, useRef } from "react";
import {
  ResponsiveContainer, AreaChart, Area, LineChart, Line,
  XAxis, YAxis, Tooltip, CartesianGrid, Legend
} from "recharts";
import { formatMetricPercent } from "../../utils/formatters.js";
import { ChartExportButton } from "../shared/ChartExportButton.jsx";

export function MonteCarloTab({ analysis }) {
  const fanChartRef = useRef(null);
  const mc = analysis?.monte_carlo;

  const fanChartData = useMemo(() => {
    if (!mc) return [];
    const { fan_bands } = mc;
    const [p5, p10, p25, p50, p75, p90, p95] = fan_bands.values;
    // Sample every 5th day for performance
    return fan_bands.days
      .filter((_, i) => i % 5 === 0 || i === fan_bands.days.length - 1)
      .map((day, i) => {
        const idx = fan_bands.days.indexOf(day);
        return {
          day,
          p5: parseFloat(((p5[idx] - 1) * 100).toFixed(2)),
          p10: parseFloat(((p10[idx] - 1) * 100).toFixed(2)),
          p25: parseFloat(((p25[idx] - 1) * 100).toFixed(2)),
          p50: parseFloat(((p50[idx] - 1) * 100).toFixed(2)),
          p75: parseFloat(((p75[idx] - 1) * 100).toFixed(2)),
          p90: parseFloat(((p90[idx] - 1) * 100).toFixed(2)),
          p95: parseFloat(((p95[idx] - 1) * 100).toFixed(2)),
          band_5_95: [
            parseFloat(((p5[idx] - 1) * 100).toFixed(2)),
            parseFloat(((p95[idx] - 1) * 100).toFixed(2))
          ],
          band_10_90: [
            parseFloat(((p10[idx] - 1) * 100).toFixed(2)),
            parseFloat(((p90[idx] - 1) * 100).toFixed(2))
          ],
          band_25_75: [
            parseFloat(((p25[idx] - 1) * 100).toFixed(2)),
            parseFloat(((p75[idx] - 1) * 100).toFixed(2))
          ],
        };
      });
  }, [mc]);

  if (!analysis) {
    return (
      <section className="rounded-[28px] bg-white p-6 shadow-panel ring-1 ring-mist">
        <p className="text-sm text-slate">No simulation loaded yet. Submit the form to run the Monte Carlo analysis.</p>
      </section>
    );
  }

  const stats = mc.terminal_stats;

  const summaryCards = [
    { label: "Median 1Y Return", value: formatMetricPercent(stats.median_return) },
    { label: "Mean 1Y Return", value: formatMetricPercent(stats.mean_return) },
    { label: "Probability of Loss", value: `${(stats.prob_loss * 100).toFixed(1)}%` },
    { label: "Prob > +5%", value: `${(stats.prob_above_5pct * 100).toFixed(1)}%` },
    { label: "5% VaR (1Y)", value: formatMetricPercent(stats.var["5%"]) },
    { label: "5% CVaR (1Y)", value: formatMetricPercent(stats.cvar["5%"]) },
  ];

  return (
    <>
      <section className="grid gap-6">
        <article className="rounded-[32px] border border-white/70 bg-white/85 p-8 shadow-panel backdrop-blur">
          <p className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-slate">
            Parametric Monte Carlo · {mc.n_simulations.toLocaleString()} Simulations · {mc.horizon_days} Trading Days
          </p>
          <h2 className="text-3xl font-semibold">Monte Carlo Simulation</h2>
          <p className="mt-3 max-w-3xl text-base leading-7 text-slate">
            Each simulated path is drawn from the historical return distribution of this portfolio. The fan chart shows the range of possible outcomes at each percentile band. This is not a forecast — it is a probability-based stress envelope.
          </p>
        </article>
      </section>

      <section className="grid grid-cols-2 gap-5 xl:grid-cols-3 2xl:grid-cols-6">
        {summaryCards.map(({ label, value }) => (
          <article key={label} className="rounded-[28px] bg-white p-4 shadow-panel ring-1 ring-mist sm:p-6">
            <p className="text-sm text-slate">{label}</p>
            <p className="mt-3 text-2xl font-semibold sm:text-3xl">{value}</p>
          </article>
        ))}
      </section>

      <section className="grid gap-6 2xl:grid-cols-[1.4fr_0.6fr]">
        <article ref={fanChartRef} className="rounded-[32px] bg-white p-6 shadow-panel ring-1 ring-mist">
          <div className="mb-4 flex items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold">Outcome Fan Chart</h2>
              <p className="text-sm text-slate">
                Percentile bands show the range of simulated portfolio returns over 1 year. The dark line is the median (50th percentile).
              </p>
            </div>
            <ChartExportButton targetRef={fanChartRef} filename="monte-carlo-fan-chart" />
          </div>
          <div className="h-96">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={fanChartData}>
                <CartesianGrid stroke="#EAECF0" vertical={false} />
                <XAxis dataKey="day" stroke="#667085" label={{ value: "Trading Days", position: "insideBottomRight", offset: -5, fill: "#667085", fontSize: 12 }} />
                <YAxis stroke="#667085" tickFormatter={(v) => `${v.toFixed(0)}%`} />
                <Tooltip formatter={(value) => `${value.toFixed(2)}%`} />
                <Area type="monotone" dataKey="p95" name="95th pct" stroke="none" fill="#D4B483" fillOpacity={0.15} />
                <Area type="monotone" dataKey="p90" name="90th pct" stroke="none" fill="#D4B483" fillOpacity={0.20} />
                <Area type="monotone" dataKey="p75" name="75th pct" stroke="none" fill="#D4B483" fillOpacity={0.25} />
                <Area type="monotone" dataKey="p25" name="25th pct" stroke="none" fill="#C88C7A" fillOpacity={0.25} />
                <Area type="monotone" dataKey="p10" name="10th pct" stroke="none" fill="#C88C7A" fillOpacity={0.20} />
                <Area type="monotone" dataKey="p5" name="5th pct" stroke="none" fill="#C88C7A" fillOpacity={0.15} />
                <Line type="monotone" dataKey="p50" name="Median" stroke="#D4B483" strokeWidth={2.5} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </article>

        <article className="rounded-[32px] bg-[#101828] p-6 text-white shadow-panel">
          <h2 className="text-xl font-semibold">Terminal Return Distribution</h2>
          <p className="mt-3 text-sm leading-7 text-white/75">
            Projected 1-year returns from {mc.n_simulations.toLocaleString()} simulated paths.
          </p>
          <div className="mt-6 grid gap-3 text-sm text-white/85">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs text-white/45 uppercase tracking-[0.18em]">Median Return</p>
              <p className="mt-1 text-2xl font-semibold text-[#E8D4AF]">{formatMetricPercent(stats.median_return)}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs text-white/45 uppercase tracking-[0.18em]">5% VaR / CVaR</p>
              <p className="mt-1 text-lg font-semibold text-[#F1B0A3]">
                {formatMetricPercent(stats.var["5%"])} / {formatMetricPercent(stats.cvar["5%"])}
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs text-white/45 uppercase tracking-[0.18em]">10% VaR / CVaR</p>
              <p className="mt-1 text-lg font-semibold text-[#F1B0A3]">
                {formatMetricPercent(stats.var["10%"])} / {formatMetricPercent(stats.cvar["10%"])}
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs text-white/45 uppercase tracking-[0.18em]">Prob Loss / Prob {">"}+5%</p>
              <p className="mt-1 text-lg font-semibold">
                <span className="text-[#F1B0A3]">{(stats.prob_loss * 100).toFixed(1)}%</span>
                {" / "}
                <span className="text-[#E8D4AF]">{(stats.prob_above_5pct * 100).toFixed(1)}%</span>
              </p>
            </div>
          </div>
        </article>
      </section>

      <section className="grid gap-6 2xl:grid-cols-[0.9fr_1.1fr]">
        <article className="rounded-[32px] border border-[#D0D5DD] bg-white p-6 shadow-panel">
          <h2 className="text-xl font-semibold">How To Read This</h2>
          <ul className="mt-4 space-y-3 text-sm leading-6 text-slate">
            <li>The fan chart bands show where 90%, 80%, and 50% of simulated paths ended up at each point in time.</li>
            <li>A narrow fan means more consistent projected behavior; a wide fan means higher uncertainty.</li>
            <li>VaR and CVaR here are 1-year terminal values, not daily values like in the Risk tab.</li>
            <li>This simulation uses the historical covariance structure — large market regime changes are not captured.</li>
          </ul>
        </article>
        <article className="rounded-[32px] bg-[#101828] p-6 text-white shadow-panel">
          <h2 className="text-xl font-semibold">Model Notes</h2>
          <p className="mt-4 text-sm leading-7 text-white/80">
            This simulation uses a parametric Monte Carlo method with Cholesky decomposition of the historical covariance matrix. The expected drift is the historical mean daily return. The model assumes returns are multivariate normally distributed — fat tails, regime shifts, and liquidity events are not modelled. Results should be treated as a probability envelope, not as a prediction of any individual outcome.
          </p>
        </article>
      </section>
    </>
  );
}
