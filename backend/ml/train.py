import joblib
import numpy as np
from sklearn.ensemble import IsolationForest
from pathlib import Path

MODEL_PATH = Path(__file__).with_name("isolation_model.pkl")

def train_dummy():
    """
    Demo training: random normal traffic + a few outliers.
    Replace with real dataset pipelines later.
    """
    rng = np.random.RandomState(42)
    normal = rng.normal(loc=0, scale=1, size=(1000, 6))
    outliers = rng.normal(loc=6, scale=1.5, size=(40, 6))
    X = np.vstack([normal, outliers])

    model = IsolationForest(n_estimators=200, contamination=0.03, random_state=42)
    model.fit(X)
    MODEL_PATH.write_bytes(b"")  # ensure path exists
    joblib.dump(model, MODEL_PATH)
    return str(MODEL_PATH)

if __name__ == "__main__":
    path = train_dummy()
    print("Saved:", path)
