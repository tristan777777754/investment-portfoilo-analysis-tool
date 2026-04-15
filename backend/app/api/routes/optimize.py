from fastapi import APIRouter

from app.schemas.analysis import (
    AnalysisRequest,
    FrontierPoint,
    OptimalPortfolio,
    OptimizationResponse,
)
from app.services.market_data import fetch_historical_prices
from app.services.portfolio import calculate_portfolio_metrics
from app.services.optimizer import compute_efficient_frontier

router = APIRouter(tags=["optimization"])


@router.post("/optimize", response_model=OptimizationResponse)
def optimize_portfolio(payload: AnalysisRequest) -> OptimizationResponse:
    """
    Compute the efficient frontier and optimal portfolios for the submitted assets.
    Returns the minimum variance portfolio, the maximum Sharpe portfolio,
    and a set of frontier points connecting them.
    """
    asset_prices, benchmark_prices = fetch_historical_prices(payload)
    results = calculate_portfolio_metrics(asset_prices, benchmark_prices, payload)
    asset_returns = results["asset_returns"]

    frontier_data = compute_efficient_frontier(asset_returns)

    return OptimizationResponse(
        tickers=frontier_data["tickers"],
        min_variance=OptimalPortfolio(
            weights=frontier_data["min_variance"]["weights"],
            expected_return=frontier_data["min_variance"]["expected_return"],
            volatility=frontier_data["min_variance"]["volatility"],
            sharpe=frontier_data["min_variance"]["sharpe"],
        ),
        max_sharpe=OptimalPortfolio(
            weights=frontier_data["max_sharpe"]["weights"],
            expected_return=frontier_data["max_sharpe"]["expected_return"],
            volatility=frontier_data["max_sharpe"]["volatility"],
            sharpe=frontier_data["max_sharpe"]["sharpe"],
        ),
        frontier=[
            FrontierPoint(
                expected_return=p["return"],
                volatility=p["volatility"],
                sharpe=p["sharpe"],
                weights=p["weights"],
            )
            for p in frontier_data["frontier"]
        ],
    )
