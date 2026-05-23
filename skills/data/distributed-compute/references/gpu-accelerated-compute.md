# GPU-Accelerated Compute with RAPIDS

## RAPIDS Suite Overview

### Core Libraries
| Library | Purpose | API |
|---------|---------|-----|
| **cuDF** | GPU DataFrame | pandas-like (`import cudf`) |
| **cuML** | Machine Learning | scikit-learn-like (`import cuml`) |
| **cuGraph** | Graph Analytics | NetworkX-like (`import cugraph`) |
| **cuSpatial** | Spatial/GIS | GPU-accelerated geo processing |
| **cuXFilter** | Dashboard filtering | Interactive GPU filtering |

## cuDF Patterns

### DataFrame Operations
```python
import cudf
import pandas as pd

# Create GPU DataFrame
gdf = cudf.DataFrame({
    'order_id': range(10_000_000),
    'customer_id': cudf.Series(range(10_000_000)) % 100_000,
    'amount': cudf.Series(random.random() for _ in range(10_000_000)),
    'created_at': cudf.date_range('2024-01-01', periods=10_000_000, freq='s')
})

# Same pandas API, 10-50x faster
result = gdf.groupby('customer_id')['amount'].agg(['sum', 'mean', 'count'])
result = gdf[gdf['amount'] > 100].sort_values('created_at', ascending=False)

# Convert between GPU and CPU
pdf = gdf.to_pandas()   # GPU → CPU
gdf = cudf.from_pandas(pdf)  # CPU → GPU (zero-copy if Arrow-compatible)
```

### Read/Write with GPU
```python
# CSV (GPU-accelerated parsing)
gdf = cudf.read_csv('s3://bucket/orders.csv', dtype={'order_id': 'int64', 'amount': 'float64'})

# Parquet (GPU decompression)
gdf = cudf.read_parquet('s3://data-lake/silver/orders/*.parquet')

# Write GPU results back
gdf.to_parquet('s3://data-lake/gold/daily_agg.parquet')
gdf.to_csv('results.csv', index=False)
```

## Dask + cuDF (Multi-GPU Scaling)

```python
from dask_cuda import LocalCUDACluster
from dask.distributed import Client
import dask_cudf

# Start multi-GPU cluster (1 worker per GPU)
cluster = LocalCUDACluster(
    n_workers=4,  # 4 GPUs
    device_memory_limit='16GB',
    local_directory='/tmp/cache'
)
client = Client(cluster)

# Read partitioned data across GPUs
ddf = dask_cudf.read_csv('s3://bucket/orders_*.csv')

# Distributed GPU operations
result = ddf.groupby('customer_id').amount.mean().compute()
```

## cuML (GPU Machine Learning)

```python
from cuml.ensemble import RandomForestRegressor
from cuml.model_selection import train_test_split
from cuml.metrics import mean_squared_error

# GPU-accelerated training
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2)
model = RandomForestRegressor(n_estimators=500, max_depth=16)
model.fit(X_train, y_train)
predictions = model.predict(X_test)
mse = mean_squared_error(y_test, predictions)

# cuML + XGBoost GPU
import xgboost as xgb
dtrain = xgb.DMatrix(cudf.DataFrame(X_train).to_pandas(), label=y_train.to_pandas())
params = {'tree_method': 'gpu_hist', 'predictor': 'gpu_predictor'}
model = xgb.train(params, dtrain, num_boost_round=1000)
```

## Memory Management

```python
import rmm
import cudf

# Initialize RAPIDS Memory Manager (pool allocation)
rmm.reinitialize(
    pool_allocator=True,      # Use memory pool (faster, reduces fragmentation)
    initial_pool_size=None,   # Use all available GPU memory
    enable_logging=True       # Track allocations
)

# Check GPU memory usage
import pynvml
pynvml.nvmlInit()
handle = pynvml.nvmlDeviceGetHandleByIndex(0)
info = pynvml.nvmlDeviceGetMemoryInfo(handle)
print(f"Free: {info.free / 1024**3:.1f} GB, Total: {info.total / 1024**3:.1f} GB")
```

## Performance Tips
- **File format**: Parquet with GPU-compatible compression (snappy, zstd) — avoid gzip
- **Data types**: use int32/float32 where possible (double precision halves throughput)
- **String operations**: cuDF strings are slower than numeric — minimize string ops on GPU
- **Data transfer**: minimize `.to_pandas()` calls; batch transfers via Arrow
- **Spilling**: set `spill_on_demand=True` when dataset exceeds GPU memory
- **Work multiple GPUs**: use NCCL for inter-GPU communication (faster than UCX)
