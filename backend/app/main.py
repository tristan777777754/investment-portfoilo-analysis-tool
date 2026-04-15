from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

import os

from app.api.routes.analysis import router as analysis_router
from app.api.routes.optimize import router as optimize_router
from app.api.routes.sector_stress import router as sector_stress_router
from app.api.routes.scenarios import router as scenarios_router

app = FastAPI(
    title="Portfolio Analysis API",
    version="0.1.0",
)

_allowed_origins_env = os.getenv("ALLOWED_ORIGINS", "")
allowed_origins = (
    [o.strip() for o in _allowed_origins_env.split(",") if o.strip()]
    if _allowed_origins_env
    else ["http://localhost:5173"]
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(analysis_router, prefix="/api/v1")
app.include_router(optimize_router, prefix="/api/v1")
app.include_router(sector_stress_router, prefix="/api/v1")
app.include_router(scenarios_router, prefix="/api/v1")


@app.get("/health")
def health_check() -> dict[str, str]:
    return {"status": "ok"}
