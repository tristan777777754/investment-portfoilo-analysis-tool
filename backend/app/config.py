import os
from pathlib import Path

from dotenv import load_dotenv

# Load environment variables from the local .env file.
load_dotenv()


class Settings:
    """
    Central application settings for backend services.

    This keeps environment-based configuration in one place
    so the rest of the codebase can import from a single source.
    """

    # Read OpenAI configuration from environment variables.
    OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "")
    OPENAI_MODEL: str = os.getenv("OPENAI_MODEL", "gpt-4.1-mini")

    # Read market data retry and cache settings.
    MARKET_DATA_RETRY_COUNT: int = int(os.getenv("MARKET_DATA_RETRY_COUNT", "3"))
    MARKET_DATA_RETRY_DELAY: int = int(os.getenv("MARKET_DATA_RETRY_DELAY", "2"))
    MARKET_DATA_CACHE_DIR: Path = Path(os.getenv("MARKET_DATA_CACHE_DIR", "data_cache"))

    # Toggle mock market data mode for development and demo use.
    USE_MOCK_DATA: bool = os.getenv("USE_MOCK_DATA", "false").lower() == "true"

    # Default risk-free rate used in Sharpe ratio calculation.
    DEFAULT_RISK_FREE_RATE: float = float(os.getenv("DEFAULT_RISK_FREE_RATE", "0.02"))


settings = Settings()
