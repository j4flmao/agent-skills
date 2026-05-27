# Time Series Forecasting

## ARIMA Models

```python
import pandas as pd
import numpy as np
from statsmodels.tsa.arima.model import ARIMA
from statsmodels.tsa.stattools import adfuller, acf, pacf
from statsmodels.graphics.tsaplots import plot_acf, plot_pacf

def check_stationarity(series: pd.Series, alpha: float = 0.05) -> dict:
    """Check stationarity using ADF test."""
    result = adfuller(series.dropna())

    return {
        'statistic': result[0],
        'p_value': result[1],
        'critical_values': result[4],
        'is_stationary': result[1] < alpha,
    }

def determine_arima_order(series: pd.Series, max_lag: int = 20) -> tuple:
    """Determine ARIMA order using ACF and PACF plots."""
    d = 0
    stationary_check = check_stationarity(series)

    if not stationary_check['is_stationary']:
        series_diff = series.diff().dropna()
        d = 1
    else:
        series_diff = series

    acf_values = acf(series_diff, nlags=max_lag)
    pacf_values = pacf(series_diff, nlags=max_lag)

    p = sum(1 for i in range(1, len(pacf_values))
            if abs(pacf_values[i]) > 1.96 / np.sqrt(len(series_diff)))
    q = sum(1 for i in range(1, len(acf_values))
            if abs(acf_values[i]) > 1.96 / np.sqrt(len(series_diff)))

    return p, d, q

def fit_arima(series: pd.Series, order: tuple = None) -> ARIMA:
    """Fit ARIMA model to time series."""
    if order is None:
        order = determine_arima_order(series)

    model = ARIMA(series, order=order)
    fitted = model.fit()

    print(f"ARIMA{order} - AIC: {fitted.aic:.2f}, BIC: {fitted.bic:.2f}")
    return fitted

def forecast_arima(model: ARIMA, steps: int = 10) -> pd.Series:
    """Generate forecasts from fitted ARIMA model."""
    forecast = model.forecast(steps=steps)
    conf_int = model.get_forecast(steps=steps).conf_int()

    return pd.DataFrame({
        'forecast': forecast,
        'lower_ci': conf_int.iloc[:, 0],
        'upper_ci': conf_int.iloc[:, 1],
    })
```

## Prophet Forecasting

```python
from prophet import Prophet
import pandas as pd

def fit_prophet(
    df: pd.DataFrame,
    date_col: str = 'ds',
    value_col: str = 'y',
    yearly_seasonality: bool = True,
    weekly_seasonality: bool = True,
    daily_seasonality: bool = False,
    changepoint_prior_scale: float = 0.05,
    seasonality_prior_scale: float = 10.0,
    holidays: pd.DataFrame = None,
) -> Prophet:
    """Fit Prophet forecasting model."""
    prophet_df = df.rename(columns={date_col: 'ds', value_col: 'y'})

    model = Prophet(
        yearly_seasonality=yearly_seasonality,
        weekly_seasonality=weekly_seasonality,
        daily_seasonality=daily_seasonality,
        changepoint_prior_scale=changepoint_prior_scale,
        seasonality_prior_scale=seasonality_prior_scale,
        holidays=holidays,
    )

    model.add_country_holidays(country_name='US')
    model.fit(prophet_df)

    return model

def forecast_prophet(
    model: Prophet,
    periods: int = 30,
    include_history: bool = True,
) -> pd.DataFrame:
    """Generate forecast using Prophet."""
    future = model.make_future_dataframe(periods=periods)
    forecast = model.predict(future)

    return forecast

def decompose_prophet(forecast: pd.DataFrame) -> dict:
    """Extract seasonality components from Prophet forecast."""
    return {
        'trend': forecast[['ds', 'trend']].copy(),
        'yearly': forecast[['ds', 'yearly']].copy() if 'yearly' in forecast else None,
        'weekly': forecast[['ds', 'weekly']].copy() if 'weekly' in forecast else None,
        'holidays': forecast[['ds', 'holidays']].copy() if 'holidays' in forecast else None,
    }
```

## LSTM for Time Series

```python
import torch
import torch.nn as nn
import torch.optim as optim

class LSTMForecaster(nn.Module):
    """LSTM model for time series forecasting."""

    def __init__(self, input_size: int, hidden_size: int = 64, num_layers: int = 2, output_size: int = 1):
        super().__init__()
        self.lstm = nn.LSTM(
            input_size=input_size,
            hidden_size=hidden_size,
            num_layers=num_layers,
            batch_first=True,
            dropout=0.2,
        )
        self.fc = nn.Linear(hidden_size, output_size)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        lstm_out, _ = self.lstm(x)
        last_output = lstm_out[:, -1, :]
        return self.fc(last_output)

def create_sequences(data: np.ndarray, seq_length: int = 10) -> tuple:
    """Create sequences for LSTM training."""
    X, y = [], []
    for i in range(len(data) - seq_length):
        X.append(data[i:i + seq_length])
        y.append(data[i + seq_length])

    return np.array(X), np.array(y)

def train_lstm(
    model: LSTMForecaster,
    X_train: torch.Tensor,
    y_train: torch.Tensor,
    X_val: torch.Tensor,
    y_val: torch.Tensor,
    epochs: int = 50,
    lr: float = 0.001,
) -> LSTMForecaster:
    """Train LSTM forecaster."""
    optimizer = optim.Adam(model.parameters(), lr=lr)
    criterion = nn.MSELoss()

    for epoch in range(epochs):
        model.train()
        optimizer.zero_grad()
        predictions = model(X_train)
        loss = criterion(predictions, y_train)
        loss.backward()
        optimizer.step()

        model.eval()
        with torch.no_grad():
            val_pred = model(X_val)
            val_loss = criterion(val_pred, y_val)

        if (epoch + 1) % 10 == 0:
            print(f"Epoch {epoch + 1}: Train Loss = {loss.item():.6f}, "
                  f"Val Loss = {val_loss.item():.6f}")

    return model
```

## Key Points

- Check stationarity before applying ARIMA models
- Use ACF/PACF plots to determine ARIMA order
- Use Prophet for time series with strong seasonality
- Use LSTM for complex non-linear patterns
- Validate forecasts with walk-forward validation
- Plot residuals to check model assumptions
- Use cross-validation for time series (expanding window)
- Include external regressors for better accuracy
- Handle missing values with interpolation
- Detect and handle outliers before modeling
- Evaluate with MAE, RMSE, and MAPE
- Combine multiple models for ensemble forecasting
