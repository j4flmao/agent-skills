# Time Series Feature Engineering

## Date/Time Features

```python
import pandas as pd
import numpy as np

def create_datetime_features(df: pd.DataFrame, date_col: str = 'date') -> pd.DataFrame:
    """Create features from datetime column."""
    result = df.copy()
    dates = pd.to_datetime(result[date_col])

    result['year'] = dates.dt.year
    result['month'] = dates.dt.month
    result['week'] = dates.dt.isocalendar().week.astype(int)
    result['day'] = dates.dt.day
    result['dayofweek'] = dates.dt.dayofweek
    result['dayofyear'] = dates.dt.dayofyear
    result['quarter'] = dates.dt.quarter
    result['is_weekend'] = dates.dt.dayofweek.isin([5, 6]).astype(int)
    result['is_month_start'] = dates.dt.is_month_start.astype(int)
    result['is_month_end'] = dates.dt.is_month_end.astype(int)
    result['is_quarter_start'] = dates.dt.is_quarter_start.astype(int)
    result['is_quarter_end'] = dates.dt.is_quarter_end.astype(int)
    result['is_year_start'] = dates.dt.is_year_start.astype(int)
    result['is_year_end'] = dates.dt.is_year_end.astype(int)
    result['day_sin'] = np.sin(2 * np.pi * dates.dt.dayofyear / 365)
    result['day_cos'] = np.cos(2 * np.pi * dates.dt.dayofyear / 365)
    result['month_sin'] = np.sin(2 * np.pi * dates.dt.month / 12)
    result['month_cos'] = np.cos(2 * np.pi * dates.dt.month / 12)

    return result
```

## Lag Features

```python
def create_lag_features(
    df: pd.DataFrame,
    target_col: str,
    lags: List[int] = [1, 2, 3, 7, 14, 28],
    group_col: str = None,
) -> pd.DataFrame:
    """Create lag features for time series."""
    result = df.copy()

    for lag in lags:
        if group_col:
            result[f'lag_{lag}'] = result.groupby(group_col)[target_col].shift(lag)
        else:
            result[f'lag_{lag}'] = result[target_col].shift(lag)

    return result

def create_rolling_features(
    df: pd.DataFrame,
    target_col: str,
    windows: List[int] = [3, 7, 14, 30],
    group_col: str = None,
) -> pd.DataFrame:
    """Create rolling window features."""
    result = df.copy()

    for window in windows:
        if group_col:
            grouped = result.groupby(group_col)[target_col]
        else:
            grouped = result[target_col]

        result[f'rolling_mean_{window}'] = grouped.shift().rolling(window).mean()
        result[f'rolling_std_{window}'] = grouped.shift().rolling(window).std()
        result[f'rolling_min_{window}'] = grouped.shift().rolling(window).min()
        result[f'rolling_max_{window}'] = grouped.shift().rolling(window).max()

        result[f'rolling_range_{window}'] = (
            result[f'rolling_max_{window}'] - result[f'rolling_min_{window}']
        )

    return result

def create_expanding_features(
    df: pd.DataFrame,
    target_col: str,
    group_col: str = None,
) -> pd.DataFrame:
    """Create expanding window features."""
    result = df.copy()

    if group_col:
        grouped = result.groupby(group_col)[target_col]
    else:
        grouped = result[target_col]

    shifted = grouped.shift()
    result['expanding_mean'] = shifted.expanding().mean()
    result['expanding_std'] = shifted.expanding().std()
    result['expanding_min'] = shifted.expanding().min()
    result['expanding_max'] = shifted.expanding().max()

    return result
```

## Seasonal Features

```python
def create_seasonal_features(
    df: pd.DataFrame,
    target_col: str,
    seasonal_period: int = 7,
    group_col: str = None,
) -> pd.DataFrame:
    """Create seasonal difference features."""
    result = df.copy()

    if group_col:
        result[f'seasonal_diff_{seasonal_period}'] = (
            result.groupby(group_col)[target_col].diff(seasonal_period)
        )
    else:
        result[f'seasonal_diff_{seasonal_period}'] = result[target_col].diff(seasonal_period)

    return result

def add_holiday_features(df: pd.DataFrame, date_col: str = 'date') -> pd.DataFrame:
    """Add holiday indicators."""
    result = df.copy()

    from pandas.tseries.holiday import USFederalHolidayCalendar
    cal = USFederalHolidayCalendar()
    holidays = cal.holidays(start=result[date_col].min(), end=result[date_col].max())

    result['is_holiday'] = result[date_col].isin(holidays).astype(int)

    for offset in [-3, -2, -1, 1, 2, 3]:
        shifted_holidays = holidays + pd.Timedelta(days=offset)
        result[f'holiday_offset_{offset}'] = result[date_col].isin(shifted_holidays).astype(int)

    return result
```

## Statistical Features

```python
def create_statistical_features(
    df: pd.DataFrame,
    target_col: str,
    window: int = 14,
) -> pd.DataFrame:
    """Create statistical aggregate features."""
    result = df.copy()
    shifted = result[target_col].shift()

    result['rolling_skew'] = shifted.rolling(window).skew()
    result['rolling_kurt'] = shifted.rolling(window).kurt()
    result['rolling_median'] = shifted.rolling(window).median()
    result['rolling_q25'] = shifted.rolling(window).quantile(0.25)
    result['rolling_q75'] = shifted.rolling(window).quantile(0.75)
    result['rolling_iqr'] = result['rolling_q75'] - result['rolling_q25']
    result['rolling_cv'] = result['rolling_std'] / result['rolling_mean'].clip(lower=1e-10)
    result['pct_change'] = result[target_col].pct_change()
    result['log_return'] = np.log1p(result['pct_change'].clip(lower=-1))

    return result
```

## Key Points

- Create cyclical encoding for time features (sin/cos)
- Use lag features for autoregressive patterns
- Use rolling windows for recent trend features
- Use expanding windows for cumulative statistics
- Add seasonal differences for periodic patterns
- Include holiday effects with offsets
- Create interaction features between time and other variables
- Use discrete Fourier transforms for seasonality
- Add domain-specific calendar events
- Handle NaN values from lag/rolling operations
- Use feature selection to avoid multicollinearity
- Validate feature importance with model-based methods
