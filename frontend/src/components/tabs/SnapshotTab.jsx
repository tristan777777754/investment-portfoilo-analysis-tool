import { useMemo, useRef } from "react";
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid,
  PieChart, Pie, Cell
} from "recharts";
import { chartColors } from "../../constants.jsx";
import { formatMetricValue, formatChartPercent, formatDisplayWeight } from "../../utils/formatters.js";
import { ChartExportButton } from "../shared/ChartExportButton.jsx";

export function SnapshotTab({ analysis, isLoading, form }) {
  const performanceChartRef = useRef(null);
  const allocationChartRef = useRef(null);
  const overviewMetricCards = analysis?.metrics
    ? [
        ["Cumulative Return", analysis.metrics.cumulative_return],
        ["Benchmark Return", analysis.metrics.benchmark_cumulative_return],
        ["Relative Performance", analysis.metrics.relative_performance],
        ["Annualized Return", analysis.metrics.annualized_return],
        ["Annualized Volatility", analysis.metrics.annualized_volatility],
        ["Max Drawdown", analysis.metrics.max_drawdown]
      ]
    : [];

  const allocationData = analysis?.charts?.allocation?.map((item) => ({
    name: item.ticker,
    value: item.weight
  })) || [];

  const lineSeries = useMemo(() => {
    const assetSeries = analysis?.charts?.allocation?.map((item) => item.ticker) || [];
    return [
      { key: "portfolio", label: "Portfolio" },
      { key: "benchmark", label: form.benchmark },
      ...assetSeries.map((ticker) => ({ key: ticker, label: ticker }))
    ];
  }, [analysis, form.benchmark]);

  const [selectedLineSeries, setSelectedLineSeries] = useMemo(() => {
    const initial = ["portfolio", "benchmark", ...(analysis?.charts?.allocation?.map((item) => item.ticker) || [])];
    return [initial, () => {}];
  }, [analysis]);

  const lineChartData = useMemo(() => {
    return (analysis?.charts?.portfolio_vs_benchmark || []).map((point) => ({
      date: point.date,
      portfolio: point.portfolio,
      benchmark: point.benchmark,
      ...(point.assets || {})
    }));
  }, [analysis]);

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
        ) : overviewMetricCards.length ? (
          overviewMetricCards.map(([label, value]) => (
            <article key={label} className="rounded-[28px] bg-white p-4 shadow-panel ring-1 ring-mist sm:p-6">
              <p className="text-sm text-slate">{label}</p>
              <p className="mt-3 text-2xl font-semibold sm:text-3xl">{formatMetricValue(label, value)}</p>
            </article>
          ))
        ) : (
          <article className="col-span-2 rounded-[28px] bg-white p-6 shadow-panel ring-1 ring-mist xl:col-span-3 2xl:col-span-6">
            <p className="text-sm text-slate">No analysis loaded yet. Submit the form to render live results.</p>
          </article>
        )}
      </section>

      <section className="grid gap-6 2xl:grid-cols-[1.35fr_0.65fr]">
        <article ref={performanceChartRef} className="rounded-[32px] bg-white p-6 shadow-panel ring-1 ring-mist">
          <div className="mb-4 flex flex-col gap-3">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold">Portfolio vs Benchmark</h2>
                <p className="text-sm text-slate">Percentage performance since the start of the selected analysis window.</p>
              </div>
              <ChartExportButton targetRef={performanceChartRef} filename="portfolio-vs-benchmark" />
            </div>
            {lineSeries.length ? (
              <div className="flex flex-wrap gap-2">
                {lineSeries.map((series, index) => (
                  <span
                    key={series.key}
                    className="rounded-full border px-3 py-1.5 text-sm font-medium border-transparent text-white"
                    style={{ backgroundColor: chartColors[index % chartColors.length] }}
                  >
                    {series.label}
                  </span>
                ))}
              </div>
            ) : null}
          </div>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={lineChartData}>
                <CartesianGrid stroke="#EAECF0" vertical={false} />
                <XAxis dataKey="date" stroke="#667085" />
                <YAxis stroke="#667085" tickFormatter={(value) => `${value.toFixed(0)}%`} />
                <Tooltip formatter={(value) => formatChartPercent(value)} />
                {lineSeries.map((series, index) => (
                  <Line
                    key={series.key}
                    type="monotone"
                    dataKey={series.key}
                    name={series.label}
                    stroke={chartColors[index % chartColors.length]}
                    strokeWidth={3}
                    dot={false}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </article>

        <article ref={allocationChartRef} className="rounded-[32px] bg-white p-6 shadow-panel ring-1 ring-mist">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold">Allocation</h2>
              <p className="mt-1 text-sm text-slate">Submitted portfolio weights.</p>
            </div>
            <ChartExportButton targetRef={allocationChartRef} filename="allocation" />
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={allocationData} dataKey="value" nameKey="name" innerRadius={55} outerRadius={95}>
                  {allocationData.map((entry, index) => (
                    <Cell key={entry.name} fill={chartColors[index % chartColors.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => `${formatDisplayWeight(value)}%`} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {allocationData.map((item, index) => (
              <div key={item.name} className="rounded-2xl bg-surface px-3 py-2 text-sm">
                <span className="mr-2 inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: chartColors[index % chartColors.length] }} />
                {item.name} {formatDisplayWeight(item.value)}%
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="grid gap-6 2xl:grid-cols-[0.9fr_1.1fr]">
        <article className="rounded-[32px] border border-[#D0D5DD] bg-white p-6 shadow-panel">
          <h2 className="text-xl font-semibold">Overview Notes</h2>
          <ul className="mt-4 space-y-3 text-sm leading-6 text-slate">
            <li>The overview tab focuses on total performance, benchmark context, and allocation structure.</li>
            <li>The line chart lets you compare the portfolio, benchmark, and each stock on one scale.</li>
            <li>Relative performance shows whether the portfolio beat the chosen market reference.</li>
            <li>Use the Risk Analytics tab to inspect downside and tail-risk metrics in more detail.</li>
          </ul>
        </article>
        <article className="rounded-[32px] bg-[#101828] p-6 text-white shadow-panel">
          <h2 className="text-xl font-semibold">AI Summary Module</h2>
          <p className="mt-4 text-sm leading-7 text-white/75">This section reads the summary field returned by the backend response.</p>
          <div className="mt-6 rounded-3xl border border-white/10 bg-white/5 p-5 text-sm leading-7 text-white/90">
            {analysis?.summary || "Submit an analysis request to load the backend summary here."}
          </div>
        </article>
      </section>
    </>
  );
}
