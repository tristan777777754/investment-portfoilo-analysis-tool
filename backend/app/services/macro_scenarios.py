"""
Historically grounded macro scenario library.

Each scenario defines asset-level shocks (as decimals) derived from
real historical events. Shocks for assets not listed default to 0.
"""

MACRO_SCENARIOS: dict[str, dict] = {
    "2008_financial_crisis": {
        "name": "2008 Financial Crisis",
        "description": "Peak-to-trough drawdown 2007-09 to 2009-03. S&P 500 -56%.",
        "shocks": {
            "SPY": -0.56, "QQQ": -0.52, "DIA": -0.54, "VOO": -0.56, "IWM": -0.60,
            "XLF": -0.78, "XLE": -0.53, "XLK": -0.52,
            "GLD": 0.21, "TLT": 0.26,
            "AAPL": -0.60, "MSFT": -0.44, "AMZN": -0.45, "GOOGL": -0.59,
        },
    },
    "2020_covid_crash": {
        "name": "COVID-19 Crash (Feb–Mar 2020)",
        "description": "33-day bear market. S&P 500 -34%.",
        "shocks": {
            "SPY": -0.34, "QQQ": -0.28, "DIA": -0.37, "VOO": -0.34, "IWM": -0.42,
            "XLF": -0.43, "XLE": -0.57, "XLK": -0.27,
            "GLD": -0.12, "TLT": 0.18,
            "AAPL": -0.25, "MSFT": -0.26, "AMZN": 0.05, "GOOGL": -0.27,
        },
    },
    "2022_rate_hike_cycle": {
        "name": "2022 Rate Hike Bear Market",
        "description": "Fed tightening cycle. S&P 500 -25%, NASDAQ -33%.",
        "shocks": {
            "SPY": -0.25, "QQQ": -0.33, "DIA": -0.21, "VOO": -0.25, "IWM": -0.26,
            "XLF": -0.13, "XLE": 0.38, "XLK": -0.35,
            "GLD": -0.02, "TLT": -0.31,
            "AAPL": -0.28, "MSFT": -0.29, "NVDA": -0.50, "AMZN": -0.50, "GOOGL": -0.39, "META": -0.65, "TSLA": -0.65,
        },
    },
    "2000_dot_com_bust": {
        "name": "Dot-Com Bust (2000–2002)",
        "description": "NASDAQ -78%, S&P 500 -49% peak-to-trough.",
        "shocks": {
            "SPY": -0.49, "QQQ": -0.78, "DIA": -0.38, "VOO": -0.49, "IWM": -0.30,
            "XLK": -0.75, "XLF": -0.30, "XLE": -0.15,
            "AAPL": -0.82, "MSFT": -0.64, "AMZN": -0.93,
        },
    },
    "stagflation_1970s": {
        "name": "1970s Stagflation Analog",
        "description": "Sustained high inflation + slow growth. Equities flat in real terms.",
        "shocks": {
            "SPY": -0.20, "QQQ": -0.30, "DIA": -0.18, "VOO": -0.20, "IWM": -0.22,
            "XLE": 0.45, "XLB": 0.20, "XLF": -0.10,
            "GLD": 0.50, "TLT": -0.25,
            "AAPL": -0.25, "MSFT": -0.25, "NVDA": -0.30, "META": -0.30, "TSLA": -0.35,
        },
    },
    "geopolitical_shock": {
        "name": "Geopolitical Shock (Ukraine War Analog)",
        "description": "Energy spike, defense up, broad equity down ~10–15%.",
        "shocks": {
            "SPY": -0.12, "QQQ": -0.15, "DIA": -0.10, "VOO": -0.12, "IWM": -0.13,
            "XLE": 0.35, "XLF": -0.08, "XLK": -0.16,
            "GLD": 0.10,
            "AAPL": -0.15, "MSFT": -0.14, "NVDA": -0.18, "META": -0.18, "GOOGL": -0.14, "AMZN": -0.14,
        },
    },
    "flash_crash_2010": {
        "name": "Flash Crash (May 2010)",
        "description": "Intraday plunge. S&P 500 briefly down ~9%, recovered same day.",
        "shocks": {
            "SPY": -0.09, "QQQ": -0.10, "DIA": -0.09, "VOO": -0.09, "IWM": -0.11,
            "XLF": -0.12, "XLK": -0.10,
            "AAPL": -0.09, "MSFT": -0.09,
        },
    },
    "taper_tantrum_2013": {
        "name": "Taper Tantrum (2013)",
        "description": "Bernanke hints at tapering QE. Rates spike, bonds sell off.",
        "shocks": {
            "SPY": -0.06, "QQQ": -0.05, "DIA": -0.05, "VOO": -0.06,
            "XLF": -0.03, "XLE": -0.04, "XLU": -0.12, "XLRE": -0.10,
            "TLT": -0.12,
            "AAPL": -0.08, "MSFT": -0.06,
        },
    },
    "china_slowdown_2015": {
        "name": "China Slowdown Shock (2015)",
        "description": "CNY devaluation + commodity rout. S&P 500 -12% correction.",
        "shocks": {
            "SPY": -0.12, "QQQ": -0.13, "DIA": -0.11, "VOO": -0.12, "IWM": -0.14,
            "XLE": -0.22, "XLB": -0.18, "XLF": -0.10, "XLK": -0.14,
            "AAPL": -0.16, "MSFT": -0.14, "AMZN": -0.11,
        },
    },
}


def list_scenarios() -> list[dict]:
    """Return scenario metadata without the full shock table."""
    return [
        {"id": k, "name": v["name"], "description": v["description"]}
        for k, v in MACRO_SCENARIOS.items()
    ]


def apply_scenario(scenario_id: str, weights: dict[str, float]) -> dict:
    """
    Apply a macro scenario's shocks to the given portfolio weights.

    Tickers not in the scenario shock table receive a shock of 0.
    Returns portfolio_return and per-asset impact details.
    """
    if scenario_id not in MACRO_SCENARIOS:
        raise KeyError(f"Unknown scenario: {scenario_id}")

    scenario = MACRO_SCENARIOS[scenario_id]
    shocks = scenario["shocks"]

    asset_impacts = []
    portfolio_return = 0.0

    for ticker, weight in weights.items():
        shock = shocks.get(ticker.upper(), 0.0)
        weighted_impact = weight * shock
        portfolio_return += weighted_impact
        asset_impacts.append(
            {
                "ticker": ticker,
                "shock": round(float(shock), 4),
                "weighted_impact": round(float(weighted_impact), 4),
                "in_scenario": ticker.upper() in shocks,
            }
        )

    asset_impacts.sort(key=lambda r: r["weighted_impact"])
    return {
        "scenario_id": scenario_id,
        "scenario_name": scenario["name"],
        "description": scenario["description"],
        "portfolio_return": round(float(portfolio_return), 4),
        "asset_impacts": asset_impacts,
    }
