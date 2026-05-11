"""Auth0 JWT verification for multi-user authentication.

Fetches JSON Web Key Sets (JWKS) from Auth0's tenant endpoint,
caches them in-memory with a TTL, and verifies RS256-signed bearer tokens.
Includes a single cache-invalidation retry when a key-id is not found.
"""

import time

import httpx
import jwt
from fastapi import HTTPException, Request, status

from app.core.config import settings

# In-memory JWKS cache. Auth0 rotates signing keys periodically, so we
# re-fetch after JWKS_CACHE_TTL_SECONDS to pick up new keys automatically
# without relying on a process restart.
_JWKS_CACHE_TTL_SECONDS = 6 * 3600  # 6 hours

_jwks_cache: dict | None = None
_jwks_cache_ts: float = 0.0


async def _get_jwks(*, force_refresh: bool = False) -> dict:
    """Return cached JWKS, refreshing when the TTL has elapsed or forced."""
    global _jwks_cache, _jwks_cache_ts

    if not force_refresh and _jwks_cache is not None:
        if (time.monotonic() - _jwks_cache_ts) < _JWKS_CACHE_TTL_SECONDS:
            return _jwks_cache

    issuer = settings.AUTH0_ISSUER or f"https://{settings.AUTH0_DOMAIN}/"
    jwks_url = f"{issuer}.well-known/jwks.json"
    async with httpx.AsyncClient(timeout=10.0) as client:
        response = await client.get(jwks_url)
        response.raise_for_status()
        _jwks_cache = response.json()
        _jwks_cache_ts = time.monotonic()
        return _jwks_cache


async def verify_auth0_token(request: Request) -> str:
    """Verify an Auth0 JWT from the Authorization header.

    Returns the ``auth0_id`` (``sub`` claim) when the token is valid.
    Raises ``HTTPException(401)`` on any authentication failure.
    """
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing or invalid Authorization header",
        )

    token = auth_header.removeprefix("Bearer ")
    issuer = settings.AUTH0_ISSUER or f"https://{settings.AUTH0_DOMAIN}/"

    try:
        jwks = await _get_jwks()
        # Get the signing key from JWKS
        unverified_header = jwt.get_unverified_header(token)
        kid = unverified_header.get("kid")

        rsa_key = None
        for key in jwks.get("keys", []):
            if key.get("kid") == kid:
                rsa_key = jwt.algorithms.RSAAlgorithm.from_jwk(key)
                break

        if rsa_key is None:
            # Key not found - force a cache refresh and try once more.
            # This handles Auth0 key rotations without requiring a redeploy.
            jwks = await _get_jwks(force_refresh=True)
            for key in jwks.get("keys", []):
                if key.get("kid") == kid:
                    rsa_key = jwt.algorithms.RSAAlgorithm.from_jwk(key)
                    break

        if rsa_key is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Unable to find matching signing key",
            )

        decode_options: dict = {}
        decode_kwargs: dict = {
            "algorithms": ["RS256"],
            "issuer": issuer,
        }
        # If an API audience is configured, verify it; otherwise skip aud check
        if settings.AUTH0_AUDIENCE:
            decode_kwargs["audience"] = settings.AUTH0_AUDIENCE
        else:
            decode_options["verify_aud"] = False

        payload = jwt.decode(
            token,
            rsa_key,
            options=decode_options,
            **decode_kwargs,
        )

        auth0_id = payload.get("sub")
        if not auth0_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token missing sub claim",
            )

        return auth0_id

    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired",
        )
    except jwt.InvalidTokenError:
        # Do not forward the raw PyJWT error message to the client -
        # it can reveal internal token structure details.
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token",
        )
