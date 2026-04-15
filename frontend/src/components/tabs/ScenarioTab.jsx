import { useState } from "react";
import { API_BASE_URL } from "../../constants.jsx";
import { InfoTooltip } from "../shared/InfoTooltip.jsx";
import { scenarioMetricHelp } from "../../constants.jsx";
import { formatSignedMetricPercent } from "../../utils/formatters.js";

const AVAILABLE_SECTORS = [
  "Technology","Healthcare","Financials","Energy","Consumer Discretionary",
  "Consumer Staples","Industrials","Materials","Utilities","Real Estate","Communication Services",
];

function SectorStressPanel({ form }) {
  const [sectorShocks, setSectorShocks] = useState({ Technology: -15 });
  const [result, setResult] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  function toggleSector(sector) {
    setSectorShocks((prev) => {
      const next = { ...prev };
      if (sector in next) { delete next[sector]; } else { next[sector] = -10; }
      return next;
    });
  }

  function setShock(sector, value) {
    setSectorShocks((prev) => ({ ...prev, [sector]: Number(value) }));
  }

  async function runStress() {
    if (!form || Object.keys(sectorShocks).length === 0) return;
    setIsLoading(true);
    setError("");
    setResult(null);
    try {
      const payload = {
        assets: form.assets.map((a) => ({ ticker: a.ticker.toUpperCase(), weight: parseFloat(a.weight) })),
        lookback_period: form.lookbackPeriod,
        sector_shocks: Object.fromEntries(Object.entries(sectorShocks).map(([k, v]) => [k, v / 100])),
      };
      const resp = await fetch(`${API_BASE_URL}/api/v1/sector-stress`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.detail || "Sector stress request failed.");
      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }

  if (!form) return null;

  return (
    <section className="rounded-[32px] border border-white/10 bg-white/[0.04] p-6 text-white shadow-panel backdrop-blur">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#E8D4AF]/70">Sector Beta Stress Test</p>
      <h2 className="mt-3 text-2xl font-semibold">Sector-Level Shock Estimation</h2>
      <p className="mt-2 text-sm leading-6 text-white/70">
        Select sectors and set shock magnitudes. Portfolio impact is estimated using OLS sector betas computed from historical returns.
      </p>

      <div className="mt-6 flex flex-wrap gap-2">
        {AVAILABLE_SECTORS.map((sector) => (
          <button
            key={sector}
            type="button"
            onClick={() => toggleSector(sector)}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
              sector in sectorShocks
                ? "bg-[#D4B483]/20 text-[#E7CDA0] ring-1 ring-[#D4B483]/40"
                : "bg-white/5 text-white/50 ring-1 ring-white/10 hover:bg-white/10"
            }`}
          >
            {sector}
          </button>
        ))}
      </div>

      {Object.keys(sectorShocks).length > 0 && (
        <div className="mt-5 space-y-4">
          {Object.entries(sectorShocks).map(([sector, shock]) => (
            <div key={sector}>
              <div className="mb-2 flex items-center justify-between text-sm">
                <span className="font-semibold">{sector}</span>
                <span className={`font-semibold ${shock < 0 ? "text-[#F1B0A3]" : "text-[#E7CDA0]"}`}>
                  {shock >= 0 ? "+" : ""}{shock}%
                </span>
              </div>
              <input
                type="range" min="-50" max="50" step="1" value={shock}
                onChange={(e) => setShock(sector, e.target.value)}
                className="w-full accent-[#D4B483]"
              />
            </div>
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={runStress}
        disabled={isLoading || Object.keys(sectorShocks).length === 0}
        className="mt-5 w-full rounded-2xl bg-[linear-gradient(135deg,#E8D4AF_0%,#D4B483_48%,#B68562_100%)] px-4 py-3 text-sm font-semibold text-[#1A140E] transition hover:brightness-110 disabled:opacity-40"
      >
        {isLoading ? "Running Sector Stress…" : "Run Sector Stress"}
      </button>

      {error && (
        <div className="mt-4 rounded-2xl border border-[#C88C7A]/35 bg-[#C88C7A]/10 px-4 py-3 text-sm text-[#F7D2CB]">{error}</div>
      )}

      {result && (
        <div className="mt-6 space-y-4">
          <div className="rounded-[24px] border border-white/10 bg-black/20 p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/45">Estimated Portfolio Impact</p>
            <p className={`mt-3 text-4xl font-semibold ${result.portfolio_return < 0 ? "text-[#F1B0A3]" : "text-[#E7CDA0]"}`}>
              {result.portfolio_return >= 0 ? "+" : ""}{(result.portfolio_return * 100).toFixed(2)}%
            </p>
          </div>
          <div className="space-y-3">
            {result.asset_impacts.map((item) => (
              <div key={item.ticker} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-semibold">{item.ticker}</span>
                  <span className={`font-semibold ${item.weighted_impact < 0 ? "text-[#F1B0A3]" : "text-[#E7CDA0]"}`}>
                    {item.weighted_impact >= 0 ? "+" : ""}{(item.weighted_impact * 100).toFixed(2)}%
                  </span>
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {Object.entries(item.sector_betas).map(([s, b]) => (
                    <span key={s} className="rounded-full bg-white/5 px-2 py-0.5 text-xs text-white/50 ring-1 ring-white/10">
                      {s} β={b.toFixed(2)}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

function MacroScenarioPanel({ form }) {
  const [scenarios, setScenarios] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [result, setResult] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  async function loadScenarios() {
    try {
      const resp = await fetch(`${API_BASE_URL}/api/v1/scenarios`);
      const data = await resp.json();
      setScenarios(data);
    } catch (err) {
      setError("Could not load scenario library.");
    }
  }

  async function applyScenario(scenarioId) {
    if (!form) return;
    setIsLoading(true);
    setError("");
    setResult(null);
    setSelectedId(scenarioId);
    try {
      const payload = {
        scenario_id: scenarioId,
        assets: form.assets.map((a) => ({ ticker: a.ticker.toUpperCase(), weight: parseFloat(a.weight) })),
      };
      const resp = await fetch(`${API_BASE_URL}/api/v1/scenarios/apply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.detail || "Failed to apply scenario.");
      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }

  if (!form) return null;

  return (
    <section className="rounded-[32px] border border-white/10 bg-white/[0.04] p-6 text-white shadow-panel backdrop-blur">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#E8D4AF]/70">Macro Scenario Library</p>
      <h2 className="mt-3 text-2xl font-semibold">Historical Event Stress Tests</h2>
      <p className="mt-2 text-sm leading-6 text-white/70">
        Select a historical macro event to see how your portfolio would have been impacted based on documented peak-to-trough shocks.
      </p>

      {!scenarios && (
        <button
          type="button"
          onClick={loadScenarios}
          className="mt-4 rounded-2xl bg-[linear-gradient(135deg,#E8D4AF_0%,#D4B483_48%,#B68562_100%)] px-4 py-2.5 text-sm font-semibold text-[#1A140E] transition hover:brightness-110"
        >
          Load Scenario Library
        </button>
      )}

      {scenarios && (
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {scenarios.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => applyScenario(s.id)}
              disabled={isLoading}
              className={`rounded-2xl border px-4 py-3 text-left transition ${
                selectedId === s.id
                  ? "border-[#D4B483]/40 bg-[#D4B483]/10"
                  : "border-white/10 bg-white/5 hover:bg-white/10"
              }`}
            >
              <p className="text-sm font-semibold leading-5">{s.name}</p>
              <p className="mt-1 text-xs leading-5 text-white/55">{s.description}</p>
            </button>
          ))}
        </div>
      )}

      {error && (
        <div className="mt-4 rounded-2xl border border-[#C88C7A]/35 bg-[#C88C7A]/10 px-4 py-3 text-sm text-[#F7D2CB]">{error}</div>
      )}

      {isLoading && <p className="mt-4 text-sm text-white/50">Applying scenario…</p>}

      {result && (
        <div className="mt-6 space-y-4">
          <div className="rounded-[24px] border border-white/10 bg-black/20 p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/45">{result.scenario_name}</p>
            <p className="mt-1 text-xs text-white/40">{result.description}</p>
            <p className={`mt-3 text-4xl font-semibold ${result.portfolio_return < 0 ? "text-[#F1B0A3]" : "text-[#E7CDA0]"}`}>
              {result.portfolio_return >= 0 ? "+" : ""}{(result.portfolio_return * 100).toFixed(2)}%
            </p>
          </div>
          <div className="space-y-3">
            {result.asset_impacts.map((item) => (
              <div key={item.ticker} className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm">
                <div>
                  <span className="font-semibold">{item.ticker}</span>
                  {!item.in_scenario && <span className="ml-2 text-xs text-white/40">(not in scenario, 0% shock)</span>}
                </div>
                <div className="text-right">
                  <span className={`text-xs text-white/50`}>Shock: {item.shock >= 0 ? "+" : ""}{(item.shock * 100).toFixed(0)}%</span>
                  <span className={`ml-4 font-semibold ${item.weighted_impact < 0 ? "text-[#F1B0A3]" : "text-[#E7CDA0]"}`}>
                    {item.weighted_impact >= 0 ? "+" : ""}{(item.weighted_impact * 100).toFixed(2)}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

const SAVED_SCENARIOS_KEY = "portfolio_custom_scenarios";

function CustomShockBuilder({ allocation }) {
  const assets = allocation || [];
  const [shocks, setShocks] = useState(() => Object.fromEntries(assets.map((a) => [a.ticker, 0])));
  const [scenarioName, setScenarioName] = useState("");
  const [savedScenarios, setSavedScenarios] = useState(() => {
    try { return JSON.parse(localStorage.getItem(SAVED_SCENARIOS_KEY) || "[]"); } catch { return []; }
  });

  const portfolioImpact = assets.reduce((sum, a) => sum + (a.weight / 100) * ((shocks[a.ticker] ?? 0) / 100), 0);

  function handleSlider(ticker, value) {
    setShocks((prev) => ({ ...prev, [ticker]: Number(value) }));
  }

  function saveScenario() {
    if (!scenarioName.trim()) return;
    const entry = { name: scenarioName.trim(), shocks: { ...shocks }, portfolioImpact, savedAt: new Date().toISOString() };
    const updated = [entry, ...savedScenarios.slice(0, 9)];
    setSavedScenarios(updated);
    localStorage.setItem(SAVED_SCENARIOS_KEY, JSON.stringify(updated));
    setScenarioName("");
  }

  function deleteScenario(index) {
    const updated = savedScenarios.filter((_, i) => i !== index);
    setSavedScenarios(updated);
    localStorage.setItem(SAVED_SCENARIOS_KEY, JSON.stringify(updated));
  }

  function loadScenario(scenario) {
    setShocks(scenario.shocks);
  }

  if (!assets.length) return null;

  return (
    <section className="rounded-[32px] border border-white/10 bg-white/[0.04] p-6 text-white shadow-panel backdrop-blur">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#E8D4AF]/70">Custom Shock Builder</p>
      <h2 className="mt-3 text-2xl font-semibold">Define Your Own Scenario</h2>
      <p className="mt-2 text-sm leading-6 text-white/70">
        Drag each slider to apply a percentage shock to each asset. Portfolio impact is calculated in real time.
      </p>

      <div className="mt-6 space-y-5">
        {assets.map((a) => (
          <div key={a.ticker}>
            <div className="mb-2 flex items-center justify-between text-sm">
              <span className="font-semibold">{a.ticker} <span className="text-white/50">({a.weight.toFixed(1)}%)</span></span>
              <span className={`font-semibold ${shocks[a.ticker] < 0 ? "text-[#F1B0A3]" : shocks[a.ticker] > 0 ? "text-[#E7CDA0]" : "text-white/60"}`}>
                {shocks[a.ticker] >= 0 ? "+" : ""}{shocks[a.ticker]}%
              </span>
            </div>
            <input
              type="range"
              min="-50"
              max="50"
              step="1"
              value={shocks[a.ticker] ?? 0}
              onChange={(e) => handleSlider(a.ticker, e.target.value)}
              className="w-full accent-[#D4B483]"
            />
            <div className="mt-1 flex justify-between text-xs text-white/40">
              <span>-50%</span><span>0</span><span>+50%</span>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 rounded-[24px] border border-white/10 bg-black/20 p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/45">Estimated Portfolio Impact</p>
        <p className={`mt-3 text-4xl font-semibold ${portfolioImpact < 0 ? "text-[#F1B0A3]" : portfolioImpact > 0 ? "text-[#E7CDA0]" : "text-white"}`}>
          {portfolioImpact >= 0 ? "+" : ""}{(portfolioImpact * 100).toFixed(2)}%
        </p>
        <p className="mt-2 text-xs text-white/50">Weighted sum: Σ (weight × shock)</p>
      </div>

      <div className="mt-4 flex gap-3">
        <input
          type="text"
          placeholder="Scenario name…"
          value={scenarioName}
          onChange={(e) => setScenarioName(e.target.value)}
          className="flex-1 rounded-2xl border border-white/10 bg-[#20273A] px-4 py-2.5 text-sm text-white outline-none focus:border-white/30"
        />
        <button
          type="button"
          onClick={saveScenario}
          disabled={!scenarioName.trim()}
          className="rounded-2xl bg-[linear-gradient(135deg,#E8D4AF_0%,#D4B483_48%,#B68562_100%)] px-4 py-2.5 text-sm font-semibold text-[#1A140E] disabled:opacity-40"
        >
          Save
        </button>
      </div>

      {savedScenarios.length > 0 && (
        <div className="mt-6 space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/45">Saved Scenarios</p>
          {savedScenarios.map((scenario, i) => (
            <div key={`${scenario.name}-${i}`} className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
              <div>
                <p className="text-sm font-semibold">{scenario.name}</p>
                <p className={`text-xs ${scenario.portfolioImpact < 0 ? "text-[#F1B0A3]" : "text-[#E7CDA0]"}`}>
                  {scenario.portfolioImpact >= 0 ? "+" : ""}{(scenario.portfolioImpact * 100).toFixed(2)}%
                </p>
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={() => loadScenario(scenario)} className="rounded-xl border border-white/10 px-3 py-1 text-xs font-semibold text-white/70 hover:bg-white/10">Load</button>
                <button type="button" onClick={() => deleteScenario(i)} className="rounded-xl border border-red-400/20 px-3 py-1 text-xs font-semibold text-red-300/70 hover:bg-red-400/10">Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

export function ScenarioTab({ analysis, scenarioInterpretation, form }) {
  const scenarioCards = analysis?.scenarios
    ? [analysis.scenarios.market_shock, analysis.scenarios.sector_shock].filter(Boolean)
    : [];

  return (
    <>
      <section className="grid gap-5 md:grid-cols-2 2xl:grid-cols-4">
        {scenarioCards.length ? (
          scenarioCards.flatMap((scenario) => [
            <article key={`${scenario.scenario_type}-portfolio`} className="rounded-[28px] bg-white p-6 shadow-panel ring-1 ring-mist">
              <p className="text-sm text-slate">{scenario.scenario_name}</p>
              <div className="mt-2 flex items-start justify-between gap-3">
                <p className="text-xs uppercase tracking-[0.18em] text-slate/70">Portfolio Impact</p>
                <InfoTooltip text={scenarioMetricHelp["Portfolio Impact"]} />
              </div>
              <p className="mt-3 text-3xl font-semibold text-[#F1B0A3]">
                {formatSignedMetricPercent(scenario.portfolio_estimated_return)}
              </p>
            </article>,
            <article key={`${scenario.scenario_type}-benchmark`} className="rounded-[28px] bg-white p-6 shadow-panel ring-1 ring-mist">
              <p className="text-sm text-slate">{scenario.scenario_name}</p>
              <div className="mt-2 flex items-start justify-between gap-3">
                <p className="text-xs uppercase tracking-[0.18em] text-slate/70">Benchmark Impact</p>
                <InfoTooltip text={scenarioMetricHelp["Benchmark Impact"]} />
              </div>
              <p className="mt-3 text-3xl font-semibold text-[#D4DBE7]">
                {scenario.benchmark_estimated_return !== null ? formatSignedMetricPercent(scenario.benchmark_estimated_return) : "N/A"}
              </p>
            </article>,
            <article key={`${scenario.scenario_type}-relative`} className="rounded-[28px] bg-white p-6 shadow-panel ring-1 ring-mist">
              <p className="text-sm text-slate">{scenario.scenario_name}</p>
              <div className="mt-2 flex items-start justify-between gap-3">
                <p className="text-xs uppercase tracking-[0.18em] text-slate/70">Relative vs Benchmark</p>
                <InfoTooltip text={scenarioMetricHelp["Relative vs Benchmark"]} />
              </div>
              <p className={`mt-3 text-3xl font-semibold ${scenario.relative_impact_vs_benchmark >= 0 ? "text-[#E7CDA0]" : "text-[#F1B0A3]"}`}>
                {scenario.relative_impact_vs_benchmark !== null ? formatSignedMetricPercent(scenario.relative_impact_vs_benchmark) : "N/A"}
              </p>
            </article>,
            <article key={`${scenario.scenario_type}-type`} className="rounded-[28px] bg-white p-6 shadow-panel ring-1 ring-mist">
              <p className="text-sm text-slate">{scenario.scenario_name}</p>
              <div className="mt-2 flex items-start justify-between gap-3">
                <p className="text-xs uppercase tracking-[0.18em] text-slate/70">Scenario Type</p>
                <InfoTooltip text={scenarioMetricHelp["Scenario Type"]} />
              </div>
              <p className="mt-3 text-2xl font-semibold">{scenario.scenario_type.replace("_", " ")}</p>
            </article>
          ])
        ) : (
          <article className="rounded-[28px] bg-white p-6 shadow-panel ring-1 ring-mist md:col-span-2 xl:col-span-4">
            <p className="text-sm text-slate">No scenario analysis loaded yet. Submit the form to generate preset stress tests.</p>
          </article>
        )}
      </section>

      <section className="grid gap-6 2xl:grid-cols-[1fr_1fr]">
        <article className="rounded-[32px] bg-[#101828] p-6 text-white shadow-panel">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-white/60">Interpretation Layer</p>
          <h2 className="mt-3 text-2xl font-semibold">What These Scenarios Suggest</h2>
          <p className="mt-4 text-sm leading-7 text-white/85">{scenarioInterpretation}</p>
        </article>
        <article className="rounded-[32px] border border-[#D0D5DD] bg-white p-6 shadow-panel">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate">How To Read It</p>
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
                <span key={assumption} className="rounded-full bg-surface px-3 py-1.5 text-xs font-medium text-slate ring-1 ring-mist">
                  {assumption}
                </span>
              ))}
            </div>
            <div className="rounded-3xl bg-[#101828] p-5 text-sm leading-7 text-white shadow-panel">
              {scenario.summary}
            </div>
            <div className="mt-6 space-y-4">
              {scenario.asset_impacts.map((item) => {
                const maxAbsImpact = Math.max(...scenario.asset_impacts.map((row) => Math.abs(row.weighted_impact)), 0.0001);
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
                        <p className="font-semibold text-[#F1B0A3]">{formatSignedMetricPercent(item.weighted_impact)}</p>
                      </div>
                    </div>
                    <div className="h-3 overflow-hidden rounded-full bg-white ring-1 ring-mist">
                      <div className="h-full rounded-full bg-[linear-gradient(90deg,#D4B483_0%,#C88C7A_100%)]" style={{ width: barWidth }} />
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
            <li>Use the Custom Shock Builder below to define your own shocks and save named scenarios.</li>
          </ul>
        </article>
        <article className="rounded-[32px] bg-[#101828] p-6 text-white shadow-panel">
          <h2 className="text-xl font-semibold">Why It Matters</h2>
          <p className="mt-4 text-sm leading-7 text-white/80">
            The Scenario Lab extends the dashboard beyond historical analysis. It shows how the same portfolio could behave under a broad market selloff or a focused technology shock, making the tool feel more like a practical stress-testing dashboard.
          </p>
        </article>
      </section>

      <CustomShockBuilder allocation={analysis?.charts?.allocation} />
      <SectorStressPanel form={form} />
      <MacroScenarioPanel form={form} />
    </>
  );
}
