from openai import OpenAI

from app.config import settings
from app.schemas.analysis import AnalysisRequest


def build_ai_summary(payload: AnalysisRequest, results: dict) -> str:
    """
    Generate a short AI summary from real portfolio metrics.

    This function uses the OpenAI API when an API key is available.
    If the key is missing or the request fails, it falls back to a local summary.
    """

    # Return a fallback summary when no API key is configured.
    if not settings.OPENAI_API_KEY:
        return build_fallback_summary(payload, results)

    # Initialize the OpenAI client from application settings.
    client = OpenAI(api_key=settings.OPENAI_API_KEY)

    # Convert portfolio allocation into readable text for the prompt.
    allocation_text = ", ".join(
        f"{asset.ticker.upper()} {asset.weight:.1f}%"
        for asset in payload.assets
    )

    # Highlight the strongest pairwise relationship to explain diversification trade-offs.
    strongest_pair_text = build_strongest_pair_text(results)
    benchmark_comparison = (
        "outperformed"
        if results["relative_performance"] >= 0
        else "underperformed"
    )
    top_risk_contributor = results["risk_contribution"][0]["ticker"] if results["risk_contribution"] else "not available"

    # Build a controlled prompt so the model explains metrics
    # instead of giving direct financial advice.
    prompt = f"""
You are a financial analysis assistant.

Your task is to explain a portfolio analysis result in plain English.

Rules:
- Use only the information provided below.
- Do not invent facts.
- Do not give personal investment advice.
- Do not recommend buying or selling assets.
- Focus on performance, benchmark comparison, volatility, drawdown, and diversification.
- Explain what the numbers imply instead of repeating them mechanically.
- Keep the response short, clear, and professional.
- Write 4 to 6 sentences.
- Mention whether the portfolio outperformed or underperformed the benchmark.
- Mention concentration risk when one holding has a clearly larger weight.
- Mention diversification using the correlation information below.
- Mention which asset contributes the most to overall portfolio risk.

Portfolio allocation:
{allocation_text}

Benchmark:
{payload.benchmark.upper()}

Metrics:
- Cumulative return: {results["cumulative_return"]:.4f}
- Benchmark cumulative return: {results["benchmark_cumulative_return"]:.4f}
- Relative performance vs benchmark: {results["relative_performance"]:.4f}
- Annualized return: {results["annualized_return"]:.4f}
- Annualized volatility: {results["annualized_volatility"]:.4f}
- Sharpe ratio: {results["sharpe_ratio"]:.4f}
- Sortino ratio: {results["sortino_ratio"]:.4f}
- Beta vs benchmark: {results["beta_vs_benchmark"]:.4f}
- VaR 95%: {results["var_95"]:.4f}
- CVaR 95%: {results["cvar_95"]:.4f}
- Maximum drawdown: {results["max_drawdown"]:.4f}

Portfolio benchmark comparison:
- The portfolio {benchmark_comparison} the benchmark over the selected period.

Diversification note:
- Strongest correlation pair: {strongest_pair_text}
- Top risk contributor: {top_risk_contributor}
"""

    try:
        # Request a short natural-language explanation from the model.
        response = client.responses.create(
            model=settings.OPENAI_MODEL,
            input=prompt,
        )

        # Return the generated summary if available.
        if response.output_text:
            return response.output_text.strip()

        return build_fallback_summary(payload, results)

    except Exception:
        # Return a safe fallback summary if the model call fails.
        return build_fallback_summary(payload, results)


def build_fallback_summary(payload: AnalysisRequest, results: dict) -> str:
    """
    Build a local summary when the AI service is unavailable.
    """

    # Identify the largest portfolio position.
    top_asset = max(payload.assets, key=lambda asset: asset.weight)

    # Convert core metrics into readable percentages.
    cumulative_return = f"{results['cumulative_return']:.2%}"
    annualized_return = f"{results['annualized_return']:.2%}"
    annualized_volatility = f"{results['annualized_volatility']:.2%}"
    max_drawdown = f"{results['max_drawdown']:.2%}"
    benchmark_return = f"{results['benchmark_cumulative_return']:.2%}"
    relative_performance = f"{results['relative_performance']:.2%}"
    sharpe_ratio = f"{results['sharpe_ratio']:.2f}"
    sortino_ratio = f"{results['sortino_ratio']:.2f}"
    beta_vs_benchmark = f"{results['beta_vs_benchmark']:.2f}"
    var_95 = f"{results['var_95']:.2%}"
    cvar_95 = f"{results['cvar_95']:.2%}"
    benchmark_comparison = "outperformed" if results["relative_performance"] >= 0 else "underperformed"
    strongest_pair_text = build_strongest_pair_text(results)
    top_risk_contributor = results["risk_contribution"][0]["ticker"] if results["risk_contribution"] else "not available"

    return (
        f"The portfolio is most heavily allocated to {top_asset.ticker.upper()} "
        f"and delivered a cumulative return of {cumulative_return}, versus {benchmark_return} "
        f"for the benchmark. It {benchmark_comparison} the benchmark by {relative_performance}. "
        f"Annualized return was {annualized_return}, while annualized volatility was "
        f"{annualized_volatility}. The Sharpe ratio was {sharpe_ratio}, the Sortino ratio was "
        f"{sortino_ratio}, and beta versus the benchmark was {beta_vs_benchmark}. "
        f"Daily tail-risk measures came in at VaR 95% of {var_95} and CVaR 95% of {cvar_95}, "
        f"while the maximum drawdown over the selected period was {max_drawdown}. "
        f"The strongest correlation relationship was {strongest_pair_text}, and the largest risk contributor was {top_risk_contributor}. "
        f"This is a fallback summary because the AI service was unavailable."
    )


def build_strongest_pair_text(results: dict) -> str:
    """
    Extract the strongest off-diagonal correlation pair for human-readable explanation.
    """

    correlation_matrix = results["correlation_matrix"]
    strongest_pair = None
    strongest_value = -1.0

    for row_ticker in correlation_matrix.index:
        for column_ticker in correlation_matrix.columns:
            if row_ticker == column_ticker:
                continue

            correlation_value = float(correlation_matrix.loc[row_ticker, column_ticker])
            if correlation_value > strongest_value:
                strongest_value = correlation_value
                strongest_pair = (row_ticker, column_ticker)

    if strongest_pair is None:
        return "not available"

    return f"{strongest_pair[0]} and {strongest_pair[1]} at {strongest_value:.2f}"
