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

const dashboardTabs = [
  { key: "overview", label: "Overview" },
  { key: "risk", label: "Risk Analytics" },
  { key: "scenario", label: "Scenario Lab" },
  { key: "guide", label: "Index Guide" }
];

const formulaLibrary = {
  cumulativeReturn: (
    <>
      Cumulative Return = Π(1 + r<sub>t</sub>) - 1
    </>
  ),
  benchmarkReturn: (
    <>
      Benchmark Return = Π(1 + r<sub>m,t</sub>) - 1
    </>
  ),
  relativePerformance: (
    <>
      Relative Performance = Portfolio Return - Benchmark Return
    </>
  ),
  annualizedReturn: (
    <>
      Annualized Return = (1 + Cumulative Return)
      <sup>(252 / N)</sup> - 1
    </>
  ),
  annualizedVolatility: (
    <>
      Annualized Volatility = std(r<sub>daily</sub>) × √252
    </>
  ),
  sharpeRatio: (
    <>
      Sharpe = (Annualized Return - Risk Free Rate) / Annualized Volatility
    </>
  ),
  sortinoRatio: (
    <>
      Sortino = (Annualized Return - Risk Free Rate) / Downside Deviation
    </>
  ),
  downsideDeviation: (
    <>
      Downside Deviation = std(r<sub>t</sub> | r<sub>t</sub> &lt; 0) × √252
    </>
  ),
  beta: (
    <>
      Beta = Cov(r<sub>p</sub>, r<sub>m</sub>) / Var(r<sub>m</sub>)
    </>
  ),
  rollingBeta: (
    <>
      Rolling Beta<sub>t</sub> = Cov<sub>window</sub>(r<sub>p</sub>, r<sub>m</sub>) / Var<sub>window</sub>(r<sub>m</sub>)
    </>
  ),
  var95: (
    <>
      VaR<sub>95</sub> = 5th percentile of daily returns
    </>
  ),
  cvar95: (
    <>
      CVaR<sub>95</sub> = E[r<sub>t</sub> | r<sub>t</sub> ≤ VaR<sub>95</sub>]
    </>
  ),
  rollingVolatility: (
    <>
      Rolling Volatility<sub>t</sub> = std<sub>window</sub>(r<sub>p</sub>) × √252
    </>
  ),
  maxDrawdown: (
    <>
      Drawdown<sub>t</sub> = (Wealth<sub>t</sub> / Peak<sub>t</sub>) - 1
    </>
  ),
  correlation: (
    <>
      Corr(i, j) = Cov(r<sub>i</sub>, r<sub>j</sub>) / (σ<sub>i</sub> × σ<sub>j</sub>)
    </>
  ),
  riskContribution: (
    <>
      RC<sub>i</sub> = w<sub>i</sub>(Σw)<sub>i</sub> / σ<sub>p</sub>
    </>
  ),
  topHolding: (
    <>
      Top Holding Weight = max(w<sub>i</sub>)
    </>
  ),
  topThree: (
    <>
      Top 3 Holdings = sum of the three largest w<sub>i</sub> values
    </>
  ),
  herfindahl: (
    <>
      HHI = Σ(w<sub>i</sub>
      <sup>2</sup>)
    </>
  ),
  effectiveHoldings: (
    <>
      Effective Holdings = 1 / HHI
    </>
  ),
  scenarioCore: (
    <>
      R<sub>p</sub>(scenario) = Σ w<sub>i</sub> · s<sub>i</sub>
    </>
  ),
  marketShock: (
    <>
      s<sub>i</sub> = β<sub>i</sub>
      <sup>(mkt)</sup> · S<sub>m</sub>
    </>
  ),
  technologyShock: (
    <>
      Stock Shock = S<sub>tech</sub>; ETF Shock = Exposure<sub>tech</sub> · S<sub>tech</sub>
    </>
  )
};

const indexGuideSections = [
  {
    title: "Performance Metrics",
    items: [
      {
        name: "Cumulative Return",
        definition: "Shows the total portfolio gain or loss across the selected analysis window.",
        formula: formulaLibrary.cumulativeReturn,
        interpretation: "Use it to compare how much the portfolio actually grew or fell over the full period."
      },
      {
        name: "Benchmark Return",
        definition: "Shows the benchmark's cumulative return over the same analysis window.",
        formula: formulaLibrary.benchmarkReturn,
        interpretation: "This gives the market reference point used to judge whether the portfolio outperformed or underperformed."
      },
      {
        name: "Relative Performance",
        definition: "Measures the portfolio's excess performance over the benchmark.",
        formula: formulaLibrary.relativePerformance,
        interpretation: "A positive value means the portfolio beat the benchmark. A negative value means it lagged."
      },
      {
        name: "Annualized Return",
        definition: "Converts the total return in the selected window into a one-year equivalent growth rate.",
        formula: formulaLibrary.annualizedReturn,
        interpretation: "This is useful when you want returns from different lookback windows to be comparable on the same scale."
      }
    ]
  },
  {
    title: "Volatility and Downside Risk",
    items: [
      {
        name: "Annualized Volatility",
        definition: "Measures how unstable the portfolio's daily returns are, scaled to a yearly basis.",
        formula: formulaLibrary.annualizedVolatility,
        interpretation: "Higher volatility means larger return swings and a rougher ride for the investor."
      },
      {
        name: "Sharpe Ratio",
        definition: "Measures return earned per unit of total risk.",
        formula: formulaLibrary.sharpeRatio,
        interpretation: "A higher Sharpe ratio suggests stronger risk-adjusted performance, but it treats upside and downside volatility the same."
      },
      {
        name: "Sortino Ratio",
        definition: "Measures return earned per unit of downside risk only.",
        formula: formulaLibrary.sortinoRatio,
        interpretation: "This is often more intuitive than Sharpe because it only penalizes harmful volatility."
      },
      {
        name: "Downside Deviation",
        definition: "Measures only the volatility of negative return observations.",
        formula: formulaLibrary.downsideDeviation,
        interpretation: "This isolates 'bad volatility' and is the denominator used in the Sortino ratio."
      },
      {
        name: "Maximum Drawdown",
        definition: "Shows the worst cumulative drop from a previous portfolio peak to a later trough.",
        formula: formulaLibrary.maxDrawdown,
        interpretation: "This tells you how deep the portfolio fell at its most painful point in the selected window."
      }
    ]
  },
  {
    title: "Tail Risk and Market Sensitivity",
    items: [
      {
        name: "Beta vs Benchmark",
        definition: "Measures how sensitive the portfolio is to moves in the selected benchmark.",
        formula: formulaLibrary.beta,
        interpretation: "Beta above 1 means the portfolio tends to amplify benchmark moves. Beta below 1 means it behaves more defensively."
      },
      {
        name: "Rolling Beta",
        definition: "Tracks how the portfolio's benchmark sensitivity changes across rolling windows.",
        formula: formulaLibrary.rollingBeta,
        interpretation: "This shows whether the portfolio becomes more aggressive or more defensive through time."
      },
      {
        name: "VaR (95%)",
        definition: "Estimates the one-day loss threshold that should not be exceeded with 95% confidence.",
        formula: formulaLibrary.var95,
        interpretation: "It is a threshold, not an average. It says how bad a typical worst-case day can get."
      },
      {
        name: "CVaR (95%)",
        definition: "Measures the average loss when returns are already inside the worst 5% tail.",
        formula: formulaLibrary.cvar95,
        interpretation: "This is more severe than VaR because it describes the average damage inside the tail, not just the cutoff."
      },
      {
        name: "Rolling Volatility",
        definition: "Tracks annualized volatility through time using a rolling lookback window.",
        formula: formulaLibrary.rollingVolatility,
        interpretation: "This helps users see whether portfolio risk is calm, rising, or unstable across different periods."
      }
    ]
  },
  {
    title: "Diversification and Concentration",
    items: [
      {
        name: "Correlation Matrix",
        definition: "Measures how strongly each pair of assets moves together.",
        formula: formulaLibrary.correlation,
        interpretation: "Values near 1 imply similar movement, values near 0 imply weak linear relationship, and values near -1 imply opposite movement."
      },
      {
        name: "Risk Contribution by Asset",
        definition: "Shows how much each holding contributes to total portfolio volatility, not just how large its weight is.",
        formula: formulaLibrary.riskContribution,
        interpretation: "A smaller holding can still be a major risk source if it is volatile and highly correlated with the rest of the portfolio."
      },
      {
        name: "Top Holding Weight",
        definition: "Shows the weight of the single largest portfolio holding.",
        formula: formulaLibrary.topHolding,
        interpretation: "A high value can signal concentration risk even if the portfolio contains several assets."
      },
      {
        name: "Top 3 Holdings",
        definition: "Adds together the weights of the three largest positions.",
        formula: formulaLibrary.topThree,
        interpretation: "This quickly shows whether most capital is clustered in only a few names."
      },
      {
        name: "Herfindahl Index",
        definition: "Measures concentration by summing squared portfolio weights.",
        formula: formulaLibrary.herfindahl,
        interpretation: "A higher HHI means the portfolio is more concentrated and less evenly diversified."
      },
      {
        name: "Effective Holdings",
        definition: "Converts concentration into an intuitive estimate of how many equally weighted holdings the portfolio behaves like.",
        formula: formulaLibrary.effectiveHoldings,
        interpretation: "This is often more intuitive than HHI because it translates concentration into a holding-count style measure."
      }
    ]
  },
  {
    title: "Scenario Analysis",
    items: [
      {
        name: "Scenario Analysis Core Formula",
        definition: "Applies predefined shocks to each asset and estimates the portfolio impact through weighted aggregation.",
        formula: formulaLibrary.scenarioCore,
        interpretation: "It is a stress-testing framework, not a forecast. The key steps are defining a scenario and assigning asset-level shocks."
      },
      {
        name: "Market Shock",
        definition: "Assumes a broad benchmark move and translates it into asset shocks using historical market beta.",
        formula: formulaLibrary.marketShock,
        interpretation: "Assets with higher market beta are expected to move more aggressively when the benchmark is stressed."
      },
      {
        name: "Technology Sector Shock",
        definition: "Applies a direct technology shock to mapped technology stocks and an exposure-weighted shock to ETFs.",
        formula: formulaLibrary.technologyShock,
        interpretation: "This is a first-pass rule-based sector stress test and can later be upgraded to a sector-beta framework."
      }
    ]
  }
];

function formatMetricPercent(value) {
  // Format decimal metrics like 0.1234 into 12.34%.
  return `${(value * 100).toFixed(2)}%`;
}

function formatChartPercent(value) {
  // Format chart values that are already stored as percentage points.
  return `${Number(value).toFixed(2)}%`;
}

function formatSignedMetricPercent(value) {
  // Add a leading plus sign for positive scenario impacts.
  const sign = value > 0 ? "+" : "";
  return `${sign}${(value * 100).toFixed(2)}%`;
}

function formatDisplayWeight(value) {
  // Keep weight labels readable without unnecessary trailing zeroes.
  return Number(value).toFixed(2).replace(/\.00$/, "").replace(/(\.\d)0$/, "$1");
}

function formatMetricValue(label, value) {
  // Show ratios and beta as plain numbers while returns stay as percentages.
  if (["Sharpe Ratio", "Sortino Ratio", "Beta vs Benchmark", "Effective Holdings", "Herfindahl Index"].includes(label)) {
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
  const [activeTab, setActiveTab] = useState("overview");

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

  const overviewMetricCards = analysis
    ? [
        ["Cumulative Return", analysis.metrics.cumulative_return],
        ["Benchmark Return", analysis.metrics.benchmark_cumulative_return],
        ["Relative Performance", analysis.metrics.relative_performance],
        ["Annualized Return", analysis.metrics.annualized_return],
        ["Annualized Volatility", analysis.metrics.annualized_volatility],
        ["Max Drawdown", analysis.metrics.max_drawdown]
      ]
    : [];

  const riskMetricCards = analysis
    ? [
        ["Sharpe Ratio", analysis.metrics.sharpe_ratio],
        ["Sortino Ratio", analysis.metrics.sortino_ratio],
        ["Beta vs Benchmark", analysis.metrics.beta_vs_benchmark],
        ["Downside Deviation", analysis.metrics.downside_deviation],
        ["VaR (95%)", analysis.metrics.var_95],
        ["CVaR (95%)", analysis.metrics.cvar_95]
      ]
    : [];

  const concentrationMetricCards = analysis
    ? [
        ["Top Holding Weight", analysis.metrics.top_holding_weight],
        ["Top 3 Holdings", analysis.metrics.top_three_weight],
        ["Effective Holdings", analysis.metrics.effective_number_of_holdings],
        ["Herfindahl Index", analysis.metrics.herfindahl_index]
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
  const rollingVolatilityData = analysis?.charts?.rolling_volatility || [];
  const rollingBetaData = analysis?.charts?.rolling_beta || [];
  const correlationData = analysis?.charts?.correlation_matrix || [];
  const riskContributionData = analysis?.charts?.risk_contribution || [];
  const worstDrawdownPeriods = analysis?.charts?.worst_drawdown_periods || [];
  const scenarioCards = analysis
    ? [analysis.scenarios.market_shock, analysis.scenarios.sector_shock]
    : [];

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
              This version adds a dedicated Risk Analytics view with deeper downside,
              concentration, market-sensitivity, and tail-risk diagnostics.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              {dashboardTabs.map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveTab(tab.key)}
                  className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                    activeTab === tab.key
                      ? "bg-accent text-white"
                      : "bg-surface text-slate ring-1 ring-mist hover:bg-white"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
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

        {activeTab === "overview" ? (
          <>
            <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-6">
              {isLoading ? (
                Array.from({ length: 6 }).map((_, index) => (
                  <article key={index} className="animate-pulse rounded-[28px] bg-white p-6 shadow-panel ring-1 ring-mist">
                    <div className="h-4 w-24 rounded bg-slate-200" />
                    <div className="mt-4 h-8 w-28 rounded bg-slate-200" />
                  </article>
                ))
              ) : overviewMetricCards.length ? (
                overviewMetricCards.map(([label, value]) => (
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
                <article className="rounded-[28px] bg-white p-6 shadow-panel ring-1 ring-mist md:col-span-2 xl:col-span-6">
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

            <section className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
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
                <p className="mt-4 text-sm leading-7 text-white/75">
                  This section reads the summary field returned by the backend response.
                </p>
                <div className="mt-6 rounded-3xl border border-white/10 bg-white/5 p-5 text-sm leading-7 text-white/90">
                  {analysis?.summary ||
                    "Submit an analysis request to load the backend summary here."}
                </div>
              </article>
            </section>
          </>
        ) : activeTab === "risk" ? (
          <>
            <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-6">
              {isLoading ? (
                Array.from({ length: 6 }).map((_, index) => (
                  <article key={index} className="animate-pulse rounded-[28px] bg-white p-6 shadow-panel ring-1 ring-mist">
                    <div className="h-4 w-24 rounded bg-slate-200" />
                    <div className="mt-4 h-8 w-28 rounded bg-slate-200" />
                  </article>
                ))
              ) : riskMetricCards.length ? (
                riskMetricCards.map(([label, value]) => (
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
                <article className="rounded-[28px] bg-white p-6 shadow-panel ring-1 ring-mist md:col-span-2 xl:col-span-6">
                  <p className="text-sm text-slate">
                    No risk analytics loaded yet. Submit the form to render live results.
                  </p>
                </article>
              )}
            </section>

            <section className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
              {concentrationMetricCards.map(([label, value]) => (
                <article key={label} className="rounded-[28px] bg-white p-6 shadow-panel ring-1 ring-mist">
                  <p className="text-sm text-slate">{label}</p>
                  <p className="mt-3 text-3xl font-semibold">
                    {formatMetricValue(label, value)}
                  </p>
                </article>
              ))}
            </section>

            <section className="grid gap-6 xl:grid-cols-[1fr_1fr]">
              <article className="rounded-[32px] bg-white p-6 shadow-panel ring-1 ring-mist">
                <div className="mb-4">
                  <h2 className="text-xl font-semibold">Rolling Volatility</h2>
                  <p className="text-sm text-slate">
                    21-day annualized volatility shows how risk changes through time.
                  </p>
                </div>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={rollingVolatilityData}>
                      <CartesianGrid stroke="#EAECF0" vertical={false} />
                      <XAxis dataKey="date" stroke="#667085" />
                      <YAxis stroke="#667085" tickFormatter={(value) => `${value.toFixed(0)}%`} />
                      <Tooltip formatter={(value) => formatChartPercent(value)} />
                      <Line type="monotone" dataKey="portfolio" stroke="#0B6E4F" strokeWidth={3} dot={false} />
                      <Line type="monotone" dataKey="benchmark" stroke="#98A2B3" strokeWidth={3} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </article>

              <article className="rounded-[32px] bg-white p-6 shadow-panel ring-1 ring-mist">
                <div className="mb-4">
                  <h2 className="text-xl font-semibold">Rolling Beta</h2>
                  <p className="text-sm text-slate">
                    Rolling beta shows how benchmark sensitivity changes through time.
                  </p>
                </div>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={rollingBetaData}>
                      <CartesianGrid stroke="#EAECF0" vertical={false} />
                      <XAxis dataKey="date" stroke="#667085" />
                      <YAxis stroke="#667085" />
                      <Tooltip formatter={(value) => Number(value).toFixed(2)} />
                      <Line type="monotone" dataKey="beta" stroke="#1570EF" strokeWidth={3} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </article>
            </section>

            <section className="grid gap-6 xl:grid-cols-[1fr_1fr]">
              <article className="rounded-[32px] bg-white p-6 shadow-panel ring-1 ring-mist">
                <div className="mb-4">
                  <h2 className="text-xl font-semibold">Risk Contribution by Asset</h2>
                  <p className="text-sm text-slate">
                    This table shows which holdings contribute the most to total portfolio volatility.
                  </p>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
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
                          <td className="py-3 text-[#0B6E4F]">{formatChartPercent(item.risk_contribution_pct)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </article>

              <article className="rounded-[32px] bg-white p-6 shadow-panel ring-1 ring-mist">
                <div className="mb-4">
                  <h2 className="text-xl font-semibold">Worst Drawdown Periods</h2>
                  <p className="text-sm text-slate">
                    The most severe peak-to-trough drawdown episodes in the selected window.
                  </p>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
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
                          <td className="py-3 pr-4 text-rose-700">{formatChartPercent(item.drawdown)}</td>
                          <td className="py-3">{item.duration_days}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </article>
            </section>

            <section className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
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
            </section>
          </>
        ) : activeTab === "scenario" ? (
          <>
            <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
              {scenarioCards.length ? (
                scenarioCards.flatMap((scenario) => [
                  <article
                    key={`${scenario.scenario_type}-portfolio`}
                    className="rounded-[28px] bg-white p-6 shadow-panel ring-1 ring-mist"
                  >
                    <p className="text-sm text-slate">{scenario.scenario_name}</p>
                    <p className="mt-2 text-xs uppercase tracking-[0.18em] text-slate/70">
                      Portfolio Impact
                    </p>
                    <p className="mt-3 text-3xl font-semibold text-rose-700">
                      {formatSignedMetricPercent(scenario.portfolio_estimated_return)}
                    </p>
                  </article>,
                  <article
                    key={`${scenario.scenario_type}-benchmark`}
                    className="rounded-[28px] bg-white p-6 shadow-panel ring-1 ring-mist"
                  >
                    <p className="text-sm text-slate">{scenario.scenario_name}</p>
                    <p className="mt-2 text-xs uppercase tracking-[0.18em] text-slate/70">
                      Benchmark Impact
                    </p>
                    <p className="mt-3 text-3xl font-semibold text-slate-700">
                      {scenario.benchmark_estimated_return !== null
                        ? formatSignedMetricPercent(scenario.benchmark_estimated_return)
                        : "N/A"}
                    </p>
                  </article>,
                  <article
                    key={`${scenario.scenario_type}-relative`}
                    className="rounded-[28px] bg-white p-6 shadow-panel ring-1 ring-mist"
                  >
                    <p className="text-sm text-slate">{scenario.scenario_name}</p>
                    <p className="mt-2 text-xs uppercase tracking-[0.18em] text-slate/70">
                      Relative vs Benchmark
                    </p>
                    <p className={`mt-3 text-3xl font-semibold ${scenario.relative_impact_vs_benchmark >= 0 ? "text-emerald-700" : "text-rose-700"}`}>
                      {scenario.relative_impact_vs_benchmark !== null
                        ? formatSignedMetricPercent(scenario.relative_impact_vs_benchmark)
                        : "N/A"}
                    </p>
                  </article>,
                  <article
                    key={`${scenario.scenario_type}-type`}
                    className="rounded-[28px] bg-white p-6 shadow-panel ring-1 ring-mist"
                  >
                    <p className="text-sm text-slate">{scenario.scenario_name}</p>
                    <p className="mt-2 text-xs uppercase tracking-[0.18em] text-slate/70">
                      Scenario Type
                    </p>
                    <p className="mt-3 text-2xl font-semibold">{scenario.scenario_type.replace("_", " ")}</p>
                  </article>
                ])
              ) : (
                <article className="rounded-[28px] bg-white p-6 shadow-panel ring-1 ring-mist md:col-span-2 xl:col-span-4">
                  <p className="text-sm text-slate">
                    No scenario analysis loaded yet. Submit the form to generate preset stress tests.
                  </p>
                </article>
              )}
            </section>

            <section className="grid gap-6 xl:grid-cols-2">
              {scenarioCards.map((scenario) => (
                <article key={scenario.scenario_type} className="rounded-[32px] bg-white p-6 shadow-panel ring-1 ring-mist">
                  <div className="mb-5">
                    <h2 className="text-xl font-semibold">{scenario.scenario_name}</h2>
                    <p className="mt-1 text-sm text-slate">{scenario.description}</p>
                  </div>

                  <div className="mb-5 flex flex-wrap gap-2">
                    {scenario.assumptions.map((assumption) => (
                      <span
                        key={assumption}
                        className="rounded-full bg-surface px-3 py-1.5 text-xs font-medium text-slate ring-1 ring-mist"
                      >
                        {assumption}
                      </span>
                    ))}
                  </div>

                  <div className="rounded-3xl bg-[#101828] p-5 text-sm leading-7 text-white shadow-panel">
                    {scenario.summary}
                  </div>

                  <div className="mt-6 space-y-4">
                    {scenario.asset_impacts.map((item) => {
                      const maxAbsImpact = Math.max(
                        ...scenario.asset_impacts.map((row) => Math.abs(row.weighted_impact)),
                        0.0001
                      );
                      const barWidth = `${(Math.abs(item.weighted_impact) / maxAbsImpact) * 100}%`;

                      return (
                        <div key={`${scenario.scenario_type}-${item.ticker}`} className="rounded-3xl border border-mist bg-surface p-4">
                          <div className="mb-3 flex items-center justify-between gap-3">
                            <div>
                              <p className="font-semibold text-ink">{item.ticker}</p>
                              <p className="text-sm text-slate">{item.sector}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-sm text-slate">Weighted Impact</p>
                              <p className="font-semibold text-rose-700">
                                {formatSignedMetricPercent(item.weighted_impact)}
                              </p>
                            </div>
                          </div>

                          <div className="h-3 overflow-hidden rounded-full bg-white ring-1 ring-mist">
                            <div
                              className="h-full rounded-full bg-[linear-gradient(90deg,#F04438_0%,#B42318_100%)]"
                              style={{ width: barWidth }}
                            />
                          </div>

                          <div className="mt-3 flex items-center justify-between text-sm text-slate">
                            <span>Asset Shock</span>
                            <span>{formatSignedMetricPercent(item.shock)}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </article>
              ))}
            </section>

            <section className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
              <article className="rounded-[32px] border border-[#D0D5DD] bg-white p-6 shadow-panel">
                <h2 className="text-xl font-semibold">Scenario Lab Notes</h2>
                <ul className="mt-4 space-y-3 text-sm leading-6 text-slate">
                  <li>Market Shock uses historical asset beta to translate a benchmark selloff into asset-level shocks.</li>
                  <li>Technology Sector Shock uses a first-pass sector mapping for stocks and static tech exposure assumptions for ETFs.</li>
                  <li>Scenario analysis is a stress-testing tool, not a forecast of what will actually happen next.</li>
                  <li>The next upgrade can add custom shocks, sector beta, and macro stress libraries.</li>
                </ul>
              </article>

              <article className="rounded-[32px] bg-[#101828] p-6 text-white shadow-panel">
                <h2 className="text-xl font-semibold">Why It Matters</h2>
                <p className="mt-4 text-sm leading-7 text-white/80">
                  The Scenario Lab extends the dashboard beyond historical analysis. It shows how the
                  same portfolio could behave under a broad market selloff or a focused technology shock,
                  making the tool feel more like a practical stress-testing dashboard.
                </p>
              </article>
            </section>
          </>
        ) : (
          <>
            <section className="grid gap-6">
              <article className="rounded-[32px] border border-white/70 bg-white/85 p-8 shadow-panel backdrop-blur">
                <h2 className="text-3xl font-semibold">Index Guide</h2>
                <p className="mt-3 max-w-3xl text-base leading-7 text-slate">
                  This page explains the main portfolio analytics indexes used across the dashboard.
                  Each card includes a plain-English definition, a formula, and a short interpretation
                  so users can understand what the metric means before they react to the number.
                </p>
              </article>
            </section>

            <section className="grid gap-6">
              {indexGuideSections.map((section) => (
                <article key={section.title} className="rounded-[32px] bg-white p-6 shadow-panel ring-1 ring-mist">
                  <div className="mb-5">
                    <h3 className="text-2xl font-semibold">{section.title}</h3>
                  </div>

                  <div className="grid gap-5 xl:grid-cols-2">
                    {section.items.map((item) => (
                      <div key={item.name} className="rounded-[28px] border border-mist bg-surface p-5">
                        <h4 className="text-lg font-semibold text-ink">{item.name}</h4>
                        <div className="mt-4 space-y-3 text-sm leading-7 text-slate">
                          <p>
                            <span className="font-semibold text-ink">Definition: </span>
                            {item.definition}
                          </p>
                          <div className="rounded-2xl bg-white px-4 py-4 font-serif text-[15px] text-ink ring-1 ring-mist">
                            {item.formula}
                          </div>
                          <p>
                            <span className="font-semibold text-ink">Interpretation: </span>
                            {item.interpretation}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </article>
              ))}
            </section>
          </>
        )}
      </main>
    </div>
  );
}

export default App;
