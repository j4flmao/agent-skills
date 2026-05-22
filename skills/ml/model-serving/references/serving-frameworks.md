# Serving Frameworks Comparison

## TorchServe

```python
# Model archive creation
# model-config.yaml
model:
  model_name: resnet50
  handler: image_classifier
  model_file: model.pt
  extra_files:
    - index_to_name.json

# Create .mar file
torch-model-archiver \
  --model-name resnet50 \
  --version 1.0 \
  --model-file model.py \
  --serialized-file resnet50.pt \
  --handler image_classifier.py \
  --extra-files index_to_name.json \
  --export-path model_store/

# Serve
torchserve --start --model-store model_store/ --models resnet50=resnet50.mar

# Inference API
# POST http://localhost:8080/predictions/resnet50
# Body: image bytes
```

### Custom Handler

```python
# custom_handler.py
from torchserve import BaseHandler
import torch
import torch.nn.functional as F

class CustomHandler(BaseHandler):
    def __init__(self):
        super().__init__()
        self.initialized = False

    def initialize(self, context):
        self.manifest = context.manifest
        properties = context.system_properties
        model_path = properties.get("model_dir")
        self.model = torch.jit.load(f"{model_path}/model.pt")
        self.model.eval()
        self.initialized = True

    def preprocess(self, data):
        images = []
        for row in data:
            image = row.get("data") or row.get("body")
            image = torch.tensor(image).float()
            images.append(image)
        return torch.stack(images)

    def inference(self, data):
        with torch.no_grad():
            results = self.model(data)
        return F.softmax(results, dim=1)

    def postprocess(self, data):
        return [{"prediction": d.tolist()} for d in data]
```

## BentoML

```python
# model.py
import bentoml
import numpy as np
from bentoml.io import JSON, NumpyNdarray
from sklearn.ensemble import GradientBoostingClassifier

# Train and save
model = GradientBoostingClassifier()
model.fit(X_train, y_train)
bentoml.sklearn.save_model("fraud_detector", model)

# Service definition
@bentoml.service(
    resources={"cpu": "2"},
    traffic={"timeout": 10, "max_concurrency": 100},
)
class FraudDetector:
    def __init__(self):
        self.model = bentoml.sklearn.load_model("fraud_detector:latest")

    @bentoml.api(input=NumpyNdarray(), output=JSON())
    def predict(self, input_data: np.ndarray) -> dict:
        predictions = self.model.predict(input_data)
        probabilities = self.model.predict_proba(input_data)
        return {
            "predictions": predictions.tolist(),
            "probabilities": probabilities.tolist(),
        }

    @bentoml.api(input=JSON(), output=JSON())
    def explain(self, input_data: dict) -> dict:
        import shap
        explainer = shap.TreeExplainer(self.model)
        shap_values = explainer.shap_values(np.array([input_data["features"]]))
        return {"shap_values": shap_values.tolist()}

# Serve
bentoml serve fraud_detector:latest

# Build container
bentoml containerize fraud_detector:latest -t fraud-detector:latest
```

## Ray Serve

```python
from ray import serve
import ray
import torch
from starlette.requests import Request

@serve.deployment(
    ray_actor_options={"num_gpus": 1},
    autoscaling_config={
        "min_replicas": 2,
        "max_replicas": 10,
        "target_num_ongoing_requests_per_replica": 5,
    },
)
class TransformerModel:
    def __init__(self, model_id: str):
        from transformers import pipeline
        self.pipeline = pipeline("text-classification", model=model_id)

    async def __call__(self, request: Request) -> dict:
        data = await request.json()
        results = self.pipeline(data["text"])
        return {"results": results}

# Model composition
@serve.deployment
class EnsembleRouter:
    def __init__(self):
        self.model_a = TransformerModel.get_handle("model-a")
        self.model_b = TransformerModel.get_handle("model-b")

    async def __call__(self, request: Request) -> dict:
        data = await request.json()
        result_a = await self.model_a.remote(data)
        result_b = await self.model_b.remote(data)
        return {"ensemble": self._fuse(result_a, result_b)}

    def _fuse(self, a, b):
        return a if a["score"] > b["score"] else b

# Deploy
serve.run(TransformerModel.bind("facebook/opt-350m"))
```

## Optimization Techniques

### Dynamic Batching

```python
# TorchServe config.properties
batch_size=32
max_batch_delay=100
batch_size=auto

# BentoML batching
@bentoml.service(batching={"max_batch_size": 32, "max_latency_ms": 50})
class BatchedModel:
    @bentoml.api(batchable=True)
    def predict(self, inputs: np.ndarray) -> np.ndarray:
        return self.model(inputs)
```

### Quantization

```python
# PyTorch quantization
import torch

# Dynamic quantization (best for LLMs)
model_q = torch.quantization.quantize_dynamic(
    model, {torch.nn.Linear}, dtype=torch.qint8
)

# FP16 inference
model_half = model.half()

# INT8 with calibration
model_static_q = torch.quantization.quantize_fx(
    model,
    prepare_custom_config={
        "float_to_observed": {torch.nn.Linear},
    },
)
```

## Framework Comparison

| Feature | TorchServe | BentoML | Ray Serve |
|---|---|---|---|
| Framework support | PyTorch | Any (Python) | Any (Python) |
| REST API | Built-in | OpenAPI | FastAPI |
| gRPC | Yes | No | No |
| Batching | Built-in | Built-in | Custom |
| GPU support | Native | Native | Native |
| Model archive | .mar | .bento | N/A |
| Autoscaling | K8s HPA | K8s HPA | Built-in |
| Distributed | No | No | Yes |
| Best for | PyTorch models | Python ML | Complex pipelines |
