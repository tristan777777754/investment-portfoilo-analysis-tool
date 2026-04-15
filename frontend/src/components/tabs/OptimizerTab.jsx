import { useRef, useState } from "react";
import {
  ResponsiveContainer, ScatterChart, Scatter, XAxis, YAxis, Tooltip,
  CartesianGrid, ReferenceDot
} from "recharts";
import { API_BASE_URL } from "../../constants.jsx";
import { formatMetricPercent } from "../../utils/formatters.js";
import { buildPayload } from "../../utils/portfolio.js";
import { ChartExportButton } from "../shared/ChartExportButton.jsx";

export function OptimizerTab({ form, onApplyWeights }) {
  const [optimization, setOptimization] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [hoveredPoint, setHoveredPoint] = useState(null);
  const efficientFrontierChartRef = useRef(null);

  async function runOptimization() {
    setIsLoading(true);
    setError("");
    try {
      const payload = buildPayload(form);
      const response = await fetch(`${API_BASE_URL}/api/v1/optimize`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || "Optimization failed.");
      setOptimization(data);
    } catch (err) {
      setError(err.message || "Something went wrong.");
    } finally {
      setIsLoading(false);
    }
  }

  const frontierData = (optimization?.frontier || []).map((p) => ({
    volatility: parseFloat((p.volatility * 100).toFixed(2)),
    expected_return: parseFloat((p.expected_return * 100).toFixed(2)),
    sharpe: p.sharpe,
    weights: p.weights,
  }));

  const minVarPoint = optimization?.min_variance
    ? {
        volatility: parseFloat((optimization.min_variance.volatility * 100).toFixed(2)),
        expected_return: parseFloat((optimization.min_variance.expected_return * 100).toFixed(2)),
      }
    : null;

  const maxSharpePoint = optimization?.max_sharpe
    ? {
        volatility: parseFloat((optimization.max_sharpe.volatility * 100).toFixed(2)),
        expected_return: parseFloat((optimization.max_sharpe.expected_return * 100).toFixed(2)),
      }
    : null;

  const tickers = optimization?.tickers || [];

  function renderWeightBar(weights, label, color) {
    return (
      <div className="rounded-[28px] border border-mist bg-surface p-5">
        <h4 className="text-sm font-semibold text-ink">{label}</h4>
        <div className="mt-4 space-y-2">
          {tickers.map((ticker) => {
            const w = weights[ticker] ?? 0;
            return (
              <div key={ticker}>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span className="font-medium text-ink">{ticker}</span>
                  <span className="text-slate">{(w * 100).toFixed(1)}%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-white ring-1 ring-mist">
                  <div className="h-full rounded-full" style={{ width: `${w * 100}%`, backgroundColor: color }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <>
      <section className="grid gap-6">
        <article className="rounded-[32px] border border-white/70 bg-white/85 p-8 shadow-panel backdrop-blur">
          <p className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-slate">Mean-Variance Optimization · Long-Only · SciPy SLSQP</p>
          <h2 className="text-3xl font-semibold">Efficient Frontier</h2>
          <p className="mt-3 max-w-3xl text-base leading-7 text-slate">
            Find the minimum-variance and maximum-Sharpe portfolios for your selected assets. The efficient frontier traces all portfolios with the lowest volatility for a given expected return.
          </p>
          <button
            type="button"
            onClick={runOptimization}
            disabled={isLoading}
            className="mt-6 rounded-full bg-[linear-gradient(135deg,#E8D4AF_0%,#D4B483_48%,#B68562_100%)] px-6 py-3 text-sm font-semibold text-[#1A140E] transition hover:brightness-110 disabled:opacity-60"
          >
            {isLoading ? "Optimizing..." : "Run Optimization"}
          </button>
          {error ? (
            <p className="mt-4 text-sm text-rose-600">{error}</p>
          ) : null}
        </article>
      </section>

      {optimization ? (
        <>
          <section className="grid grid-cols-2 gap-5 xl:grid-cols-3">
            {[
              { label: "Min Variance — Expected Return", value: formatMetricPercent(optimization.min_variance.expected_return) },
              { label: "Min Variance — Volatility", value: formatMetricPercent(optimization.min_variance.volatility) },
              { label: "Min Variance — Sharpe", value: optimization.min_variance.sharpe.toFixed(2) },
              { label: "Max Sharpe — Expected Return", value: formatMetricPercent(optimization.max_sharpe.expected_return) },
              { label: "Max Sharpe — Volatility", value: formatMetricPercent(optimization.max_sharpe.volatility) },
              { label: "Max Sharpe — Sharpe", value: optimization.max_sharpe.sharpe.toFixed(2) },
            ].map(({ label, value }) => (
              <article key={label} className="rounded-[28px] bg-white p-4 shadow-panel ring-1 ring-mist sm:p-6">
                <p className="text-sm text-slate">{label}</p>
                <p className="mt-3 text-2xl font-semibold sm:text-3xl">{value}</p>
              </article>
            ))}
          </section>

          <section className="grid gap-6 2xl:grid-cols-[1.4fr_0.6fr]">
            <article ref={efficientFrontierChartRef} className="rounded-[32px] bg-white p-6 shadow-panel ring-1 ring-mist">
              <div className="mb-4 flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-xl font-semibold">Efficient Frontier</h2>
                  <p className="text-sm text-slate">
                    Each point is a portfolio with minimum volatility at a given return. Stars mark Min Variance and Max Sharpe portfolios.
                  </p>
                </div>
                <ChartExportButton targetRef={efficientFrontierChartRef} filename="efficient-frontier" />
              </div>
              <div className="h-96">
                <ResponsiveContainer width="100%" height="100%">
                  <ScatterChart>
                    <CartesianGrid stroke="#EAECF0" />
                    <XAxis
                      type="number"
                      dataKey="volatility"
                      name="Volatility"
                      stroke="#667085"
                      label={{ value: "Volatility (%)", position: "insideBottomRight", offset: -5, fill: "#667085", fontSize: 12 }}
                    />
                    <YAxis
                      type="number"
                      dataKey="expected_return"
                      name="Expected Return"
                      stroke="#667085"
                      label={{ value: "Expected Return (%)", angle: -90, position: "insideLeft", fill: "#667085", fontSize: 12 }}
                    />
                    <Tooltip
                      cursor={{ strokeDasharray: "3 3" }}
                      formatter={(value, name) => [`${value.toFixed(2)}%`, name]}
                    />
                    <Scatter
                      name="Frontier"
                      data={frontierData}
                      fill="#D4B483"
                      opacity={0.7}
                    />
                    {minVarPoint && (
                      <ReferenceDot
                        x={minVarPoint.volatility}
                        y={minVarPoint.expected_return}
                        r={10}
                        fill="#B5C0CF"
                        stroke="#667085"
                        label={{ value: "Min Vol", position: "top", fill: "#667085", fontSize: 11 }}
                      />
                    )}
                    {maxSharpePoint && (
                      <ReferenceDot
                        x={maxSharpePoint.volatility}
                        y={maxSharpePoint.expected_return}
                        r={10}
                        fill="#C88C7A"
                        stroke="#667085"
                        label={{ value: "Max Sharpe", position: "top", fill: "#667085", fontSize: 11 }}
                      />
                    )}
                  </ScatterChart>
                </ResponsiveContainer>
              </div>
            </article>

            <div className="space-y-5">
              {renderWeightBar(optimization.min_variance.weights, "Min Variance Weights", "#B5C0CF")}
              {renderWeightBar(optimization.max_sharpe.weights, "Max Sharpe Weights", "#D4B483")}
              <button
                type="button"
                onClick={() => onApplyWeights(optimization.max_sharpe.weights, tickers)}
                className="w-full rounded-full border border-[#D4B483]/40 bg-[#D4B483]/10 px-5 py-3 text-sm font-semibold text-[#C8A96A] transition hover:bg-[#D4B483]/20"
              >
                Apply Max Sharpe Weights to Form
              </button>
            </div>
          </section>

          <section className="rounded-[32px] border border-[#D0D5DD] bg-white p-6 shadow-panel">
            <h2 className="text-xl font-semibold">Optimization Notes</h2>
            <ul className="mt-4 space-y-3 text-sm leading-6 text-slate">
              <li>Optimization is long-only (no short positions) with weights constrained between 0% and 100%.</li>
              <li>Expected returns and covariances are estimated from the historical returns in the selected lookback window — past data does not guarantee future performance.</li>
              <li>Maximum Sharpe assumes the same risk-free rate used throughout the dashboard (2% annualized).</li>
              <li>The frontier is computed using SciPy SLSQP — a gradient-based constrained optimizer. Some frontier segments may be approximate when the optimizer converges to local solutions.</li>
            </ul>
          </section>
        </>
      ) : null}
    </>
  );
}
