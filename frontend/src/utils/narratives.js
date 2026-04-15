import { dashboardTabs } from "../constants.jsx";
import { formatMetricPercent } from "./formatters.js";

export function describeRiskPosture(metrics) {
  if (!metrics) return "";
  const volatility = metrics.annualized_volatility;
  const drawdown = Math.abs(metrics.max_drawdown);
  const beta = metrics.beta_vs_benchmark;
  const volatilityLabel = volatility < 0.12 ? "fairly stable" : volatility < 0.2 ? "moderately volatile" : "fairly volatile";
  const drawdownLabel = drawdown < 0.08 ? "shallow" : drawdown < 0.18 ? "noticeable" : "deep";
  const betaLabel = beta < 0.85 ? "more defensive than the benchmark" : beta > 1.15 ? "more aggressive than the benchmark" : "close to benchmark-like sensitivity";
  return `This portfolio looks ${volatilityLabel}, has experienced a ${drawdownLabel} drawdown profile, and currently behaves ${betaLabel}.`;
}

export function getRiskInterpretation(analysis) {
  if (!analysis?.metrics) return "";
  const { metrics } = analysis;
  const sortinoVsSharpe = metrics.sortino_ratio > metrics.sharpe_ratio
    ? "Downside risk looks more manageable than total volatility suggests."
    : "The portfolio's downside risk is almost as important as its total volatility.";
  const varText = metrics.var_95 > -0.01
    ? "Typical bad days have been relatively contained."
    : metrics.var_95 > -0.02
      ? "Typical bad days can still be uncomfortable."
      : "The left-tail risk is meaningful, so bad days can be sharp.";
  return `${describeRiskPosture(metrics)} ${sortinoVsSharpe} VaR is ${formatMetricPercent(metrics.var_95)} and CVaR is ${formatMetricPercent(metrics.cvar_95)}, which means ${varText}`;
}

export function getScenarioInterpretation(analysis) {
  const marketShock = analysis?.scenarios?.market_shock;
  const sectorShock = analysis?.scenarios?.sector_shock;
  if (!marketShock || !sectorShock) return "";
  const marketRelative = marketShock.relative_impact_vs_benchmark > 0 ? "more resilient than the benchmark" : "more vulnerable than the benchmark";
  const sectorRelative = sectorShock.relative_impact_vs_benchmark > 0 ? "holds up better than the benchmark" : "gets hit harder than the benchmark";
  return `In the current stress tests, this portfolio looks ${marketRelative} during a broad market selloff, but it ${sectorRelative} when technology takes a direct shock. In simple terms, the portfolio's weak point is more sector-specific than market-wide.`;
}

export function getFactorInterpretation(factorModel) {
  if (!factorModel?.is_available) return "";
  const exposureMap = Object.fromEntries((factorModel.exposures || []).map((item) => [item.factor, item.beta]));
  const smb = exposureMap.SMB ?? 0;
  const hml = exposureMap.HML ?? 0;
  const mom = exposureMap.MOM ?? 0;
  const mkt = exposureMap["Mkt-RF"] ?? 0;
  const sizeStory = smb > 0.1
    ? "shows a positive SMB loading in this window, which means returns moved somewhat with the small-minus-big factor, not that the holdings are literally small-cap stocks"
    : smb < -0.1
      ? "shows a negative SMB loading in this window, which means returns moved more like large-cap exposure than small-cap exposure"
      : "does not show a strong size-related factor loading";
  const valueStory = hml > 0.1 ? "shows a positive value loading" : hml < -0.1 ? "shows a mild growth-oriented loading" : "does not show a strong value-versus-growth loading";
  const momentumStory = mom > 0.1 ? "still carries a noticeable positive momentum loading" : mom < -0.1 ? "leans against recent momentum winners" : "does not have a strong momentum loading";
  const marketStory = Math.abs(mkt) < 0.1
    ? "Its returns are not being strongly explained by broad market factor exposure in this model."
    : mkt > 0 ? "It still moves with broad market risk." : "It slightly offsets broad market factor exposure.";
  const fitStory = factorModel.r_squared < 0.2
    ? "The factor fit is low, so these factors explain only a small part of what your portfolio is doing."
    : factorModel.r_squared < 0.5
      ? "The factor fit is moderate, so the model explains part of the portfolio behavior but not all of it."
      : "The factor fit is fairly strong, so the model captures a large share of the portfolio behavior.";
  const alphaStory = factorModel.alpha_annualized > 0
    ? "The model also shows positive alpha, but because the fit is limited, you should treat that as a hint rather than proof of skill."
    : "The model does not show strong positive alpha after accounting for these factors.";
  return `This portfolio ${sizeStory}, ${valueStory}, and ${momentumStory}. ${marketStory} ${fitStory} ${alphaStory}`;
}

export function getExecutiveSummary(analysis, form, factorModel) {
  if (!analysis?.metrics) {
    return "Build a portfolio and run the analysis. The workspace will then guide you from holdings and performance into risk, stress testing, and factor interpretation.";
  }
  const relative = analysis.metrics.relative_performance ?? 0;
  const riskPosture = describeRiskPosture(analysis.metrics).toLowerCase();
  const marketRelative = analysis?.scenarios?.market_shock?.relative_impact_vs_benchmark ?? 0;
  const sectorRelative = analysis?.scenarios?.sector_shock?.relative_impact_vs_benchmark ?? 0;
  const factorFit = factorModel?.is_available && factorModel.r_squared < 0.2
    ? "Factor fit is still low, so factor results should be treated as directional clues rather than hard labels."
    : factorModel?.is_available
      ? "Factor fit is meaningful enough to use as a supporting explanation layer."
      : "Factor analysis is not currently available for this request.";
  const performanceStory = relative >= 0
    ? `The portfolio is ahead of ${form.benchmark} by ${formatMetricPercent(relative)} in this window.`
    : `The portfolio is behind ${form.benchmark} by ${formatMetricPercent(Math.abs(relative))} in this window.`;
  const stressStory = sectorRelative < marketRelative
    ? "The bigger weakness currently looks sector-specific rather than purely market-wide."
    : "The portfolio's broad market sensitivity currently matters more than the sector-specific shock in this setup.";
  return `${performanceStory} Overall, the portfolio looks ${riskPosture} ${marketRelative >= 0 ? "It has been relatively resilient against the benchmark in the market shock test." : "It looks more exposed than the benchmark in the market shock test."} ${stressStory} ${factorFit}`;
}

export function getSectionNarrative(activeTab, analysis, form, factorModel, riskInterpretation, scenarioInterpretation, factorInterpretation) {
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
      finding: analysis?.metrics ? riskInterpretation : "Run an analysis first to see how much downside and tail risk the portfolio is carrying.",
      nextStep: "Go next to Scenario Lab to see how this risk profile behaves under explicit stress assumptions."
    },
    scenario: {
      eyebrow: "Step 3",
      title: "Scenario Lab",
      purpose: "Historical returns are backward-looking. This page asks what could happen if the market or a key sector gets hit next.",
      finding: analysis?.scenarios ? scenarioInterpretation : "Run an analysis first to generate the scenario stress tests.",
      nextStep: "Go next to Factor Lens to understand which structural exposures may be driving that stress behavior."
    },
    factor: {
      eyebrow: "Step 4",
      title: "Factor Lens",
      purpose: "This page is the explanation layer behind return behavior. It estimates whether the portfolio has market, size, value, or momentum tendencies in the selected window.",
      finding: factorModel?.is_available ? factorInterpretation : "Factor results are not available yet, so this page cannot explain the portfolio through factor exposures.",
      nextStep: "Use the Index Guide last whenever you want definitions, formulas, and interpretation rules for the metrics."
    },
    montecarlo: {
      eyebrow: "Step 5",
      title: "Monte Carlo Simulation",
      purpose: "Project a range of possible portfolio outcomes over the next year using 1,000 simulated paths based on historical return distributions.",
      finding: analysis?.monte_carlo
        ? `The simulation projects a median 1-year return of ${(analysis.monte_carlo.terminal_stats.median_return * 100).toFixed(1)}%. Probability of loss: ${(analysis.monte_carlo.terminal_stats.prob_loss * 100).toFixed(1)}%.`
        : "Run an analysis first to generate the Monte Carlo simulation.",
      nextStep: "Use the Index Guide for metric definitions and formulas."
    },
    optimizer: {
      eyebrow: "Step 6",
      title: "Portfolio Optimizer",
      purpose: "Find the most efficient allocation across your selected assets using mean-variance optimization.",
      finding: "Click Run Optimization to compute the efficient frontier and see optimal weight suggestions.",
      nextStep: "Use the Index Guide for metric definitions and formulas."
    },
    guide: {
      eyebrow: "Step 7",
      title: "Index Guide",
      purpose: "This page is a reference layer rather than a main decision page. Use it when you want to understand formulas, assumptions, and the meaning behind each metric.",
      finding: "The guide is here to support the workflow, not interrupt it. Users can come here when a metric needs clarification, then jump back into the main analysis path.",
      nextStep: "Loop back to Snapshot & Performance after reading definitions if you want to review the portfolio with more confidence."
    }
  };
  return { ...currentTab, ...narratives[activeTab] };
}
