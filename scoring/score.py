"""Score one loan application with the trained charge-off model."""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from catboost import CatBoostClassifier, Pool

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from scoring.features import transform

DIR = Path(__file__).resolve().parent
SPEC_PATH = DIR / "features.json"
MODEL_PATH = DIR / "model.cbm"
CALIBRATOR_PATH = DIR / "calibrator.joblib"

_MODEL: CatBoostClassifier | None = None
_SPEC: dict | None = None
_CALIBRATOR = None


def _load():
    global _MODEL, _SPEC, _CALIBRATOR
    if _MODEL is None:
        if not MODEL_PATH.exists() or not SPEC_PATH.exists():
            raise FileNotFoundError(
                "Model files are missing in scoring/. Run training/train.py first."
            )
        _SPEC = json.loads(SPEC_PATH.read_text())
        _MODEL = CatBoostClassifier()
        _MODEL.load_model(str(MODEL_PATH))
        if CALIBRATOR_PATH.exists():
            _CALIBRATOR = joblib.load(CALIBRATOR_PATH)
    return _MODEL, _SPEC, _CALIBRATOR


def score(payload: dict) -> dict:
    """Return the charge-off probability and a 0-1000 score where 1000 is safest."""
    model, spec, calibrator = _load()
    frame = transform(pd.DataFrame([payload]), spec)
    pool = Pool(frame, cat_features=spec["categorical_features"])
    probability = float(model.predict_proba(pool)[:, 1][0])
    if calibrator is not None:
        probability = float(calibrator.predict([probability])[0])
    probability = float(np.clip(probability, 0.0, 1.0))
    return {
        "pd_chargeoff": round(probability, 6),
        "risk_score": int(np.clip(round((1.0 - probability) * 1000), 0, 1000)),
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="Score one loan application")
    parser.add_argument("--json", help="Application JSON. Reads stdin when omitted and piped.")
    parser.add_argument("--loan-amount", type=float)
    parser.add_argument("--term-months", type=float)
    parser.add_argument("--naics-code")
    parser.add_argument("--business-type")
    parser.add_argument("--business-age")
    parser.add_argument("--jobs-supported", type=float)
    parser.add_argument("--collateral")
    parser.add_argument("--revolver")
    parser.add_argument("--franchise")
    args = parser.parse_args()
    if args.json:
        payload = json.loads(args.json)
    elif args.loan_amount is not None:
        payload = {
            "loan_amount": args.loan_amount,
            "term_months": args.term_months,
            "naics_code": args.naics_code,
            "business_type": args.business_type,
            "business_age": args.business_age,
            "jobs_supported": args.jobs_supported,
            "collateral": args.collateral,
            "revolver": args.revolver,
            "franchise": args.franchise,
        }
    else:
        payload = json.loads(input())
    print(json.dumps(score(payload), ensure_ascii=False))


if __name__ == "__main__":
    main()
