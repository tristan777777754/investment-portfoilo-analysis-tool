import React, { useMemo, useState } from "react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid
} from "recharts";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";

const chartColors = ["#D4B483", "#B5C0CF", "#C88C7A", "#BFA2D8", "#8EA3A6", "#E0C27A", "#9AA4B2", "#D76E6E"];
const stockOptions = ["AAPL", "MSFT", "VOO", "SPY", "QQQ", "NVDA", "META", "AMZN", "GOOGL", "TSLA"];
const benchmarkOptions = ["SPY", "QQQ", "VOO", "DIA", "IWM"];

const defaultForm = {
  assets: [{ ticker: "AAPL", weight: "100.00" }],
  benchmark: "SPY",
  lookbackPeriod: "1y"
};

const dashboardTabs = [
  {
    key: "overview",
    step: "01",
    label: "Snapshot & Performance",
    shortLabel: "Snapshot",
    description: "Start with what the portfolio owns and how it performed versus the benchmark.",
    question: "What do I own, and how did this portfolio actually perform?",
    nextKey: "risk",
    nextLabel: "Risk Diagnostics"
  },
  {
    key: "risk",
    step: "02",
    label: "Risk Diagnostics",
    shortLabel: "Risk",
    description: "Check how much volatility, drawdown, and tail risk were taken to earn that return.",
    question: "Did the portfolio take efficient risk, or did performance come with painful downside?",
    nextKey: "scenario",
    nextLabel: "Scenario Lab"
  },
  {
    key: "scenario",
    step: "03",
    label: "Scenario Lab",
    shortLabel: "Scenario",
    description: "Stress test the portfolio under broad market and technology-specific shocks.",
    question: "If markets get hit, where is this portfolio most fragile?",
    nextKey: "factor",
    nextLabel: "Factor Lens"
  },
  {
    key: "factor",
    step: "04",
    label: "Factor Lens",
    shortLabel: "Factors",
    description: "Understand which structural style exposures help explain the portfolio behavior.",
    question: "What hidden factor exposures are driving the portfolio's return behavior?",
    nextKey: "guide",
    nextLabel: "Index Guide"
  },
  {
    key: "guide",
    step: "05",
    label: "Index Guide",
    shortLabel: "Guide",
    description: "Use the methodology page when you want formulas, definitions, and interpretation rules.",
    question: "What does each metric mean, and how should I read it correctly?",
    nextKey: "overview",
    nextLabel: "Snapshot & Performance"
  }
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
  ),
  factorModel: (
    <>
      R<sub>p</sub> - RF = α + β<sub>mkt</sub>(Mkt-RF) + β<sub>smb</sub>SMB + β<sub>hml</sub>HML + β<sub>mom</sub>MOM + ε
    </>
  ),
  factorAlpha: (
    <>
      α = average excess return not explained by the selected factors
    </>
  ),
  factorRSquared: (
    <>
      R<sup>2</sup> = 1 - SS<sub>residual</sub> / SS<sub>total</sub>
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
  },
  {
    title: "Factor-Based Portfolio Analysis",
    items: [
      {
        name: "Fama-French 3-Factor + Momentum Model",
        definition: "Explains portfolio excess return using market, size, value, and momentum factor returns from Kenneth French daily data.",
        formula: formulaLibrary.factorModel,
        interpretation: "The factor betas show whether the portfolio behaves more like market risk, small-cap risk, value risk, or momentum risk."
      },
      {
        name: "Factor Alpha",
        definition: "Measures the average excess return left over after the selected factors explain the portfolio return.",
        formula: formulaLibrary.factorAlpha,
        interpretation: "Positive alpha can suggest unexplained outperformance, but it should be interpreted carefully because it depends on the selected factors and time window."
      },
      {
        name: "Factor R-Squared",
        definition: "Measures how much of the portfolio's excess-return variation is explained by the factor model.",
        formula: formulaLibrary.factorRSquared,
        interpretation: "A higher value means the selected factor model explains more of the portfolio's movement."
      }
    ]
  }
];

const factorMetricHelp = {
  "Alpha Daily": "Daily alpha is the average daily excess return that the factor model could not explain. Positive alpha means the portfolio earned more than the selected factors alone would imply during this window.",
  "Alpha Annualized": "Annualized alpha converts daily alpha into a one-year equivalent. It is easier to read than daily alpha, but it still depends on the same model and time window.",
  "R-Squared": "R-squared shows how much of the portfolio's excess-return movement is explained by the selected factors. A low value means a lot of the portfolio behavior still comes from stock-specific or unexplained drivers.",
  "Residual Volatility": "Residual volatility is the annualized risk left over after removing the part explained by the factor model. Higher residual volatility means more idiosyncratic or unexplained risk.",
  Observations: "Observations are the number of daily data points used in the regression. More observations usually make the factor estimates more stable."
};

const riskMetricHelp = {
  "Sharpe Ratio": "Sharpe ratio measures return earned per unit of total volatility. Higher is usually better, but it treats upside and downside volatility the same.",
  "Sortino Ratio": "Sortino ratio measures return earned per unit of downside risk only. It is often easier for non-technical users because it focuses on harmful volatility.",
  "Beta vs Benchmark": "Beta shows how sensitive the portfolio is to benchmark moves. Above 1 means it usually moves more aggressively than the benchmark; below 1 means it is more defensive.",
  "Downside Deviation": "Downside deviation measures the volatility of negative returns only. It isolates the 'bad' side of volatility.",
  "VaR (95%)": "VaR estimates a one-day loss threshold. It answers: on a typical bad day, how bad can losses get before entering the worst 5% tail?",
  "CVaR (95%)": "CVaR estimates the average loss once returns are already inside the worst 5% tail. It is usually more severe than VaR."
};

const scenarioMetricHelp = {
  "Portfolio Impact": "This is the estimated portfolio return under the scenario shock. A more negative number means the portfolio is expected to be hit harder.",
  "Benchmark Impact": "This is the estimated benchmark return under the same shock. It gives you a market reference point for comparison.",
  "Relative vs Benchmark": "This compares the portfolio's estimated shock return with the benchmark's estimated shock return. Positive means the portfolio is more resilient; negative means it is more vulnerable.",
  "Scenario Type": "This tells you whether the stress test is broad-market based or sector-specific."
};

function toFiniteNumber(value) {
  // Normalize unknown values into finite numbers so the UI does not crash on unexpected payloads.
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function formatMetricPercent(value) {
  // Format decimal metrics like 0.1234 into 12.34%.
  const parsed = toFiniteNumber(value);
  return parsed === null ? "N/A" : `${(parsed * 100).toFixed(2)}%`;
}

function formatChartPercent(value) {
  // Format chart values that are already stored as percentage points.
  const parsed = toFiniteNumber(value);
  return parsed === null ? "N/A" : `${parsed.toFixed(2)}%`;
}

function formatSignedMetricPercent(value) {
  // Add a leading plus sign for positive scenario impacts.
  const parsed = toFiniteNumber(value);
  if (parsed === null) {
    return "N/A";
  }

  const sign = parsed > 0 ? "+" : "";
  return `${sign}${(parsed * 100).toFixed(2)}%`;
}

function formatDisplayWeight(value) {
  // Keep weight labels readable without unnecessary trailing zeroes.
  const parsed = toFiniteNumber(value);
  return parsed === null ? "N/A" : parsed.toFixed(2).replace(/\.00$/, "").replace(/(\.\d)0$/, "$1");
}

function formatMetricValue(label, value) {
  // Show ratios and beta as plain numbers while returns stay as percentages.
  const parsed = toFiniteNumber(value);
  if (parsed === null) {
    return "N/A";
  }

  if (["Sharpe Ratio", "Sortino Ratio", "Beta vs Benchmark", "Effective Holdings", "Herfindahl Index"].includes(label)) {
    return parsed.toFixed(2);
  }

  return formatMetricPercent(parsed);
}

function formatFactorValue(value) {
  // Keep factor model ratios readable while handling unavailable values safely.
  const parsed = toFiniteNumber(value);
  if (parsed === null) {
    return "N/A";
  }

  return parsed.toFixed(2);
}

function InfoTooltip({ text }) {
  // Show a lightweight hover tooltip without introducing a large custom tooltip system.
  return (
    <span className="group relative inline-flex">
      <span className="inline-flex h-5 w-5 cursor-help items-center justify-center rounded-full bg-surface text-xs font-bold text-slate ring-1 ring-mist">
        i
      </span>
      <span className="pointer-events-none absolute right-0 top-7 z-20 w-72 rounded-2xl bg-[#101828] px-4 py-3 text-xs font-medium leading-6 text-white opacity-0 shadow-2xl transition duration-150 group-hover:opacity-100">
        {text}
      </span>
    </span>
  );
}

class AppErrorBoundary extends React.Component {
  // Catch render-time crashes and show the real error instead of a blank screen.
  constructor(props) {
    super(props);
    this.state = { hasError: false, message: "" };
  }

  static getDerivedStateFromError(error) {
    return {
      hasError: true,
      message: error?.message || "Unknown frontend error"
    };
  }

  componentDidCatch(error) {
    // Keep the original error visible in the browser console for debugging.
    console.error("Portfolio dashboard render error:", error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[linear-gradient(180deg,_#090A0F_0%,_#12141B_46%,_#171922_100%)] px-6 py-10 text-white">
          <div className="mx-auto max-w-3xl rounded-[32px] border border-[#C88C7A]/35 bg-[#101828] p-8 shadow-panel">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#E8D4AF]/70">
              Frontend Error Boundary
            </p>
            <h1 className="mt-3 text-3xl font-semibold">The dashboard hit a render error</h1>
            <p className="mt-4 text-sm leading-7 text-white/85">
              The app no longer stays black. The current frontend error message is shown below so we can debug it directly.
            </p>
            <div className="mt-6 rounded-2xl border border-[#C88C7A]/35 bg-[#C88C7A]/12 px-4 py-4 text-sm leading-7 text-[#F7D2CB]">
              {this.state.message}
            </div>
            <p className="mt-5 text-sm leading-7 text-white/70">
              Refresh the page after the fix, then try Run Analysis again.
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

function LandingPage({ onStart }) {
  // Present a product-style homepage before the user enters the dashboard workspace.
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(212,180,131,0.12),_transparent_20%),radial-gradient(circle_at_82%_18%,_rgba(168,139,181,0.10),_transparent_18%),linear-gradient(180deg,_#090A0F_0%,_#12141B_48%,_#171922_100%)] text-white">
      <main className="mx-auto flex min-h-screen max-w-7xl flex-col px-6 py-8 md:px-10">
        <header className="flex items-center justify-between rounded-full border border-white/10 bg-white/5 px-5 py-3 backdrop-blur">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#E8D4AF]/80">
              Midnight Edition
            </p>
            <h1 className="mt-1 text-lg font-semibold">Portfolio Intelligence Workspace</h1>
          </div>
          <span className="rounded-full border border-[#D4B483]/20 bg-[#D4B483]/10 px-3 py-1 text-xs font-semibold text-[#F2DFC0]">
            AI + Finance + Risk
          </span>
        </header>

        <section className="grid flex-1 items-center gap-10 py-10 lg:grid-cols-[1.08fr_0.92fr]">
          <div className="space-y-8">
            <div className="inline-flex rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white/70 backdrop-blur">
              Build your portfolio. Stress it. Explain it.
            </div>

            <div className="max-w-3xl">
              <h2 className="text-5xl font-semibold leading-[1.05] md:text-7xl">
                Build your portfolio and read it like a real analytics desk.
              </h2>
              <p className="mt-6 max-w-2xl text-base leading-8 text-slate-300 md:text-lg">
                This workspace helps you construct a portfolio, compare it against a benchmark,
                inspect risk, run scenarios, and translate financial indicators into language a
                normal user can actually understand.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-[28px] border border-white/10 bg-white/5 p-5 backdrop-blur">
                <p className="text-sm text-slate-300">Analytics</p>
                <p className="mt-3 text-3xl font-semibold">20+</p>
                <p className="mt-2 text-sm leading-6 text-slate-400">
                  Returns, drawdown, tail risk, factor model, and concentration signals.
                </p>
              </div>
              <div className="rounded-[28px] border border-white/10 bg-white/5 p-5 backdrop-blur">
                <p className="text-sm text-slate-300">Scenario Lab</p>
                <p className="mt-3 text-3xl font-semibold">2</p>
                <p className="mt-2 text-sm leading-6 text-slate-400">
                  Market and technology shock presets to reveal weak points quickly.
                </p>
              </div>
              <div className="rounded-[28px] border border-white/10 bg-white/5 p-5 backdrop-blur">
                <p className="text-sm text-slate-300">Interpretation</p>
                <p className="mt-3 text-3xl font-semibold">AI</p>
                <p className="mt-2 text-sm leading-6 text-slate-400">
                  Hover help and plain-English explanations for non-professional users.
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-[36px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.03))] p-6 shadow-2xl backdrop-blur">
            <div className="rounded-[30px] border border-white/10 bg-[#0F172A] p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/45">
                    Workspace Preview
                  </p>
                  <h3 className="mt-2 text-2xl font-semibold">Deep-night dashboard</h3>
                </div>
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/70">
                  Live workflow
                </span>
              </div>

              <div className="mt-6 grid gap-4 md:grid-cols-[0.7fr_1.3fr]">
                <aside className="rounded-[28px] border border-white/10 bg-white/5 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/40">
                    Modules
                  </p>
                  <div className="mt-4 space-y-2">
                    {["Overview", "Risk Analytics", "Scenario Lab", "Factor Model", "Index Guide"].map((item, index) => (
                      <div
                        key={item}
                        className={`rounded-2xl px-4 py-3 text-sm font-medium ${
                          index === 0
                            ? "bg-[#D4B483]/15 text-[#F2DFC0] ring-1 ring-[#D4B483]/20"
                            : "bg-white/[0.03] text-white/65"
                        }`}
                      >
                        {item}
                      </div>
                    ))}
                  </div>
                </aside>

                <div className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-3">
                    {[
                      ["Return", "+18.4%"],
                      ["VaR (95%)", "-1.07%"],
                      ["Beta", "0.94"]
                    ].map(([label, value]) => (
                      <div key={label} className="rounded-[24px] border border-white/10 bg-white/5 p-4">
                        <p className="text-sm text-white/55">{label}</p>
                        <p className="mt-3 text-2xl font-semibold">{value}</p>
                      </div>
                    ))}
                  </div>

                  <div className="rounded-[28px] border border-white/10 bg-white/5 p-5">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-lg font-semibold">Portfolio Overview</h4>
                        <p className="text-sm text-white/55">Performance, benchmark, and holdings.</p>
                      </div>
                      <span className="rounded-full bg-[#D4B483]/15 px-3 py-1 text-xs font-semibold text-[#F2DFC0]">
                        Ready
                      </span>
                    </div>
                    <div className="mt-5 h-44 rounded-[22px] bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.02))] p-4">
                      <div className="flex h-full items-end gap-3">
                        {[32, 46, 38, 62, 58, 74, 68, 81].map((height, index) => (
                          <div key={index} className="flex-1 rounded-t-2xl bg-[linear-gradient(180deg,#E8D4AF_0%,#C88C7A_100%)]" style={{ height: `${height}%` }} />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <div className="sticky bottom-0 pb-4">
          <div className="mx-auto flex max-w-3xl items-center justify-between rounded-[30px] border border-white/10 bg-black/30 px-5 py-4 shadow-2xl backdrop-blur">
            <div>
              <p className="text-sm font-semibold text-white">Start with the workspace</p>
              <p className="text-sm text-slate-400">
                Build your portfolio, then move through analytics tabs step by step.
              </p>
            </div>
            <button
              type="button"
              onClick={onStart}
              className="rounded-full bg-[linear-gradient(135deg,#E8D4AF_0%,#D4B483_48%,#B68562_100%)] px-6 py-3 text-sm font-semibold text-[#1A140E] transition hover:scale-[1.02]"
            >
              Start Analysis
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}

function describeRiskPosture(metrics) {
  // Translate risk metrics into a simple user-facing portfolio posture.
  if (!metrics) {
    return "";
  }

  const volatility = metrics.annualized_volatility;
  const drawdown = Math.abs(metrics.max_drawdown);
  const beta = metrics.beta_vs_benchmark;

  const volatilityLabel =
    volatility < 0.12 ? "fairly stable" : volatility < 0.2 ? "moderately volatile" : "fairly volatile";
  const drawdownLabel =
    drawdown < 0.08 ? "shallow" : drawdown < 0.18 ? "noticeable" : "deep";
  const betaLabel =
    beta < 0.85 ? "more defensive than the benchmark" : beta > 1.15 ? "more aggressive than the benchmark" : "close to benchmark-like sensitivity";

  return `This portfolio looks ${volatilityLabel}, has experienced a ${drawdownLabel} drawdown profile, and currently behaves ${betaLabel}.`;
}

function getRiskInterpretation(analysis) {
  // Summarize the risk page in plain English for non-technical users.
  if (!analysis?.metrics) {
    return "";
  }

  const { metrics } = analysis;
  const sortinoVsSharpe =
    metrics.sortino_ratio > metrics.sharpe_ratio
      ? "Downside risk looks more manageable than total volatility suggests."
      : "The portfolio's downside risk is almost as important as its total volatility.";
  const varText =
    metrics.var_95 > -0.01
      ? "Typical bad days have been relatively contained."
      : metrics.var_95 > -0.02
        ? "Typical bad days can still be uncomfortable."
        : "The left-tail risk is meaningful, so bad days can be sharp.";

  return `${describeRiskPosture(metrics)} ${sortinoVsSharpe} VaR is ${formatMetricPercent(metrics.var_95)} and CVaR is ${formatMetricPercent(metrics.cvar_95)}, which means ${varText}`;
}

function getScenarioInterpretation(analysis) {
  // Explain the scenario page as a practical stress-test takeaway.
  const marketShock = analysis?.scenarios?.market_shock;
  const sectorShock = analysis?.scenarios?.sector_shock;
  if (!marketShock || !sectorShock) {
    return "";
  }

  const marketRelative =
    marketShock.relative_impact_vs_benchmark > 0
      ? "more resilient than the benchmark"
      : "more vulnerable than the benchmark";
  const sectorRelative =
    sectorShock.relative_impact_vs_benchmark > 0
      ? "holds up better than the benchmark"
      : "gets hit harder than the benchmark";

  return `In the current stress tests, this portfolio looks ${marketRelative} during a broad market selloff, but it ${sectorRelative} when technology takes a direct shock. In simple terms, the portfolio's weak point is more sector-specific than market-wide.`;
}

function getFactorInterpretation(factorModel) {
  // Turn factor betas into a plain-English portfolio profile.
  if (!factorModel?.is_available) {
    return "";
  }

  const exposureMap = Object.fromEntries(
    (factorModel.exposures || []).map((item) => [item.factor, item.beta])
  );

  const smb = exposureMap.SMB ?? 0;
  const hml = exposureMap.HML ?? 0;
  const mom = exposureMap.MOM ?? 0;
  const mkt = exposureMap["Mkt-RF"] ?? 0;

  const sizeStory =
    smb > 0.1
      ? "shows a positive SMB loading in this window, which means returns moved somewhat with the small-minus-big factor, not that the holdings are literally small-cap stocks"
      : smb < -0.1
        ? "shows a negative SMB loading in this window, which means returns moved more like large-cap exposure than small-cap exposure"
        : "does not show a strong size-related factor loading";
  const valueStory =
    hml > 0.1
      ? "shows a positive value loading"
      : hml < -0.1
        ? "shows a mild growth-oriented loading"
        : "does not show a strong value-versus-growth loading";
  const momentumStory =
    mom > 0.1
      ? "still carries a noticeable positive momentum loading"
      : mom < -0.1
        ? "leans against recent momentum winners"
        : "does not have a strong momentum loading";
  const marketStory =
    Math.abs(mkt) < 0.1
      ? "Its returns are not being strongly explained by broad market factor exposure in this model."
      : mkt > 0
        ? "It still moves with broad market risk."
        : "It slightly offsets broad market factor exposure.";
  const fitStory =
    factorModel.r_squared < 0.2
      ? "The factor fit is low, so these factors explain only a small part of what your portfolio is doing."
      : factorModel.r_squared < 0.5
        ? "The factor fit is moderate, so the model explains part of the portfolio behavior but not all of it."
        : "The factor fit is fairly strong, so the model captures a large share of the portfolio behavior.";
  const alphaStory =
    factorModel.alpha_annualized > 0
      ? "The model also shows positive alpha, but because the fit is limited, you should treat that as a hint rather than proof of skill."
      : "The model does not show strong positive alpha after accounting for these factors.";

  return `This portfolio ${sizeStory}, ${valueStory}, and ${momentumStory}. ${marketStory} ${fitStory} ${alphaStory}`;
}

function getExecutiveSummary(analysis, form, factorModel) {
  // Create a top-level summary that connects return, risk, stress, and factor pages together.
  if (!analysis?.metrics) {
    return "Build a portfolio and run the analysis. The workspace will then guide you from holdings and performance into risk, stress testing, and factor interpretation.";
  }

  const relative = analysis.metrics.relative_performance ?? 0;
  const riskPosture = describeRiskPosture(analysis.metrics).toLowerCase();
  const marketRelative = analysis?.scenarios?.market_shock?.relative_impact_vs_benchmark ?? 0;
  const sectorRelative = analysis?.scenarios?.sector_shock?.relative_impact_vs_benchmark ?? 0;
  const factorFit =
    factorModel?.is_available && factorModel.r_squared < 0.2
      ? "Factor fit is still low, so factor results should be treated as directional clues rather than hard labels."
      : factorModel?.is_available
        ? "Factor fit is meaningful enough to use as a supporting explanation layer."
        : "Factor analysis is not currently available for this request.";
  const performanceStory =
    relative >= 0
      ? `The portfolio is ahead of ${form.benchmark} by ${formatMetricPercent(relative)} in this window.`
      : `The portfolio is behind ${form.benchmark} by ${formatMetricPercent(Math.abs(relative))} in this window.`;
  const stressStory =
    sectorRelative < marketRelative
      ? "The bigger weakness currently looks sector-specific rather than purely market-wide."
      : "The portfolio's broad market sensitivity currently matters more than the sector-specific shock in this setup.";

  return `${performanceStory} Overall, the portfolio looks ${riskPosture} ${marketRelative >= 0 ? "It has been relatively resilient against the benchmark in the market shock test." : "It looks more exposed than the benchmark in the market shock test."} ${stressStory} ${factorFit}`;
}

function getSectionNarrative(
  activeTab,
  analysis,
  form,
  factorModel,
  riskInterpretation,
  scenarioInterpretation,
  factorInterpretation
) {
  // Give each page a clear purpose, takeaway, and next step so the dashboard feels guided.
  const currentTab = dashboardTabs.find((tab) => tab.key === activeTab) || dashboardTabs[0];

  const narratives = {
    overview: {
      eyebrow: "Step 1",
      title: "Portfolio Snapshot And Performance",
      purpose: "Start here before looking at deeper analytics. This page tells you what the portfolio owns, how concentrated it is, and whether it actually beat the benchmark.",
      finding: analysis?.metrics
        ? `The current portfolio uses ${form.assets.length} holdings against ${form.benchmark}. ${analysis.metrics.relative_performance >= 0 ? "It outperformed the benchmark." : "It underperformed the benchmark."} The next question is whether that result came from an efficient risk profile.`
        : "No analysis has been run yet, so this page is waiting to become the starting point of the workflow.",
      nextStep: "Go next to Risk Diagnostics to judge whether the return profile was efficient or fragile."
    },
    risk: {
      eyebrow: "Step 2",
      title: "Risk Diagnostics",
      purpose: "This is where performance gets pressure-tested. The goal is to understand volatility, downside risk, drawdown depth, diversification quality, and tail risk.",
      finding: analysis?.metrics
        ? riskInterpretation
        : "Run an analysis first to see how much downside and tail risk the portfolio is carrying.",
      nextStep: "Go next to Scenario Lab to see how this risk profile behaves under explicit stress assumptions."
    },
    scenario: {
      eyebrow: "Step 3",
      title: "Scenario Lab",
      purpose: "Historical returns are backward-looking. This page asks what could happen if the market or a key sector gets hit next.",
      finding: analysis?.scenarios
        ? scenarioInterpretation
        : "Run an analysis first to generate the scenario stress tests.",
      nextStep: "Go next to Factor Lens to understand which structural exposures may be driving that stress behavior."
    },
    factor: {
      eyebrow: "Step 4",
      title: "Factor Lens",
      purpose: "This page is the explanation layer behind return behavior. It estimates whether the portfolio has market, size, value, or momentum tendencies in the selected window.",
      finding: factorModel?.is_available
        ? factorInterpretation
        : "Factor results are not available yet, so this page cannot explain the portfolio through factor exposures.",
      nextStep: "Use the Index Guide last whenever you want definitions, formulas, and interpretation rules for the metrics."
    },
    guide: {
      eyebrow: "Step 5",
      title: "Index Guide",
      purpose: "This page is a reference layer rather than a main decision page. Use it when you want to understand formulas, assumptions, and the meaning behind each metric.",
      finding: "The guide is here to support the workflow, not interrupt it. Users can come here when a metric needs clarification, then jump back into the main analysis path.",
      nextStep: "Loop back to Snapshot & Performance after reading definitions if you want to review the portfolio with more confidence."
    }
  };

  return {
    ...currentTab,
    ...narratives[activeTab]
  };
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
  if (value >= 0.5) return "ring-1 ring-[#D4B483]/35";
  if (value >= 0.15) return "ring-1 ring-[#C88C7A]/30";
  if (value >= -0.15) return "ring-1 ring-white/10";
  if (value >= -0.5) return "ring-1 ring-[#A88BB9]/30";
  return "ring-1 ring-[#8E7DB0]/35";
}

function getCorrelationCellStyle(value) {
  // Use a high-contrast dark-mode heatmap so text stays readable on every cell.
  const clampedValue = Math.max(-1, Math.min(1, value));

  if (clampedValue >= 0) {
    const intensity = clampedValue;
    const alpha = 0.22 + intensity * 0.38;

    return {
      backgroundColor: `rgba(168, 126, 78, ${alpha})`,
      color: "#F8FAFC",
      textShadow: "0 1px 1px rgba(0, 0, 0, 0.35)"
    };
  }

  const intensity = Math.abs(clampedValue);
  const alpha = 0.2 + intensity * 0.36;

  return {
    backgroundColor: `rgba(103, 86, 140, ${alpha})`,
    color: "#F8FAFC",
    textShadow: "0 1px 1px rgba(0, 0, 0, 0.35)"
  };
}

function App() {
  // Store the dynamic asset form rows and global input state.
  const [form, setForm] = useState(defaultForm);
  const [hasStarted, setHasStarted] = useState(false);

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
      setActiveTab("overview");
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

  const lineChartData = useMemo(() => {
    // Flatten nested asset values so Recharts can draw each ticker as its own line.
    return (analysis?.charts?.portfolio_vs_benchmark || []).map((point) => ({
      date: point.date,
      portfolio: point.portfolio,
      benchmark: point.benchmark,
      ...(point.assets || {})
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
  const scenarioCards = analysis?.scenarios
    ? [analysis.scenarios.market_shock, analysis.scenarios.sector_shock].filter(Boolean)
    : [];
  const factorModel = analysis?.factor_model || null;
  const factorExposureData = factorModel?.exposures || [];
  const riskInterpretation = getRiskInterpretation(analysis);
  const scenarioInterpretation = getScenarioInterpretation(analysis);
  const factorInterpretation = getFactorInterpretation(factorModel);
  const executiveSummary = getExecutiveSummary(analysis, form, factorModel);
  const currentJourney = getSectionNarrative(
    activeTab,
    analysis,
    form,
    factorModel,
    riskInterpretation,
    scenarioInterpretation,
    factorInterpretation
  );
  const nextJourney = dashboardTabs.find((tab) => tab.key === currentJourney.nextKey) || dashboardTabs[0];
  const factorMetricCards = factorModel?.is_available
    ? [
        ["Alpha Daily", factorModel.alpha_daily, "percent"],
        ["Alpha Annualized", factorModel.alpha_annualized, "percent"],
        ["R-Squared", factorModel.r_squared, "number"],
        ["Residual Volatility", factorModel.residual_volatility, "percent"],
        ["Observations", factorModel.observations, "integer"]
      ]
    : [];

  if (!hasStarted) {
    return <LandingPage onStart={() => setHasStarted(true)} />;
  }

  return (
    <div className="workspace-dark min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(212,180,131,0.10),_transparent_18%),radial-gradient(circle_at_90%_8%,_rgba(168,139,181,0.08),_transparent_16%),linear-gradient(180deg,_#090A0F_0%,_#12141B_46%,_#171922_100%)] text-white">
      <main className="mx-auto flex min-h-screen w-full max-w-[1580px] flex-col gap-8 px-6 py-8 md:px-10">
        <section className="flex flex-wrap items-center justify-between gap-4 rounded-[28px] border border-white/10 bg-white/[0.04] px-5 py-4 backdrop-blur">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#E8D4AF]/70">
              Guided Analysis Workspace
            </p>
            <h2 className="mt-1 text-xl font-semibold text-white">Portfolio Intelligence Dashboard</h2>
          </div>
          <div className="flex items-center gap-3">
            <div className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/75">
              Current Step: {currentJourney.step} {currentJourney.shortLabel}
            </div>
            <button
              type="button"
              onClick={() => setHasStarted(false)}
              className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white/80 transition hover:bg-white/10"
            >
              Back To Home
            </button>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[15.5rem_minmax(0,1fr)]">
          <aside className="sticky top-8 self-start rounded-[28px] border border-white/10 bg-white/[0.04] p-4 shadow-panel backdrop-blur">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#E8D4AF]/70">
              Analysis Journey
            </p>
            <h1 className="mt-3 text-xl font-semibold text-white">Follow the portfolio story</h1>
            <p className="mt-3 text-sm leading-6 text-slate">
              Move from snapshot, to risk, to stress testing, to factor explanation. The order is designed to help users understand what to look at next.
            </p>

            <div className="mt-6 space-y-3">
              {dashboardTabs.map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveTab(tab.key)}
                  className={`w-full rounded-[22px] px-3.5 py-3.5 text-left transition ${
                    activeTab === tab.key
                      ? "bg-[linear-gradient(135deg,rgba(232,212,175,0.16)_0%,rgba(200,140,122,0.14)_100%)] text-[#F4E7CF] ring-1 ring-[#D4B483]/20"
                      : "bg-white/5 text-white/75 ring-1 ring-white/10 hover:bg-white/10"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/45">
                        Step {tab.step}
                      </p>
                      <p className="mt-1 text-[13px] font-semibold leading-5">{tab.label}</p>
                    </div>
                    <span className="rounded-full border border-white/10 px-2.5 py-1 text-[11px] font-semibold text-white/55">
                      {tab.shortLabel}
                    </span>
                  </div>
                  <p className="mt-2.5 text-[11px] leading-5 text-white/60">{tab.description}</p>
                </button>
              ))}
            </div>
          </aside>

          <div className="min-w-0 space-y-6">
            <section className="rounded-[32px] border border-white/10 bg-white/[0.05] p-6 shadow-panel backdrop-blur">
              <div className="grid gap-6 2xl:grid-cols-[1.1fr_0.9fr]">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#E8D4AF]/70">
                    Executive Summary
                  </p>
                  <h1 className="mt-3 text-3xl font-semibold leading-tight text-white">
                    Read the portfolio in a guided order, not as isolated tabs.
                  </h1>
                  <p className="mt-4 max-w-3xl text-sm leading-7 text-slate md:text-base">
                    {executiveSummary}
                  </p>
                </div>
                <div className="rounded-[28px] border border-white/10 bg-black/20 p-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/45">
                    What this workspace does
                  </p>
                  <ul className="mt-4 space-y-3 text-sm leading-6 text-white/80">
                    <li>Start with what the portfolio owns and how it performed.</li>
                    <li>Judge whether the result came with efficient or painful risk.</li>
                    <li>Stress test the weak points under market and sector shocks.</li>
                    <li>Use factors and the guide page as the explanation layer.</li>
                  </ul>
                </div>
              </div>
            </section>

            <section className="rounded-[32px] border border-white/10 bg-white/[0.05] p-6 shadow-panel backdrop-blur">
              <div className="grid gap-5 2xl:grid-cols-[1.05fr_0.95fr]">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#E8D4AF]/70">
                    {currentJourney.eyebrow}
                  </p>
                  <h2 className="mt-3 text-3xl font-semibold text-white">{currentJourney.title}</h2>
                  <p className="mt-4 text-sm leading-7 text-slate">
                    {currentJourney.purpose}
                  </p>
                </div>
                <div className="space-y-4">
                  <div className="rounded-[24px] border border-white/10 bg-black/20 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/45">
                      Question This Section Answers
                    </p>
                    <p className="mt-3 text-sm leading-7 text-white/85">{currentJourney.question}</p>
                  </div>
                  <div className="rounded-[24px] border border-white/10 bg-black/20 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/45">
                      Recommended Next Step
                    </p>
                    <div className="mt-3 flex items-center justify-between gap-3">
                      <p className="text-sm leading-7 text-white/85">{currentJourney.nextStep}</p>
                      <button
                        type="button"
                        onClick={() => setActiveTab(nextJourney.key)}
                        className="shrink-0 rounded-full bg-[linear-gradient(135deg,#E8D4AF_0%,#D4B483_48%,#B68562_100%)] px-4 py-2 text-xs font-semibold text-[#1A140E] transition hover:brightness-110"
                      >
                        Go To {nextJourney.shortLabel}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <section className="rounded-[32px] bg-[#101828] p-6 text-white shadow-panel">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/60">
                What We Found
              </p>
              <p className="mt-4 text-sm leading-7 text-white/85">{currentJourney.finding}</p>
            </section>

            <div className="grid gap-6 2xl:grid-cols-[minmax(0,1fr)_21rem]">
          <form
            onSubmit={handleSubmit}
            className="sticky top-8 self-start rounded-[36px] border border-white/10 bg-[#0F172A] p-6 text-white shadow-panel max-h-[calc(100vh-6rem)] overflow-hidden 2xl:order-2"
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

            <div className="mt-6 flex h-[calc(100%-3.5rem)] flex-col">
              <div className="max-h-[18.5rem] space-y-4 overflow-y-auto pr-2">
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
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/80">
                Total Weight:{" "}
                <span className={Math.abs(totalWeight - 100) <= 0.001 ? "font-semibold text-[#E7CDA0]" : "font-semibold text-[#DDB78C]"}>
                  {totalWeight.toFixed(2)}%
                </span>
              </div>

              {validationIssues.length ? (
                <div className="rounded-2xl border border-[#D4B483]/30 bg-[#D4B483]/10 px-4 py-3 text-sm leading-6 text-[#F1E0BF]">
                  {validationIssues.map((issue) => (
                    <p key={issue}>{issue}</p>
                  ))}
                </div>
              ) : (
                <div className="rounded-2xl border border-[#D4B483]/25 bg-[#D4B483]/12 px-4 py-3 text-sm leading-6 text-[#F2E3C6]">
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
              <div className="mt-5 rounded-2xl border border-[#C88C7A]/35 bg-[#C88C7A]/14 px-4 py-3 text-sm leading-6 text-[#F7D2CB]">
                {errorMessage}
              </div>
            ) : null}

            {successMessage ? (
              <div className="mt-5 rounded-2xl border border-[#D4B483]/25 bg-[#D4B483]/12 px-4 py-3 text-sm leading-6 text-[#F2E3C6]">
                {successMessage}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={!canSubmit}
              className="mt-6 w-full rounded-2xl bg-[linear-gradient(135deg,#E8D4AF_0%,#D4B483_48%,#B68562_100%)] px-4 py-3 font-semibold text-[#1A140E] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isLoading ? "Running Analysis..." : "Run Analysis"}
            </button>
          </form>
              <div className="min-w-0 space-y-6 2xl:order-1">

        {activeTab === "overview" ? (
          <>
            <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
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

            <section className="grid gap-6 2xl:grid-cols-[1.35fr_0.65fr]">
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
            <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
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
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-sm text-slate">{label}</p>
                      <InfoTooltip text={riskMetricHelp[label]} />
                    </div>
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

            <section className="grid gap-6 md:grid-cols-2 2xl:grid-cols-4">
              {concentrationMetricCards.map(([label, value]) => (
                <article key={label} className="rounded-[28px] bg-white p-6 shadow-panel ring-1 ring-mist">
                  <p className="text-sm text-slate">{label}</p>
                  <p className="mt-3 text-3xl font-semibold">
                    {formatMetricValue(label, value)}
                  </p>
                </article>
              ))}
            </section>

            <section className="grid gap-6 2xl:grid-cols-[1fr_1fr]">
              <article className="rounded-[32px] bg-[#101828] p-6 text-white shadow-panel">
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-white/60">
                  Interpretation Layer
                </p>
                <h2 className="mt-3 text-2xl font-semibold">What The Risk Metrics Suggest</h2>
                <p className="mt-4 text-sm leading-7 text-white/85">
                  {riskInterpretation}
                </p>
              </article>

              <article className="rounded-[32px] border border-[#D0D5DD] bg-white p-6 shadow-panel">
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate">
                  How To Read It
                </p>
                <h2 className="mt-3 text-2xl font-semibold">Risk Does Not Mean Good Or Bad By Itself</h2>
                <p className="mt-4 text-sm leading-7 text-slate">
                  A higher-risk portfolio is not automatically bad, and a lower-risk portfolio is not automatically good. The key question is whether the return, drawdown, and tail-risk profile match the type of investor the portfolio is meant for.
                </p>
              </article>
            </section>

            <section className="grid gap-6 2xl:grid-cols-[1fr_1fr]">
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
                      <Line type="monotone" dataKey="portfolio" stroke="#D4B483" strokeWidth={3} dot={false} />
                      <Line type="monotone" dataKey="benchmark" stroke="#B5C0CF" strokeWidth={3} dot={false} />
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
                      <div className="relative h-3 overflow-hidden rounded-full bg-white/5 ring-1 ring-white/10">
                        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(142,125,176,0.95)_0%,rgba(142,125,176,0.28)_35%,rgba(44,49,63,1)_50%,rgba(212,180,131,0.28)_65%,rgba(212,180,131,0.95)_100%)]" />
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
                      <Line type="monotone" dataKey="drawdown" stroke="#C88C7A" strokeWidth={3} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </article>
            </section>
          </>
        ) : activeTab === "scenario" ? (
          <>
            <section className="grid gap-5 md:grid-cols-2 2xl:grid-cols-4">
              {scenarioCards.length ? (
                scenarioCards.flatMap((scenario) => [
                  <article
                    key={`${scenario.scenario_type}-portfolio`}
                    className="rounded-[28px] bg-white p-6 shadow-panel ring-1 ring-mist"
                  >
                    <p className="text-sm text-slate">{scenario.scenario_name}</p>
                    <div className="mt-2 flex items-start justify-between gap-3">
                      <p className="text-xs uppercase tracking-[0.18em] text-slate/70">
                        Portfolio Impact
                      </p>
                      <InfoTooltip text={scenarioMetricHelp["Portfolio Impact"]} />
                    </div>
                    <p className="mt-3 text-3xl font-semibold text-[#F1B0A3]">
                      {formatSignedMetricPercent(scenario.portfolio_estimated_return)}
                    </p>
                  </article>,
                  <article
                    key={`${scenario.scenario_type}-benchmark`}
                    className="rounded-[28px] bg-white p-6 shadow-panel ring-1 ring-mist"
                  >
                    <p className="text-sm text-slate">{scenario.scenario_name}</p>
                    <div className="mt-2 flex items-start justify-between gap-3">
                      <p className="text-xs uppercase tracking-[0.18em] text-slate/70">
                        Benchmark Impact
                      </p>
                      <InfoTooltip text={scenarioMetricHelp["Benchmark Impact"]} />
                    </div>
                    <p className="mt-3 text-3xl font-semibold text-[#D4DBE7]">
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
                    <div className="mt-2 flex items-start justify-between gap-3">
                      <p className="text-xs uppercase tracking-[0.18em] text-slate/70">
                        Relative vs Benchmark
                      </p>
                      <InfoTooltip text={scenarioMetricHelp["Relative vs Benchmark"]} />
                    </div>
                    <p className={`mt-3 text-3xl font-semibold ${scenario.relative_impact_vs_benchmark >= 0 ? "text-[#E7CDA0]" : "text-[#F1B0A3]"}`}>
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
                    <div className="mt-2 flex items-start justify-between gap-3">
                      <p className="text-xs uppercase tracking-[0.18em] text-slate/70">
                        Scenario Type
                      </p>
                      <InfoTooltip text={scenarioMetricHelp["Scenario Type"]} />
                    </div>
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

            <section className="grid gap-6 2xl:grid-cols-[1fr_1fr]">
              <article className="rounded-[32px] bg-[#101828] p-6 text-white shadow-panel">
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-white/60">
                  Interpretation Layer
                </p>
                <h2 className="mt-3 text-2xl font-semibold">What These Scenarios Suggest</h2>
                <p className="mt-4 text-sm leading-7 text-white/85">
                  {scenarioInterpretation}
                </p>
              </article>

              <article className="rounded-[32px] border border-[#D0D5DD] bg-white p-6 shadow-panel">
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate">
                  How To Read It
                </p>
                <h2 className="mt-3 text-2xl font-semibold">Stress Tests Show Weak Points</h2>
                <p className="mt-4 text-sm leading-7 text-slate">
                  Scenario analysis is not trying to predict the future. It is showing which type of shock this portfolio handles better and which type of shock could hurt it more badly.
                </p>
              </article>
            </section>

            <section className="grid gap-6 2xl:grid-cols-2">
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
                              <p className="font-semibold text-[#F1B0A3]">
                                {formatSignedMetricPercent(item.weighted_impact)}
                              </p>
                            </div>
                          </div>

                          <div className="h-3 overflow-hidden rounded-full bg-white ring-1 ring-mist">
                            <div
                              className="h-full rounded-full bg-[linear-gradient(90deg,#D4B483_0%,#C88C7A_100%)]"
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

            <section className="grid gap-6 2xl:grid-cols-[0.9fr_1.1fr]">
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
        ) : activeTab === "factor" ? (
          <>
            <section className="grid gap-6">
              <article className="rounded-[32px] border border-white/70 bg-white/85 p-8 shadow-panel backdrop-blur">
                <p className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-slate">
                  Kenneth French Factor Data
                </p>
                <h2 className="text-3xl font-semibold">Factor Model</h2>
                <p className="mt-3 max-w-3xl text-base leading-7 text-slate">
                  Phase 1 explains portfolio excess return using the official Kenneth French daily
                  Fama-French factors: market excess return, size, value, and momentum.
                </p>
              </article>
            </section>

            {!analysis ? (
              <section className="rounded-[28px] bg-white p-6 shadow-panel ring-1 ring-mist">
                <p className="text-sm text-slate">
                  No factor model loaded yet. Submit the form to estimate portfolio factor exposures.
                </p>
              </section>
            ) : factorModel?.is_available ? (
              <>
                <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5">
                  {factorMetricCards.map(([label, value, type]) => (
                    <article key={label} className="rounded-[28px] bg-white p-6 shadow-panel ring-1 ring-mist transition hover:-translate-y-0.5 hover:shadow-xl">
                      <div className="flex items-start justify-between gap-3">
                        <p className="text-sm text-slate">{label}</p>
                        <InfoTooltip text={factorMetricHelp[label]} />
                      </div>
                      <p className="mt-3 text-3xl font-semibold">
                        {type === "percent"
                          ? formatMetricPercent(value)
                          : type === "integer"
                            ? Number(value).toLocaleString()
                            : formatFactorValue(value)}
                      </p>
                    </article>
                  ))}
                </section>

                <section className="grid gap-6 2xl:grid-cols-[1fr_1fr]">
                  <article className="rounded-[32px] bg-[#101828] p-6 text-white shadow-panel">
                    <p className="text-sm font-semibold uppercase tracking-[0.18em] text-white/60">
                      Interpretation Layer
                    </p>
                    <h2 className="mt-3 text-2xl font-semibold">What These Factor Results Suggest</h2>
                    <p className="mt-4 text-sm leading-7 text-white/85">
                      {factorInterpretation}
                    </p>
                  </article>

                  <article className="rounded-[32px] border border-[#D0D5DD] bg-white p-6 shadow-panel">
                    <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate">
                      Model Setup
                    </p>
                    <h2 className="mt-3 text-2xl font-semibold">How To Read This Page</h2>
                    <div className="mt-5 rounded-3xl bg-surface p-5 font-serif text-sm leading-7 text-ink ring-1 ring-mist">
                      {factorModel.formula}
                    </div>
                    <p className="mt-5 text-sm leading-7 text-slate">
                      There is no universal good or bad factor mix. This page is mainly answering: what style exposures your portfolio seems to carry, how strongly they show up, and how much of the portfolio behavior this model can actually explain.
                    </p>
                  </article>
                </section>

                <section className="grid gap-6 2xl:grid-cols-[1.1fr_0.9fr]">
                  <article className="rounded-[32px] bg-white p-6 shadow-panel ring-1 ring-mist">
                    <div className="mb-4">
                      <h2 className="text-xl font-semibold">Factor Exposures</h2>
                      <p className="text-sm text-slate">
                        Positive beta means the portfolio tends to move with that factor; negative beta means it tends to move against it.
                      </p>
                    </div>
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={factorExposureData}>
                          <CartesianGrid stroke="#EAECF0" vertical={false} />
                          <XAxis dataKey="factor" stroke="#667085" />
                          <YAxis stroke="#667085" tickFormatter={(value) => Number(value).toFixed(1)} />
                          <Tooltip formatter={(value) => formatFactorValue(value)} />
                          <Bar dataKey="beta" name="Factor Beta" fill="#D4B483" radius={[12, 12, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </article>

                  <article className="rounded-[32px] bg-[#101828] p-6 text-white shadow-panel">
                    <h2 className="text-xl font-semibold">Data Window And Model Confidence</h2>
                    <p className="mt-3 text-sm leading-7 text-white/75">
                      Regression window: {factorModel.start_date} to {factorModel.end_date}
                    </p>
                    <div className="mt-5 grid gap-3 text-sm text-white/85">
                      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                        Model: {factorModel.model_name}
                      </div>
                      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                        Observations: {factorModel.observations} trading days
                      </div>
                      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                        R-Squared: {formatFactorValue(factorModel.r_squared)} means the factor model explains only part of the total portfolio behavior when this number is low.
                      </div>
                      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                        Residual Volatility: {formatMetricPercent(factorModel.residual_volatility)} is the risk left over after the factor model explanation.
                      </div>
                    </div>
                    <p className="mt-5 text-sm leading-7 text-white/70">
                      This card is intentionally not repeating the factor definitions. The table on the left shows the raw exposures, while the interpretation layer above explains what those exposures mean for a non-technical user.
                    </p>
                  </article>
                </section>

                <section className="grid gap-6 2xl:grid-cols-[1fr_1fr]">
                  <article className="rounded-[32px] bg-white p-6 shadow-panel ring-1 ring-mist">
                    <div className="mb-4">
                      <h2 className="text-xl font-semibold">Exposure Details</h2>
                      <p className="text-sm text-slate">
                        These betas are estimated from daily portfolio excess returns matched to Kenneth French factor dates.
                      </p>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="min-w-full text-sm">
                        <thead>
                          <tr className="border-b border-mist text-left text-slate">
                            <th className="pb-3 pr-4">Factor</th>
                            <th className="pb-3 pr-4">Beta</th>
                            <th className="pb-3">Meaning</th>
                          </tr>
                        </thead>
                        <tbody>
                          {factorExposureData.map((item) => (
                            <tr key={item.factor} className="border-b border-mist/70 text-ink last:border-b-0">
                              <td className="py-3 pr-4 font-semibold">{item.factor}</td>
                              <td className="py-3 pr-4 text-[#D9BB88]">{formatFactorValue(item.beta)}</td>
                              <td className="py-3 leading-6 text-slate">{item.description}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </article>

                  <article className="rounded-[32px] border border-[#D0D5DD] bg-white p-6 shadow-panel">
                    <h2 className="text-xl font-semibold">Future Plan: Phase 2</h2>
                    <p className="mt-4 text-sm leading-7 text-slate">
                      {factorModel.future_plan}
                    </p>
                    <div className="mt-6 grid gap-3 text-sm text-slate">
                      <div className="rounded-2xl bg-surface p-4 ring-1 ring-mist">
                        Add RMW to test profitability exposure.
                      </div>
                      <div className="rounded-2xl bg-surface p-4 ring-1 ring-mist">
                        Add CMA to test conservative versus aggressive investment exposure.
                      </div>
                      <div className="rounded-2xl bg-surface p-4 ring-1 ring-mist">
                        Compare the current four-factor model against the upgraded five-factor-plus-momentum model.
                      </div>
                    </div>
                  </article>
                </section>
              </>
            ) : (
              <section className="grid gap-6 2xl:grid-cols-[1fr_1fr]">
                <article className="rounded-[32px] border border-red-200 bg-white p-6 shadow-panel">
                  <h2 className="text-xl font-semibold text-rose-700">Factor Model Unavailable</h2>
                  <p className="mt-4 text-sm leading-7 text-slate">
                    {factorModel?.error_message || "Kenneth French factor data could not be aligned with this portfolio request."}
                  </p>
                </article>
                <article className="rounded-[32px] border border-[#D0D5DD] bg-white p-6 shadow-panel">
                  <h2 className="text-xl font-semibold">Future Plan: Phase 2</h2>
                  <p className="mt-4 text-sm leading-7 text-slate">
                    {factorModel?.future_plan}
                  </p>
                </article>
              </section>
            )}
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
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

export default function AppWithBoundary() {
  // Wrap the dashboard so runtime render failures are visible instead of becoming a blank screen.
  return (
    <AppErrorBoundary>
      <App />
    </AppErrorBoundary>
  );
}
