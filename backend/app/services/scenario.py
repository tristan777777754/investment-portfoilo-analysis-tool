import numpy as np
import pandas as pd

from app.schemas.analysis import AnalysisRequest

# Use a simple first-pass sector map for individual stocks.
STOCK_SECTOR_MAP = {
    "AAPL": "Technology",
    "MSFT": "Technology",
    "NVDA": "Technology",
    "META": "Technology",
    "GOOGL": "Technology",
    "AMZN": "Consumer Discretionary",
    "TSLA": "Consumer Discretionary",
    "VOO": "Broad Market ETF",
    "SPY": "Broad Market ETF",
    "QQQ": "Growth ETF",
    "DIA": "Large Cap ETF",
    "IWM": "Small Cap ETF",
}

# Approximate technology exposure for common ETFs used in the dashboard.
ETF_TECH_EXPOSURE = {
    "VOO": 0.31,
    "SPY": 0.31,
    "QQQ": 0.58,
    "DIA": 0.18,
    "IWM": 0.14,
}

TECHNOLOGY_STOCKS = {"AAPL", "MSFT", "NVDA", "META", "GOOGL"}
MARKET_SHOCK = -0.10
TECH_SECTOR_SHOCK = -0.10


def calculate_scenario_analysis(payload: AnalysisRequest, results: dict) -> dict:
    """
    Build a first-pass scenario analysis module for the dashboard.

    Phase 1 supports:
    - Market Shock: asset shock = asset beta to benchmark * benchmark shock
    - Technology Sector Shock: full shock for mapped technology stocks and
      exposure-weighted shock for ETFs
    """

    asset_returns: pd.DataFrame = results["asset_returns"]
    benchmark_returns: pd.Series = results["benchmark_returns"]
    weights = {
        asset.ticker.upper(): asset.weight / 100.0
        for asset in payload.assets
    }

    asset_betas = _calculate_asset_betas(asset_returns, benchmark_returns)

    return {
        "market_shock": _build_market_shock_scenario(
            payload=payload,
            weights=weights,
            asset_betas=asset_betas,
        ),
        "sector_shock": _build_technology_sector_shock(
            payload=payload,
            weights=weights,
        ),
    }


def _calculate_asset_betas(asset_returns: pd.DataFrame, benchmark_returns: pd.Series) -> dict[str, float]:
    """
    Estimate each asset's beta to the selected benchmark from historical returns.
    """

    benchmark_variance = float(benchmark_returns.var())
    if benchmark_variance <= 0:
        return {ticker: 0.0 for ticker in asset_returns.columns}

    asset_betas: dict[str, float] = {}
    for ticker in asset_returns.columns:
        covariance = float(asset_returns[ticker].cov(benchmark_returns))
        asset_betas[ticker] = covariance / benchmark_variance

    return asset_betas


def _build_market_shock_scenario(payload: AnalysisRequest, weights: dict[str, float], asset_betas: dict[str, float]) -> dict:
    """
    Estimate portfolio impact when the benchmark moves sharply.
    """

    asset_impacts = []

    for asset in payload.assets:
        ticker = asset.ticker.upper()
        shock = asset_betas.get(ticker, 0.0) * MARKET_SHOCK
        weighted_impact = weights[ticker] * shock

        asset_impacts.append(
            {
                "ticker": ticker,
                "sector": STOCK_SECTOR_MAP.get(ticker, "Unknown"),
                "shock": float(shock),
                "weighted_impact": float(weighted_impact),
            }
        )

    asset_impacts.sort(key=lambda row: row["weighted_impact"])
    portfolio_estimated_return = float(np.sum([row["weighted_impact"] for row in asset_impacts]))
    benchmark_estimated_return = float(MARKET_SHOCK)
    relative_impact = float(portfolio_estimated_return - benchmark_estimated_return)

    return {
        "scenario_type": "market_shock",
        "scenario_name": "Market Shock",
        "description": "Estimate portfolio impact from a broad market selloff using historical asset betas to the benchmark.",
        "assumptions": [
            f"Benchmark shock = {MARKET_SHOCK:.0%}",
            "Each asset shock = asset beta to benchmark × benchmark shock",
            "Beta is estimated from historical daily returns in the selected analysis window",
        ],
        "portfolio_estimated_return": portfolio_estimated_return,
        "benchmark_estimated_return": benchmark_estimated_return,
        "relative_impact_vs_benchmark": relative_impact,
        "asset_impacts": asset_impacts,
        "summary": (
            f"If the benchmark falls by {MARKET_SHOCK:.0%}, the portfolio is estimated to move by "
            f"{portfolio_estimated_return:.2%}, which is {relative_impact:.2%} relative to the benchmark."
        ),
    }


def _build_technology_sector_shock(payload: AnalysisRequest, weights: dict[str, float]) -> dict:
    """
    Estimate portfolio impact from a technology-sector stress event.
    """

    benchmark_ticker = payload.benchmark.upper()
    benchmark_estimated_return = _estimate_technology_shock_for_ticker(benchmark_ticker)
    asset_impacts = []

    for asset in payload.assets:
        ticker = asset.ticker.upper()
        shock = _estimate_technology_shock_for_ticker(ticker)
        weighted_impact = weights[ticker] * shock

        asset_impacts.append(
            {
                "ticker": ticker,
                "sector": STOCK_SECTOR_MAP.get(ticker, "Unknown"),
                "shock": float(shock),
                "weighted_impact": float(weighted_impact),
            }
        )

    asset_impacts.sort(key=lambda row: row["weighted_impact"])
    portfolio_estimated_return = float(np.sum([row["weighted_impact"] for row in asset_impacts]))
    relative_impact = float(portfolio_estimated_return - benchmark_estimated_return)

    return {
        "scenario_type": "sector_shock",
        "scenario_name": "Technology Sector Shock",
        "description": "Estimate portfolio impact when technology holdings fall sharply and ETF exposures absorb a proportional shock.",
        "assumptions": [
            f"Technology shock = {TECH_SECTOR_SHOCK:.0%}",
            "Technology stocks receive the full sector shock",
            "ETF shocks use a simplified technology exposure map",
        ],
        "portfolio_estimated_return": portfolio_estimated_return,
        "benchmark_estimated_return": float(benchmark_estimated_return),
        "relative_impact_vs_benchmark": relative_impact,
        "asset_impacts": asset_impacts,
        "summary": (
            f"If technology falls by {TECH_SECTOR_SHOCK:.0%}, the portfolio is estimated to move by "
            f"{portfolio_estimated_return:.2%}, versus {benchmark_estimated_return:.2%} for the benchmark."
        ),
    }


def _estimate_technology_shock_for_ticker(ticker: str) -> float:
    """
    Apply the first-pass technology shock logic for stocks and ETFs.
    """

    if ticker in TECHNOLOGY_STOCKS:
        return float(TECH_SECTOR_SHOCK)

    if ticker in ETF_TECH_EXPOSURE:
        return float(ETF_TECH_EXPOSURE[ticker] * TECH_SECTOR_SHOCK)

    return 0.0
