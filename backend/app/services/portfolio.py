import numpy as np
import pandas as pd

from app.config import settings
from app.schemas.analysis import AnalysisRequest


def calculate_portfolio_metrics(
    asset_prices: pd.DataFrame,
    benchmark_prices: pd.Series,
    payload: AnalysisRequest,
) -> dict:
    """
    Calculate the core portfolio metrics for the MVP.

    Inputs:
    - asset_prices: DataFrame of aligned asset prices, columns are tickers
    - benchmark_prices: Series of aligned benchmark prices
    - payload: request payload containing asset weights

    Outputs:
    - dictionary containing return series, summary metrics, drawdown, and correlation matrix
    """

    # Convert daily prices into daily percentage returns for each asset.
    asset_returns = asset_prices.pct_change().dropna()

    # Convert benchmark prices into daily percentage returns.
    benchmark_returns = benchmark_prices.pct_change().dropna()

    # Convert input weights from percentages to decimals.
    # Example: 30 becomes 0.30
    weights = np.array([asset.weight for asset in payload.assets], dtype=float) / 100.0

    # Calculate the portfolio daily return using weighted asset returns.
    # This is the main return series we will use for most metrics.
    portfolio_returns = asset_returns.dot(weights)
    portfolio_returns.name = "portfolio"

    # Make sure portfolio and benchmark use the same date index before comparison.
    common_index = portfolio_returns.index.intersection(benchmark_returns.index)
    portfolio_returns = portfolio_returns.loc[common_index]
    benchmark_returns = benchmark_returns.loc[common_index]

    # Total cumulative return over the selected lookback period.
    cumulative_return = (1 + portfolio_returns).prod() - 1

    # Convert total return into annualized return using 252 trading days.
    annualized_return = (1 + cumulative_return) ** (252 / len(portfolio_returns)) - 1

    # Annualized volatility based on standard deviation of daily returns.
    annualized_volatility = portfolio_returns.std() * np.sqrt(252)

    # Basic Sharpe ratio using a fixed risk-free rate for now.
    # We can later replace 0.02 with a value from the request payload.
    risk_free_rate = settings.DEFAULT_RISK_FREE_RATE
    sharpe_ratio = 0.0
    if annualized_volatility > 0:
        sharpe_ratio = (annualized_return - risk_free_rate) / annualized_volatility

    # Sortino ratio only penalizes downside volatility.
    downside_returns = portfolio_returns[portfolio_returns < 0]
    downside_deviation = 0.0
    if not downside_returns.empty:
        downside_deviation = downside_returns.std() * np.sqrt(252)

    sortino_ratio = 0.0
    if downside_deviation > 0:
        sortino_ratio = (annualized_return - risk_free_rate) / downside_deviation

    # Build cumulative growth curve of the portfolio.
    cumulative_curve = (1 + portfolio_returns).cumprod()

    # Track the highest historical point reached so far.
    rolling_peak = cumulative_curve.cummax()

    # Drawdown shows how far the portfolio falls below its previous peak.
    drawdown_series = (cumulative_curve / rolling_peak) - 1

    # Maximum drawdown is the worst drop from peak to trough.
    max_drawdown = drawdown_series.min()

    # Build a benchmark cumulative growth curve for comparison charts.
    benchmark_cumulative_curve = (1 + benchmark_returns).cumprod()
    benchmark_cumulative_return = benchmark_cumulative_curve.iloc[-1] - 1

    # Keep each asset's cumulative growth curve so the frontend can compare
    # portfolio, benchmark, and individual holdings on the same chart.
    asset_cumulative_curves = (1 + asset_returns).cumprod()

    # Correlation matrix helps us understand diversification between assets.
    correlation_matrix = asset_returns.corr()

    # Beta measures sensitivity to benchmark moves.
    benchmark_variance = benchmark_returns.var()
    beta_vs_benchmark = 0.0
    if benchmark_variance > 0:
        beta_vs_benchmark = portfolio_returns.cov(benchmark_returns) / benchmark_variance

    # Historical VaR and CVaR summarize tail loss risk.
    var_threshold = portfolio_returns.quantile(0.05)
    cvar_threshold = portfolio_returns[portfolio_returns <= var_threshold].mean()

    # Rolling volatility shows how annualized risk changes through time.
    rolling_window = min(21, len(portfolio_returns))
    rolling_volatility = portfolio_returns.rolling(window=rolling_window).std() * np.sqrt(252)
    benchmark_rolling_volatility = benchmark_returns.rolling(window=rolling_window).std() * np.sqrt(252)
    rolling_beta = portfolio_returns.rolling(window=rolling_window).cov(benchmark_returns)
    benchmark_rolling_variance = benchmark_returns.rolling(window=rolling_window).var()
    rolling_beta = rolling_beta.divide(benchmark_rolling_variance.replace(0, np.nan))

    # Concentration metrics summarize how diversified the weight profile really is.
    top_holding_weight = float(weights.max())
    top_three_weight = float(np.sort(weights)[-3:].sum()) if len(weights) >= 3 else float(weights.sum())
    herfindahl_index = float(np.sum(np.square(weights)))
    effective_number_of_holdings = float(1 / herfindahl_index) if herfindahl_index > 0 else 0.0

    # Attribute portfolio risk to each asset using covariance-based volatility contribution.
    covariance_matrix = asset_returns.cov() * 252
    portfolio_variance = float(weights.T @ covariance_matrix.values @ weights)
    portfolio_volatility = np.sqrt(portfolio_variance) if portfolio_variance > 0 else 0.0
    marginal_contribution = covariance_matrix.values @ weights
    volatility_contribution = (
        weights * marginal_contribution / portfolio_volatility
        if portfolio_volatility > 0
        else np.zeros_like(weights)
    )
    risk_contribution_pct = (
        volatility_contribution / portfolio_volatility
        if portfolio_volatility > 0
        else np.zeros_like(weights)
    )
    risk_contribution = [
        {
            "ticker": asset.ticker.upper(),
            "weight": float(weight),
            "volatility_contribution": float(vol_contribution),
            "risk_contribution_pct": float(risk_pct),
        }
        for asset, weight, vol_contribution, risk_pct in zip(
            payload.assets,
            weights,
            volatility_contribution,
            risk_contribution_pct,
            strict=False,
        )
    ]
    risk_contribution.sort(key=lambda item: item["risk_contribution_pct"], reverse=True)

    # Break the drawdown curve into individual peak-to-trough periods for diagnostics.
    worst_drawdown_periods = _extract_drawdown_periods(drawdown_series)

    return {
        "asset_returns": asset_returns,
        "benchmark_returns": benchmark_returns,
        "portfolio_returns": portfolio_returns,
        "cumulative_return": float(cumulative_return),
        "benchmark_cumulative_return": float(benchmark_cumulative_return),
        "relative_performance": float(cumulative_return - benchmark_cumulative_return),
        "annualized_return": float(annualized_return),
        "annualized_volatility": float(annualized_volatility),
        "sharpe_ratio": float(sharpe_ratio),
        "sortino_ratio": float(sortino_ratio),
        "beta_vs_benchmark": float(beta_vs_benchmark),
        "downside_deviation": float(downside_deviation),
        "var_95": float(var_threshold),
        "cvar_95": float(cvar_threshold),
        "max_drawdown": float(max_drawdown),
        "top_holding_weight": top_holding_weight,
        "top_three_weight": top_three_weight,
        "effective_number_of_holdings": effective_number_of_holdings,
        "herfindahl_index": herfindahl_index,
        "cumulative_curve": cumulative_curve,
        "benchmark_cumulative_curve": benchmark_cumulative_curve,
        "asset_cumulative_curves": asset_cumulative_curves,
        "drawdown_series": drawdown_series,
        "rolling_volatility": rolling_volatility,
        "benchmark_rolling_volatility": benchmark_rolling_volatility,
        "rolling_beta": rolling_beta,
        "correlation_matrix": correlation_matrix,
        "risk_contribution": risk_contribution,
        "worst_drawdown_periods": worst_drawdown_periods,
    }


def _extract_drawdown_periods(drawdown_series: pd.Series) -> list[dict]:
    """
    Convert the drawdown curve into discrete peak-to-trough episodes.
    """

    periods = []
    in_drawdown = False
    start_date = None
    trough_date = None
    trough_value = 0.0

    for index, value in drawdown_series.items():
        if not in_drawdown and value < 0:
            in_drawdown = True
            start_date = index
            trough_date = index
            trough_value = float(value)
            continue

        if in_drawdown:
            if value < trough_value:
                trough_value = float(value)
                trough_date = index

            if value >= 0:
                periods.append(
                    {
                        "start_date": start_date,
                        "trough_date": trough_date,
                        "recovery_date": index,
                        "drawdown": trough_value,
                        "duration_days": int((index - start_date).days),
                    }
                )
                in_drawdown = False
                start_date = None
                trough_date = None
                trough_value = 0.0

    if in_drawdown and start_date is not None and trough_date is not None:
        periods.append(
            {
                "start_date": start_date,
                "trough_date": trough_date,
                "recovery_date": None,
                "drawdown": trough_value,
                "duration_days": int((drawdown_series.index[-1] - start_date).days),
            }
        )

    periods.sort(key=lambda item: item["drawdown"])
    return periods[:5]
