from fastapi import APIRouter

from app.schemas.analysis import (
    AllocationPoint,
    AnalysisRequest,
    AnalysisResponse,
    Charts,
    CorrelationRow,
    DrawdownPoint,
    Metrics,
    PortfolioVsBenchmarkPoint,
)
from app.services.ai_summary import build_ai_summary
from app.services.market_data import fetch_historical_prices
from app.services.portfolio import calculate_portfolio_metrics

router = APIRouter(tags=["analysis"])


@router.post("/analyze", response_model=AnalysisResponse)
def analyze_portfolio(payload: AnalysisRequest) -> AnalysisResponse:
    """
    Main analysis endpoint for the backend MVP.

    Flow:
    1. Fetch historical prices
    2. Calculate portfolio metrics
    3. Format chart output
    4. Generate AI summary
    """

    # Fetch cleaned market data for the selected assets and benchmark.
    asset_prices, benchmark_prices = fetch_historical_prices(payload)

    # Calculate the main portfolio analytics from the price data.
    results = calculate_portfolio_metrics(asset_prices, benchmark_prices, payload)

    # Merge portfolio and benchmark cumulative curves into one chart series.
    merged_curves = (
        results["cumulative_curve"]
        .to_frame("portfolio")
        .join(results["benchmark_cumulative_curve"].to_frame("benchmark"), how="inner")
        .join(results["asset_cumulative_curves"], how="inner")
    )

    portfolio_vs_benchmark = []
    for index, row in merged_curves.iterrows():
        portfolio_vs_benchmark.append(
            PortfolioVsBenchmarkPoint(
                date=index.strftime("%Y-%m-%d"),
                # Convert cumulative curves into percentage change values for the frontend.
                portfolio=float((row["portfolio"] - 1) * 100),
                benchmark=float((row["benchmark"] - 1) * 100),
                assets={
                    ticker: float((row[ticker] - 1) * 100)
                    for ticker in results["asset_cumulative_curves"].columns
                },
            )
        )

    # Convert drawdown series into JSON-friendly chart points.
    drawdown_points = []
    for index, value in results["drawdown_series"].items():
        drawdown_points.append(
            DrawdownPoint(
                date=index.strftime("%Y-%m-%d"),
                # Convert drawdown from decimal form to percentage points for chart display.
                drawdown=float(value * 100),
            )
        )

    # Convert the correlation matrix into a frontend-friendly structure.
    correlation_rows = []
    correlation_matrix = results["correlation_matrix"]
    for row_ticker in correlation_matrix.index:
        correlation_rows.append(
            CorrelationRow(
                ticker=row_ticker,
                values={
                    column_ticker: float(correlation_matrix.loc[row_ticker, column_ticker])
                    for column_ticker in correlation_matrix.columns
                },
            )
        )

    # Build allocation chart data from the request weights.
    allocation_points = [
        AllocationPoint(ticker=asset.ticker.upper(), weight=asset.weight)
        for asset in payload.assets
    ]

    # Generate AI summary from real metrics with safe fallback behavior.
    summary = build_ai_summary(payload, results)

    return AnalysisResponse(
        metrics=Metrics(
            cumulative_return=results["cumulative_return"],
            annualized_return=results["annualized_return"],
            annualized_volatility=results["annualized_volatility"],
            sharpe_ratio=results["sharpe_ratio"],
            max_drawdown=results["max_drawdown"],
        ),
        charts=Charts(
            portfolio_vs_benchmark=portfolio_vs_benchmark,
            allocation=allocation_points,
            drawdown=drawdown_points,
            correlation_matrix=correlation_rows,
        ),
        summary=summary,
    )
