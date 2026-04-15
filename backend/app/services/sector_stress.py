import numpy as np
import pandas as pd
import yfinance as yf

# Sector ETF proxies used to estimate asset-level sector betas.
SECTOR_ETFS: dict[str, str] = {
    "Technology": "XLK",
    "Healthcare": "XLV",
    "Financials": "XLF",
    "Energy": "XLE",
    "Consumer Discretionary": "XLY",
    "Consumer Staples": "XLP",
    "Industrials": "XLI",
    "Materials": "XLB",
    "Utilities": "XLU",
    "Real Estate": "XLRE",
    "Communication Services": "XLC",
}

LOOKBACK_TO_PERIOD: dict[str, str] = {"1y": "1y", "3y": "3y", "5y": "5y"}


def fetch_sector_returns(lookback_period: str) -> pd.DataFrame:
    """
    Download daily returns for all sector ETFs.

    Returns a DataFrame with sector names as columns and daily decimal returns as values.
    """
    period = LOOKBACK_TO_PERIOD.get(lookback_period, "1y")
    etf_tickers = list(SECTOR_ETFS.values())

    frames: list[pd.Series] = []
    for ticker in etf_tickers:
        try:
            raw = yf.download(ticker, period=period, auto_adjust=True, progress=False, threads=False)
            if raw.empty:
                continue
            if isinstance(raw.columns, pd.MultiIndex):
                col = ("Close", ticker) if ("Close", ticker) in raw.columns else None
            else:
                col = "Close" if "Close" in raw.columns else None
            if col is None:
                continue
            prices = raw[col].dropna()
            returns = prices.pct_change().dropna()
            returns.name = ticker
            frames.append(returns)
        except Exception:
            continue

    if not frames:
        return pd.DataFrame()

    sector_returns = pd.concat(frames, axis=1).dropna(how="all")
    # Rename columns from ETF ticker to sector name.
    etf_to_sector = {v: k for k, v in SECTOR_ETFS.items()}
    sector_returns = sector_returns.rename(columns=etf_to_sector)
    return sector_returns


def estimate_sector_betas(
    asset_returns: pd.DataFrame,
    sector_returns: pd.DataFrame,
) -> dict[str, dict[str, float]]:
    """
    Estimate each asset's beta to each available sector ETF via OLS.

    Returns {ticker: {sector_name: beta}}.
    """
    betas: dict[str, dict[str, float]] = {}
    for ticker in asset_returns.columns:
        betas[ticker] = {}
        asset_ret = asset_returns[ticker].dropna()
        for sector in sector_returns.columns:
            sector_ret = sector_returns[sector].dropna()
            aligned_asset, aligned_sector = asset_ret.align(sector_ret, join="inner")
            if len(aligned_asset) < 20:
                betas[ticker][sector] = 0.0
                continue
            sector_var = float(aligned_sector.var())
            if sector_var <= 0:
                betas[ticker][sector] = 0.0
                continue
            covariance = float(aligned_asset.cov(aligned_sector))
            betas[ticker][sector] = round(covariance / sector_var, 3)
    return betas


def run_sector_shock(
    weights: dict[str, float],
    asset_betas: dict[str, dict[str, float]],
    sector_shock: dict[str, float],
) -> dict:
    """
    Estimate portfolio impact from a user-defined set of sector-level shocks.

    ``sector_shock`` maps sector name -> shock magnitude (e.g. {"Technology": -0.15}).
    """
    asset_impacts = []
    portfolio_return = 0.0

    for ticker, weight in weights.items():
        asset_sector_betas = asset_betas.get(ticker, {})
        asset_impact = sum(
            asset_sector_betas.get(sector, 0.0) * shock
            for sector, shock in sector_shock.items()
        )
        weighted_impact = weight * asset_impact
        portfolio_return += weighted_impact
        asset_impacts.append(
            {
                "ticker": ticker,
                "estimated_impact": round(float(asset_impact), 4),
                "weighted_impact": round(float(weighted_impact), 4),
                "sector_betas": {
                    sector: asset_sector_betas.get(sector, 0.0)
                    for sector in sector_shock
                },
            }
        )

    asset_impacts.sort(key=lambda r: r["weighted_impact"])
    return {
        "portfolio_return": round(float(portfolio_return), 4),
        "asset_impacts": asset_impacts,
    }
