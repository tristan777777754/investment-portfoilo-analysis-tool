import csv
import io
import logging
import zipfile
from datetime import date
from pathlib import Path
from urllib.request import Request, urlopen

import numpy as np
import pandas as pd

from app.config import settings

logger = logging.getLogger(__name__)

FACTOR_CACHE_DIR = Path(settings.MARKET_DATA_CACHE_DIR) / "factors"

FAMA_FRENCH_DAILY_URL = (
    "https://mba.tuck.dartmouth.edu/pages/faculty/ken.french/ftp/"
    "F-F_Research_Data_Factors_daily_CSV.zip"
)
FAMA_FRENCH_MOMENTUM_DAILY_URL = (
    "https://mba.tuck.dartmouth.edu/pages/faculty/ken.french/ftp/"
    "F-F_Momentum_Factor_daily_CSV.zip"
)
FACTOR_COLUMNS = ["Mkt-RF", "SMB", "HML", "MOM"]
MIN_FACTOR_OBSERVATIONS = 30

FACTOR_DESCRIPTIONS = {
    "Mkt-RF": "Market excess return factor: broad market return minus the risk-free rate.",
    "SMB": "Size factor: small-cap stock return minus large-cap stock return.",
    "HML": "Value factor: high book-to-market stock return minus low book-to-market growth stock return.",
    "MOM": "Momentum factor: recent winner stock return minus recent loser stock return.",
}

PHASE_2_FUTURE_PLAN = (
    "Phase 2 can extend this from the current Fama-French 3-Factor + Momentum model "
    "into the Fama-French 5-Factor + Momentum model by adding RMW and CMA. RMW would "
    "test exposure to profitability, while CMA would test exposure to conservative "
    "versus aggressive investment behavior. A later version can also compare multiple "
    "factor models side by side and show factor contribution through time."
)


def calculate_factor_model(results: dict) -> dict:
    """
    Run Phase 1 factor regression using Kenneth French daily factor data.

    Model:
    portfolio excess return = alpha + factor betas + residual error
    """

    try:
        factor_data = fetch_fama_french_daily_factors()
    except Exception as error:
        return _build_unavailable_factor_model(f"Kenneth French data fetch failed: {error}")

    portfolio_returns = results["portfolio_returns"].copy()
    portfolio_returns.index = pd.to_datetime(portfolio_returns.index).normalize()
    portfolio_returns.name = "portfolio_return"

    # Align portfolio returns and factor returns on shared trading dates.
    regression_frame = (
        portfolio_returns.to_frame()
        .join(factor_data, how="inner")
        .dropna(subset=["portfolio_return", "RF", *FACTOR_COLUMNS])
    )

    if len(regression_frame) < MIN_FACTOR_OBSERVATIONS:
        return _build_unavailable_factor_model(
            "Not enough overlapping portfolio and Kenneth French factor observations."
        )

    # Kenneth French returns are daily decimals, so subtract daily RF from daily portfolio returns.
    y = regression_frame["portfolio_return"] - regression_frame["RF"]
    x = regression_frame[FACTOR_COLUMNS]

    # Add the intercept column so numpy can estimate alpha directly.
    x_values = np.column_stack([np.ones(len(x)), x.to_numpy(dtype=float)])
    y_values = y.to_numpy(dtype=float)

    coefficients, *_ = np.linalg.lstsq(x_values, y_values, rcond=None)
    fitted_values = x_values @ coefficients
    residuals = y_values - fitted_values

    ss_residual = float(np.sum(np.square(residuals)))
    ss_total = float(np.sum(np.square(y_values - np.mean(y_values))))
    r_squared = 0.0 if ss_total == 0 else 1 - (ss_residual / ss_total)

    alpha_daily = float(coefficients[0])
    alpha_annualized = float((1 + alpha_daily) ** 252 - 1)
    residual_volatility = float(np.std(residuals, ddof=1) * np.sqrt(252))

    exposures = [
        {
            "factor": factor,
            "beta": float(beta),
            "description": FACTOR_DESCRIPTIONS[factor],
        }
        for factor, beta in zip(FACTOR_COLUMNS, coefficients[1:], strict=False)
    ]

    strongest_exposure = max(exposures, key=lambda item: abs(item["beta"]))
    summary = _build_factor_summary(
        exposures=exposures,
        strongest_exposure=strongest_exposure,
        r_squared=r_squared,
        alpha_annualized=alpha_annualized,
        residual_volatility=residual_volatility,
    )

    return {
        "is_available": True,
        "model_name": "Fama-French 3-Factor + Momentum",
        "formula": "Rp - RF = alpha + beta_mkt(Mkt-RF) + beta_smb(SMB) + beta_hml(HML) + beta_mom(MOM) + error",
        "observations": int(len(regression_frame)),
        "start_date": regression_frame.index.min().strftime("%Y-%m-%d"),
        "end_date": regression_frame.index.max().strftime("%Y-%m-%d"),
        "alpha_daily": alpha_daily,
        "alpha_annualized": alpha_annualized,
        "r_squared": float(r_squared),
        "residual_volatility": residual_volatility,
        "exposures": exposures,
        "summary": summary,
        "future_plan": PHASE_2_FUTURE_PLAN,
        "error_message": None,
    }


def fetch_fama_french_daily_factors() -> pd.DataFrame:
    """
    Fetch and merge official Kenneth French daily factor datasets.

    Results are cached to disk using a monthly key so repeated requests within
    the same month skip the network entirely. The source files store returns in
    percent form, so this function converts them into decimal daily returns
    before the regression step.
    """
    cache_key = date.today().strftime("%Y-%m")
    FACTOR_CACHE_DIR.mkdir(parents=True, exist_ok=True)
    cache_file = FACTOR_CACHE_DIR / f"ff_factors_{cache_key}.pkl"

    if cache_file.exists():
        try:
            return pd.read_pickle(cache_file)
        except Exception:
            logger.warning("Failed to read factor cache; re-fetching from network.")

    three_factor_data = _download_and_parse_factor_zip(
        FAMA_FRENCH_DAILY_URL,
        required_columns=["Mkt-RF", "SMB", "HML", "RF"],
    )
    momentum_data = _download_and_parse_factor_zip(
        FAMA_FRENCH_MOMENTUM_DAILY_URL,
        required_columns=["Mom"],
    ).rename(columns={"Mom": "MOM"})

    factor_data = three_factor_data.join(momentum_data[["MOM"]], how="inner")
    result = factor_data[["Mkt-RF", "SMB", "HML", "MOM", "RF"]].sort_index()

    try:
        result.to_pickle(cache_file)
    except Exception:
        logger.warning("Failed to write factor cache to disk.")

    return result


def _download_and_parse_factor_zip(url: str, required_columns: list[str]) -> pd.DataFrame:
    """
    Download a Kenneth French ZIP file and parse the factor table inside it.
    """

    request = Request(url, headers={"User-Agent": "portfolio-factor-analysis/1.0"})
    with urlopen(request, timeout=10) as response:
        zip_bytes = response.read()

    with zipfile.ZipFile(io.BytesIO(zip_bytes)) as archive:
        csv_name = next(name for name in archive.namelist() if name.lower().endswith(".csv"))
        text = archive.read(csv_name).decode("utf-8-sig")

    return _parse_kenneth_french_csv(text, required_columns)


def _parse_kenneth_french_csv(text: str, required_columns: list[str]) -> pd.DataFrame:
    """
    Parse Kenneth French CSV text with preamble/footer rows and YYYYMMDD dates.
    """

    rows = list(csv.reader(text.splitlines()))
    required_set = set(required_columns)
    header_index = None

    for index, row in enumerate(rows):
        cleaned_row = [value.strip() for value in row]
        if cleaned_row and not cleaned_row[0] and required_set.issubset(set(cleaned_row[1:])):
            header_index = index
            break

    if header_index is None:
        raise ValueError(f"Could not find Kenneth French header for {required_columns}.")

    headers = [value.strip() or "Date" for value in rows[header_index]]
    records = []

    for row in rows[header_index + 1 :]:
        if not row or not row[0].strip().isdigit() or len(row[0].strip()) != 8:
            break

        records.append([value.strip() for value in row[: len(headers)]])

    if not records:
        raise ValueError(f"No factor records found for {required_columns}.")

    frame = pd.DataFrame(records, columns=headers)
    frame["Date"] = pd.to_datetime(frame["Date"], format="%Y%m%d")
    frame = frame.set_index("Date")

    for column in required_columns:
        frame[column] = pd.to_numeric(frame[column], errors="coerce")

    # Convert percent-form factor returns into decimal returns for regression math.
    frame = frame[required_columns] / 100
    return frame.dropna()


def _build_unavailable_factor_model(error_message: str) -> dict:
    """
    Return a safe unavailable payload so the whole analysis endpoint stays usable.
    """

    return {
        "is_available": False,
        "model_name": "Fama-French 3-Factor + Momentum",
        "formula": "Rp - RF = alpha + beta_mkt(Mkt-RF) + beta_smb(SMB) + beta_hml(HML) + beta_mom(MOM) + error",
        "observations": 0,
        "start_date": None,
        "end_date": None,
        "alpha_daily": None,
        "alpha_annualized": None,
        "r_squared": None,
        "residual_volatility": None,
        "exposures": [],
        "summary": "Factor analysis is unavailable for this request.",
        "future_plan": PHASE_2_FUTURE_PLAN,
        "error_message": error_message,
    }


def _build_factor_summary(
    exposures: list[dict],
    strongest_exposure: dict,
    r_squared: float,
    alpha_annualized: float,
    residual_volatility: float,
) -> str:
    """
    Turn raw regression outputs into a plain-English interpretation for the UI.
    """

    exposure_summary = ", ".join(_describe_factor_exposure(item) for item in exposures)
    r_squared_description = _describe_r_squared(r_squared)
    alpha_description = (
        "positive unexplained excess return"
        if alpha_annualized > 0
        else "negative unexplained excess return"
    )

    return (
        f"The portfolio's strongest factor tilt is {strongest_exposure['factor']} "
        f"with beta {strongest_exposure['beta']:.2f}. Across the four factors, the "
        f"portfolio currently shows {exposure_summary}. R-squared is {r_squared:.2f}, "
        f"which means {r_squared_description}. Annualized alpha is {alpha_annualized:.2%}, "
        f"suggesting {alpha_description} during this window, but that result should be read "
        f"together with the model fit. Residual volatility is {residual_volatility:.2%}, "
        "which represents the portion of annualized risk not explained by the selected factors."
    )


def _describe_factor_exposure(exposure: dict) -> str:
    """
    Describe each factor beta using a simple qualitative label.
    """

    factor_label = exposure["factor"]
    beta = exposure["beta"]
    abs_beta = abs(beta)

    if abs_beta < 0.05:
        intensity = "little to no"
    elif abs_beta < 0.2:
        intensity = "a mild"
    elif abs_beta < 0.5:
        intensity = "a moderate"
    else:
        intensity = "a strong"

    if beta > 0:
        direction = "positive"
    elif beta < 0:
        direction = "negative"
    else:
        direction = "neutral"

    return f"{intensity} {direction} {factor_label} tilt"


def _describe_r_squared(r_squared: float) -> str:
    """
    Translate R-squared into a short explanation for non-technical users.
    """

    if r_squared < 0.2:
        return "the selected factors explain only a small share of the portfolio's day-to-day excess-return movement"
    if r_squared < 0.5:
        return "the selected factors explain a meaningful but still incomplete share of the portfolio's excess-return movement"
    return "the selected factors explain a large share of the portfolio's excess-return movement"
