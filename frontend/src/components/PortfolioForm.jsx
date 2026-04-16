import { benchmarkOptions } from "../constants.jsx";
import { TickerCombobox } from "./shared/TickerCombobox.jsx";

export function PortfolioForm({
  className = "",
  form,
  isLoading,
  totalWeight,
  validationIssues,
  canSubmit,
  errorMessage,
  successMessage,
  onSubmit,
  onAddAsset,
  onRemoveAsset,
  onUpdateAsset,
  onChangeLookback,
  onChangeBenchmark,
  isTickerDisabled
}) {
  return (
    <form
      onSubmit={onSubmit}
      className={`self-start rounded-[36px] border border-white/10 bg-[#0F172A] p-5 text-white shadow-panel overflow-visible sm:p-6 min-[1850px]:sticky min-[1850px]:top-8 min-[1850px]:max-h-[calc(100vh-6rem)] min-[1850px]:overflow-hidden ${className}`}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-2xl font-semibold">Input Panel</h2>
        <button
          type="button"
          onClick={onAddAsset}
          disabled={form.assets.length >= 6}
          className="rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-40"
        >
          + Add Asset
        </button>
      </div>

      <div className="mt-6 flex flex-col gap-4 min-[1850px]:h-[calc(100%-3.5rem)]">
        <div className="space-y-4 overflow-visible pr-0 min-[1850px]:max-h-[18.5rem] min-[1850px]:overflow-y-auto min-[1850px]:pr-2">
          {form.assets.map((asset, index) => (
            <div key={`${asset.ticker}-${index}`} className="rounded-3xl border border-white/10 bg-white/5 p-4">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-sm font-semibold text-white/70">Asset {index + 1}</p>
                {form.assets.length > 1 ? (
                  <button
                    type="button"
                    onClick={() => onRemoveAsset(index)}
                    className="text-sm font-semibold text-red-200 transition hover:text-red-100"
                  >
                    Remove
                  </button>
                ) : null}
              </div>
              <div className="grid gap-4 sm:grid-cols-[1.2fr_0.8fr]">
                <label className="block">
                  <span className="mb-2 block text-sm text-white/70">Stock</span>
                  <TickerCombobox
                    value={asset.ticker}
                    onChange={(value) => onUpdateAsset(index, "ticker", value)}
                    isDisabled={(option) => isTickerDisabled(option, index)}
                  />
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
                    onChange={(event) => onUpdateAsset(index, "weight", event.target.value)}
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
            {validationIssues.map((issue) => <p key={issue}>{issue}</p>)}
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
              onChange={(event) => onChangeLookback(event.target.value)}
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
              onChange={(event) => onChangeBenchmark(event.target.value)}
            >
              {benchmarkOptions.map((option) => (
                <option key={option} value={option}>{option}</option>
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
  );
}
