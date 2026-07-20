from __future__ import annotations

import json
import os
from pathlib import Path
from typing import Any

from flask import Flask, jsonify, request

app = Flask(__name__)
BASE_DIR = Path(__file__).resolve().parent
DATA_FILE = BASE_DIR / "compliance_data.json"
ALLOWED_ORIGIN = os.getenv("ALLOWED_ORIGIN", "*")


@app.after_request
def add_cors_headers(response):
    response.headers["Access-Control-Allow-Origin"] = ALLOWED_ORIGIN
    response.headers["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS"
    response.headers["Access-Control-Allow-Headers"] = "Content-Type"
    return response


@app.before_request
def handle_options():
    if request.method == "OPTIONS":
        return ("", 204)
    return None


def load_compliance_data() -> dict[str, Any]:
    with DATA_FILE.open("r", encoding="utf-8") as file:
        return json.load(file)


def clean_text(value: Any, max_length: int = 100) -> str:
    if not isinstance(value, str):
        return ""
    return value.strip()[:max_length]


@app.get("/")
@app.get("/health")
def health():
    return jsonify({
        "status": "ok",
        "service": "biashara-compliance-assistant-api",
    })


@app.get("/api/options")
def options():
    data = load_compliance_data()
    counties = sorted(data["counties"].keys())
    business_types = [
        {"id": business_id, "name": business["name"]}
        for business_id, business in data["business_types"].items()
    ]
    business_types.sort(key=lambda item: item["name"])
    return jsonify({"counties": counties, "business_types": business_types})


@app.post("/api/checklist")
def generate_checklist():
    payload = request.get_json(silent=True) or {}
    county = clean_text(payload.get("county"), 50)
    business_type = clean_text(payload.get("business_type"), 50)
    business_name = clean_text(payload.get("business_name"), 120)

    if not county:
        return jsonify({"error": "County is required."}), 400
    if not business_type:
        return jsonify({"error": "Business type is required."}), 400

    data = load_compliance_data()
    county_data = data["counties"].get(county)
    business_data = data["business_types"].get(business_type)

    if not county_data:
        return jsonify({"error": "The selected county is not available yet."}), 404
    if not business_data:
        return jsonify({"error": "The selected business type is not available."}), 404

    items = []
    for item in data["general_requirements"]:
        items.append({**item, "source_scope": "Kenya general"})
    for item in business_data["requirements"]:
        items.append({**item, "source_scope": business_data["name"]})
    for item in county_data.get("requirements", []):
        applies_to = item.get("applies_to", [])
        if not applies_to or business_type in applies_to:
            clean_item = {k: v for k, v in item.items() if k != "applies_to"}
            items.append({**clean_item, "source_scope": county})

    return jsonify({
        "business_name": business_name or "Your business",
        "county": county,
        "business_type": business_data["name"],
        "checklist": items,
        "disclaimer": data["disclaimer"],
        "verification_status": "Initial guidance only",
    })


if __name__ == "__main__":
    app.run(
        host="0.0.0.0",
        port=int(os.getenv("PORT", "5000")),
        debug=os.getenv("FLASK_DEBUG") == "1",
    )
