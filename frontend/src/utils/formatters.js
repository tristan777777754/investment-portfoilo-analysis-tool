export function toFiniteNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function formatMetricPercent(value) {
  const parsed = toFiniteNumber(value);
  return parsed === null ? "N/A" : `${(parsed * 100).toFixed(2)}%`;
}

export function formatChartPercent(value) {
  const parsed = toFiniteNumber(value);
  return parsed === null ? "N/A" : `${parsed.toFixed(2)}%`;
}

export function formatSignedMetricPercent(value) {
  const parsed = toFiniteNumber(value);
  if (parsed === null) return "N/A";
  const sign = parsed > 0 ? "+" : "";
  return `${sign}${(parsed * 100).toFixed(2)}%`;
}

export function formatDisplayWeight(value) {
  const parsed = toFiniteNumber(value);
  return parsed === null ? "N/A" : parsed.toFixed(2).replace(/\.00$/, "").replace(/(\.\d)0$/, "$1");
}

export function formatMetricValue(label, value) {
  const parsed = toFiniteNumber(value);
  if (parsed === null) return "N/A";
  if (["Sharpe Ratio", "Sortino Ratio", "Beta vs Benchmark", "Effective Holdings", "Herfindahl Index"].includes(label)) {
    return parsed.toFixed(2);
  }
  return formatMetricPercent(parsed);
}

export function formatFactorValue(value) {
  const parsed = toFiniteNumber(value);
  if (parsed === null) return "N/A";
  return parsed.toFixed(2);
}

export function getCorrelationCellClass(value, mode = "absolute", bounds = { min: -1, max: 1 }) {
  const normalizedValue = getNormalizedCorrelationValue(value, mode, bounds);
  if (normalizedValue >= 0.5) return "ring-1 ring-[#D4B483]/35";
  if (normalizedValue >= 0.15) return "ring-1 ring-[#C88C7A]/30";
  if (normalizedValue >= -0.15) return "ring-1 ring-white/10";
  if (normalizedValue >= -0.5) return "ring-1 ring-[#A88BB9]/30";
  return "ring-1 ring-[#8E7DB0]/35";
}

export function getCorrelationScaleBounds(correlationMatrix) {
  const values = correlationMatrix
    .flatMap((row) => Object.values(row.values || {}))
    .filter((value) => Number.isFinite(value));

  if (!values.length) {
    return { min: -1, max: 1 };
  }

  return {
    min: Math.min(...values),
    max: Math.max(...values),
  };
}

export function getNormalizedCorrelationValue(value, mode = "absolute", bounds = { min: -1, max: 1 }) {
  const numericValue = toFiniteNumber(value);
  if (numericValue === null) return 0;

  if (mode !== "relative") {
    return Math.max(-1, Math.min(1, numericValue));
  }

  const min = toFiniteNumber(bounds.min);
  const max = toFiniteNumber(bounds.max);
  if (min === null || max === null || Math.abs(max - min) < 1e-9) {
    return 0;
  }

  const scaled = ((numericValue - min) / (max - min)) * 2 - 1;
  return Math.max(-1, Math.min(1, scaled));
}

export function getCorrelationCellStyle(value, mode = "absolute", bounds = { min: -1, max: 1 }) {
  const normalizedValue = getNormalizedCorrelationValue(value, mode, bounds);
  if (normalizedValue >= 0) {
    const intensity = normalizedValue;
    const alpha = 0.22 + intensity * 0.38;
    return {
      backgroundColor: `rgba(168, 126, 78, ${alpha})`,
      color: "#F8FAFC",
      textShadow: "0 1px 1px rgba(0, 0, 0, 0.35)"
    };
  }
  const intensity = Math.abs(normalizedValue);
  const alpha = 0.2 + intensity * 0.36;
  return {
    backgroundColor: `rgba(103, 86, 140, ${alpha})`,
    color: "#F8FAFC",
    textShadow: "0 1px 1px rgba(0, 0, 0, 0.35)"
  };
}
