# Deep Learning Anomaly Detection

## Autoencoder
```
import torch.nn as nn

class Autoencoder(nn.Module):
    def __init__(self, input_dim, encoding_dim=16):
        super().__init__()
        self.encoder = nn.Sequential(
            nn.Linear(input_dim, 32), nn.ReLU(), nn.BatchNorm1d(32), nn.Dropout(0.2),
            nn.Linear(32, encoding_dim), nn.ReLU())
        self.decoder = nn.Sequential(
            nn.Linear(encoding_dim, 32), nn.ReLU(), nn.BatchNorm1d(32),
            nn.Linear(32, input_dim))

    def forward(self, x):
        return self.decoder(self.encoder(x))

    def anomaly_score(self, x):
        with torch.no_grad():
            return nn.MSELoss(reduction="none")(self(x), x).mean(dim=1)
```

Autoencoder learns to compress normal data. Anomalies have high reconstruction error. Training: use normal data only (novelty) or all data (outlier detection — risk of learning to reconstruct anomalies). Encoding dimension: 5-25% of input.

### Training & Detection
```
def train(model, X_normal, epochs=100):
    loader = torch.utils.data.DataLoader(
        torch.utils.data.TensorDataset(torch.FloatTensor(X_normal)),
        batch_size=64, shuffle=True)
    opt = torch.optim.Adam(model.parameters(), lr=1e-3)
    for _ in range(epochs):
        for (batch,) in loader:
            opt.zero_grad(); nn.MSELoss()(model(batch), batch).backward(); opt.step()

def detect(model, X, threshold_pct=95):
    model.eval()
    with torch.no_grad():
        errors = model.anomaly_score(torch.FloatTensor(X)).numpy()
    return errors > np.percentile(errors, threshold_pct), errors
```

## VAE
```
class VAE(nn.Module):
    def __init__(self, input_dim, latent_dim=8):
        super().__init__()
        self.encoder = nn.Sequential(nn.Linear(input_dim, 64), nn.ReLU(), nn.Linear(64, 32), nn.ReLU())
        self.mu = nn.Linear(32, latent_dim); self.log_var = nn.Linear(32, latent_dim)
        self.decoder = nn.Sequential(nn.Linear(latent_dim, 32), nn.ReLU(),
            nn.Linear(32, 64), nn.ReLU(), nn.Linear(64, input_dim))

    def reparameterize(self, mu, log_var):
        return mu + torch.exp(0.5*log_var) * torch.randn_like(mu)

    def forward(self, x):
        h = self.encoder(x); mu, lv = self.mu(h), self.log_var(h)
        return self.decoder(self.reparameterize(mu, lv)), mu, lv

    def anomaly_score(self, x):
        with torch.no_grad():
            recon, mu, lv = self(x)
            return nn.MSELoss(reduction="none")(recon,x).mean(1) - 0.5*(1+lv-mu**2-lv.exp()).sum(1)
```

VAE: anomaly score = reconstruction error + KL divergence. More robust separation than deterministic autoencoder.

## DeepSVDD
```
class DeepSVDD(nn.Module):
    def __init__(self, input_dim, hidden=[64,32], rep_dim=8):
        super().__init__(); layers = []
        for h in hidden:
            layers.extend([nn.Linear(input_dim, h), nn.BatchNorm1d(h), nn.ReLU(), nn.Dropout(0.2)])
            input_dim = h
        layers.append(nn.Linear(input_dim, rep_dim))
        self.net = nn.Sequential(*layers)
    def forward(self, x): return self.net(x)
```

Learn representation where normal data maps near center. Pre-train with autoencoder to avoid collapse.

## LSTM-AD
```
class LSTMAutoencoder(nn.Module):
    def __init__(self, input_dim, hidden=64, num_layers=2):
        super().__init__()
        self.encoder = nn.LSTM(input_dim, hidden, num_layers, batch_first=True)
        self.decoder = nn.LSTM(input_dim, hidden, num_layers, batch_first=True)
        self.fc = nn.Linear(hidden, input_dim)

    def forward(self, x):
        _, (h_n, c_n) = self.encoder(x)
        dec_in = x[:,-1:,:].repeat(1,x.size(1),1)
        dec_out, _ = self.decoder(dec_in, (h_n, c_n))
        return self.fc(dec_out)

    def anomaly_score(self, x):
        with torch.no_grad():
            return torch.mean((self(x)-x)**2, dim=2).mean(dim=1)
```

Learn normal temporal patterns. High prediction/reconstruction error = anomaly.

## Time-Series Anomaly Detection
```
from statsmodels.tsa.seasonal import STL

def ts_anomaly_stl(series, period=7, robust=True, threshold=3):
    resid = STL(series, period=period, robust=robust).fit().resid
    mad = np.median(np.abs(resid - np.median(resid)))
    z = 0.6745 * (resid - np.median(resid)) / (mad + 1e-8)
    return np.abs(z) > threshold, resid
```

Decompose (STL) then detect anomalies in residuals. Handles trend and seasonality.

## Evaluation
```
errors = model.anomaly_score(X_val)
for p in [90, 95, 99]:
    t = np.percentile(errors, p)
    print(f"P{p}: threshold={t:.4f}, detected={(errors>t).sum()}")

from sklearn.metrics import precision_score, recall_score
if labels_available:
    y_pred = errors > np.percentile(errors, 95)
    print(f"P: {precision_score(y_true,y_pred):.3f}, R: {recall_score(y_true,y_pred):.3f}")
```

## Best Practices
- Autoencoders need >1000 normal samples, >10 features.
- VAE preferred over deterministic AE — better anomaly separation.
- Encoding dimension: 5-25% of input.
- Pre-train DeepSVDD with autoencoder weights.
- For time-series: decompose (STL) first, detect on residuals.
- Monitor false positive rate — >5% means tighten threshold or retrain.
- Ensemble: autoencoder + isolation forest + stats for best coverage.
