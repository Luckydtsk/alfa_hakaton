"""Feature contract shared by training and inference.

The model estimates the probability that a resolved SBA 7(a) loan is charged off.
Inputs are the fields known at approval. Amounts are US dollars, the unit of the
training data.
"""

from __future__ import annotations

import math

import numpy as np
import pandas as pd

NUMERIC_FEATURES = ["loan_amount", "term_months", "jobs_supported"]
CATEGORICAL_FEATURES = [
    "naics_sector",
    "business_type",
    "business_age",
    "collateral",
    "revolver",
    "franchise",
]
FEATURE_ORDER = NUMERIC_FEATURES + CATEGORICAL_FEATURES

BUSINESS_TYPES = ["CORPORATION", "INDIVIDUAL", "PARTNERSHIP", "unknown"]
BUSINESS_AGES = [
    "existing_5y_plus",
    "age_2_to_5",
    "under_2y",
    "startup",
    "unknown",
]

_AGE_BUCKETS = {
    "existing_5y_plus": "existing_5y_plus",
    "existing, 5 or more years": "existing_5y_plus",
    "existing or more than 2 years old": "existing_5y_plus",
    "age_2_to_5": "age_2_to_5",
    "less than 5 years old but at least 4": "age_2_to_5",
    "less than 4 years old but at least 3": "age_2_to_5",
    "less than 3 years old but at least 2": "age_2_to_5",
    "under_2y": "under_2y",
    "new, less than 1 year old": "under_2y",
    "new business or 2 years or less": "under_2y",
    "startup": "startup",
    "startup, loan funds will open business": "startup",
    "unknown": "unknown",
    "unanswered": "unknown",
    "change of ownership": "unknown",
    "ownership_change": "unknown",
    "больше 5 лет": "existing_5y_plus",
    "5+": "existing_5y_plus",
    "от 2 до 5": "age_2_to_5",
    "2-5": "age_2_to_5",
    "меньше 2 лет": "under_2y",
    "<2": "under_2y",
    "стартап": "startup",
    "неизвестно": "unknown",
}

_TYPE_BUCKETS = {
    "CORPORATION": "CORPORATION",
    "INDIVIDUAL": "INDIVIDUAL",
    "PARTNERSHIP": "PARTNERSHIP",
    "LLC": "CORPORATION",
    "OOO": "CORPORATION",
    "ООО": "CORPORATION",
    "IP": "INDIVIDUAL",
    "ИП": "INDIVIDUAL",
}


def _missing(value) -> bool:
    if value is None:
        return True
    if isinstance(value, float) and math.isnan(value):
        return True
    text = str(value).strip()
    return text == "" or text.lower() in {"nan", "none", "null", "nat"}


def yes_no(value) -> str:
    if _missing(value):
        return "unknown"
    text = str(value).strip().lower()
    if text in {"y", "yes", "1", "true", "да"}:
        return "yes"
    if text in {"n", "no", "0", "false", "нет"}:
        return "no"
    return "unknown"


def naics_sector(value, kept: set[str] | None = None) -> str:
    if _missing(value):
        return "unknown"
    digits = "".join(ch for ch in str(value).strip() if ch.isdigit())
    if len(digits) < 2 or digits[:2] == "00":
        return "unknown"
    sector = digits[:2]
    if kept is not None and sector not in kept:
        return "other"
    return sector


def business_type(value) -> str:
    if _missing(value):
        return "unknown"
    text = str(value).strip().upper()
    return _TYPE_BUCKETS.get(text, "unknown")


def business_age(value) -> str:
    if _missing(value):
        return "unknown"
    text = str(value).strip().lower()
    return _AGE_BUCKETS.get(text, "unknown")


def build_spec(train: pd.DataFrame) -> dict:
    jobs = pd.to_numeric(train["jobs_supported"], errors="coerce")
    amount = pd.to_numeric(train["loan_amount"], errors="coerce")
    sectors = train["naics_code"].map(lambda value: naics_sector(value))
    counts = sectors.value_counts()
    kept = sorted(
        sector
        for sector, count in counts.items()
        if sector != "unknown" and count >= 500
    )
    return {
        "numeric_features": NUMERIC_FEATURES,
        "categorical_features": CATEGORICAL_FEATURES,
        "feature_order": FEATURE_ORDER,
        "jobs_cap": float(jobs.quantile(0.99)),
        "jobs_median": float(jobs.median()),
        "naics_sectors_kept": kept,
        "business_age_values": BUSINESS_AGES,
        "business_type_values": BUSINESS_TYPES,
        "amount_unit": "USD",
        "amount_percentiles_usd": {
            "p05": float(amount.quantile(0.05)),
            "p25": float(amount.quantile(0.25)),
            "p50": float(amount.quantile(0.50)),
            "p75": float(amount.quantile(0.75)),
            "p95": float(amount.quantile(0.95)),
        },
    }


def transform(frame: pd.DataFrame, spec: dict) -> pd.DataFrame:
    kept = set(spec["naics_sectors_kept"])
    jobs = pd.to_numeric(frame["jobs_supported"], errors="coerce")
    jobs = jobs.clip(upper=spec["jobs_cap"]).fillna(spec["jobs_median"])
    out = pd.DataFrame(
        {
            "loan_amount": pd.to_numeric(frame["loan_amount"], errors="coerce"),
            "term_months": pd.to_numeric(frame["term_months"], errors="coerce"),
            "jobs_supported": jobs,
            "naics_sector": frame["naics_code"].map(lambda value: naics_sector(value, kept)),
            "business_type": frame["business_type"].map(business_type),
            "business_age": frame["business_age"].map(business_age),
            "collateral": frame["collateral"].map(yes_no),
            "revolver": frame["revolver"].map(yes_no),
            "franchise": frame["franchise"].map(yes_no),
        }
    )
    for column in CATEGORICAL_FEATURES:
        out[column] = out[column].astype(str)
    return out[FEATURE_ORDER]
