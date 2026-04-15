from typing import Literal

from pydantic import BaseModel, Field, model_validator


class AssetInput(BaseModel):
    ticker: str = Field(..., min_length=1, examples=["AAPL"])
    weight: float = Field(..., gt=0, le=100, examples=[30])


class AnalysisRequest(BaseModel):
    assets: list[AssetInput] = Field(..., min_length=1, max_length=6)
    benchmark: str = Field(default="SPY", min_length=1)
    lookback_period: Literal["1y", "3y", "5y"] = "1y"

    @model_validator(mode="after")
    def validate_weight_sum(self) -> "AnalysisRequest":
        total_weight = sum(asset.weight for asset in self.assets)
        if round(total_weight, 4) != 100:
            raise ValueError("Asset weights must sum to 100.")
        return self


class AssetListRequest(BaseModel):
    assets: list[AssetInput] = Field(..., min_length=1, max_length=6)

    @model_validator(mode="after")
    def validate_weight_sum(self) -> "AssetListRequest":
        total_weight = sum(asset.weight for asset in self.assets)
        if round(total_weight, 4) != 100:
            raise ValueError("Asset weights must sum to 100.")
        return self


class Metrics(BaseModel):
    cumulative_return: float
    benchmark_cumulative_return: float
    relative_performance: float
    annualized_return: float
    annualized_volatility: float
    sharpe_ratio: float
    sortino_ratio: float
    beta_vs_benchmark: float
    downside_deviation: float
    var_95: float
    cvar_95: float
    max_drawdown: float
    top_holding_weight: float
    top_three_weight: float
    effective_number_of_holdings: float
    herfindahl_index: float


class PortfolioVsBenchmarkPoint(BaseModel):
    date: str
    portfolio: float
    benchmark: float
    assets: dict[str, float]


class AllocationPoint(BaseModel):
    ticker: str
    weight: float


class DrawdownPoint(BaseModel):
    date: str
    drawdown: float


class RollingVolatilityPoint(BaseModel):
    date: str
    portfolio: float
    benchmark: float


class RollingBetaPoint(BaseModel):
    date: str
    beta: float


class CorrelationRow(BaseModel):
    ticker: str
    values: dict[str, float]


class RiskContributionRow(BaseModel):
    ticker: str
    weight: float
    volatility_contribution: float
    risk_contribution_pct: float


class DrawdownPeriod(BaseModel):
    start_date: str
    trough_date: str
    recovery_date: str | None
    drawdown: float
    duration_days: int


class ScenarioAssetImpact(BaseModel):
    ticker: str
    sector: str
    shock: float
    weighted_impact: float


class ScenarioResult(BaseModel):
    scenario_type: str
    scenario_name: str
    description: str
    assumptions: list[str]
    portfolio_estimated_return: float
    benchmark_estimated_return: float | None
    relative_impact_vs_benchmark: float | None
    asset_impacts: list[ScenarioAssetImpact]
    summary: str


class ScenarioAnalysis(BaseModel):
    market_shock: ScenarioResult
    sector_shock: ScenarioResult


class FactorExposure(BaseModel):
    factor: str
    beta: float
    description: str


class FactorModel(BaseModel):
    is_available: bool
    model_name: str
    formula: str
    observations: int
    start_date: str | None
    end_date: str | None
    alpha_daily: float | None
    alpha_annualized: float | None
    r_squared: float | None
    residual_volatility: float | None
    exposures: list[FactorExposure]
    summary: str
    future_plan: str
    error_message: str | None


class Charts(BaseModel):
    portfolio_vs_benchmark: list[PortfolioVsBenchmarkPoint]
    allocation: list[AllocationPoint]
    drawdown: list[DrawdownPoint]
    rolling_volatility: list[RollingVolatilityPoint]
    rolling_beta: list[RollingBetaPoint]
    correlation_matrix: list[CorrelationRow]
    risk_contribution: list[RiskContributionRow]
    worst_drawdown_periods: list[DrawdownPeriod]


class MonteCarloFanBands(BaseModel):
    percentiles: list[int]
    days: list[int]
    values: list[list[float]]


class MonteCarloTerminalStats(BaseModel):
    median_return: float
    mean_return: float
    std_return: float
    var: dict[str, float]
    cvar: dict[str, float]
    prob_loss: float
    prob_above_5pct: float


class MonteCarloResult(BaseModel):
    n_simulations: int
    horizon_days: int
    fan_bands: MonteCarloFanBands
    terminal_stats: MonteCarloTerminalStats


class FrontierPoint(BaseModel):
    expected_return: float
    volatility: float
    sharpe: float
    weights: dict[str, float]


class OptimalPortfolio(BaseModel):
    weights: dict[str, float]
    expected_return: float
    volatility: float
    sharpe: float


class OptimizationResponse(BaseModel):
    tickers: list[str]
    min_variance: OptimalPortfolio
    max_sharpe: OptimalPortfolio
    frontier: list[FrontierPoint]


class AnalysisResponse(BaseModel):
    metrics: Metrics
    charts: Charts
    scenarios: ScenarioAnalysis
    factor_model: FactorModel
    monte_carlo: MonteCarloResult
    summary: str


# ── Sector Stress ─────────────────────────────────────────────────────────────

class SectorStressRequest(AssetListRequest):
    lookback_period: Literal["1y", "3y", "5y"] = "1y"
    sector_shocks: dict[str, float]  # sector_name -> shock magnitude (e.g. {"Technology": -0.15})


class SectorStressAssetImpact(BaseModel):
    ticker: str
    estimated_impact: float
    weighted_impact: float
    sector_betas: dict[str, float]


class SectorStressResponse(BaseModel):
    portfolio_return: float
    asset_impacts: list[SectorStressAssetImpact]
    available_sectors: list[str]


# ── Macro Scenarios ───────────────────────────────────────────────────────────

class MacroScenarioMeta(BaseModel):
    id: str
    name: str
    description: str


class ApplyScenarioRequest(AssetListRequest):
    scenario_id: str


class ScenarioAssetResult(BaseModel):
    ticker: str
    shock: float
    weighted_impact: float
    in_scenario: bool


class ApplyScenarioResponse(BaseModel):
    scenario_id: str
    scenario_name: str
    description: str
    portfolio_return: float
    asset_impacts: list[ScenarioAssetResult]
