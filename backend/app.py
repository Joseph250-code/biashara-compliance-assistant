from __future__ import annotations

import json
import os
from typing import Any

from flask import Flask, jsonify, request

from database import (
    get_active_requirements,
    get_business_types,
    get_counties,
)


app = Flask(__name__)

ALLOWED_ORIGIN = os.getenv("ALLOWED_ORIGIN", "*")

DISCLAIMER = (
    "Biashara Compliance Assistant is an independent information platform. "
    "It is not affiliated with Nairobi City County, KRA, or any government "
    "agency. Requirements, fees, forms and renewal dates may change. "
    "Confirm every item with the responsible authority before making payment."
)


@app.after_request
def add_cors_headers(response):
    response.headers["Access-Control-Allow-Origin"] = ALLOWED_ORIGIN
    response.headers["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS"
    response.headers["Access-Control-Allow-Headers"] = "Content-Type"
    return response


@app.before_request
def handle_options():
    if request.method == "OPTIONS":
        return "", 204

    return None


@app.errorhandler(RuntimeError)
def handle_database_error(error):
    app.logger.error("Supabase error: %s", error)

    return jsonify(
        {
            "error": (
                "The compliance database is temporarily unavailable. "
                "Please try again."
            )
        }
    ), 503


def clean_text(value: Any, max_length: int = 100) -> str:
    if not isinstance(value, str):
        return ""

    return value.strip()[:max_length]


def normalize_documents(value: Any) -> list[str]:
    if isinstance(value, list):
        return [str(item) for item in value]

    if isinstance(value, str):
        try:
            decoded = json.loads(value)

            if isinstance(decoded, list):
                return [str(item) for item in decoded]
        except json.JSONDecodeError:
            return []

    return []


def requirement_applies(
    requirement: dict[str, Any],
    county_id: int,
    business_type_id: int,
) -> bool:
    requirement_county_id = requirement.get("county_id")
    requirement_business_type_id = requirement.get("business_type_id")

    is_general = (
        requirement_county_id is None
        and requirement_business_type_id is None
    )

    is_business_requirement = (
        requirement_county_id is None
        and requirement_business_type_id == business_type_id
    )

    is_county_requirement = (
        requirement_county_id == county_id
        and requirement_business_type_id is None
    )

    is_county_business_requirement = (
        requirement_county_id == county_id
        and requirement_business_type_id == business_type_id
    )

    return any(
        (
            is_general,
            is_business_requirement,
            is_county_requirement,
            is_county_business_requirement,
        )
    )


def determine_source_scope(
    requirement: dict[str, Any],
    county_name: str,
    business_type_name: str,
) -> str:
    county_id = requirement.get("county_id")
    business_type_id = requirement.get("business_type_id")

    if county_id is None and business_type_id is None:
        return "Kenya general"

    if county_id is not None and business_type_id is None:
        return county_name

    if county_id is None and business_type_id is not None:
        return business_type_name

    return f"{county_name} — {business_type_name}"


def format_requirement(
    requirement: dict[str, Any],
    county_name: str,
    business_type_name: str,
) -> dict[str, Any]:
    return {
        "id": requirement.get("id"),
        "title": requirement.get("title", ""),
        "category": requirement.get("category", ""),
        "description": requirement.get("description", ""),
        "documents": normalize_documents(
            requirement.get("required_documents")
        ),
        "renewal_note": requirement.get("renewal_note")
        or "Confirm the current renewal requirements.",
        "fee_note": requirement.get("fee_note")
        or "Confirm the current official fee before payment.",
        "verification": requirement.get("verification_status")
        or "Needs official verification",
        "official_source_url": requirement.get("official_source_url"),
        "last_verified_date": requirement.get("last_verified_date"),
        "source_scope": determine_source_scope(
            requirement,
            county_name,
            business_type_name,
        ),
    }


@app.get("/")
@app.get("/health")
def health():
    return jsonify(
        {
            "status": "ok",
            "service": "biashara-compliance-assistant-api",
        }
    )


@app.get("/api/options")
def options():
    counties = get_counties()
    business_types = get_business_types()

    return jsonify(
        {
            "counties": [
                county["name"]
                for county in counties
            ],
            "business_types": [
                {
                    "id": business_type["slug"],
                    "name": business_type["name"],
                }
                for business_type in business_types
            ],
        }
    )


@app.post("/api/checklist")
def generate_checklist():
    payload = request.get_json(silent=True) or {}

    county_name = clean_text(payload.get("county"), 100)
    business_type_slug = clean_text(
        payload.get("business_type"),
        100,
    )
    business_name = clean_text(
        payload.get("business_name"),
        200,
    )

    if not county_name:
        return jsonify({"error": "County is required."}), 400

    if not business_type_slug:
        return jsonify({"error": "Business type is required."}), 400

    counties = get_counties()
    business_types = get_business_types()
    requirements = get_active_requirements()

    selected_county = next(
        (
            county
            for county in counties
            if county["name"].lower() == county_name.lower()
        ),
        None,
    )

    selected_business_type = next(
        (
            business_type
            for business_type in business_types
            if business_type["slug"] == business_type_slug
        ),
        None,
    )

    if selected_county is None:
        return jsonify(
            {
                "error": (
                    "The selected county is not available yet."
                )
            }
        ), 404

    if selected_business_type is None:
        return jsonify(
            {
                "error": (
                    "The selected business type is not available."
                )
            }
        ), 404

    county_id = selected_county["id"]
    business_type_id = selected_business_type["id"]

    checklist = [
        format_requirement(
            requirement,
            selected_county["name"],
            selected_business_type["name"],
        )
        for requirement in requirements
        if requirement_applies(
            requirement,
            county_id,
            business_type_id,
        )
    ]

    return jsonify(
        {
            "business_name": business_name or "Your business",
            "county": selected_county["name"],
            "business_type": selected_business_type["name"],
            "checklist": checklist,
            "disclaimer": DISCLAIMER,
            "verification_status": "Initial guidance only",
        }
    )


if __name__ == "__main__":
    app.run(
        host="0.0.0.0",
        port=int(os.getenv("PORT", "5000")),
        debug=os.getenv("FLASK_DEBUG") == "1",
    )