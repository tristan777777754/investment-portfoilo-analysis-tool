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


class Metrics(BaseModel):
    cumulative_return: float
    annualized_return: float
    annualized_volatility: float
    sharpe_ratio: float
    max_drawdown: float


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


class CorrelationRow(BaseModel):
    ticker: str
    values: dict[str, float]


class Charts(BaseModel):
    portfolio_vs_benchmark: list[PortfolioVsBenchmarkPoint]
    allocation: list[AllocationPoint]
    drawdown: list[DrawdownPoint]
    correlation_matrix: list[CorrelationRow]


class AnalysisResponse(BaseModel):
    metrics: Metrics
    charts: Charts
    summary: str
