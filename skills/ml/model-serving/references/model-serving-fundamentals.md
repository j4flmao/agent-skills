# Model Serving Fundamentals

How trained models become predictions in production: serving patterns, API contracts, latency budgets, keeping preprocessing consistent between training and serving, packaging, health checks, scaling basics and monitoring. Framework comparisons are in `serving-frameworks.md`; Kubernetes deployment in `k8s-serving.md`.

## Serving Patterns

| Pattern | Latency | Example | Infrastructure |
|---------|---------|---------|----------------|
| Batch (offline) | Minutes–hours | Nightly churn scores written to a table | Spark/warehouse jobs, orchestrator |
| Online (request/response) | Milliseconds–seconds | Fraud score at checkout | HTTP/gRPC model server, autoscaling |
| Streaming | Seconds | Anomaly detection on event streams | Kafka/Flink consumers with embedded model |
| Edge / on-device | Milliseconds, offline | Mobile image classification | Core ML, TensorFlow Lite / LiteRT, ONNX Runtime Mobile |
| Async online | Seconds–minutes | Document processing, long LLM jobs | Queue + workers + callback/polling |

Prefer batch when predictions can be precomputed: it is cheaper, simpler and easier to monitor than online serving.

## API Contract

```json
POST /v1/models/churn-classifier:predict
{
  "instances": [
    { "customer_id": "c-123", "tenure_months": 18, "plan": "pro", "monthly_spend": 42.5 }
  ]
}

200 OK
{
  "model": "churn-classifier",
  "model_version": "14",
  "predictions": [ { "customer_id": "c-123", "churn_probability": 0.27 } ]
}
```

Rules:
- Validate inputs against a schema (types, ranges, required fields) and return 400/422 with field errors.
- Return the model version with every response for debugging and audits.
- Support batched instances to amortize overhead.
- Keep the contract stable across model versions; evolve with optional fields.
- Standard protocols (KServe Open Inference Protocol V2, also used by Triton) ease switching servers.

## Latency Budget

```text
client SLA: p99 ≤ 150 ms
  network + gateway            20 ms
  feature retrieval            40 ms   (online feature store / cache)
  preprocessing                10 ms
  model inference              50 ms
  postprocessing + logging     10 ms
  headroom                     20 ms
```

Measure each stage; optimize the largest. Feature retrieval is often slower than inference.

## Training/Serving Consistency

Training-serving skew (different feature computation offline vs online) silently degrades accuracy.

- Package preprocessing with the model (scikit-learn `Pipeline`, `torch` module including normalization, saved tokenizer).
- Use a feature store or shared feature code for both paths.
- Log served features and compare their distributions to training data.

```python
from sklearn.pipeline import Pipeline
from sklearn.compose import ColumnTransformer
from sklearn.preprocessing import OneHotEncoder, StandardScaler
from sklearn.linear_model import LogisticRegression

model = Pipeline([
    ("prep", ColumnTransformer([
        ("num", StandardScaler(), ["tenure_months", "monthly_spend"]),
        ("cat", OneHotEncoder(handle_unknown="ignore"), ["plan"]),
    ])),
    ("clf", LogisticRegression(max_iter=1000)),
])
```

`handle_unknown="ignore"` avoids crashes on categories unseen in training; monitor how often it happens.

## Packaging

| Format | Use |
|--------|-----|
| MLflow model (`pyfunc`) | Framework-agnostic packaging with signature and environment |
| ONNX | Portable inference across runtimes (ONNX Runtime, Triton) |
| TorchScript / `torch.export` | PyTorch deployment without Python model code |
| SavedModel | TensorFlow Serving |
| Container image | Model + server + dependencies, immutable and versioned |

Pin library versions to those used in training; pickled models can break or behave differently across versions, and loading pickles executes code, so only load from trusted sources.

## Minimal Online Server (classical model)

```python
from contextlib import asynccontextmanager
import logging
import mlflow
import pandas as pd
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

log = logging.getLogger("serving")
MODEL_URI = "models:/churn-classifier@champion"
state: dict = {}


class Instance(BaseModel):
    customer_id: str
    tenure_months: int = Field(ge=0, le=600)
    plan: str
    monthly_spend: float = Field(ge=0)


class PredictRequest(BaseModel):
    instances: list[Instance] = Field(min_length=1, max_length=256)


@asynccontextmanager
async def lifespan(app: FastAPI):
    version = mlflow.MlflowClient().get_model_version_by_alias("churn-classifier", "champion")
    state["model"] = mlflow.pyfunc.load_model(f"models:/churn-classifier/{version.version}")  # pin the resolved version
    state["version"] = version.version
    yield


app = FastAPI(lifespan=lifespan)


@app.get("/healthz/ready")
def ready() -> dict:
    if "model" not in state:
        raise HTTPException(status_code=503, detail="model not loaded")
    return {"status": "ready"}


@app.post("/v1/models/churn-classifier:predict")
def predict(req: PredictRequest) -> dict:
    df = pd.DataFrame([i.model_dump() for i in req.instances])
    try:
        scores = state["model"].predict(df.drop(columns=["customer_id"]))
    except Exception as err:
        log.exception("prediction failed for %d instances, model run %s", len(df), state["version"])
        raise HTTPException(status_code=500, detail="prediction failed") from err
    return {
        "model": "churn-classifier",
        "model_version": state["version"],
        "predictions": [{"customer_id": c, "churn_probability": float(s)} for c, s in zip(df["customer_id"], scores)],
    }
```

This is suitable for small CPU models. For LLMs and GPU-heavy models use a dedicated serving engine (vLLM, SGLang, TensorRT-LLM, TGI, Triton) rather than wrapping a framework's generate call in a web app (see advanced reference).

## Health, Readiness and Startup

- **Startup**: model load can take long; use a startup probe so the orchestrator does not kill the pod while loading.
- **Readiness**: true only when the model is loaded (and warmed up with a dummy request if the first call is slow).
- **Liveness**: process responsive; do not run inference in liveness checks.

## Scaling Basics

- Stateless replicas behind a load balancer; scale on concurrency/queue length or latency rather than CPU alone for GPU models.
- Set request timeouts and payload size limits.
- CPU inference: tune thread counts (`OMP_NUM_THREADS`, framework intra-op threads) per replica to avoid oversubscription.

## Monitoring

| Signal | Example |
|--------|---------|
| Service | Request rate, error rate, p50/p95/p99 latency, saturation |
| Model inputs | Missing values, out-of-range rates, feature distributions vs training |
| Model outputs | Score distribution, class balance, confidence |
| Quality (delayed labels) | Accuracy/AUC once ground truth arrives |
| Business | Conversion, fraud losses tied to model decisions |

Log request IDs, model version, inputs (subject to privacy rules) and outputs to enable later evaluation.

## Checklist

- [ ] Serving pattern matches latency needs (batch where possible)
- [ ] Validated, versioned API contract returning model version
- [ ] Preprocessing packaged with the model; skew monitored
- [ ] Startup/readiness probes; warm-up
- [ ] Latency budget measured per stage
- [ ] Service, data and model-quality monitoring in place
