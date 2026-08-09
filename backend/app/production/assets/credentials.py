"""Envelope-compatible credential encryption; plaintext is never serialised."""

from __future__ import annotations

import base64
import hashlib

from cryptography.fernet import Fernet, MultiFernet


class CredentialCipher:
    def __init__(self, keys: str, fallback_secret: str | None = None) -> None:
        supplied = [key.strip().encode() for key in keys.split(",") if key.strip()]
        # An ephemeral-like deterministic development fallback keeps local tests
        # usable; production must configure explicit KMS-managed Fernet keys.
        if not supplied:
            if not fallback_secret:
                raise ValueError("credential encryption keys are required")
            supplied = [base64.urlsafe_b64encode(hashlib.sha256(fallback_secret.encode()).digest())]
        self._fernet = MultiFernet([Fernet(key) for key in supplied])
        self.key_version = 0

    def encrypt(self, secret: str) -> str:
        if not secret:
            raise ValueError("credential cannot be empty")
        return self._fernet.encrypt(secret.encode()).decode()

    def decrypt(self, encrypted_secret: str) -> str:
        return self._fernet.decrypt(encrypted_secret.encode()).decode()

    @staticmethod
    def masked(secret: str) -> str:
        return f"…{secret[-4:]}" if len(secret) >= 4 else "••••"
