from datetime import datetime, timedelta
from io import StringIO
import logging
from pathlib import Path
import time

import numpy as np
import pandas as pd
import requests
import yfinance as yf
from fastapi import HTTPException

logger = logging.getLogger(__name__)

from app.config import settings
from app.schemas.analysis import AnalysisRequest

# Map supported lookback periods to approximate calendar days.
LOOKBACK_TO_DAYS = {
    "1y": 365,
    "3y": 365 * 3,
    "5y": 365 * 5,
}

# Store cache files inside the configured cache directory.
CACHE_DIR = Path(settings.MARKET_DATA_CACHE_DIR)
CACHE_DIR.mkdir(exist_ok=True)


def fetch_historical_prices(payload: AnalysisRequest) -> tuple[pd.DataFrame, pd.Series]:
    """
    Fetch historical asset and benchmark prices.

    Strategy:
    1. Use mock data when mock mode is enabled
    2. Try live download from yfinance
    3. Try fallback download from Stooq
    4. If both fail, load data from local cache
    """

    asset_tickers = [asset.ticker.upper() for asset in payload.assets]
    benchmark_ticker = payload.benchmark.upper()
    all_tickers = asset_tickers + [benchmark_ticker]
    cache_path = _build_cache_path(asset_tickers, benchmark_ticker, payload.lookback_period)

    # Return generated mock price data when mock mode is enabled.
    if settings.USE_MOCK_DATA:
        close_prices = _generate_mock_prices(all_tickers, payload.lookback_period)
        _write_cache(cache_path, close_prices)
        asset_prices = close_prices[asset_tickers].copy()
        benchmark_prices = close_prices[benchmark_ticker].copy()
        benchmark_prices.name = benchmark_ticker
        return asset_prices, benchmark_prices

    data_sources = [
        ("yfinance", lambda: _download_from_yfinance(all_tickers, payload.lookback_period)),
        ("stooq", lambda: _download_from_stooq(all_tickers, payload.lookback_period)),
    ]

    errors: list[str] = []

    for source_name, loader in data_sources:
        try:
            close_prices = loader()
            close_prices = _clean_price_frame(close_prices, all_tickers)

            # Save successful data locally so later requests can reuse it.
            _write_cache(cache_path, close_prices)

            asset_prices = close_prices[asset_tickers].copy()
            benchmark_prices = close_prices[benchmark_ticker].copy()
            benchmark_prices.name = benchmark_ticker
            return asset_prices, benchmark_prices

        except Exception as exc:
            errors.append(f"{source_name}: {exc}")

            # Fall back to a stable local cache as soon as a live source fails.
            cached_prices = _load_cache(cache_path, all_tickers)
            if cached_prices is not None:
                asset_prices = cached_prices[asset_tickers].copy()
                benchmark_prices = cached_prices[benchmark_ticker].copy()
                benchmark_prices.name = benchmark_ticker
                return asset_prices, benchmark_prices

    # If live sources fail, try to read from the local cache.
    cached_prices = _load_cache(cache_path, all_tickers)
    if cached_prices is not None:
        asset_prices = cached_prices[asset_tickers].copy()
        benchmark_prices = cached_prices[benchmark_ticker].copy()
        benchmark_prices.name = benchmark_ticker
        return asset_prices, benchmark_prices

    raise HTTPException(
        status_code=400,
        detail=(
            "Unable to retrieve market data from all configured sources and no cache was available. "
            + " | ".join(errors)
        ),
    )


def _build_cache_path(asset_tickers: list[str], benchmark_ticker: str, lookback_period: str) -> Path:
    """
    Build a stable cache key so the same portfolio can reuse prior downloads.
    """

    sorted_assets = "-".join(sorted(asset_tickers))
    return CACHE_DIR / f"{sorted_assets}__benchmark-{benchmark_ticker}__{lookback_period}.csv"


def _write_cache(cache_path: Path, close_prices: pd.DataFrame) -> None:
    """
    Persist price data locally so failed live requests can reuse the last good result.
    """

    close_prices.to_csv(cache_path)


def _load_cache(cache_path: Path, tickers: list[str]) -> pd.DataFrame | None:
    """
    Load and validate cache data if a previous successful response exists.
    """

    if not cache_path.exists():
        return None

    cached_prices = pd.read_csv(cache_path, index_col=0, parse_dates=True)
    return _clean_price_frame(cached_prices, tickers)


def _generate_mock_prices(tickers: list[str], lookback_period: str) -> pd.DataFrame:
    """
    Generate deterministic mock price series for development use.

    This allows the backend and frontend to keep working even when
    live market data providers are unavailable or rate-limited.
    """

    # Create business-day dates for the selected lookback period.
    days = LOOKBACK_TO_DAYS[lookback_period]
    end_date = pd.Timestamp.today().normalize()
    start_date = end_date - pd.Timedelta(days=days)
    index = pd.date_range(start=start_date, end=end_date, freq="B")

    series_map: dict[str, pd.Series] = {}

    for ticker in tickers:
        # Seed each ticker independently so mock data stays stable even when row order changes.
        rng = np.random.default_rng(sum(ord(char) for char in ticker))

        # Start each ticker at a slightly different base price.
        base_price = 100 + rng.uniform(20, 180)

        # Create a daily return path with mild trend and volatility.
        daily_returns = rng.normal(loc=0.0005, scale=0.012, size=len(index))

        # Turn daily returns into a cumulative price path.
        prices = base_price * np.cumprod(1 + daily_returns)

        # Store each ticker as a pandas Series.
        series_map[ticker] = pd.Series(prices, index=index, name=ticker)

    return pd.concat(series_map.values(), axis=1)


def _download_from_yfinance(tickers: list[str], lookback_period: str) -> pd.DataFrame:
    """
    Download historical prices from Yahoo Finance.

    This version fetches tickers one by one to reduce the chance
    of multi-ticker rate-limit failures.
    """

    frames: list[pd.Series] = []
    errors: list[str] = []

    for ticker in tickers:
        last_error = None

        # Retry each ticker a few times before giving up.
        for attempt in range(settings.MARKET_DATA_RETRY_COUNT):
            try:
                raw_data = yf.download(
                    ticker,
                    period=lookback_period,
                    auto_adjust=True,
                    progress=False,
                    threads=False,
                )

                if raw_data.empty:
                    raise ValueError(f"No data returned from yfinance for {ticker}.")

                # Handle both normal and MultiIndex column formats.
                if isinstance(raw_data.columns, pd.MultiIndex):
                    if ("Close", ticker) in raw_data.columns:
                        series = raw_data[("Close", ticker)].copy()
                    elif ("Adj Close", ticker) in raw_data.columns:
                        series = raw_data[("Adj Close", ticker)].copy()
                    else:
                        raise ValueError(f"No usable close column found for {ticker}.")
                else:
                    if "Close" in raw_data.columns:
                        series = raw_data["Close"].copy()
                    elif "Adj Close" in raw_data.columns:
                        series = raw_data["Adj Close"].copy()
                    else:
                        raise ValueError(f"No usable close column found for {ticker}.")

                # Rename the series so it becomes one column in the merged DataFrame.
                series.name = ticker
                frames.append(series)
                break

            except Exception as exc:
                last_error = exc
                time.sleep(settings.MARKET_DATA_RETRY_DELAY * (attempt + 1))

        else:
            errors.append(f"{ticker}: {last_error}")

    if not frames:
        raise ValueError(f"yfinance failed for all tickers: {' | '.join(errors)}")

    close_prices = pd.concat(frames, axis=1).sort_index()

    missing_tickers = [ticker for ticker in tickers if ticker not in close_prices.columns]
    if missing_tickers:
        raise ValueError(
            f"yfinance returned incomplete data. Missing: {', '.join(missing_tickers)}"
        )

    return close_prices


def _download_from_stooq(tickers: list[str], lookback_period: str) -> pd.DataFrame:
    """
    Download historical prices from Stooq as a secondary fallback source.

    Tries the `.us` suffix first (US equities/ETFs), then falls back to the bare
    ticker symbol so that non-US or index symbols are also attempted.
    """

    frames: list[pd.Series] = []

    for ticker in tickers:
        candidates = [f"{ticker.lower()}.us", ticker.lower()]
        fetched = False

        for symbol in candidates:
            url = f"https://stooq.com/q/d/l/?s={symbol}&i=d"
            try:
                response = requests.get(url, timeout=10)
                response.raise_for_status()
                frame = pd.read_csv(StringIO(response.text))
            except Exception as exc:
                logger.warning("Stooq request failed for symbol %s: %s", symbol, exc)
                continue

            if frame.empty or "Date" not in frame.columns or "Close" not in frame.columns:
                logger.warning(
                    "Stooq returned empty or unusable CSV for symbol %s (ticker %s).",
                    symbol, ticker,
                )
                continue

            series = frame.assign(Date=pd.to_datetime(frame["Date"]))[["Date", "Close"]].copy()
            series = series.rename(columns={"Close": ticker}).set_index("Date")[ticker]
            frames.append(series)
            fetched = True
            break

        if not fetched:
            raise ValueError(f"No usable data returned from Stooq for {ticker} (tried: {candidates}).")

    close_prices = pd.concat(frames, axis=1).sort_index()
    start_date = pd.Timestamp(datetime.utcnow() - timedelta(days=LOOKBACK_TO_DAYS[lookback_period]))
    return close_prices.loc[close_prices.index >= start_date]


def _clean_price_frame(close_prices: pd.DataFrame, tickers: list[str]) -> pd.DataFrame:
    """
    Validate and clean price data before returning it to the analysis layer.
    """

    missing_tickers = [ticker for ticker in tickers if ticker not in close_prices.columns]
    if missing_tickers:
        raise ValueError(f"Missing price data for: {', '.join(missing_tickers)}")

    cleaned = close_prices.dropna(how="all").ffill().dropna()
    if cleaned.empty:
        raise ValueError("Price data is empty after cleaning.")

    return cleaned
