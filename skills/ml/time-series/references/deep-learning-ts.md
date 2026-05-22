# Deep Learning for Time Series

## LSTM
```
import torch.nn as nn

class LSTMForecaster(nn.Module):
    def __init__(self, input_size, hidden_size=64, num_layers=2, output_size=1, dropout=0.2):
        super().__init__()
        self.lstm = nn.LSTM(input_size, hidden_size, num_layers, batch_first=True,
                            dropout=dropout if num_layers>1 else 0)
        self.fc = nn.Linear(hidden_size, output_size)

    def forward(self, x):
        lstm_out, (h_n, c_n) = self.lstm(x)
        return self.fc(h_n[-1])
```

Input: (batch, seq_len, features). Hidden: 32-128. Layers: 1-3. Sequence length: enough for one seasonal cycle. Gradient clipping (max_norm=1.0) prevents exploding gradients. Adam lr=1e-3, reduce on plateau. Early stopping patience=10-20.

## Temporal Fusion Transformer (TFT)
```
from pytorch_forecasting import TemporalFusionTransformer, TimeSeriesDataSet

training = TimeSeriesDataSet(data, time_idx="time_idx", target="value",
    group_ids=["series_id"], min_encoder_length=30, max_encoder_length=60,
    min_prediction_length=1, max_prediction_length=10,
    static_categoricals=["category"],
    time_varying_known_categoricals=["day_of_week","month"],
    time_varying_unknown_reals=["value"])

tft = TemporalFusionTransformer.from_dataset(training,
    hidden_size=64, attention_head_size=4, dropout=0.1,
    hidden_continuous_size=32, output_size=7, loss=QuantileLoss())
```

TFT: gating (skip irrelevant features), LSTM encoder-decoder, multi-head attention, quantile output. Variable selection learns feature importance per time step. Interpretable: attention weights show relevant past periods.

## Attention Mechanism
```
class MultiHeadAttention(nn.Module):
    def __init__(self, d_model, n_heads):
        super().__init__()
        self.n_heads = n_heads; self.d_k = d_model // n_heads
        self.W_q, self.W_k, self.W_v, self.W_o = [nn.Linear(d_model, d_model) for _ in range(4)]

    def forward(self, query, key, value, mask=None):
        B = query.size(0)
        Q = self.W_q(query).view(B, -1, self.n_heads, self.d_k).transpose(1,2)
        K = self.W_k(key).view(B, -1, self.n_heads, self.d_k).transpose(1,2)
        V = self.W_v(value).view(B, -1, self.n_heads, self.d_k).transpose(1,2)
        scores = torch.matmul(Q, K.transpose(-2,-1)) / math.sqrt(self.d_k)
        if mask is not None: scores = scores.masked_fill(mask==0, -1e9)
        attn = torch.softmax(scores, dim=-1)
        out = torch.matmul(attn, V).transpose(1,2).contiguous().view(B, -1, self.d_model*self.n_heads)
        return self.W_o(out)
```

Self-attention: query=key=value from same sequence. Cross-attention: decoder attends to encoder. Interpret attention weights to see which past periods matter.

## Feature Engineering
```
def create_features(df, date_col="date", target="y"):
    df = df.copy()
    # Calendar
    for attr in ["dayofweek", "quarter", "month", "dayofyear"]:
        df[attr] = getattr(df[date_col].dt, attr)
    df["weekend"] = (df["dayofweek"] >= 5).astype(int)
    # Lags
    for lag in [1, 2, 3, 7, 14, 28]:
        df[f"lag_{lag}"] = df[target].shift(lag)
    # Rolling windows
    for w in [7, 14, 30]:
        df[f"roll_mean_{w}"] = df[target].shift(1).rolling(w).mean()
        df[f"roll_std_{w}"] = df[target].shift(1).rolling(w).std()
    return df
```

## Temporal Cross-Validation
```
from sklearn.model_selection import TimeSeriesSplit
tscv = TimeSeriesSplit(n_splits=5, max_train_size=1000)
for train_idx, val_idx in tscv.split(X):
    X_train, X_val = X[train_idx], X[val_idx]
    y_train, y_val = y[train_idx], y[val_idx]
    model.fit(X_train, y_train)
    print(evaluate(model, X_val, y_val))
```

## Metrics
```
def mase(y_true, y_pred, y_train, seasonality=1):
    naive = np.mean(np.abs(y_train[seasonality:] - y_train[:-seasonality]))
    return np.mean(np.abs(y_true - y_pred)) / (naive + 1e-8)

def smape(y_true, y_pred):
    return 100 * np.mean(2*np.abs(y_true-y_pred)/(np.abs(y_true)+np.abs(y_pred)+1e-8))

def pinball_loss(y_true, y_pred, q):
    err = y_true - y_pred
    return np.mean(np.maximum(q*err, (q-1)*err))
```

## Best Practices
- Start simple: classical models beat deep learning on <10K steps.
- Scale features: normalize per-series for multiple time series.
- Teacher forcing at training, autoregressive at inference.
- Gradient clipping: 0.5-1.0 for LSTMs.
- Ensemble: average predictions from multiple random seeds.
- Backtest: simulate historical forecast performance exactly as in production.
