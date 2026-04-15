import { stockOptions } from "../constants.jsx";

export function getEvenWeightStrings(count) {
  const totalBasisPoints = 10000;
  const base = Math.floor(totalBasisPoints / count);
  const remainder = totalBasisPoints - base * count;
  return Array.from({ length: count }, (_, index) => {
    const basisPoints = base + (index < remainder ? 1 : 0);
    return (basisPoints / 100).toFixed(2);
  });
}

export function rebalanceAssets(assets) {
  const balancedWeights = getEvenWeightStrings(assets.length);
  return assets.map((asset, index) => ({ ...asset, weight: balancedWeights[index] }));
}

export function getNextTicker(currentAssets) {
  const selected = new Set(currentAssets.map((asset) => asset.ticker));
  return stockOptions.find((option) => !selected.has(option)) || stockOptions[0];
}

export function buildPayload(form) {
  const assets = form.assets.map((asset) => ({
    ticker: asset.ticker,
    weight: Number(asset.weight)
  }));

  const invalidWeight = assets.some((asset) => Number.isNaN(asset.weight) || asset.weight <= 0);
  if (invalidWeight) throw new Error("Each asset weight must be a valid positive number.");

  const seen = new Set();
  for (const asset of assets) {
    if (seen.has(asset.ticker)) throw new Error("Duplicate tickers are not allowed.");
    seen.add(asset.ticker);
  }

  const totalWeight = assets.reduce((sum, asset) => sum + asset.weight, 0);
  if (Math.abs(totalWeight - 100) > 0.001) throw new Error("Total asset weight must equal 100.");

  return { assets, benchmark: form.benchmark, lookback_period: form.lookbackPeriod };
}

export function getErrorMessage(errorPayload) {
  if (!errorPayload) return "Something went wrong.";
  if (typeof errorPayload.detail === "string") return errorPayload.detail;
  if (Array.isArray(errorPayload.detail)) {
    return errorPayload.detail
      .map((item) => (item?.loc && item?.msg ? `${item.loc.join(" > ")}: ${item.msg}` : JSON.stringify(item)))
      .join(" | ");
  }
  return "Something went wrong.";
}
