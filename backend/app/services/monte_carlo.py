import numpy as np
import pandas as pd


def run_monte_carlo(
    returns: pd.DataFrame,
    weights: np.ndarray,
    horizon_days: int = 252,
    n_simulations: int = 1000,
    confidence_levels: list[float] = [0.05, 0.10, 0.25],
) -> dict:
    """
    Parametric Monte Carlo via Cholesky decomposition of the historical
    covariance matrix. Returns percentile fan bands for the equity curve.
    """
    mu = returns.mean().values          # shape (n_assets,)
    cov = returns.cov().values          # shape (n_assets, n_assets)
    port_mu = float(weights @ mu)

    # Add small regularisation to ensure positive-definiteness.
    cov_reg = cov + np.eye(len(weights)) * 1e-8

    L = np.linalg.cholesky(cov_reg)
    rng = np.random.default_rng(seed=42)
    z = rng.standard_normal((n_simulations, horizon_days, len(weights)))
    correlated = z @ L.T              # shape (sims, days, assets)
    port_daily = (correlated * weights).sum(axis=2)  # shape (sims, days)

    port_daily += port_mu             # add expected drift
    equity_curves = np.cumprod(1 + port_daily, axis=1)  # shape (sims, days)

    percentiles = [5, 10, 25, 50, 75, 90, 95]
    bands = np.percentile(equity_curves, percentiles, axis=0)  # (7, days)

    terminal = equity_curves[:, -1]
    var_dict = {}
    cvar_dict = {}
    for cl in confidence_levels:
        pct = cl * 100
        var_val = float(np.percentile(terminal, pct)) - 1
        tail = terminal[terminal <= np.percentile(terminal, pct)]
        cvar_val = float(tail.mean()) - 1 if len(tail) > 0 else var_val
        var_dict[f"{int(pct)}%"] = round(var_val, 4)
        cvar_dict[f"{int(pct)}%"] = round(cvar_val, 4)

    prob_loss = float((terminal < 1.0).mean())
    prob_5pct = float((terminal > 1.05).mean())

    return {
        "n_simulations": n_simulations,
        "horizon_days": horizon_days,
        "fan_bands": {
            "percentiles": percentiles,
            "days": list(range(1, horizon_days + 1)),
            "values": bands.tolist()
        },
        "terminal_stats": {
            "median_return": round(float(np.percentile(terminal, 50)) - 1, 4),
            "mean_return": round(float(terminal.mean()) - 1, 4),
            "std_return": round(float(terminal.std()), 4),
            "var": var_dict,
            "cvar": cvar_dict,
            "prob_loss": round(prob_loss, 4),
            "prob_above_5pct": round(prob_5pct, 4),
        }
    }
