import { useMemo, useState, lazy, Suspense } from "react";
import { API_BASE_URL, dashboardTabs, defaultForm } from "./constants.jsx";
import { buildPayload, getErrorMessage, getNextTicker, rebalanceAssets } from "./utils/portfolio.js";
import { getRiskInterpretation, getScenarioInterpretation, getFactorInterpretation, getExecutiveSummary, getSectionNarrative } from "./utils/narratives.js";
import { ErrorBoundary, TabErrorBoundary } from "./components/shared/ErrorBoundary.jsx";
import { LandingPage } from "./components/LandingPage.jsx";
import { PortfolioForm } from "./components/PortfolioForm.jsx";
import { SnapshotTab } from "./components/tabs/SnapshotTab.jsx";
import { RiskTab } from "./components/tabs/RiskTab.jsx";
import { ScenarioTab } from "./components/tabs/ScenarioTab.jsx";
import { FactorTab } from "./components/tabs/FactorTab.jsx";
import { MonteCarloTab } from "./components/tabs/MonteCarloTab.jsx";
import { OptimizerTab } from "./components/tabs/OptimizerTab.jsx";
import { IndexGuideTab } from "./components/tabs/IndexGuideTab.jsx";
const PdfExportButton = lazy(() =>
  import("./components/PdfExportButton.jsx").then((m) => ({ default: m.PdfExportButton }))
);
import { AnalysisHistoryPanel, saveAnalysisToHistory } from "./components/AnalysisHistoryPanel.jsx";

function App() {
  const [form, setForm] = useState(defaultForm);
  const [hasStarted, setHasStarted] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [activeTab, setActiveTab] = useState("overview");

  const totalWeight = useMemo(
    () => form.assets.reduce((sum, asset) => sum + (Number(asset.weight) || 0), 0),
    [form.assets]
  );

  const validationIssues = useMemo(() => {
    const issues = [];
    const tickers = form.assets.map((asset) => asset.ticker);
    const duplicates = tickers.filter((ticker, index) => tickers.indexOf(ticker) !== index);
    const invalidWeight = form.assets.some((asset) => {
      const parsedWeight = Number(asset.weight);
      return Number.isNaN(parsedWeight) || parsedWeight <= 0;
    });
    if (duplicates.length) issues.push(`Duplicate tickers are not allowed: ${[...new Set(duplicates)].join(", ")}`);
    if (invalidWeight) issues.push("Each asset weight must be a valid positive number.");
    if (Math.abs(totalWeight - 100) > 0.001) issues.push("Total asset weight must equal 100% before submitting.");
    if (form.assets.length > 6) issues.push("You can analyze up to 6 assets in the MVP.");
    return issues;
  }, [form.assets, totalWeight]);

  const canSubmit = !isLoading && validationIssues.length === 0;

  async function handleSubmit(event) {
    event.preventDefault();
    setIsLoading(true);
    setErrorMessage("");
    setSuccessMessage("");
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60_000);
    try {
      const payload = buildPayload(form);
      const response = await fetch(`${API_BASE_URL}/api/v1/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      const data = await response.json();
      if (!response.ok) throw new Error(getErrorMessage(data));
      setAnalysis(data);
      saveAnalysisToHistory(form, data);
      setActiveTab("overview");
      setSuccessMessage(`Analysis updated successfully for ${payload.assets.length} asset(s).`);
    } catch (error) {
      setAnalysis(null);
      if (error.name === "AbortError") {
        setErrorMessage("Request timed out after 60 seconds. The analysis is taking too long — try a shorter lookback period.");
      } else {
        setErrorMessage(error.message || "Something went wrong.");
      }
    } finally {
      clearTimeout(timeoutId);
      setIsLoading(false);
    }
  }

  function updateAsset(index, field, value) {
    setForm((current) => ({
      ...current,
      assets: current.assets.map((asset, assetIndex) =>
        assetIndex === index ? { ...asset, [field]: value } : asset
      )
    }));
  }

  function addAssetRow() {
    setForm((current) => {
      if (current.assets.length >= 6) return current;
      const nextAssets = [...current.assets, { ticker: getNextTicker(current.assets), weight: "0.00" }];
      return { ...current, assets: rebalanceAssets(nextAssets) };
    });
    setSuccessMessage("Weights were rebalanced automatically after adding an asset.");
    setErrorMessage("");
  }

  function removeAssetRow(index) {
    if (form.assets.length === 1) return;
    setForm((current) => ({
      ...current,
      assets: rebalanceAssets(current.assets.filter((_, assetIndex) => assetIndex !== index))
    }));
    setSuccessMessage("Weights were rebalanced automatically after removing an asset.");
    setErrorMessage("");
  }

  function isTickerDisabled(option, rowIndex) {
    return form.assets.some((asset, assetIndex) => assetIndex !== rowIndex && asset.ticker === option);
  }

  function applyOptimalWeights(weights, tickers) {
    // Replace current form assets with optimal weights from the optimizer.
    const totalBasisPoints = 10000;
    const rawWeights = tickers.map((t) => Math.round((weights[t] ?? 0) * 10000));
    const diff = totalBasisPoints - rawWeights.reduce((a, b) => a + b, 0);
    rawWeights[0] = (rawWeights[0] || 0) + diff; // assign remainder to first ticker
    setForm((current) => ({
      ...current,
      assets: tickers.map((ticker, i) => ({
        ticker,
        weight: (rawWeights[i] / 100).toFixed(2)
      }))
    }));
    setSuccessMessage("Optimal weights applied. Review and run analysis to see updated results.");
    setErrorMessage("");
  }

  const factorModel = analysis?.factor_model || null;
  const riskInterpretation = getRiskInterpretation(analysis);
  const scenarioInterpretation = getScenarioInterpretation(analysis);
  const factorInterpretation = getFactorInterpretation(factorModel);
  const executiveSummary = getExecutiveSummary(analysis, form, factorModel);
  const currentJourney = getSectionNarrative(activeTab, analysis, form, factorModel, riskInterpretation, scenarioInterpretation, factorInterpretation);
  const nextJourney = dashboardTabs.find((tab) => tab.key === currentJourney.nextKey) || dashboardTabs[0];

  if (!hasStarted) {
    return <LandingPage onStart={() => setHasStarted(true)} />;
  }

  return (
    <div className="workspace-dark min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(212,180,131,0.10),_transparent_18%),radial-gradient(circle_at_90%_8%,_rgba(168,139,181,0.08),_transparent_16%),linear-gradient(180deg,_#090A0F_0%,_#12141B_46%,_#171922_100%)] text-white">
      <main className="mx-auto flex min-h-screen w-full max-w-[1580px] flex-col gap-8 px-4 py-5 sm:px-6 sm:py-6 md:px-10 md:py-8">
        <section className="flex flex-wrap items-center justify-between gap-4 rounded-[28px] border border-white/10 bg-white/[0.04] px-4 py-4 backdrop-blur sm:px-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#E8D4AF]/70">Guided Analysis Workspace</p>
            <h2 className="mt-1 text-xl font-semibold text-white">Portfolio Intelligence Dashboard</h2>
          </div>
          <div className="flex w-full flex-wrap items-center gap-3 sm:w-auto sm:justify-end">
            <div className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/75">
              Current Step: {currentJourney.step} {currentJourney.shortLabel}
            </div>
            <AnalysisHistoryPanel
              onRestore={(restoredForm, restoredAnalysis) => {
                setForm(restoredForm);
                setAnalysis(restoredAnalysis);
                setActiveTab("overview");
              }}
            />
            <Suspense fallback={null}>
              <PdfExportButton analysis={analysis} form={form} />
            </Suspense>
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
          <aside className="self-start rounded-[28px] border border-white/10 bg-white/[0.04] p-4 shadow-panel backdrop-blur xl:sticky xl:top-8">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#E8D4AF]/70">Analysis Journey</p>
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
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/45">Step {tab.step}</p>
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
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#E8D4AF]/70">Executive Summary</p>
                  <h1 className="mt-3 text-3xl font-semibold leading-tight text-white">
                    Read the portfolio in a guided order, not as isolated tabs.
                  </h1>
                  <p className="mt-4 max-w-3xl text-sm leading-7 text-slate md:text-base">{executiveSummary}</p>
                </div>
                <div className="rounded-[28px] border border-white/10 bg-black/20 p-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/45">What this workspace does</p>
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
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#E8D4AF]/70">{currentJourney.eyebrow}</p>
                  <h2 className="mt-3 text-3xl font-semibold text-white">{currentJourney.title}</h2>
                  <p className="mt-4 text-sm leading-7 text-slate">{currentJourney.purpose}</p>
                </div>
                <div className="space-y-4">
                  <div className="rounded-[24px] border border-white/10 bg-black/20 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/45">Question This Section Answers</p>
                    <p className="mt-3 text-sm leading-7 text-white/85">{currentJourney.question}</p>
                  </div>
                  <div className="rounded-[24px] border border-white/10 bg-black/20 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/45">Recommended Next Step</p>
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
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/60">What We Found</p>
              <p className="mt-4 text-sm leading-7 text-white/85">{currentJourney.finding}</p>
            </section>

            <div className="grid gap-6 2xl:grid-cols-[minmax(0,1fr)_21rem]">
              <PortfolioForm
                form={form}
                isLoading={isLoading}
                totalWeight={totalWeight}
                validationIssues={validationIssues}
                canSubmit={canSubmit}
                errorMessage={errorMessage}
                successMessage={successMessage}
                onSubmit={handleSubmit}
                onAddAsset={addAssetRow}
                onRemoveAsset={removeAssetRow}
                onUpdateAsset={updateAsset}
                onChangeLookback={(value) => setForm((c) => ({ ...c, lookbackPeriod: value }))}
                onChangeBenchmark={(value) => setForm((c) => ({ ...c, benchmark: value }))}
                isTickerDisabled={isTickerDisabled}
              />

              <div className="min-w-0 space-y-6 2xl:order-1">
                {activeTab === "overview" && (
                  <TabErrorBoundary tabKey="overview">
                    <SnapshotTab analysis={analysis} isLoading={isLoading} form={form} />
                  </TabErrorBoundary>
                )}
                {activeTab === "risk" && (
                  <TabErrorBoundary tabKey="risk">
                    <RiskTab analysis={analysis} isLoading={isLoading} riskInterpretation={riskInterpretation} />
                  </TabErrorBoundary>
                )}
                {activeTab === "scenario" && (
                  <TabErrorBoundary tabKey="scenario">
                    <ScenarioTab analysis={analysis} scenarioInterpretation={scenarioInterpretation} form={form} />
                  </TabErrorBoundary>
                )}
                {activeTab === "factor" && (
                  <TabErrorBoundary tabKey="factor">
                    <FactorTab analysis={analysis} factorModel={factorModel} factorInterpretation={factorInterpretation} />
                  </TabErrorBoundary>
                )}
                {activeTab === "montecarlo" && (
                  <TabErrorBoundary tabKey="montecarlo">
                    <MonteCarloTab analysis={analysis} />
                  </TabErrorBoundary>
                )}
                {activeTab === "optimizer" && (
                  <TabErrorBoundary tabKey="optimizer">
                    <OptimizerTab form={form} onApplyWeights={applyOptimalWeights} />
                  </TabErrorBoundary>
                )}
                {activeTab === "guide" && (
                  <TabErrorBoundary tabKey="guide">
                    <IndexGuideTab />
                  </TabErrorBoundary>
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
  return (
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  );
}
