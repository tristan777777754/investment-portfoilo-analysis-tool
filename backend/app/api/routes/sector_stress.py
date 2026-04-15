from fastapi import APIRouter, HTTPException

from app.schemas.analysis import SectorStressRequest, SectorStressAssetImpact, SectorStressResponse
from app.services.sector_stress import (
    SECTOR_ETFS,
    estimate_sector_betas,
    fetch_sector_returns,
    run_sector_shock,
)
import yfinance as yf
import pandas as pd

router = APIRouter(tags=["sector-stress"])


@router.post("/sector-stress", response_model=SectorStressResponse)
def compute_sector_stress(payload: SectorStressRequest) -> SectorStressResponse:
    """
    Estimate portfolio impact from user-defined sector shocks using OLS sector betas.
    """
    if not payload.sector_shocks:
        raise HTTPException(status_code=400, detail="sector_shocks must not be empty.")

    unknown_sectors = [s for s in payload.sector_shocks if s not in SECTOR_ETFS]
    if unknown_sectors:
        raise HTTPException(
            status_code=400,
            detail=f"Unknown sectors: {unknown_sectors}. Available: {list(SECTOR_ETFS.keys())}",
        )

    # Fetch historical returns for each portfolio asset.
    frames: list[pd.Series] = []
    missing_tickers: list[str] = []
    for asset in payload.assets:
        ticker = asset.ticker.upper()
        try:
            raw = yf.download(
                ticker,
                period=payload.lookback_period,
                auto_adjust=True,
                progress=False,
                threads=False,
            )
            if raw.empty:
                missing_tickers.append(ticker)
                continue
            if isinstance(raw.columns, pd.MultiIndex):
                col = ("Close", ticker)
                prices = raw[col].dropna() if col in raw.columns else None
            else:
                prices = raw["Close"].dropna() if "Close" in raw.columns else None
            if prices is None or prices.empty:
                missing_tickers.append(ticker)
                continue
            returns = prices.pct_change().dropna()
            if returns.empty:
                missing_tickers.append(ticker)
                continue
            returns.name = ticker
            frames.append(returns)
        except Exception:
            missing_tickers.append(ticker)
            continue

    if not frames:
        raise HTTPException(status_code=400, detail="Could not fetch asset return data.")
    if missing_tickers:
        raise HTTPException(
            status_code=400,
            detail=(
                "Could not fetch sufficient return history for: "
                f"{', '.join(sorted(set(missing_tickers)))}."
            ),
        )

    asset_returns = pd.concat(frames, axis=1).dropna(how="all")

    # Fetch sector ETF returns for the sectors the user is shocking.
    sector_returns = fetch_sector_returns(payload.lookback_period)
    if sector_returns.empty:
        raise HTTPException(status_code=503, detail="Could not fetch sector ETF data.")

    # Only keep the sectors the user requested, if available.
    available_in_response = [s for s in payload.sector_shocks if s in sector_returns.columns]
    if not available_in_response:
        raise HTTPException(
            status_code=503,
            detail="None of the requested sector ETFs returned data.",
        )
    sector_returns = sector_returns[available_in_response]

    # Estimate sector betas and compute shock impact.
    asset_betas = estimate_sector_betas(asset_returns, sector_returns)
    weights = {asset.ticker.upper(): asset.weight / 100.0 for asset in payload.assets}
    shock_subset = {s: payload.sector_shocks[s] for s in available_in_response}
    shock_result = run_sector_shock(weights, asset_betas, shock_subset)

    return SectorStressResponse(
        portfolio_return=shock_result["portfolio_return"],
        asset_impacts=[
            SectorStressAssetImpact(
                ticker=item["ticker"],
                estimated_impact=item["estimated_impact"],
                weighted_impact=item["weighted_impact"],
                sector_betas=item["sector_betas"],
            )
            for item in shock_result["asset_impacts"]
        ],
        available_sectors=list(SECTOR_ETFS.keys()),
    )
