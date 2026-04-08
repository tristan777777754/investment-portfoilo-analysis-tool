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
        "max_drawdown": float(max_drawdown),
        "cumulative_curve": cumulative_curve,
        "benchmark_cumulative_curve": benchmark_cumulative_curve,
        "asset_cumulative_curves": asset_cumulative_curves,
        "drawdown_series": drawdown_series,
        "correlation_matrix": correlation_matrix,
    }
