import numpy as np
import json
from typing import List, Dict, Any, Tuple, Union

FEATURE_ORDER = [
    "bytes_in", "bytes_out", "packets", "duration",
    "src_port", "dest_port"
]

def to_feature_vector(features: Union[Dict[str, Any], List[float], str]) -> Tuple[np.ndarray, str]:
    """
    Accepts:
      - dict with keys from FEATURE_ORDER
      - list/array of floats
      - JSON string
    Returns (vector of shape (1, n_features), normalized_json_text)
    """
    if isinstance(features, str):
        features = json.loads(features)

    if isinstance(features, dict):
        vec = [float(features.get(k, 0.0)) for k in FEATURE_ORDER]
        normalized_json = json.dumps({k: float(features.get(k, 0.0)) for k in FEATURE_ORDER})
        return np.array(vec, dtype=float).reshape(1, -1), normalized_json

    if isinstance(features, list):
        vec = [float(x) for x in features]
        normalized_json = json.dumps(vec)
        return np.array(vec, dtype=float).reshape(1, -1), normalized_json

    raise ValueError("Unsupported features format")
