import numpy as np
import pandas as pd
from scipy.optimize import minimize


def compute_efficient_frontier(
    returns: pd.DataFrame,
    risk_free_rate: float = 0.02,
    n_points: int = 50,
) -> dict:
    """
    Compute efficient frontier via sequential quadratic programming.
    Returns portfolios from minimum variance to maximum Sharpe ratio and beyond.
    """
    tickers = list(returns.columns)
    n = len(tickers)
    mu = returns.mean().values * 252
    cov = returns.cov().values * 252

    def portfolio_stats(w):
        ret = float(w @ mu)
        vol = float(np.sqrt(w @ cov @ w))
        sharpe = (ret - risk_free_rate) / vol if vol > 1e-8 else 0.0
        return ret, vol, sharpe

    constraints = [{"type": "eq", "fun": lambda w: np.sum(w) - 1}]
    bounds = [(0.0, 1.0)] * n
    w0 = np.ones(n) / n

    def portfolio_variance(w):
        return float(w @ cov @ w)

    min_var_result = minimize(
        portfolio_variance, w0,
        method="SLSQP", bounds=bounds, constraints=constraints
    )
    min_var_w = min_var_result.x
    min_ret, min_vol, _ = portfolio_stats(min_var_w)

    def neg_sharpe(w):
        ret, vol, sharpe = portfolio_stats(w)
        return -sharpe

    max_sharpe_result = minimize(
        neg_sharpe, w0,
        method="SLSQP", bounds=bounds, constraints=constraints
    )
    max_sharpe_w = max_sharpe_result.x
    max_ret, _, _ = portfolio_stats(max_sharpe_w)

    target_returns = np.linspace(min_ret, max_ret * 1.15, n_points)
    frontier_points = []

    for target in target_returns:
        cons = [
            {"type": "eq", "fun": lambda w: np.sum(w) - 1},
            {"type": "eq", "fun": lambda w, t=target: w @ mu - t},
        ]
        result = minimize(
            portfolio_variance, w0,
            method="SLSQP", bounds=bounds, constraints=cons,
            options={"maxiter": 1000}
        )
        if result.success:
            r, v, s = portfolio_stats(result.x)
            frontier_points.append({
                "return": round(r, 4),
                "volatility": round(v, 4),
                "sharpe": round(s, 4),
                "weights": {t: round(float(w), 4) for t, w in zip(tickers, result.x)},
            })

    def weights_to_dict(w):
        return {t: round(float(w[i]), 4) for i, t in enumerate(tickers)}

    min_r, min_v, min_s = portfolio_stats(min_var_w)
    max_r, max_v, max_s = portfolio_stats(max_sharpe_w)

    return {
        "min_variance": {
            "weights": weights_to_dict(min_var_w),
            "expected_return": round(min_r, 4),
            "volatility": round(min_v, 4),
            "sharpe": round(min_s, 4),
        },
        "max_sharpe": {
            "weights": weights_to_dict(max_sharpe_w),
            "expected_return": round(max_r, 4),
            "volatility": round(max_v, 4),
            "sharpe": round(max_s, 4),
        },
        "frontier": frontier_points,
        "tickers": tickers,
    }
