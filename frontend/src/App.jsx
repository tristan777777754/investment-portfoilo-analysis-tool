import { useMemo, useState } from "react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid
} from "recharts";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";

const chartColors = ["#0B6E4F", "#98A2B3", "#1570EF", "#FDB022", "#12B76A", "#344054", "#7A5AF8", "#F04438"];
const stockOptions = ["AAPL", "MSFT", "VOO", "SPY", "QQQ", "NVDA", "META", "AMZN", "GOOGL", "TSLA"];
const benchmarkOptions = ["SPY", "QQQ", "VOO", "DIA", "IWM"];

const defaultForm = {
  assets: [{ ticker: "AAPL", weight: "100.00" }],
  benchmark: "SPY",
  lookbackPeriod: "1y"
};

function formatMetricPercent(value) {
  // Format decimal metrics like 0.1234 into 12.34%.
  return `${(value * 100).toFixed(2)}%`;
}

function formatChartPercent(value) {
  // Format chart values that are already stored as percentage points.
  return `${Number(value).toFixed(2)}%`;
}

function formatDisplayWeight(value) {
  // Keep weight labels readable without unnecessary trailing zeroes.
  return Number(value).toFixed(2).replace(/\.00$/, "").replace(/(\.\d)0$/, "$1");
}

function formatMetricValue(label, value) {
  // Show Sharpe ratio as a plain number and other metrics as percentages.
  if (label === "Sharpe Ratio") {
    return value.toFixed(2);
  }

  return formatMetricPercent(value);
}

function getErrorMessage(errorPayload) {
  // Convert backend error payloads into readable text for the UI.
  if (!errorPayload) {
    return "Something went wrong.";
  }

  if (typeof errorPayload.detail === "string") {
    return errorPayload.detail;
  }

  if (Array.isArray(errorPayload.detail)) {
    return errorPayload.detail
      .map((item) => {
        if (item?.loc && item?.msg) {
          return `${item.loc.join(" > ")}: ${item.msg}`;
        }

        return JSON.stringify(item);
      })
      .join(" | ");
  }

  return "Something went wrong.";
}

function getEvenWeightStrings(count) {
  // Spread 100.00% across rows while keeping the total exact to two decimals.
  const totalBasisPoints = 10000;
  const base = Math.floor(totalBasisPoints / count);
  const remainder = totalBasisPoints - base * count;

  return Array.from({ length: count }, (_, index) => {
    const basisPoints = base + (index < remainder ? 1 : 0);
    return (basisPoints / 100).toFixed(2);
  });
}

function rebalanceAssets(assets) {
  // Rebalance all rows evenly whenever rows are added or removed.
  const balancedWeights = getEvenWeightStrings(assets.length);

  return assets.map((asset, index) => ({
    ...asset,
    weight: balancedWeights[index]
  }));
}

function getNextTicker(currentAssets) {
  // Pick the first unused ticker so new rows stay unique by default.
  const selected = new Set(currentAssets.map((asset) => asset.ticker));
  return stockOptions.find((option) => !selected.has(option)) || stockOptions[0];
}

function buildPayload(form) {
  // Convert frontend form state into the backend request format.
  const assets = form.assets.map((asset) => ({
    ticker: asset.ticker,
    weight: Number(asset.weight)
  }));

  const invalidWeight = assets.some((asset) => Number.isNaN(asset.weight) || asset.weight <= 0);
  if (invalidWeight) {
    throw new Error("Each asset weight must be a valid positive number.");
  }

  const seen = new Set();
  for (const asset of assets) {
    if (seen.has(asset.ticker)) {
      throw new Error("Duplicate tickers are not allowed.");
    }
    seen.add(asset.ticker);
  }

  const totalWeight = assets.reduce((sum, asset) => sum + asset.weight, 0);
  if (Math.abs(totalWeight - 100) > 0.001) {
    throw new Error("Total asset weight must equal 100.");
  }

  return {
    assets,
    benchmark: form.benchmark,
    lookback_period: form.lookbackPeriod
  };
}

function getCorrelationCellClass(value) {
  // Keep a subtle border while the fill color is handled by the continuous heatmap style.
  if (value >= 0.85) return "ring-1 ring-[#B42318]/20";
  if (value >= 0.6) return "ring-1 ring-[#F79009]/20";
  if (value >= 0.3) return "ring-1 ring-[#DC6803]/20";
  if (value >= 0.1) return "ring-1 ring-[#12B76A]/20";
  if (value >= -0.1) return "ring-1 ring-[#98A2B3]/25";
  if (value >= -0.3) return "ring-1 ring-[#2E90FA]/20";
  if (value >= -0.6) return "ring-1 ring-[#1570EF]/20";
  return "ring-1 ring-[#0B6E4F]/20";
}

function getCorrelationCellStyle(value) {
  // Use a continuous UI-matched gradient so every correlation value gets visible heatmap color.
  const clampedValue = Math.max(-1, Math.min(1, value));

  if (clampedValue >= 0) {
    const intensity = clampedValue;
    const alpha = 0.10 + intensity * 0.26;

    return {
      backgroundColor: `rgba(11, 110, 79, ${alpha})`,
      color: intensity >= 0.55 ? "#F8FAFC" : "#0F172A"
    };
  }

  const intensity = Math.abs(clampedValue);
  const alpha = 0.08 + intensity * 0.24;

  return {
    backgroundColor: `rgba(21, 112, 239, ${alpha})`,
    color: intensity >= 0.55 ? "#F8FAFC" : "#0F172A"
  };
}

function App() {
  // Store the dynamic asset form rows and global input state.
  const [form, setForm] = useState(defaultForm);

  // Store backend response after a successful analysis request.
  const [analysis, setAnalysis] = useState(null);

  // Track loading, error, and success states for the UI.
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [selectedLineSeries, setSelectedLineSeries] = useState(["portfolio", "benchmark"]);

  const totalWeight = useMemo(() => {
    // Show the current total weight so users can validate input before submit.
    return form.assets.reduce((sum, asset) => sum + (Number(asset.weight) || 0), 0);
  }, [form.assets]);

  const validationIssues = useMemo(() => {
    // Build user-facing validation messages before a network request is sent.
    const issues = [];
    const tickers = form.assets.map((asset) => asset.ticker);
    const duplicates = tickers.filter((ticker, index) => tickers.indexOf(ticker) !== index);
    const invalidWeight = form.assets.some((asset) => {
      const parsedWeight = Number(asset.weight);
      return Number.isNaN(parsedWeight) || parsedWeight <= 0;
    });

    if (duplicates.length) {
      issues.push(`Duplicate tickers are not allowed: ${[...new Set(duplicates)].join(", ")}`);
    }

    if (invalidWeight) {
      issues.push("Each asset weight must be a valid positive number.");
    }

    if (Math.abs(totalWeight - 100) > 0.001) {
      issues.push("Total asset weight must equal 100% before submitting.");
    }

    if (form.assets.length > 6) {
      issues.push("You can analyze up to 6 assets in the MVP.");
    }

    return issues;
  }, [form.assets, totalWeight]);

  const canSubmit = !isLoading && validationIssues.length === 0;

  async function handleSubmit(event) {
    event.preventDefault();

    setIsLoading(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const payload = buildPayload(form);

      // Send the selected assets and weights to the backend analysis API.
      const response = await fetch(`${API_BASE_URL}/api/v1/analyze`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(getErrorMessage(data));
      }

      setAnalysis(data);
      setSelectedLineSeries(["portfolio", "benchmark", ...payload.assets.map((asset) => asset.ticker)]);
      setSuccessMessage(`Analysis updated successfully for ${payload.assets.length} asset(s).`);
    } catch (error) {
      setAnalysis(null);
      setErrorMessage(error.message || "Something went wrong.");
    } finally {
      setIsLoading(false);
    }
  }

  function updateAsset(index, field, value) {
    // Update one asset row without affecting the others.
    setForm((current) => ({
      ...current,
      assets: current.assets.map((asset, assetIndex) =>
        assetIndex === index ? { ...asset, [field]: value } : asset
      )
    }));
  }

  function addAssetRow() {
    // Add a new asset row and redistribute weights to keep the total at 100%.
    setForm((current) => {
      if (current.assets.length >= 6) {
        return current;
      }

      const nextAssets = [...current.assets, { ticker: getNextTicker(current.assets), weight: "0.00" }];
      return {
        ...current,
        assets: rebalanceAssets(nextAssets)
      };
    });

    setSuccessMessage("Weights were rebalanced automatically after adding an asset.");
    setErrorMessage("");
  }

  function removeAssetRow(index) {
    // Keep at least one asset row so the input panel is never empty.
    if (form.assets.length === 1) {
      return;
    }

    setForm((current) => ({
      ...current,
      assets: rebalanceAssets(current.assets.filter((_, assetIndex) => assetIndex !== index))
    }));

    setSuccessMessage("Weights were rebalanced automatically after removing an asset.");
    setErrorMessage("");
  }

  function isTickerDisabled(option, rowIndex) {
    // Prevent duplicate stock selection across asset rows.
    return form.assets.some((asset, assetIndex) => assetIndex !== rowIndex && asset.ticker === option);
  }

  function toggleLineSeries(seriesKey) {
    // Let users decide which lines should appear on the comparison chart.
    setSelectedLineSeries((current) => {
      if (current.includes(seriesKey)) {
        if (current.length === 1) {
          return current;
        }
        return current.filter((item) => item !== seriesKey);
      }

      return [...current, seriesKey];
    });
  }

  const metricCards = analysis
    ? [
        ["Cumulative Return", analysis.metrics.cumulative_return],
        ["Annualized Return", analysis.metrics.annualized_return],
        ["Annualized Volatility", analysis.metrics.annualized_volatility],
        ["Sharpe Ratio", analysis.metrics.sharpe_ratio],
        ["Max Drawdown", analysis.metrics.max_drawdown]
      ]
    : [];

  const lineChartData = useMemo(() => {
    // Flatten nested asset values so Recharts can draw each ticker as its own line.
    return (analysis?.charts?.portfolio_vs_benchmark || []).map((point) => ({
      date: point.date,
      portfolio: point.portfolio,
      benchmark: point.benchmark,
      ...point.assets
    }));
  }, [analysis]);

  const lineSeries = useMemo(() => {
    // Build a legend/control list from the currently loaded analysis payload.
    const assetSeries = analysis?.charts?.allocation?.map((item) => item.ticker) || [];
    return [
      { key: "portfolio", label: "Portfolio" },
      { key: "benchmark", label: form.benchmark },
      ...assetSeries.map((ticker) => ({ key: ticker, label: ticker }))
    ];
  }, [analysis, form.benchmark]);

  const allocationData =
    analysis?.charts?.allocation?.map((item) => ({
      name: item.ticker,
      value: item.weight
    })) || [];
  const drawdownData = analysis?.charts?.drawdown || [];
  const correlationData = analysis?.charts?.correlation_matrix || [];

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(11,110,79,0.12),_transparent_30%),linear-gradient(180deg,_#f8fafc_0%,_#eef2f6_100%)] text-ink">
      <main className="mx-auto flex min-h-screen max-w-7xl flex-col gap-10 px-6 py-8 md:px-10">
        <section className="grid gap-6 lg:grid-cols-[1.08fr_0.92fr]">
          <div className="rounded-[32px] border border-white/70 bg-white/80 p-8 shadow-panel backdrop-blur">
            <p className="mb-4 text-sm font-semibold uppercase tracking-[0.2em] text-slate">
              AI-Enhanced Portfolio Analysis Tool
            </p>
            <h1 className="max-w-3xl text-4xl font-semibold leading-tight md:text-6xl">
              Build a portfolio, compare it to a benchmark, and explain the result.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-slate md:text-lg">
              This version focuses on stronger validation, clearer chart formatting, and
              a more demo-ready frontend experience.
            </p>

            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              <div className="rounded-3xl bg-surface p-5 ring-1 ring-mist">
                <p className="text-sm text-slate">Current stage</p>
                <p className="mt-2 text-2xl font-semibold">Validated Dashboard</p>
              </div>
              <div className="rounded-3xl bg-accent px-5 py-5 text-white">
                <p className="text-sm text-white/80">Connected endpoint</p>
                <p className="mt-2 text-2xl font-semibold">POST /api/v1/analyze</p>
              </div>
            </div>
          </div>

          <form
            onSubmit={handleSubmit}
            className="rounded-[36px] border border-white/70 bg-[#0F172A] p-8 text-white shadow-panel"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-semibold">Input Panel</h2>
              <button
                type="button"
                onClick={addAssetRow}
                disabled={form.assets.length >= 6}
                className="rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-40"
              >
                + Add Asset
              </button>
            </div>

            <div className="mt-6 space-y-4">
              {form.assets.map((asset, index) => (
                <div
                  key={`${asset.ticker}-${index}`}
                  className="rounded-3xl border border-white/10 bg-white/5 p-4"
                >
                  <div className="mb-3 flex items-center justify-between">
                    <p className="text-sm font-semibold text-white/70">Asset {index + 1}</p>
                    {form.assets.length > 1 ? (
                      <button
                        type="button"
                        onClick={() => removeAssetRow(index)}
                        className="text-sm font-semibold text-red-200 transition hover:text-red-100"
                      >
                        Remove
                      </button>
                    ) : null}
                  </div>

                  <div className="grid gap-4 sm:grid-cols-[1.2fr_0.8fr]">
                    <label className="block">
                      <span className="mb-2 block text-sm text-white/70">Stock</span>
                      <select
                        className="w-full rounded-2xl border border-white/10 bg-[#20273A] px-4 py-3 outline-none transition focus:border-white/40"
                        value={asset.ticker}
                        onChange={(event) => updateAsset(index, "ticker", event.target.value)}
                      >
                        {stockOptions.map((option) => (
                          <option key={option} value={option} disabled={isTickerDisabled(option, index)}>
                            {option}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="block">
                      <span className="mb-2 block text-sm text-white/70">Weight (%)</span>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="0.01"
                        className="w-full rounded-2xl border border-white/10 bg-[#20273A] px-4 py-3 outline-none transition focus:border-white/40"
                        value={asset.weight}
                        onChange={(event) => updateAsset(index, "weight", event.target.value)}
                      />
                    </label>
                  </div>
                </div>
              ))}

              <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/80">
                Total Weight:{" "}
                <span className={Math.abs(totalWeight - 100) <= 0.001 ? "font-semibold text-emerald-300" : "font-semibold text-amber-300"}>
                  {totalWeight.toFixed(2)}%
                </span>
              </div>

              {validationIssues.length ? (
                <div className="rounded-2xl border border-amber-300/30 bg-amber-500/10 px-4 py-3 text-sm leading-6 text-amber-100">
                  {validationIssues.map((issue) => (
                    <p key={issue}>{issue}</p>
                  ))}
                </div>
              ) : (
                <div className="rounded-2xl border border-emerald-300/20 bg-emerald-500/10 px-4 py-3 text-sm leading-6 text-emerald-100">
                  The form is valid and ready to submit.
                </div>
              )}

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-2 block text-sm text-white/70">Date Range</span>
                  <select
                    className="w-full rounded-2xl border border-white/10 bg-[#20273A] px-4 py-3 outline-none"
                    value={form.lookbackPeriod}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        lookbackPeriod: event.target.value
                      }))
                    }
                  >
                    <option value="1y">1 Year</option>
                    <option value="3y">3 Years</option>
                    <option value="5y">5 Years</option>
                  </select>
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm text-white/70">Benchmark</span>
                  <select
                    className="w-full rounded-2xl border border-white/10 bg-[#20273A] px-4 py-3 outline-none"
                    value={form.benchmark}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, benchmark: event.target.value }))
                    }
                  >
                    {benchmarkOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </div>

            {errorMessage ? (
              <div className="mt-5 rounded-2xl border border-red-300/30 bg-red-500/10 px-4 py-3 text-sm leading-6 text-red-100">
                {errorMessage}
              </div>
            ) : null}

            {successMessage ? (
              <div className="mt-5 rounded-2xl border border-emerald-300/30 bg-emerald-500/10 px-4 py-3 text-sm leading-6 text-emerald-100">
                {successMessage}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={!canSubmit}
              className="mt-6 w-full rounded-2xl bg-white px-4 py-3 font-semibold text-ink transition hover:bg-accentSoft disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isLoading ? "Running Analysis..." : "Run Analysis"}
            </button>
          </form>
        </section>

        <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-5">
          {isLoading ? (
            Array.from({ length: 5 }).map((_, index) => (
              <article key={index} className="animate-pulse rounded-[28px] bg-white p-6 shadow-panel ring-1 ring-mist">
                <div className="h-4 w-24 rounded bg-slate-200" />
                <div className="mt-4 h-8 w-28 rounded bg-slate-200" />
              </article>
            ))
          ) : metricCards.length ? (
            metricCards.map(([label, value]) => (
              <article
                key={label}
                className="rounded-[28px] bg-white p-6 shadow-panel ring-1 ring-mist"
              >
                <p className="text-sm text-slate">{label}</p>
                <p className="mt-3 text-3xl font-semibold">
                  {formatMetricValue(label, value)}
                </p>
              </article>
            ))
          ) : (
            <article className="rounded-[28px] bg-white p-6 shadow-panel ring-1 ring-mist md:col-span-2 xl:col-span-5">
              <p className="text-sm text-slate">
                No analysis loaded yet. Submit the form to render live results.
              </p>
            </article>
          )}
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.35fr_0.65fr]">
          <article className="rounded-[32px] bg-white p-6 shadow-panel ring-1 ring-mist">
            <div className="mb-4 flex flex-col gap-3">
              <div>
                <h2 className="text-xl font-semibold">Portfolio vs Benchmark</h2>
                <p className="text-sm text-slate">
                  Percentage performance since the start of the selected analysis window.
                </p>
              </div>
              {lineSeries.length ? (
                <div className="flex flex-wrap gap-2">
                  {lineSeries.map((series, index) => (
                    <button
                      key={series.key}
                      type="button"
                      onClick={() => toggleLineSeries(series.key)}
                      className={`rounded-full border px-3 py-1.5 text-sm font-medium transition ${
                        selectedLineSeries.includes(series.key)
                          ? "border-transparent text-white"
                          : "border-slate-200 bg-white text-slate-600"
                      }`}
                      style={
                        selectedLineSeries.includes(series.key)
                          ? { backgroundColor: chartColors[index % chartColors.length] }
                          : undefined
                      }
                    >
                      {series.label}
                    </button>
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
                  {lineSeries.map((series, index) =>
                    selectedLineSeries.includes(series.key) ? (
                      <Line
                        key={series.key}
                        type="monotone"
                        dataKey={series.key}
                        name={series.label}
                        stroke={chartColors[index % chartColors.length]}
                        strokeWidth={3}
                        dot={false}
                      />
                    ) : null
                  )}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </article>

          <article className="rounded-[32px] bg-white p-6 shadow-panel ring-1 ring-mist">
            <h2 className="text-xl font-semibold">Allocation</h2>
            <p className="mt-1 text-sm text-slate">Submitted portfolio weights.</p>
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
            <div className="grid grid-cols-2 gap-3">
              {allocationData.map((item, index) => (
                <div key={item.name} className="rounded-2xl bg-surface px-3 py-2 text-sm">
                  <span
                    className="mr-2 inline-block h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: chartColors[index % chartColors.length] }}
                  />
                  {item.name} {formatDisplayWeight(item.value)}%
                </div>
              ))}
            </div>
          </article>
        </section>

        <section className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
          <article className="rounded-[32px] bg-white p-6 shadow-panel ring-1 ring-mist">
            <div className="mb-4">
              <h2 className="text-xl font-semibold">Drawdown Chart</h2>
              <p className="text-sm text-slate">
                Historical drawdown shown as percentage below the running portfolio peak.
              </p>
            </div>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={drawdownData}>
                  <CartesianGrid stroke="#EAECF0" vertical={false} />
                  <XAxis dataKey="date" stroke="#667085" />
                  <YAxis stroke="#667085" tickFormatter={(value) => `${value.toFixed(0)}%`} />
                  <Tooltip formatter={(value) => formatChartPercent(value)} />
                  <Line type="monotone" dataKey="drawdown" stroke="#B42318" strokeWidth={3} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </article>

          <article className="rounded-[32px] bg-white p-6 shadow-panel ring-1 ring-mist">
            <div className="mb-4">
              <h2 className="text-xl font-semibold">Correlation Heatmap</h2>
              <p className="text-sm text-slate">
                High correlation suggests that holdings may move together during stress periods.
              </p>
            </div>

            {correlationData.length ? (
              <>
                <div className="mb-4 flex flex-col gap-3">
                  <div className="relative h-3 overflow-hidden rounded-full bg-slate-100 ring-1 ring-slate-200">
                    <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(21,112,239,0.95)_0%,rgba(21,112,239,0.2)_35%,rgba(248,250,252,1)_50%,rgba(11,110,79,0.2)_65%,rgba(11,110,79,0.95)_100%)]" />
                  </div>
                  <div className="flex items-center justify-between text-xs text-slate">
                    <span>-1.00</span>
                    <span>-0.50</span>
                    <span>0.00</span>
                    <span>0.50</span>
                    <span>1.00</span>
                  </div>
                  <div className="flex flex-wrap gap-2 text-xs text-slate">
                    <span className="rounded-full bg-[#1570EF]/15 px-3 py-1 text-[#155EEF]">Negative</span>
                    <span className="rounded-full bg-slate-200 px-3 py-1 text-slate-700">Neutral</span>
                    <span className="rounded-full bg-[#0B6E4F]/15 px-3 py-1 text-[#0B6E4F]">Positive</span>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full border-separate border-spacing-2 text-sm">
                    <thead>
                      <tr>
                        <th className="px-3 py-2 text-left text-slate">Ticker</th>
                        {correlationData.map((column) => (
                          <th key={column.ticker} className="px-3 py-2 text-left text-slate">
                            {column.ticker}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {correlationData.map((row) => (
                        <tr key={row.ticker}>
                          <td className="px-3 py-2 font-semibold text-ink">{row.ticker}</td>
                          {correlationData.map((column) => {
                            const value = row.values[column.ticker];
                            return (
                              <td
                                key={`${row.ticker}-${column.ticker}`}
                                className={`rounded-xl px-3 py-2 font-medium ${getCorrelationCellClass(value)}`}
                                style={getCorrelationCellStyle(value)}
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
        </section>

        <section className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <article className="rounded-[32px] border border-[#D0D5DD] bg-white p-6 shadow-panel">
            <h2 className="text-xl font-semibold">Interaction Notes</h2>
            <ul className="mt-4 space-y-3 text-sm leading-6 text-slate">
              <li>Duplicate stock selection is blocked at the dropdown level.</li>
              <li>Weights rebalance automatically whenever rows are added or removed.</li>
              <li>The submit button stays disabled until the total weight equals 100%.</li>
              <li>The main line chart now supports portfolio, benchmark, and individual stock toggles.</li>
            </ul>
          </article>

          <article className="rounded-[32px] bg-[#101828] p-6 text-white shadow-panel">
            <h2 className="text-xl font-semibold">AI Summary Module</h2>
            <p className="mt-4 text-sm leading-7 text-white/75">
              This section reads the summary field returned by the backend response.
            </p>
            <div className="mt-6 rounded-3xl border border-white/10 bg-white/5 p-5 text-sm leading-7 text-white/90">
              {analysis?.summary ||
                "Submit an analysis request to load the backend summary here."}
            </div>
          </article>
        </section>
      </main>
    </div>
  );
}

export default App;
