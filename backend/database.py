from __future__ import annotations

import os
from pathlib import Path
from typing import Any

import requests
from dotenv import load_dotenv


BACKEND_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = BACKEND_DIR.parent
ENV_FILE = PROJECT_ROOT / ".env"

load_dotenv(ENV_FILE)


def get_supabase_url() -> str:
    supabase_url = os.getenv("SUPABASE_URL", "").strip().rstrip("/")

    if not supabase_url:
        raise RuntimeError(
            "SUPABASE_URL is missing from the project .env file."
        )

    return supabase_url


def get_supabase_secret_key() -> str:
    secret_key = os.getenv("SUPABASE_SECRET_KEY", "").strip()

    if not secret_key:
        raise RuntimeError(
            "SUPABASE_SECRET_KEY is missing from the project .env file."
        )

    return secret_key


def get_headers() -> dict[str, str]:
    """Return private server-side Supabase request headers."""

    return {
        "apikey": get_supabase_secret_key(),
        "Accept": "application/json",
        "Content-Type": "application/json",
    }


def request_supabase(
    table: str,
    *,
    params: dict[str, str] | None = None,
) -> list[dict[str, Any]]:
    """Read records from a Supabase table through the Data API."""

    url = f"{get_supabase_url()}/rest/v1/{table}"

    response = requests.get(
        url,
        headers=get_headers(),
        params=params or {},
        timeout=20,
    )

    if not response.ok:
        raise RuntimeError(
            f"Supabase request failed with status "
            f"{response.status_code}: {response.text}"
        )

    data = response.json()

    if not isinstance(data, list):
        raise RuntimeError(
            "Supabase returned an unexpected response."
        )

    return data


def get_counties() -> list[dict[str, Any]]:
    return request_supabase(
        "counties",
        params={
            "select": "id,name",
            "order": "name.asc",
        },
    )


def get_business_types() -> list[dict[str, Any]]:
    return request_supabase(
        "business_types",
        params={
            "select": "id,slug,name,description",
            "order": "name.asc",
        },
    )


def get_active_requirements() -> list[dict[str, Any]]:
    return request_supabase(
        "compliance_requirements",
        params={
            "select": "*",
            "is_active": "eq.true",
            "order": "id.asc",
        },
    )


def test_connection() -> dict[str, Any]:
    counties = get_counties()
    business_types = get_business_types()
    requirements = get_active_requirements()

    return {
        "status": "connected",
        "counties": len(counties),
        "business_types": len(business_types),
        "requirements": len(requirements),
    }