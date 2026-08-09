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
    RUN_MIGRATIONS_ON_STARTUP: bool = False

    # Storage
    UPLOAD_DIR: str = "./uploads"
    MAX_UPLOAD_SIZE_MB: int = 5

    # Private production assets.  These are deliberately separate from the
    # legacy public thumbnail bucket above: production media must never rely
    # on a permanent public URL.
    PRODUCTION_ASSET_DIR: str = "./production-assets"
    PRODUCTION_MAX_ASSET_SIZE_MB: int = 1024
    PRODUCTION_UPLOAD_INTENT_TTL_SECONDS: int = 3600
    PRODUCTION_SIGNED_URL_TTL_SECONDS: int = 300
    PRODUCTION_REMOTE_FETCH_MAX_BYTES: int = 104857600
    PRODUCTION_REMOTE_FETCH_TIMEOUT_SECONDS: float = 20.0
    # Comma separated url-safe base64 Fernet keys. The first encrypts; all
    # subsequent keys decrypt during a rotation. Empty is development-only.
    CREDENTIAL_ENCRYPTION_KEYS: str = ""

    # MCP is mounted on this FastAPI application at /mcp. Defaults remain
    # loopback-only; deployments must override all three public URL settings.
    # MCP transport security compares the complete Host header. Local
    # development therefore needs the explicit wildcard-port forms.
    MCP_ALLOWED_HOSTS: str = "127.0.0.1,127.0.0.1:*,localhost,localhost:*"
    MCP_ALLOWED_ORIGINS: str = ""
    MCP_PUBLIC_URL: str = "http://localhost:8000/mcp/"
    MCP_ISSUER_URL: str = "http://localhost:8000/"
    MCP_ALLOW_REMOTE_SINGLE_USER: bool = False
    MCP_PAT_SIGNING_KEY: str = ""

    # Release controls: disabled capabilities fail closed until deliberately
    # enabled in the intended rollout environment.
    MCP_ENABLED: bool = True
    MCP_HTTP_ENABLED: bool = True
    MCP_STDIO_ENABLED: bool = True
    # Build submission requires the Redis dispatcher, database worker and
    # renderer stack. Keep it fail-closed on web-only deployments.
    PRODUCTION_PIPELINE_ENABLED: bool = False
    GENERATED_ASSETS_ENABLED: bool = True
    MCP_TASKS_EXTENSION_ENABLED: bool = False
    PRODUCTION_MAX_CONCURRENT_JOBS: int = 3
    PRODUCTION_MAX_TOKENS_PER_USER: int = 10
    PRODUCTION_ASSET_RETENTION_DAYS: int = 30
    PRODUCTION_PREVIEW_RETENTION_DAYS: int = 7

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

    # Durable jobs / shared limits. Redis is intentionally optional for local
    # unit tests; production deployments must set JOBS_REDIS_URL.
    JOBS_REDIS_URL: str = "redis://localhost:6379/0"
    JOBS_QUEUE_NAME: str = "learnerverse-jobs"
    JOBS_LEASE_SECONDS: int = 60
    JOBS_OUTBOX_POLL_SECONDS: float = 1.0

    # Payment Gateway
    # Set to true only when the private payment submodule is present
    # and you want to enable Razorpay-based Pro subscriptions.
    PAYMENT_GATEWAY_ENABLED: bool = False

    # Razorpay (only used when PAYMENT_GATEWAY_ENABLED=true)
    RAZORPAY_KEY_ID: str = ""
    RAZORPAY_KEY_SECRET: str = ""
    RAZORPAY_MONTHLY_AMOUNT: int = 9900  # ₹99 in paise
    RAZORPAY_YEARLY_AMOUNT: int = 99900  # ₹999 in paise
    RAZORPAY_PLAN_ID_MONTHLY: str = ""
    RAZORPAY_PLAN_ID_YEARLY: str = ""
    RAZORPAY_WEBHOOK_SECRET: str = ""

    # Observability
    # Set this in production to enable Sentry error tracking.
    SENTRY_DSN: str = ""
    SENTRY_ENVIRONMENT: str = "production"

    # Superadmin
    # Comma-separated list of email addresses that have superadmin access.
    # Example: "gautamvhavle@gmail.com,other@example.com"
    SUPERADMIN_EMAILS: str = ""

    @property
    def superadmin_emails_list(self) -> list[str]:
        """Parse SUPERADMIN_EMAILS into a normalised lowercase list.

        In single-user mode the local development user is always
        included so that superadmin endpoints work out of the box.
        """
        emails = [e.strip().lower() for e in self.SUPERADMIN_EMAILS.split(",") if e.strip()]
        if self.SINGLE_USER_MODE and "local@learnerverse.dev" not in emails:
            emails.append("local@learnerverse.dev")
        return emails

    @property
    def cors_origins_list(self) -> list[str]:
        """Parse the comma-separated CORS_ORIGINS string into a list."""
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",")]


settings = Settings()
