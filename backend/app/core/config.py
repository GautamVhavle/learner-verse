"""Application settings loaded from environment variables.

Uses pydantic-settings to validate and type-check all configuration.
A singleton ``settings`` instance is created at module level.
"""

from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

_ENV_FILE = Path(__file__).resolve().parents[3] / ".env"


class Settings(BaseSettings):
    """Typed application configuration.

    Values are read from environment variables (or a ``.env`` file).
    Defaults are provided for local development.
    """

    model_config = SettingsConfigDict(
        env_file=str(_ENV_FILE),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # Database
    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/learnerverse"
    SECRET_KEY: str = "change-me"

    # Auth
    SINGLE_USER_MODE: bool = True
    AUTH0_DOMAIN: str = ""
    AUTH0_CLIENT_ID: str = ""
    AUTH0_AUDIENCE: str = ""
    AUTH0_ISSUER: str = ""

    # Server
    BACKEND_HOST: str = "0.0.0.0"
    BACKEND_PORT: int = 8000
    CORS_ORIGINS: str = "http://localhost:5173"
    FRONTEND_URL: str = "http://localhost:5173"
    DEFAULT_OG_IMAGE_URL: str = "https://learnerverse.xyz/preview.png"

    # Storage
    UPLOAD_DIR: str = "./uploads"
    MAX_UPLOAD_SIZE_MB: int = 5

    # Supabase Storage
    SUPABASE_URL: str = ""
    SUPABASE_SERVICE_KEY: str = ""
    SUPABASE_BUCKET: str = "thumbnails"

    # AI / LiVi Chat
    OPENROUTER_API_KEY: str = ""
    OPENROUTER_MODEL: str = "nvidia/nemotron-3-super-120b-a12b:free"
    OPENROUTER_BASE_URL: str = "https://openrouter.ai/api/v1"
    GEMINI_API_KEY: str = ""
    GEMINI_MODEL: str = "gemini-2.5-flash"
    GEMINI_BASE_URL: str = "https://generativelanguage.googleapis.com/v1beta"

    # Payment Gateway
    # Set to true only when the private payment submodule is present
    # and you want to enable Razorpay-based Pro subscriptions.
    PAYMENT_GATEWAY_ENABLED: bool = False

    # Razorpay (only used when PAYMENT_GATEWAY_ENABLED=true)
    RAZORPAY_KEY_ID: str = ""
    RAZORPAY_KEY_SECRET: str = ""
    RAZORPAY_MONTHLY_AMOUNT: int = 9900  # ₹99 in paise
    RAZORPAY_YEARLY_AMOUNT: int = 99900  # ₹999 in paise

    # Observability
    # Set this in production to enable Sentry error tracking.
    SENTRY_DSN: str = ""
    SENTRY_ENVIRONMENT: str = "production"

    @property
    def cors_origins_list(self) -> list[str]:
        """Parse the comma-separated CORS_ORIGINS string into a list."""
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",")]


settings = Settings()
