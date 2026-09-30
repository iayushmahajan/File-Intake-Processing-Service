def calculate_quality(
    total: int,
    valid: int,
    missing: int,
    columns: int,
    duplicates: int,
    anomalous_valid_rows: int,
) -> dict:
    """Score only measured dimensions; an empty dataset has no score."""
    if not total:
        return {"score": None, "dimensions": {}}
    dimensions = {
        "validity": round(100 * valid / total, 2),
        "completeness": round(100 * (1 - missing / (total * columns)), 2),
        "uniqueness": round(100 * (1 - duplicates / total), 2),
        "anomaly_health": round(100 * (1 - anomalous_valid_rows / valid), 2)
        if valid
        else None,
    }
    weights = {
        "validity": 0.6,
        "completeness": 0.2,
        "uniqueness": 0.1,
        "anomaly_health": 0.1,
    }
    available = {key: value for key, value in dimensions.items() if value is not None}
    score = sum(value * weights[key] for key, value in available.items()) / sum(
        weights[key] for key in available
    )
    return {"score": round(score, 1), "dimensions": dimensions}
