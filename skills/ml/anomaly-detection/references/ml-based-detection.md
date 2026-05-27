# ML-Based Anomaly Detection

## Isolation Forest

```python
from sklearn.ensemble import IsolationForest
import numpy as np

def train_isolation_forest(
    data: np.ndarray,
    contamination: float = 0.1,
    n_estimators: int = 100,
    random_state: int = 42
) -> IsolationForest:
    """
    Train Isolation Forest for anomaly detection.
    Works well with high-dimensional data.
    """
    model = IsolationForest(
        contamination=contamination,
        n_estimators=n_estimators,
        random_state=random_state,
        n_jobs=-1,
    )
    model.fit(data)
    return model

def predict_anomalies(
    model: IsolationForest,
    data: np.ndarray,
    threshold: float = None
) -> np.ndarray:
    """
    Predict anomalies using trained model.
    Returns boolean array where True indicates anomaly.
    """
    scores = model.decision_function(data)
    if threshold is None:
        predictions = model.predict(data)
        return predictions == -1
    else:
        return scores < threshold
```

## Autoencoder for Anomaly Detection

```python
import torch
import torch.nn as nn
import torch.optim as optim

class AnomalyAutoencoder(nn.Module):
    def __init__(self, input_dim: int, encoding_dim: int = 32):
        super().__init__()
        self.encoder = nn.Sequential(
            nn.Linear(input_dim, 128),
            nn.ReLU(),
            nn.Linear(128, encoding_dim),
            nn.ReLU(),
        )
        self.decoder = nn.Sequential(
            nn.Linear(encoding_dim, 128),
            nn.ReLU(),
            nn.Linear(128, input_dim),
            nn.Sigmoid(),
        )

    def forward(self, x):
        encoded = self.encoder(x)
        decoded = self.decoder(encoded)
        return decoded

    def reconstruction_error(self, x):
        reconstructed = self.forward(x)
        return torch.mean((x - reconstructed) ** 2, dim=1)

def train_autoencoder(
    model: AnomalyAutoencoder,
    data: torch.Tensor,
    epochs: int = 50,
    lr: float = 0.001,
) -> AnomalyAutoencoder:
    """Train autoencoder for anomaly detection."""
    optimizer = optim.Adam(model.parameters(), lr=lr)
    criterion = nn.MSELoss()

    model.train()
    for epoch in range(epochs):
        total_loss = 0
        for i in range(0, len(data), 32):
            batch = data[i:i+32]
            optimizer.zero_grad()
            output = model(batch)
            loss = criterion(output, batch)
            loss.backward()
            optimizer.step()
            total_loss += loss.item()

        if epoch % 10 == 0:
            print(f"Epoch {epoch}, Loss: {total_loss:.4f}")

    return model

def detect_with_autoencoder(
    model: AnomalyAutoencoder,
    data: torch.Tensor,
    threshold_percentile: float = 95
) -> np.ndarray:
    """Detect anomalies using reconstruction error threshold."""
    model.eval()
    with torch.no_grad():
        errors = model.reconstruction_error(data).numpy()
    threshold = np.percentile(errors, threshold_percentile)
    return errors > threshold
```

## One-Class SVM

```python
from sklearn.svm import OneClassSVM

def train_one_class_svm(
    data: np.ndarray,
    nu: float = 0.1,
    kernel: str = 'rbf',
    gamma: str = 'auto'
) -> OneClassSVM:
    """
    Train One-Class SVM for anomaly detection.
    Effective for high-dimensional and non-linear data.
    """
    model = OneClassSVM(
        nu=nu,
        kernel=kernel,
        gamma=gamma,
    )
    model.fit(data)
    return model

def evaluate_model(
    model,
    data: np.ndarray,
    true_labels: np.ndarray = None
) -> dict:
    """
    Evaluate anomaly detection model performance.
    """
    predictions = model.predict(data)
    anomaly_scores = model.decision_function(data)

    result = {
        'anomaly_count': np.sum(predictions == -1),
        'normal_count': np.sum(predictions == 1),
        'anomaly_rate': np.mean(predictions == -1),
        'score_range': (float(np.min(anomaly_scores)), float(np.max(anomaly_scores))),
    }

    if true_labels is not None:
        from sklearn.metrics import precision_score, recall_score, f1_score
        binary_preds = predictions == -1
        binary_true = true_labels == 1
        result.update({
            'precision': precision_score(binary_true, binary_preds),
            'recall': recall_score(binary_true, binary_preds),
            'f1': f1_score(binary_true, binary_preds),
        })

    return result
```

## Key Points

- Use Isolation Forest for high-dimensional anomaly detection
- Use autoencoders for complex pattern reconstruction
- Use One-Class SVM for boundary-based detection
- Tune contamination parameter based on expected anomaly rate
- Set reconstruction error threshold using percentile
- Evaluate with precision, recall, and F1 score
- Handle class imbalance in evaluation
- Use feature scaling for distance-based methods
- Validate on known anomaly datasets
- Monitor model drift in production
- Combine unsupervised methods for robust detection
- Document feature importance for interpretability
