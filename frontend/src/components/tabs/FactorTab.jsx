import { useRef } from "react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { InfoTooltip } from "../shared/InfoTooltip.jsx";
import { ChartExportButton } from "../shared/ChartExportButton.jsx";
import { factorMetricHelp } from "../../constants.jsx";
import { formatMetricPercent, formatFactorValue } from "../../utils/formatters.js";

export function FactorTab({ analysis, factorModel, factorInterpretation }) {
  const factorExposureChartRef = useRef(null);
  const factorMetricCards = factorModel?.is_available
    ? [
        ["Alpha Daily", factorModel.alpha_daily, "percent"],
        ["Alpha Annualized", factorModel.alpha_annualized, "percent"],
        ["R-Squared", factorModel.r_squared, "number"],
        ["Residual Volatility", factorModel.residual_volatility, "percent"],
        ["Observations", factorModel.observations, "integer"]
      ]
    : [];

  const factorExposureData = factorModel?.exposures || [];

  return (
    <>
      <section className="grid gap-6">
        <article className="rounded-[32px] border border-white/70 bg-white/85 p-8 shadow-panel backdrop-blur">
          <p className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-slate">Kenneth French Factor Data</p>
          <h2 className="text-3xl font-semibold">Factor Model</h2>
          <p className="mt-3 max-w-3xl text-base leading-7 text-slate">
            Phase 1 explains portfolio excess return using the official Kenneth French daily Fama-French factors: market excess return, size, value, and momentum.
          </p>
        </article>
      </section>

      {!analysis ? (
        <section className="rounded-[28px] bg-white p-6 shadow-panel ring-1 ring-mist">
          <p className="text-sm text-slate">No factor model loaded yet. Submit the form to estimate portfolio factor exposures.</p>
        </section>
      ) : factorModel?.is_available ? (
        <>
          <section className="grid grid-cols-2 gap-5 xl:grid-cols-3 2xl:grid-cols-5">
            {factorMetricCards.map(([label, value, type]) => (
              <article key={label} className="rounded-[28px] bg-white p-4 shadow-panel ring-1 ring-mist transition hover:-translate-y-0.5 hover:shadow-xl sm:p-6">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm text-slate">{label}</p>
                  <InfoTooltip text={factorMetricHelp[label]} />
                </div>
                <p className="mt-3 text-2xl font-semibold sm:text-3xl">
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
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-white/60">Interpretation Layer</p>
              <h2 className="mt-3 text-2xl font-semibold">What These Factor Results Suggest</h2>
              <p className="mt-4 text-sm leading-7 text-white/85">{factorInterpretation}</p>
            </article>
            <article className="rounded-[32px] border border-[#D0D5DD] bg-white p-6 shadow-panel">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate">Model Setup</p>
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
            <article ref={factorExposureChartRef} className="rounded-[32px] bg-white p-6 shadow-panel ring-1 ring-mist">
              <div className="mb-4 flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-xl font-semibold">Factor Exposures</h2>
                  <p className="text-sm text-slate">Positive beta means the portfolio tends to move with that factor; negative beta means it tends to move against it.</p>
                </div>
                <ChartExportButton targetRef={factorExposureChartRef} filename="factor-exposures" />
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
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">Model: {factorModel.model_name}</div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">Observations: {factorModel.observations} trading days</div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  R-Squared: {formatFactorValue(factorModel.r_squared)} means the factor model explains only part of the total portfolio behavior when this number is low.
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  Residual Volatility: {formatMetricPercent(factorModel.residual_volatility)} is the risk left over after the factor model explanation.
                </div>
              </div>
            </article>
          </section>

          <section className="grid gap-6 2xl:grid-cols-[1fr_1fr]">
            <article className="rounded-[32px] bg-white p-6 shadow-panel ring-1 ring-mist">
              <div className="mb-4">
                <h2 className="text-xl font-semibold">Exposure Details</h2>
                <p className="text-sm text-slate">These betas are estimated from daily portfolio excess returns matched to Kenneth French factor dates.</p>
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
              <p className="mt-4 text-sm leading-7 text-slate">{factorModel.future_plan}</p>
              <div className="mt-6 grid gap-3 text-sm text-slate">
                <div className="rounded-2xl bg-surface p-4 ring-1 ring-mist">Add RMW to test profitability exposure.</div>
                <div className="rounded-2xl bg-surface p-4 ring-1 ring-mist">Add CMA to test conservative versus aggressive investment exposure.</div>
                <div className="rounded-2xl bg-surface p-4 ring-1 ring-mist">Compare the current four-factor model against the upgraded five-factor-plus-momentum model.</div>
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
            <p className="mt-4 text-sm leading-7 text-slate">{factorModel?.future_plan}</p>
          </article>
        </section>
      )}
    </>
  );
}
