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
    "It is not affiliated with Nairobi City County, KRA, any county government, "
    "or another government agency. Requirements, fees, forms and renewal dates "
    "may change. Confirm every item with the responsible authority before "
    "submitting an application or making a payment."
)


# =========================================================
# CORS AND REQUEST HANDLING
# =========================================================

@app.after_request
def add_cors_headers(response):
    response.headers["Access-Control-Allow-Origin"] = ALLOWED_ORIGIN
    response.headers["Access-Control-Allow-Methods"] = (
        "GET, POST, OPTIONS"
    )
    response.headers["Access-Control-Allow-Headers"] = (
        "Content-Type, Accept"
    )
    response.headers["Vary"] = "Origin"

    return response


@app.before_request
def handle_options():
    if request.method == "OPTIONS":
        return "", 204

    return None


# =========================================================
# ERROR HANDLING
# =========================================================

@app.errorhandler(RuntimeError)
def handle_database_error(error):
    app.logger.error(
        "Supabase database error: %s",
        error,
    )

    return jsonify(
        {
            "error": (
                "The compliance database is temporarily unavailable. "
                "Please try again shortly."
            )
        }
    ), 503


@app.errorhandler(404)
def handle_not_found(_error):
    return jsonify(
        {
            "error": "The requested service route was not found."
        }
    ), 404


@app.errorhandler(500)
def handle_server_error(error):
    app.logger.error(
        "Unexpected server error: %s",
        error,
    )

    return jsonify(
        {
            "error": (
                "An unexpected server error occurred. "
                "Please try again."
            )
        }
    ), 500


# =========================================================
# HELPER FUNCTIONS
# =========================================================

def clean_text(
    value: Any,
    max_length: int = 100,
) -> str:
    """
    Convert an incoming value into a trimmed string.

    Text is limited to the supplied maximum length to prevent
    excessively large form submissions.
    """

    if not isinstance(value, str):
        return ""

    return value.strip()[:max_length]


def normalize_documents(value: Any) -> list[str]:
    """
    Convert the required_documents database value into a list.

    Supabase normally returns JSONB as a Python-compatible list,
    but this also handles a JSON string as a fallback.
    """

    if isinstance(value, list):
        return [
            str(item).strip()
            for item in value
            if str(item).strip()
        ]

    if isinstance(value, str):
        try:
            decoded = json.loads(value)

            if isinstance(decoded, list):
                return [
                    str(item).strip()
                    for item in decoded
                    if str(item).strip()
                ]

        except json.JSONDecodeError:
            return []

    return []


def requirement_applies(
    requirement: dict[str, Any],
    county_id: int,
    business_type_id: int | None,
) -> bool:
    """
    Determine whether a compliance requirement applies.

    A requirement may be:

    1. General to every Kenyan business.
    2. General to one county.
    3. General to one business type.
    4. Specific to one business type in one county.

    Manually entered business types do not yet have a database ID.
    They therefore receive general national and county requirements.
    """

    requirement_county_id = requirement.get(
        "county_id"
    )

    requirement_business_type_id = requirement.get(
        "business_type_id"
    )

    # General requirement for all businesses in Kenya.
    if (
        requirement_county_id is None
        and requirement_business_type_id is None
    ):
        return True

    # Requirement applying to all businesses in one county.
    if (
        requirement_county_id == county_id
        and requirement_business_type_id is None
    ):
        return True

    # A custom business type has no database ID.
    # It receives only general and county-wide requirements.
    if business_type_id is None:
        return False

    # Requirement for one business type in all counties.
    if (
        requirement_county_id is None
        and requirement_business_type_id
        == business_type_id
    ):
        return True

    # Requirement for one business type in one county.
    return (
        requirement_county_id == county_id
        and requirement_business_type_id
        == business_type_id
    )


def determine_source_scope(
    requirement: dict[str, Any],
    county_name: str,
    business_type_name: str,
) -> str:
    """
    Create a user-friendly label showing where a requirement applies.
    """

    county_id = requirement.get("county_id")

    business_type_id = requirement.get(
        "business_type_id"
    )

    if (
        county_id is None
        and business_type_id is None
    ):
        return "Kenya general"

    if (
        county_id is not None
        and business_type_id is None
    ):
        return county_name

    if (
        county_id is None
        and business_type_id is not None
    ):
        return business_type_name

    return (
        f"{county_name} — "
        f"{business_type_name}"
    )


def format_requirement(
    requirement: dict[str, Any],
    county_name: str,
    business_type_name: str,
) -> dict[str, Any]:
    """
    Convert a Supabase requirement record into the structure
    expected by the frontend.
    """

    return {
        "id": requirement.get("id"),
        "title": requirement.get("title") or "",
        "category": requirement.get("category") or "",
        "description": (
            requirement.get("description") or ""
        ),
        "documents": normalize_documents(
            requirement.get("required_documents")
        ),
        "renewal_note": (
            requirement.get("renewal_note")
            or (
                "Confirm the current renewal requirements "
                "with the responsible authority."
            )
        ),
        "fee_note": (
            requirement.get("fee_note")
            or (
                "Confirm the current official fee before "
                "making a payment."
            )
        ),
        "verification": (
            requirement.get("verification_status")
            or "Needs official verification"
        ),
        "official_source_url": (
            requirement.get("official_source_url")
        ),
        "last_verified_date": (
            requirement.get("last_verified_date")
        ),
        "source_scope": determine_source_scope(
            requirement,
            county_name,
            business_type_name,
        ),
    }


def find_county(
    counties: list[dict[str, Any]],
    county_name: str,
) -> dict[str, Any] | None:
    """
    Match a county without requiring exact letter casing.
    """

    normalized_name = county_name.casefold()

    return next(
        (
            county
            for county in counties
            if str(
                county.get("name", "")
            ).casefold() == normalized_name
        ),
        None,
    )


def find_business_type(
    business_types: list[dict[str, Any]],
    business_type_value: str,
) -> dict[str, Any] | None:
    """
    Match a business type by its database slug or display name.
    """

    normalized_value = (
        business_type_value.casefold()
    )

    return next(
        (
            business_type
            for business_type in business_types
            if (
                str(
                    business_type.get("slug", "")
                ).casefold() == normalized_value
                or
                str(
                    business_type.get("name", "")
                ).casefold() == normalized_value
            )
        ),
        None,
    )


# =========================================================
# HEALTH ROUTES
# =========================================================

@app.get("/")
@app.get("/health")
def health():
    return jsonify(
        {
            "status": "ok",
            "service": (
                "biashara-compliance-assistant-api"
            ),
        }
    ), 200


# =========================================================
# OPTIONS ROUTE
# =========================================================

@app.get("/api/options")
def options():
    """
    Return all counties and known business categories.

    Counties are retrieved directly from Supabase.
    The counties table should contain all 47 Kenyan counties.
    """

    counties = get_counties()
    business_types = get_business_types()

    county_names = sorted(
        [
            county["name"]
            for county in counties
            if county.get("name")
        ],
        key=str.casefold,
    )

    available_business_types = sorted(
        [
            {
                "id": business_type["slug"],
                "name": business_type["name"],
                "description": (
                    business_type.get("description")
                    or ""
                ),
            }
            for business_type in business_types
            if (
                business_type.get("slug")
                and business_type.get("name")
            )
        ],
        key=lambda item: item["name"].casefold(),
    )

    return jsonify(
        {
            "counties": county_names,
            "business_types": (
                available_business_types
            ),
            "manual_business_type_allowed": True,
        }
    ), 200


# =========================================================
# CHECKLIST ROUTE
# =========================================================

@app.post("/api/checklist")
def generate_checklist():
    """
    Generate a compliance checklist.

    Known business categories receive:
    - General national requirements.
    - General county requirements.
    - Business-type requirements.
    - County-and-business-type requirements.

    Manually entered business categories receive:
    - General national requirements.
    - General county requirements.
    """

    payload = request.get_json(
        silent=True
    ) or {}

    county_name = clean_text(
        payload.get("county"),
        100,
    )

    business_type_value = clean_text(
        payload.get("business_type"),
        150,
    )

    business_name = clean_text(
        payload.get("business_name"),
        200,
    )

    if not county_name:
        return jsonify(
            {
                "error": (
                    "Select the county where the "
                    "business operates."
                )
            }
        ), 400

    if not business_type_value:
        return jsonify(
            {
                "error": (
                    "Select or type the business activity."
                )
            }
        ), 400

    counties = get_counties()
    business_types = get_business_types()
    requirements = get_active_requirements()

    selected_county = find_county(
        counties,
        county_name,
    )

    if selected_county is None:
        return jsonify(
            {
                "error": (
                    "The selected county is not currently "
                    "available in the compliance database."
                )
            }
        ), 404

    selected_business_type = find_business_type(
        business_types,
        business_type_value,
    )

    if selected_business_type is None:
        business_type_id = None
        business_type_name = business_type_value
        business_type_is_custom = True

    else:
        business_type_id = (
            selected_business_type["id"]
        )

        business_type_name = (
            selected_business_type["name"]
        )

        business_type_is_custom = False

    county_id = selected_county["id"]

    applicable_requirements = [
        requirement
        for requirement in requirements
        if requirement_applies(
            requirement,
            county_id,
            business_type_id,
        )
    ]

    checklist = [
        format_requirement(
            requirement,
            selected_county["name"],
            business_type_name,
        )
        for requirement in applicable_requirements
    ]

    custom_business_message = None

    if business_type_is_custom:
        custom_business_message = (
            "This business activity was entered manually. "
            "The checklist therefore contains the available "
            "general national and county requirements. "
            "Sector-specific requirements should be confirmed "
            "with the relevant authority."
        )

    return jsonify(
        {
            "business_name": (
                business_name or "Your business"
            ),
            "county": selected_county["name"],
            "business_type": business_type_name,
            "business_type_is_custom": (
                business_type_is_custom
            ),
            "custom_business_message": (
                custom_business_message
            ),
            "checklist": checklist,
            "checklist_count": len(checklist),
            "disclaimer": DISCLAIMER,
            "verification_status": (
                "Initial guidance only"
            ),
        }
    ), 200


# =========================================================
# LOCAL DEVELOPMENT
# =========================================================

if __name__ == "__main__":
    app.run(
        host="0.0.0.0",
        port=int(
            os.getenv(
                "PORT",
                "5000",
            )
        ),
        debug=(
            os.getenv("FLASK_DEBUG") == "1"
        ),
    )