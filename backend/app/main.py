import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes.analysis import router as analysis_router
from app.api.routes.optimize import router as optimize_router
from app.api.routes.sector_stress import router as sector_stress_router
from app.api.routes.scenarios import router as scenarios_router

app = FastAPI(
    title="Portfolio Analysis API",
    version="0.1.0",
)

_allowed_origins_env = os.getenv("ALLOWED_ORIGINS", "")
allowed_origins = {
    "http://localhost:5173",
    "http://localhost:5174",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:5174",
}

if _allowed_origins_env:
    allowed_origins.update(
        origin.strip() for origin in _allowed_origins_env.split(",") if origin.strip()
    )

app.add_middleware(
    CORSMiddleware,
    allow_origins=sorted(allowed_origins),
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
