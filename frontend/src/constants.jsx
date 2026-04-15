export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";

export const chartColors = ["#D4B483", "#B5C0CF", "#C88C7A", "#BFA2D8", "#8EA3A6", "#E0C27A", "#9AA4B2", "#D76E6E"];
export const stockOptions = ["AAPL", "MSFT", "VOO", "SPY", "QQQ", "NVDA", "META", "AMZN", "GOOGL", "TSLA"];
export const benchmarkOptions = ["SPY", "QQQ", "VOO", "DIA", "IWM"];

export const defaultForm = {
  assets: [{ ticker: "AAPL", weight: "100.00" }],
  benchmark: "SPY",
  lookbackPeriod: "1y"
};

export const dashboardTabs = [
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
    key: "montecarlo",
    step: "05",
    label: "Monte Carlo",
    shortLabel: "MC Sim",
    description: "Simulate thousands of future portfolio paths to estimate probability of outcomes.",
    question: "What range of outcomes can I expect over the next year?",
    nextKey: "optimizer",
    nextLabel: "Optimizer"
  },
  {
    key: "optimizer",
    step: "06",
    label: "Portfolio Optimizer",
    shortLabel: "Optimizer",
    description: "Find the minimum-variance and maximum-Sharpe portfolios via mean-variance optimization.",
    question: "How should I rebalance to improve risk-adjusted returns?",
    nextKey: "guide",
    nextLabel: "Index Guide"
  },
  {
    key: "guide",
    step: "07",
    label: "Index Guide",
    shortLabel: "Guide",
    description: "Use the methodology page when you want formulas, definitions, and interpretation rules.",
    question: "What does each metric mean, and how should I read it correctly?",
    nextKey: "overview",
    nextLabel: "Snapshot & Performance"
  }
];

export const formulaLibrary = {
  cumulativeReturn: (<>Cumulative Return = Π(1 + r<sub>t</sub>) - 1</>),
  benchmarkReturn: (<>Benchmark Return = Π(1 + r<sub>m,t</sub>) - 1</>),
  relativePerformance: (<>Relative Performance = Portfolio Return - Benchmark Return</>),
  annualizedReturn: (<>Annualized Return = (1 + Cumulative Return)<sup>(252 / N)</sup> - 1</>),
  annualizedVolatility: (<>Annualized Volatility = std(r<sub>daily</sub>) × √252</>),
  sharpeRatio: (<>Sharpe = (Annualized Return - Risk Free Rate) / Annualized Volatility</>),
  sortinoRatio: (<>Sortino = (Annualized Return - Risk Free Rate) / Downside Deviation</>),
  downsideDeviation: (<>Downside Deviation = √(mean(min(r<sub>t</sub>, 0)<sup>2</sup>) × 252)</>),
  beta: (<>Beta = Cov(r<sub>p</sub>, r<sub>m</sub>) / Var(r<sub>m</sub>)</>),
  rollingBeta: (<>Rolling Beta<sub>t</sub> = Cov<sub>window</sub>(r<sub>p</sub>, r<sub>m</sub>) / Var<sub>window</sub>(r<sub>m</sub>)</>),
  var95: (<>VaR<sub>95</sub> = 5th percentile of daily returns</>),
  cvar95: (<>CVaR<sub>95</sub> = E[r<sub>t</sub> | r<sub>t</sub> ≤ VaR<sub>95</sub>]</>),
  rollingVolatility: (<>Rolling Volatility<sub>t</sub> = std<sub>window</sub>(r<sub>p</sub>) × √252</>),
  maxDrawdown: (<>Drawdown<sub>t</sub> = (Wealth<sub>t</sub> / Peak<sub>t</sub>) - 1</>),
  correlation: (<>Corr(i, j) = Cov(r<sub>i</sub>, r<sub>j</sub>) / (σ<sub>i</sub> × σ<sub>j</sub>)</>),
  riskContribution: (<>RC<sub>i</sub> = w<sub>i</sub>(Σw)<sub>i</sub> / σ<sub>p</sub></>),
  topHolding: (<>Top Holding Weight = max(w<sub>i</sub>)</>),
  topThree: (<>Top 3 Holdings = sum of the three largest w<sub>i</sub> values</>),
  herfindahl: (<>HHI = Σ(w<sub>i</sub><sup>2</sup>)</>),
  effectiveHoldings: (<>Effective Holdings = 1 / HHI</>),
  scenarioCore: (<>R<sub>p</sub>(scenario) = Σ w<sub>i</sub> · s<sub>i</sub></>),
  marketShock: (<>s<sub>i</sub> = β<sub>i</sub><sup>(mkt)</sup> · S<sub>m</sub></>),
  technologyShock: (<>Stock Shock = S<sub>tech</sub>; ETF Shock = Exposure<sub>tech</sub> · S<sub>tech</sub></>),
  factorModel: (<>R<sub>p</sub> - RF = α + β<sub>mkt</sub>(Mkt-RF) + β<sub>smb</sub>SMB + β<sub>hml</sub>HML + β<sub>mom</sub>MOM + ε</>),
  factorAlpha: (<>α = average excess return not explained by the selected factors</>),
  factorRSquared: (<>R<sup>2</sup> = 1 - SS<sub>residual</sub> / SS<sub>total</sub></>)
};

export const indexGuideSections = [
  {
    title: "Performance Metrics",
    items: [
      { name: "Cumulative Return", definition: "Shows the total portfolio gain or loss across the selected analysis window.", formula: formulaLibrary.cumulativeReturn, interpretation: "Use it to compare how much the portfolio actually grew or fell over the full period." },
      { name: "Benchmark Return", definition: "Shows the benchmark's cumulative return over the same analysis window.", formula: formulaLibrary.benchmarkReturn, interpretation: "This gives the market reference point used to judge whether the portfolio outperformed or underperformed." },
      { name: "Relative Performance", definition: "Measures the portfolio's excess performance over the benchmark.", formula: formulaLibrary.relativePerformance, interpretation: "A positive value means the portfolio beat the benchmark. A negative value means it lagged." },
      { name: "Annualized Return", definition: "Converts the total return in the selected window into a one-year equivalent growth rate.", formula: formulaLibrary.annualizedReturn, interpretation: "This is useful when you want returns from different lookback windows to be comparable on the same scale." }
    ]
  },
  {
    title: "Volatility and Downside Risk",
    items: [
      { name: "Annualized Volatility", definition: "Measures how unstable the portfolio's daily returns are, scaled to a yearly basis.", formula: formulaLibrary.annualizedVolatility, interpretation: "Higher volatility means larger return swings and a rougher ride for the investor." },
      { name: "Sharpe Ratio", definition: "Measures return earned per unit of total risk.", formula: formulaLibrary.sharpeRatio, interpretation: "A higher Sharpe ratio suggests stronger risk-adjusted performance, but it treats upside and downside volatility the same." },
      { name: "Sortino Ratio", definition: "Measures return earned per unit of downside risk only.", formula: formulaLibrary.sortinoRatio, interpretation: "This is often more intuitive than Sharpe because it only penalizes harmful volatility." },
      { name: "Downside Deviation", definition: "Measures the annualized root mean square of returns that fall below the zero target.", formula: formulaLibrary.downsideDeviation, interpretation: "This isolates 'bad volatility' and is the denominator used in the Sortino ratio." },
      { name: "Maximum Drawdown", definition: "Shows the worst cumulative drop from a previous portfolio peak to a later trough.", formula: formulaLibrary.maxDrawdown, interpretation: "This tells you how deep the portfolio fell at its most painful point in the selected window." }
    ]
  },
  {
    title: "Tail Risk and Market Sensitivity",
    items: [
      { name: "Beta vs Benchmark", definition: "Measures how sensitive the portfolio is to moves in the selected benchmark.", formula: formulaLibrary.beta, interpretation: "Beta above 1 means the portfolio tends to amplify benchmark moves. Beta below 1 means it behaves more defensively." },
      { name: "Rolling Beta", definition: "Tracks how the portfolio's benchmark sensitivity changes across rolling windows.", formula: formulaLibrary.rollingBeta, interpretation: "This shows whether the portfolio becomes more aggressive or more defensive through time." },
      { name: "VaR (95%)", definition: "Estimates the one-day loss threshold that should not be exceeded with 95% confidence.", formula: formulaLibrary.var95, interpretation: "It is a threshold, not an average. It says how bad a typical worst-case day can get." },
      { name: "CVaR (95%)", definition: "Measures the average loss when returns are already inside the worst 5% tail.", formula: formulaLibrary.cvar95, interpretation: "This is more severe than VaR because it describes the average damage inside the tail, not just the cutoff." },
      { name: "Rolling Volatility", definition: "Tracks annualized volatility through time using a rolling lookback window.", formula: formulaLibrary.rollingVolatility, interpretation: "This helps users see whether portfolio risk is calm, rising, or unstable across different periods." }
    ]
  },
  {
    title: "Diversification and Concentration",
    items: [
      { name: "Correlation Matrix", definition: "Measures how strongly each pair of assets moves together.", formula: formulaLibrary.correlation, interpretation: "Values near 1 imply similar movement, values near 0 imply weak linear relationship, and values near -1 imply opposite movement." },
      { name: "Risk Contribution by Asset", definition: "Shows how much each holding contributes to total portfolio volatility, not just how large its weight is.", formula: formulaLibrary.riskContribution, interpretation: "A smaller holding can still be a major risk source if it is volatile and highly correlated with the rest of the portfolio." },
      { name: "Top Holding Weight", definition: "Shows the weight of the single largest portfolio holding.", formula: formulaLibrary.topHolding, interpretation: "A high value can signal concentration risk even if the portfolio contains several assets." },
      { name: "Top 3 Holdings", definition: "Adds together the weights of the three largest positions.", formula: formulaLibrary.topThree, interpretation: "This quickly shows whether most capital is clustered in only a few names." },
      { name: "Herfindahl Index", definition: "Measures concentration by summing squared portfolio weights.", formula: formulaLibrary.herfindahl, interpretation: "A higher HHI means the portfolio is more concentrated and less evenly diversified." },
      { name: "Effective Holdings", definition: "Converts concentration into an intuitive estimate of how many equally weighted holdings the portfolio behaves like.", formula: formulaLibrary.effectiveHoldings, interpretation: "This is often more intuitive than HHI because it translates concentration into a holding-count style measure." }
    ]
  },
  {
    title: "Scenario Analysis",
    items: [
      { name: "Scenario Analysis Core Formula", definition: "Applies predefined shocks to each asset and estimates the portfolio impact through weighted aggregation.", formula: formulaLibrary.scenarioCore, interpretation: "It is a stress-testing framework, not a forecast. The key steps are defining a scenario and assigning asset-level shocks." },
      { name: "Market Shock", definition: "Assumes a broad benchmark move and translates it into asset shocks using historical market beta.", formula: formulaLibrary.marketShock, interpretation: "Assets with higher market beta are expected to move more aggressively when the benchmark is stressed." },
      { name: "Technology Sector Shock", definition: "Applies a direct technology shock to mapped technology stocks and an exposure-weighted shock to ETFs.", formula: formulaLibrary.technologyShock, interpretation: "This is a first-pass rule-based sector stress test and can later be upgraded to a sector-beta framework." }
    ]
  },
  {
    title: "Factor-Based Portfolio Analysis",
    items: [
      { name: "Fama-French 3-Factor + Momentum Model", definition: "Explains portfolio excess return using market, size, value, and momentum factor returns from Kenneth French daily data.", formula: formulaLibrary.factorModel, interpretation: "The factor betas show whether the portfolio behaves more like market risk, small-cap risk, value risk, or momentum risk." },
      { name: "Factor Alpha", definition: "Measures the average excess return left over after the selected factors explain the portfolio return.", formula: formulaLibrary.factorAlpha, interpretation: "Positive alpha can suggest unexplained outperformance, but it should be interpreted carefully because it depends on the selected factors and time window." },
      { name: "Factor R-Squared", definition: "Measures how much of the portfolio's excess-return variation is explained by the factor model.", formula: formulaLibrary.factorRSquared, interpretation: "A higher value means the selected factor model explains more of the portfolio's movement." }
    ]
  }
];

export const factorMetricHelp = {
  "Alpha Daily": "Daily alpha is the average daily excess return that the factor model could not explain. Positive alpha means the portfolio earned more than the selected factors alone would imply during this window.",
  "Alpha Annualized": "Annualized alpha converts daily alpha into a one-year equivalent. It is easier to read than daily alpha, but it still depends on the same model and time window.",
  "R-Squared": "R-squared shows how much of the portfolio's excess-return movement is explained by the selected factors. A low value means a lot of the portfolio behavior still comes from stock-specific or unexplained drivers.",
  "Residual Volatility": "Residual volatility is the annualized risk left over after removing the part explained by the factor model. Higher residual volatility means more idiosyncratic or unexplained risk.",
  Observations: "Observations are the number of daily data points used in the regression. More observations usually make the factor estimates more stable."
};

export const riskMetricHelp = {
  "Sharpe Ratio": "Sharpe ratio measures return earned per unit of total volatility. Higher is usually better, but it treats upside and downside volatility the same.",
  "Sortino Ratio": "Sortino ratio measures return earned per unit of downside risk only. It is often easier for non-technical users because it focuses on harmful volatility.",
  "Beta vs Benchmark": "Beta shows how sensitive the portfolio is to benchmark moves. Above 1 means it usually moves more aggressively than the benchmark; below 1 means it is more defensive.",
  "Downside Deviation": "Downside deviation measures the volatility of negative returns only. It isolates the 'bad' side of volatility.",
  "VaR (95%)": "VaR estimates a one-day loss threshold. It answers: on a typical bad day, how bad can losses get before entering the worst 5% tail?",
  "CVaR (95%)": "CVaR estimates the average loss once returns are already inside the worst 5% tail. It is usually more severe than VaR."
};

export const scenarioMetricHelp = {
  "Portfolio Impact": "This is the estimated portfolio return under the scenario shock. A more negative number means the portfolio is expected to be hit harder.",
  "Benchmark Impact": "This is the estimated benchmark return under the same shock. It gives you a market reference point for comparison.",
  "Relative vs Benchmark": "This compares the portfolio's estimated shock return with the benchmark's estimated shock return. Positive means the portfolio is more resilient; negative means it is more vulnerable.",
  "Scenario Type": "This tells you whether the stress test is broad-market based or sector-specific."
};
