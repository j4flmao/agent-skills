# Multimodal Deployment

## Overview
Deploying multimodal models (VLMs, audio models, multimodal embedding models) presents unique challenges: large model sizes, high memory requirements, multiple modalities with different preprocessing, and latency constraints.

## Model Optimization

### Quantization
```python
from transformers import BitsAndBytesConfig
import torch

def load_quantized_vlm(model_id: str, quantization: str = "4bit"):
    bnb_config = BitsAndBytesConfig(
        load_in_4bit=(quantization == "4bit"),
        load_in_8bit=(quantization == "8bit"),
        bnb_4bit_compute_dtype=torch.float16,
        bnb_4bit_use_double_quant=True,
        bnb_4bit_quant_type="nf4",
    )

    model = AutoModelForVision2Seq.from_pretrained(
        model_id,
        quantization_config=bnb_config,
        device_map="auto",
        torch_dtype=torch.float16,
    )
    return model

# Memory comparison
# FP16: ~14GB for 7B VLM
# INT8: ~7GB for 7B VLM
# INT4: ~4GB for 7B VLM
```

### Image Preprocessing Optimization
```python
class OptimizedImageProcessor:
    def __init__(self, processor, max_resolution: int = 1024):
        self.processor = processor
        self.max_res = max_resolution

    def preprocess(self, image, resize_shortest: bool = True):
        if resize_shortest:
            w, h = image.size
            scale = self.max_res / min(w, h)
            if scale < 1:
                new_w, new_h = int(w * scale), int(h * scale)
                image = image.resize((new_w, new_h), Image.LANCZOS)

        inputs = self.processor(images=image, return_tensors="pt")
        return inputs

    def batch_preprocess(self, images: list, max_batch: int = 8) -> list:
        batches = []
        for i in range(0, len(images), max_batch):
            batch = images[i:i + max_batch]
            processed = [self.preprocess(img) for img in batch]
            batches.append(self._pad_batch(processed))
        return batches
```

## Serving Architecture

### VLM Inference Server
```python
from fastapi import FastAPI, File, UploadFile, HTTPException
from pydantic import BaseModel
import io
from PIL import Image

app = FastAPI()

class VLMInference:
    def __init__(self, model_id: str, device: str = "cuda"):
        from transformers import LlavaNextProcessor, LlavaNextForConditionalGeneration
        self.processor = LlavaNextProcessor.from_pretrained(model_id)
        self.model = LlavaNextForConditionalGeneration.from_pretrained(
            model_id, torch_dtype=torch.float16, device_map="auto"
        )

    async def generate(self, image: Image.Image, prompt: str, max_tokens: int = 200):
        inputs = self.processor(text=prompt, images=image, return_tensors="pt").to(self.model.device)
        output = self.model.generate(**inputs, max_new_tokens=max_tokens, do_sample=False)
        return self.processor.decode(output[0], skip_special_tokens=True)

model = VLMInference("llava-hf/llava-v1.6-mistral-7b-hf")

class GenerateRequest(BaseModel):
    prompt: str
    max_tokens: int = 200
    temperature: float = 0.0

@app.post("/vlm/generate")
async def generate(file: UploadFile = File(...), request: GenerateRequest = None):
    contents = await file.read()
    image = Image.open(io.BytesIO(contents))

    start = time.monotonic()
    response = await model.generate(image, request.prompt, request.max_tokens)
    duration = time.monotonic() - start

    return {"response": response, "duration_ms": round(duration * 1000, 1)}
```

### Batching for Throughput
```python
class BatchVLMServer:
    def __init__(self, model, max_batch: int = 4, max_wait_ms: int = 100):
        self.model = model
        self.max_batch = max_batch
        self.max_wait = max_wait_ms / 1000
        self.queue = asyncio.Queue()
        self.processing = False

    async def submit(self, image: Image.Image, prompt: str) -> str:
        loop = asyncio.get_event_loop()
        future = loop.create_future()
        await self.queue.put({"image": image, "prompt": prompt, "future": future})

        if not self.processing:
            self.processing = True
            asyncio.create_task(self._process_batch())

        return await future

    async def _process_batch(self):
        while not self.queue.empty():
            batch = []
            deadline = time.monotonic() + self.max_wait

            while len(batch) < self.max_batch and time.monotonic() < deadline:
                try:
                    item = await asyncio.wait_for(self.queue.get(), timeout=0.01)
                    batch.append(item)
                except asyncio.TimeoutError:
                    break

            if batch:
                images = [b["image"] for b in batch]
                prompts = [b["prompt"] for b in batch]
                inputs = self.model.processor(text=prompts, images=images, return_tensors="pt", padding=True)
                outputs = self.model.model.generate(**inputs, max_new_tokens=200)
                for i, b in enumerate(batch):
                    result = self.model.processor.decode(outputs[i], skip_special_tokens=True)
                    b["future"].set_result(result)

        self.processing = False
```

## Caching Strategy

### Multimodal Cache
```python
class MultimodalCache:
    def __init__(self, cache_dir: str = "./vlm_cache", max_size_gb: int = 10):
        self.cache = diskcache.Cache(cache_dir, size_limit=max_size_gb * 1024**3)

    def _make_key(self, image: Image.Image, prompt: str) -> str:
        image_hash = hashlib.sha256(image.tobytes()).hexdigest()[:16]
        prompt_hash = hashlib.sha256(prompt.encode()).hexdigest()[:16]
        return f"vlm:{image_hash}:{prompt_hash}"

    def get(self, image: Image.Image, prompt: str) -> str | None:
        key = self._make_key(image, prompt)
        return self.cache.get(key)

    def set(self, image: Image.Image, prompt: str, response: str, expire: int = 86400):
        key = self._make_key(image, prompt)
        self.cache.set(key, response, expire=expire)
```

## Monitoring

```python
class MultimodalMonitor:
    def __init__(self):
        self.metrics = {
            "requests": Counter("multimodal_requests_total", ["model", "modality"]),
            "latency": Histogram("multimodal_latency_seconds", ["model", "modality"], buckets=[0.1, 0.5, 1, 2, 5, 10, 30]),
            "input_size": Histogram("multimodal_input_size_bytes", ["modality"]),
            "errors": Counter("multimodal_errors_total", ["model", "error_type"]),
        }

    def record_request(self, model: str, modality: str, duration: float, input_size: int, success: bool):
        self.metrics["requests"].labels(model=model, modality=modality).inc()
        self.metrics["latency"].labels(model=model, modality=modality).observe(duration)
        self.metrics["input_size"].labels(modality=modality).observe(input_size)
        if not success:
            self.metrics["errors"].labels(model=model, error_type="inference").inc()
```

## Key Points
- Quantize VLMs to INT4/INT8 for memory-constrained deployment
- Optimize image preprocessing (resize, normalize) for throughput
- Batch VLM inference requests for GPU utilization
- Cache identical image+prompt combinations
- Monitor per-modality latency (image, audio, text processing)
- Use separate endpoints for different modalities
- Set max image resolution to prevent OOM
- Implement request queuing with priority for interactive vs batch
- Graceful degradation: text-only fallback when image processing fails
- Profile GPU memory: VLM 7B ~14GB FP16, ~4GB INT4
