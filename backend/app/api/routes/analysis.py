from concurrent.futures import ThreadPoolExecutor

from fastapi import APIRouter

import numpy as np

from app.schemas.analysis import (
    AllocationPoint,
    AnalysisRequest,
    AnalysisResponse,
    Charts,
    CorrelationRow,
    DrawdownPeriod,
    DrawdownPoint,
    FactorExposure,
    FactorModel,
    Metrics,
    MonteCarloFanBands,
    MonteCarloResult,
    MonteCarloTerminalStats,
    PortfolioVsBenchmarkPoint,
    ScenarioAnalysis,
    ScenarioAssetImpact,
    ScenarioResult,
    RiskContributionRow,
    RollingVolatilityPoint,
    RollingBetaPoint,
)
from app.services.ai_summary import build_ai_summary
from app.services.factor_model import calculate_factor_model
from app.services.market_data import fetch_historical_prices
from app.services.monte_carlo import run_monte_carlo
from app.services.portfolio import calculate_portfolio_metrics
from app.services.scenario import calculate_scenario_analysis

router = APIRouter(tags=["analysis"])

_CHART_MAX_POINTS = 260


def _downsample(series_or_frame, max_points: int = _CHART_MAX_POINTS):
    """Return every N-th row so the chart series stays under max_points."""
    n = len(series_or_frame)
    if n <= max_points:
        return series_or_frame
    step = max(1, n // max_points)
    return series_or_frame.iloc[::step]


@router.post("/analyze", response_model=AnalysisResponse)
def analyze_portfolio(payload: AnalysisRequest) -> AnalysisResponse:
    """
    Main analysis endpoint for the backend MVP.

    Flow:
    1. Fetch historical prices
    2. Calculate portfolio metrics
    3. Format chart output
    4. Run scenario and factor analysis
    5. Generate AI summary
    """

    # Fetch cleaned market data for the selected assets and benchmark.
    asset_prices, benchmark_prices = fetch_historical_prices(payload)

    # Calculate the main portfolio analytics from the price data.
    results = calculate_portfolio_metrics(asset_prices, benchmark_prices, payload)

    # Run scenario analysis, factor model, and Monte Carlo in parallel — all depend only on results.
    weights_array = np.array([asset.weight for asset in payload.assets], dtype=float) / 100.0
    with ThreadPoolExecutor(max_workers=3) as executor:
        future_scenario = executor.submit(calculate_scenario_analysis, payload, results)
        future_factor = executor.submit(calculate_factor_model, results)
        future_mc = executor.submit(run_monte_carlo, results["asset_returns"], weights_array)

    scenario_results = future_scenario.result()
    factor_model_results = future_factor.result()
    mc_results = future_mc.result()

    # Merge portfolio and benchmark cumulative curves into one chart series.
    merged_curves = (
        results["cumulative_curve"]
        .to_frame("portfolio")
        .join(results["benchmark_cumulative_curve"].to_frame("benchmark"), how="inner")
        .join(results["asset_cumulative_curves"], how="inner")
    )

    portfolio_vs_benchmark = []
    for index, row in _downsample(merged_curves).iterrows():
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
    for index, value in _downsample(results["drawdown_series"]).items():
        drawdown_points.append(
            DrawdownPoint(
                date=index.strftime("%Y-%m-%d"),
                # Convert drawdown from decimal form to percentage points for chart display.
                drawdown=float(value * 100),
            )
        )

    # Convert rolling volatility series into frontend-ready chart points.
    rolling_volatility_points = []
    rolling_volatility_frame = (
        results["rolling_volatility"]
        .to_frame("portfolio")
        .join(results["benchmark_rolling_volatility"].to_frame("benchmark"), how="inner")
        .dropna()
    )
    for index, row in _downsample(rolling_volatility_frame).iterrows():
        rolling_volatility_points.append(
            RollingVolatilityPoint(
                date=index.strftime("%Y-%m-%d"),
                portfolio=float(row["portfolio"] * 100),
                benchmark=float(row["benchmark"] * 100),
            )
        )

    # Convert rolling beta series into chart points for the risk view.
    rolling_beta_points = []
    for index, value in _downsample(results["rolling_beta"].dropna()).items():
        rolling_beta_points.append(
            RollingBetaPoint(
                date=index.strftime("%Y-%m-%d"),
                beta=float(value),
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

    # Convert risk attribution into a frontend-friendly summary table.
    risk_contribution_rows = []
    for row in results["risk_contribution"]:
        risk_contribution_rows.append(
            RiskContributionRow(
                ticker=row["ticker"],
                weight=float(row["weight"] * 100),
                volatility_contribution=float(row["volatility_contribution"] * 100),
                risk_contribution_pct=float(row["risk_contribution_pct"] * 100),
            )
        )

    # Convert drawdown periods into a readable summary table.
    worst_drawdown_periods = []
    for period in results["worst_drawdown_periods"]:
        worst_drawdown_periods.append(
            DrawdownPeriod(
                start_date=period["start_date"].strftime("%Y-%m-%d"),
                trough_date=period["trough_date"].strftime("%Y-%m-%d"),
                recovery_date=period["recovery_date"].strftime("%Y-%m-%d") if period["recovery_date"] is not None else None,
                drawdown=float(period["drawdown"] * 100),
                duration_days=period["duration_days"],
            )
        )

    # Build allocation chart data from the request weights.
    allocation_points = [
        AllocationPoint(ticker=asset.ticker.upper(), weight=asset.weight)
        for asset in payload.assets
    ]

    # Generate AI summary from real metrics with safe fallback behavior.
    summary = build_ai_summary(payload, results)

    # Convert scenario analysis results into a frontend-friendly structure.
    market_scenario = _build_scenario_result(scenario_results["market_shock"])
    sector_scenario = _build_scenario_result(scenario_results["sector_shock"])

    return AnalysisResponse(
        metrics=Metrics(
            cumulative_return=results["cumulative_return"],
            benchmark_cumulative_return=results["benchmark_cumulative_return"],
            relative_performance=results["relative_performance"],
            annualized_return=results["annualized_return"],
            annualized_volatility=results["annualized_volatility"],
            sharpe_ratio=results["sharpe_ratio"],
            sortino_ratio=results["sortino_ratio"],
            beta_vs_benchmark=results["beta_vs_benchmark"],
            downside_deviation=results["downside_deviation"],
            var_95=results["var_95"],
            cvar_95=results["cvar_95"],
            max_drawdown=results["max_drawdown"],
            top_holding_weight=results["top_holding_weight"],
            top_three_weight=results["top_three_weight"],
            effective_number_of_holdings=results["effective_number_of_holdings"],
            herfindahl_index=results["herfindahl_index"],
        ),
        charts=Charts(
            portfolio_vs_benchmark=portfolio_vs_benchmark,
            allocation=allocation_points,
            drawdown=drawdown_points,
            rolling_volatility=rolling_volatility_points,
            rolling_beta=rolling_beta_points,
            correlation_matrix=correlation_rows,
            risk_contribution=risk_contribution_rows,
            worst_drawdown_periods=worst_drawdown_periods,
        ),
        scenarios=ScenarioAnalysis(
            market_shock=market_scenario,
            sector_shock=sector_scenario,
        ),
        factor_model=_build_factor_model(factor_model_results),
        monte_carlo=MonteCarloResult(
            n_simulations=mc_results["n_simulations"],
            horizon_days=mc_results["horizon_days"],
            fan_bands=MonteCarloFanBands(
                percentiles=mc_results["fan_bands"]["percentiles"],
                days=mc_results["fan_bands"]["days"],
                values=mc_results["fan_bands"]["values"],
            ),
            terminal_stats=MonteCarloTerminalStats(
                median_return=mc_results["terminal_stats"]["median_return"],
                mean_return=mc_results["terminal_stats"]["mean_return"],
                std_return=mc_results["terminal_stats"]["std_return"],
                var=mc_results["terminal_stats"]["var"],
                cvar=mc_results["terminal_stats"]["cvar"],
                prob_loss=mc_results["terminal_stats"]["prob_loss"],
                prob_above_5pct=mc_results["terminal_stats"]["prob_above_5pct"],
            ),
        ),
        summary=summary,
    )


def _build_scenario_result(raw_scenario: dict) -> ScenarioResult:
    """
    Convert scenario dictionaries into response models for the API layer.
    """

    return ScenarioResult(
        scenario_type=raw_scenario["scenario_type"],
        scenario_name=raw_scenario["scenario_name"],
        description=raw_scenario["description"],
        assumptions=raw_scenario["assumptions"],
        portfolio_estimated_return=raw_scenario["portfolio_estimated_return"],
        benchmark_estimated_return=raw_scenario["benchmark_estimated_return"],
        relative_impact_vs_benchmark=raw_scenario["relative_impact_vs_benchmark"],
        asset_impacts=[
            ScenarioAssetImpact(
                ticker=item["ticker"],
                sector=item["sector"],
                shock=item["shock"],
                weighted_impact=item["weighted_impact"],
            )
            for item in raw_scenario["asset_impacts"]
        ],
        summary=raw_scenario["summary"],
    )


def _build_factor_model(raw_factor_model: dict) -> FactorModel:
    """
    Convert factor model dictionaries into response models for the API layer.
    """

    return FactorModel(
        is_available=raw_factor_model["is_available"],
        model_name=raw_factor_model["model_name"],
        formula=raw_factor_model["formula"],
        observations=raw_factor_model["observations"],
        start_date=raw_factor_model["start_date"],
        end_date=raw_factor_model["end_date"],
        alpha_daily=raw_factor_model["alpha_daily"],
        alpha_annualized=raw_factor_model["alpha_annualized"],
        r_squared=raw_factor_model["r_squared"],
        residual_volatility=raw_factor_model["residual_volatility"],
        exposures=[
            FactorExposure(
                factor=item["factor"],
                beta=item["beta"],
                description=item["description"],
            )
            for item in raw_factor_model["exposures"]
        ],
        summary=raw_factor_model["summary"],
        future_plan=raw_factor_model["future_plan"],
        error_message=raw_factor_model["error_message"],
    )
