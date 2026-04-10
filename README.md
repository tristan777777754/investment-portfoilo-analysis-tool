# AI-Enhanced Portfolio Analysis Tool

An interactive portfolio analytics dashboard that combines market data, portfolio risk metrics, scenario stress testing, and AI-generated explanations.

This project was built as a finance/data science/AI portfolio project. It lets users build a stock or ETF portfolio, compare it against a benchmark, inspect performance and downside risk, and read a natural-language summary of the results.

Repository: <https://github.com/tristan777777754/investment-portfoilo-analysis-tool>

## Current Status

The project has moved beyond the initial scaffold and now includes a working full-stack MVP:

- React dashboard frontend
- FastAPI backend
- Portfolio analytics engine
- Market data service with `yfinance`, Stooq fallback, local cache, and mock data mode
- AI summary service with safe fallback text
- Scenario Analysis module
- Traditional Chinese project report: `portfolio_analysis_pm_report.docx`

## Main Features

### Portfolio Input

- Dynamic asset rows
- Dropdown-based ticker selection
- Automatic weight rebalancing when assets are added or removed
- Duplicate ticker prevention
- Weight validation before submit
- Benchmark and lookback-period selection

### Overview Dashboard

- Cumulative return
- Benchmark return
- Relative performance
- Annualized return
- Annualized volatility
- Maximum drawdown
- Allocation pie chart
- Portfolio vs benchmark trend
- Individual asset trend comparison with line toggles
- AI-generated or fallback summary

### Risk Analytics

- Sharpe ratio
- Sortino ratio
- Beta vs benchmark
- Downside deviation
- VaR 95%
- CVaR 95%
- Rolling volatility
- Rolling beta
- Risk contribution by asset
- Worst drawdown periods
- Correlation heatmap with continuous color scale
- Concentration risk metrics:
  - Top holding weight
  - Top 3 holdings
  - Effective number of holdings
  - Herfindahl Index

### Scenario Lab

The Scenario Lab is a rule-based stress testing module. It is not a prediction engine. It answers: if a defined shock happens, how might the portfolio be affected?

Included scenarios:

- Market Shock
  - Assumes a broad benchmark move
  - Asset shock is estimated as `asset beta × benchmark shock`
- Technology Sector Shock
  - Technology stocks receive the full sector shock
  - ETFs receive an exposure-weighted shock based on a simplified technology exposure map

Core scenario formula:

```text
Portfolio Scenario Return = sum(asset weight × asset shock)
```

### Index Guide

The web app includes an English `Index Guide` tab explaining:

- Definitions
- Formulas
- Interpretations

Covered topics include:

- Performance metrics
- Volatility and downside risk
- Tail risk and market sensitivity
- Diversification and concentration
- Scenario analysis formulas

## Tech Stack

### Frontend

- React
- Vite
- Tailwind CSS
- Recharts

### Backend

- Python
- FastAPI
- Pydantic
- pandas
- NumPy
- SciPy
- yfinance
- OpenAI API

## Project Structure

```text
.
├── backend/
│   ├── app/
│   │   ├── api/routes/analysis.py
│   │   ├── schemas/analysis.py
│   │   ├── services/
│   │   │   ├── ai_summary.py
│   │   │   ├── market_data.py
│   │   │   ├── portfolio.py
│   │   │   └── scenario.py
│   │   ├── config.py
│   │   └── main.py
│   ├── data_cache/
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── styles.css
│   ├── package.json
│   └── vite.config.js
├── portfolio_analysis_pm_report.docx
└── README.md
```

## Backend Setup

From the repository root:

```bash
cd backend
conda create -n portfolio-api python=3.12 -y
conda activate portfolio-api
pip install -r requirements.txt
python -m uvicorn app.main:app --reload
```

The API runs at:

```text
http://127.0.0.1:8000
```

Health check:

```text
GET /health
```

Main endpoint:

```text
POST /api/v1/analyze
```

## Backend Environment Variables

Create `backend/.env`:

```env
OPENAI_API_KEY=
OPENAI_MODEL=gpt-4.1-mini
MARKET_DATA_RETRY_COUNT=3
MARKET_DATA_RETRY_DELAY=2
MARKET_DATA_CACHE_DIR=data_cache
USE_MOCK_DATA=true
DEFAULT_RISK_FREE_RATE=0.02
```

Notes:

- Use `USE_MOCK_DATA=true` for stable development and demos.
- Use `USE_MOCK_DATA=false` to attempt live market data through `yfinance` and fallback sources.
- If `OPENAI_API_KEY` is empty or the OpenAI request fails, the backend returns a safe fallback summary.

## Frontend Setup

From the repository root:

```bash
cd frontend
npm install
npm run dev
```

The frontend usually runs at:

```text
http://localhost:5173
```

Create `frontend/.env` if needed:

```env
VITE_API_BASE_URL=http://127.0.0.1:8000
```

## Example API Request

```bash
curl -X POST "http://127.0.0.1:8000/api/v1/analyze" \
  -H "Content-Type: application/json" \
  -d '{
    "assets": [
      { "ticker": "AAPL", "weight": 30 },
      { "ticker": "MSFT", "weight": 20 },
      { "ticker": "VOO", "weight": 50 }
    ],
    "benchmark": "SPY",
    "lookback_period": "1y"
  }'
```

## Key Calculations

### Annualized Volatility

```text
Annualized Volatility = std(daily returns) × sqrt(252)
```

### Beta vs Benchmark

```text
Beta = Cov(portfolio returns, benchmark returns) / Var(benchmark returns)
```

### Risk Contribution by Asset

```text
Portfolio variance = w^T Σ w
Risk Contribution_i = w_i × (Σw)_i / portfolio volatility
Risk Share_i = Risk Contribution_i / portfolio volatility
```

### Scenario Analysis

```text
Portfolio Scenario Return = sum(weight_i × shock_i)
```

Market Shock:

```text
Asset Shock_i = Asset Beta_i × Benchmark Shock
```

Technology Sector Shock:

```text
Technology stock shock = full technology shock
ETF shock = technology exposure × technology shock
```

## Development Notes

This project uses `yfinance` for live market data, but free market data APIs can be rate-limited or temporarily unstable. The backend therefore includes:

- Retry logic
- Stooq fallback
- Local CSV cache
- Mock data mode

Mock mode is useful for dashboard development because it keeps the UI and analytics flow working even if a live data source is unavailable.

## Report

The project report is included as:

```text
portfolio_analysis_pm_report.docx
```

It is written in Traditional Chinese and includes:

- Project background
- MVP scope
- Technical architecture
- Feature roadmap
- Metric definitions and formulas
- Scenario Analysis definitions and future improvements

## Roadmap

Potential next upgrades:

- Custom Shock Builder
- Sector beta based stress testing
- Macro scenario library
- Monte Carlo simulation
- Portfolio optimization
- PDF report export
- Persistent user analysis history

## Disclaimer

This project is for education, portfolio demonstration, and product prototyping. It is not financial advice and should not be used as a production trading or investment decision system.
