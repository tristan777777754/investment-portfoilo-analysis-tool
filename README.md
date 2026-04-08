# AI-Enhanced Portfolio Analysis Tool (In process)

Project scaffold based on the technical stack from the planning document:

- Frontend: React + Vite + Tailwind CSS + Recharts
- Backend: Python + FastAPI
- Data: `yfinance` (to be integrated in the analysis service)
- AI: OpenAI API or another LLM provider

## Structure

```text
frontend/   React dashboard app
backend/    FastAPI API service
```

## Frontend

```bash
cd frontend
npm install
npm run dev
```

## Backend

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

## Next Build Steps

1. Implement market data retrieval in `backend/app/services/market_data.py`
2. Implement portfolio metrics in `backend/app/services/portfolio.py`
3. Connect the frontend form to the backend `/api/v1/analyze` route
4. Add AI summary generation in `backend/app/services/ai_summary.py`

