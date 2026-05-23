# Vision Models

## Model Comparison

| Model | Vision Capability | Context | Best For | Cost/Image |
|-------|------------------|---------|----------|-----------|
| GPT-4o | Full (image + video frames) | 128K | General vision, OCR, diagrams | ~$0.003 |
| Claude Opus 4 | Image understanding | 200K | Document analysis, charts | ~$0.005 |
| Gemini Ultra 2 | Image + video + audio | 1M | Long video, multimodal search | ~$0.004 |
| Llama-3.2-11B-Vision | Image | 128K | Self-hosted vision tasks | ~$0.0001 |
| Qwen-VL-Plus | Image | 32K | Chinese content, OCR | ~$0.002 |

## Image Preprocessing

### Compression for Cost Optimization
```python
from PIL import Image
import io

def compress_image(image_path, max_size=1024, quality=85):
    img = Image.open(image_path)
    
    # Resize if too large
    if max(img.size) > max_size:
        ratio = max_size / max(img.size)
        new_size = (int(img.width * ratio), int(img.height * ratio))
        img = img.resize(new_size, Image.LANCZOS)
    
    # Compress
    buffer = io.BytesIO()
    img.save(buffer, format="JPEG", quality=quality, optimize=True)
    
    return buffer.getvalue()
```

### Cost Impact
```
Before (raw 4K photo): 4000x3000, ~6MB → $0.01+
After (resized 1024px): 1024x768, ~200KB → $0.002
Savings: 5x cost reduction
```

## Use Cases

### Document OCR
- Extract text from scanned documents
- Table extraction and structure preservation
- Handwriting recognition (limited)
- Form field detection

### Image Analysis
- Object detection and counting
- Scene description and classification
- Logo and brand recognition
- Quality inspection (manufacturing)

### Chart & Diagram Understanding
- Data extraction from charts (bar, line, pie)
- Flowchart interpretation
- Architecture diagram analysis
- Graph and plot reading

## Token Accounting

### Image Token Formula
```
GPT-4o: tokens = (width / 512) × (height / 512) × 170 + 85
Example: 1024×768 image
  = (1024/512) × (768/512) × 170 + 85
  = 2 × 1.5 × 170 + 85
  = 595 tokens
```

### Cost Per Image by Model
| Model | Small (512px) | Medium (1024px) | Large (2048px) |
|-------|--------------|----------------|----------------|
| GPT-4o | ~$0.001 | ~$0.003 | ~$0.008 |
| Claude Opus 4 | ~$0.002 | ~$0.005 | ~$0.015 |
| Gemini Ultra 2 | ~$0.001 | ~$0.004 | ~$0.010 |

## Vision Quality Benchmarks

### MMMU (Massive Multi-discipline Multimodal Understanding)
| Model | Score |
|-------|-------|
| GPT-4o | 69.1 |
| Gemini Ultra 2 | 68.5 |
| Claude Opus 4 | 67.8 |
| Llama-3.2-90B-Vision | 60.3 |

### ChartQA
| Model | Score |
|-------|-------|
| GPT-4o | 85.7 |
| Claude Opus 4 | 84.2 |
| Gemini Ultra 2 | 83.1 |

## Video Processing

### Frame Sampling Strategies
```
Uniform: Every Nth frame. Simple, may miss key moments.
Scene-based: Detect scene changes, sample each scene.
Keyframe: Use video keyframes (I-frames). Efficient.
Query-aware: Sample based on relevance to query.
```

### Cost Calculation
```
Video cost = frames_sampled × cost_per_image
Example: 60s video at 1fps = 60 frames
  GPT-4o: 60 × $0.003 = $0.18
  Claude: 60 × $0.005 = $0.30
```

## Best Practices

- Preprocess images before sending (resize, compress)
- Use image descriptions for caching and retrieval
- Combine vision + text in structured prompts
- Extract text via OCR first, then analyze
- Use lower resolution for classification tasks
- Batch independent image analyses in parallel
