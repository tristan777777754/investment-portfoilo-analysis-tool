from fastapi import APIRouter, HTTPException

from app.schemas.analysis import (
    ApplyScenarioRequest,
    ApplyScenarioResponse,
    MacroScenarioMeta,
    ScenarioAssetResult,
)
from app.services.macro_scenarios import apply_scenario, list_scenarios

router = APIRouter(tags=["scenarios"])


@router.get("/scenarios", response_model=list[MacroScenarioMeta])
def get_scenarios() -> list[MacroScenarioMeta]:
    """Return metadata for all available macro scenario library entries."""
    return [MacroScenarioMeta(**s) for s in list_scenarios()]


@router.post("/scenarios/apply", response_model=ApplyScenarioResponse)
def apply_macro_scenario(payload: ApplyScenarioRequest) -> ApplyScenarioResponse:
    """Apply a named macro scenario's shocks to the submitted portfolio."""
    weights = {asset.ticker.upper(): asset.weight / 100.0 for asset in payload.assets}
    try:
        result = apply_scenario(payload.scenario_id, weights)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc

    return ApplyScenarioResponse(
        scenario_id=result["scenario_id"],
        scenario_name=result["scenario_name"],
        description=result["description"],
        portfolio_return=result["portfolio_return"],
        asset_impacts=[
            ScenarioAssetResult(
                ticker=item["ticker"],
                shock=item["shock"],
                weighted_impact=item["weighted_impact"],
                in_scenario=item["in_scenario"],
            )
            for item in result["asset_impacts"]
        ],
    )
