# Deep Learning for Time Series Forecasting

## Deep Learning Architectures

| Architecture | Best For | Training Time | Interpretability | Data Requirement |
|-------------|----------|---------------|-----------------|------------------|
| LSTM/GRU | Univariate, short-mid horizon | Medium | Low | >10K steps |
| CNN (TCN, WaveNet) | Pattern recognition | Fast | Low | >5K steps |
| Transformer | Long-range dependencies | Medium | Medium | >10K steps |
| Temporal Fusion Transformer | Multi-series + exogenous | Slow | High | >20K steps |
| N-BEATS | Univariate, interpretable | Medium | High | >5K steps |
| DeepAR | Probabilistic, multi-series | Medium | Medium | >10K steps |
| Informer | Long sequence | Slow | Low | >50K steps |
| TimesNet | General purpose | Medium | Low | >10K steps |

## TFT Implementation

```
from pytorch_forecasting import TemporalFusionTransformer, TimeSeriesDataSet
from pytorch_forecasting.data import GroupNormalizer
from pytorch_forecasting.metrics import QuantileLoss

# Prepare data
dataset = TimeSeriesDataSet(
    data,
    time_idx="time_idx",
    target="value",
    group_ids=["series_id"],
    min_encoder_length=30,
    max_encoder_length=60,
    min_prediction_length=1,
    max_prediction_length=10,
    static_categoricals=["category"],
    time_varying_known_categoricals=["day_of_week"],
    time_varying_known_reals=["hour", "promotion"],
    time_varying_unknown_reals=["value"],
    target_normalizer=GroupNormalizer(groups=["series_id"]),
)

# Model
tft = TemporalFusionTransformer.from_dataset(
    dataset,
    hidden_size=128,
    lstm_layers=2,
    dropout=0.1,
    attention_head_size=4,
    max_encoder_length=60,
    output_size=7,  # Quantiles: [0.1, 0.2, ..., 0.9]
)

# Train
from pytorch_lightning import Trainer
trainer = Trainer(max_epochs=50, gradient_clip_val=0.1)
trainer.fit(tft, train_dataloader=dataloader)
```

## N-BEATS

```
from darts.models import NBEATSModel

model = NBEATSModel(
    input_chunk_length=30,
    output_chunk_length=10,
    generic_architecture=False,
    num_stacks=30,
    num_blocks=1,
    num_layers=4,
    layer_widths=256,
    expansion_coefficient_dim=8,
    batch_size=32,
    n_epochs=100,
    random_state=42,
)

model.fit(train_series, val_series=val_series, verbose=True)
forecast = model.predict(n=10)

# N-BEATS is interpretable:
# Each stack decomposes into trend + seasonal components
# plot_components shows the learned decomposition
model.plot_components(forecast)
```

## Data Preparation for Deep Learning TS

```
from torch.utils.data import Dataset

class TimeSeriesDataset(Dataset):
    def __init__(self, data, seq_length=30, pred_length=10):
        self.data = torch.tensor(data.values, dtype=torch.float32)
        self.seq_length = seq_length
        self.pred_length = pred_length

    def __len__(self):
        return len(self.data) - self.seq_length - self.pred_length + 1

    def __getitem__(self, idx):
        x = self.data[idx:idx + self.seq_length]
        y = self.data[idx + self.seq_length:idx + self.seq_length + self.pred_length]
        return x, y

# Normalization is critical for deep learning
from sklearn.preprocessing import StandardScaler
scaler = StandardScaler()
data_scaled = scaler.fit_transform(data.reshape(-1, 1))
```

## Feature Engineering for Deep Learning TS

| Feature Type | Examples | Encoding |
|-------------|----------|----------|
| Calendar | hour, day_of_week, month, quarter | Sin/cos cyclical |
| Holiday | is_holiday, days_to_holiday | Binary + float |
| Lags | t-1, t-7, t-30 | Float (normalized) |
| Rolling stats | mean_7d, std_30d | Float |
| Exogenous | price, promotion, weather | Float (normalized) |
| Series ID | category, store_id | Embedding |

## Multi-Horizon Forecasting

```
# Direct multi-step: separate model per horizon
models = {}
for h in range(1, 11):
    model = LSTM(hidden_size=64)
    model.fit(X, y_h=h)
    models[h] = model

# Single model with multi-output head
class MultiHorizonLSTM(nn.Module):
    def __init__(self, input_size, hidden_size, horizon):
        super().__init__()
        self.lstm = nn.LSTM(input_size, hidden_size, batch_first=True)
        self.fc = nn.Linear(hidden_size, horizon)

    def forward(self, x):
        _, (h_n, _) = self.lstm(x)
        return self.fc(h_n.squeeze(0))
```

| Strategy | Pros | Cons |
|----------|------|------|
| Recursive | Single model, any horizon | Error accumulates |
| Direct | No error accumulation | N models, high variance |
| MIMO | Single model, no error accum | Fixed horizon |
| Seq2Seq | Flexible horizon | Complex training |

## Backtesting for Deep Learning Models

```
from darts import TimeSeries
from darts.models import TFTModel
from darts.metrics import mase

# Walk-forward validation
def backtest_dl(series, model_class, params, start=0.5, fh=10, stride=1):
    train, test = series.split_before(start)
    forecasts = model_class(**params).historical_forecasts(
        series,
        start=start,
        forecast_horizon=fh,
        stride=stride,
        retrain=True,
        verbose=True,
    )
    return mase(series, forecasts)
```

## Best Practices

- Normalize all input features — deep learning is sensitive to scale
- Use gradient clipping (max_norm=1.0) to prevent training instability
- Start with simple models (N-BEATS, LSTM) before complex ones (TFT, Informer)
- Use early stopping with patience=10-20 on validation loss
- Batch size: as large as GPU memory allows, typically 64-256
- Learning rate: 1e-4 for Adam, use ReduceLROnPlateau or cosine annealing
- Embed categorical features (series_id, category) rather than one-hot encoding
- Use residual connections to train deeper networks without vanishing gradients
- Validate on multiple random seeds (3-5) — deep learning TS has high variance
- Compare against simple baselines (ARIMA, Prophet) before deploying deep learning
- Monitor training curves: loss should decrease smoothly, not oscillate
- Use mixed precision (amp) for 2x training speedup on compatible GPUs
