# Vision-Language Models

## Model Comparison

| Model | Vision Encoder | LLM | Resolution | Open Source | Best For |
|---|---|---|---|---|---|
| CLIP ViT-L/14 | ViT-L/14 | N/A (embeddings) | 224px | Yes | Zero-shot classification, multimodal search |
| LLaVA-1.6 | CLIP ViT-L | Mistral-7B / Yi-34B | 336px | Yes | VQA, captioning, reasoning |
| BLIP-3 (Florence-2) | DaViT | 2.6B params | 224-448px | Yes | Captioning, fine-grained understanding |
| Qwen-VL | ViT-bigG | Qwen-7B / Qwen-14B | 448px | Yes | Multilingual VQA |
| GPT-4V | Unknown | GPT-4 | Variable | No | Best quality, complex reasoning |
| Claude 3.5 Sonnet | Unknown | Claude | Variable | No | Document understanding, charts |

## CLIP: Zero-Shot Classification

```python
from transformers import CLIPProcessor, CLIPModel
from PIL import Image

model = CLIPModel.from_pretrained("openai/clip-vit-large-patch14")
processor = CLIPProcessor.from_pretrained("openai/clip-vit-large-patch14")

image = Image.open("cat.jpg")
labels = ["a photo of a cat", "a photo of a dog", "a photo of a bird"]

inputs = processor(text=labels, images=image, return_tensors="pt", padding=True)
outputs = model(**inputs)
logits_per_image = outputs.logits_per_image
probs = logits_per_image.softmax(dim=1)

# Highest probability label
predicted_idx = probs.argmax().item()
print(f"Predicted: {labels[predicted_idx]} ({probs[0][predicted_idx]:.2%})")
```

## LLaVA: Visual QA

```python
from transformers import LlavaNextProcessor, LlavaNextForConditionalGeneration
from PIL import Image

processor = LlavaNextProcessor.from_pretrained("llava-hf/llava-v1.6-mistral-7b-hf")
model = LlavaNextForConditionalGeneration.from_pretrained(
    "llava-hf/llava-v1.6-mistral-7b-hf",
    torch_dtype="float16",
    device_map="auto",
)

image = Image.open("chart.png")

# Single VQA
prompt = "[INST] <image>\nWhat is the trend shown in this chart? [/INST]"
inputs = processor(text=prompt, images=image, return_tensors="pt").to("cuda")
output = model.generate(**inputs, max_new_tokens=200)
response = processor.decode(output[0], skip_special_tokens=True)
print(response)

# Multi-turn conversation
conversation = [
    {"role": "user", "content": [
        {"type": "image"},
        {"type": "text", "text": "Describe this image in detail."}
    ]},
]
prompt = processor.apply_chat_template(conversation, add_generation_prompt=True)
inputs = processor(images=image, text=prompt, return_tensors="pt").to("cuda")
```

## BLIP-3 / Florence-2

```python
# Florence-2 for fine-grained understanding
from transformers import AutoProcessor, AutoModelForCausalLM

model = AutoModelForCausalLM.from_pretrained(
    "microsoft/Florence-2-large",
    trust_remote_code=True,
)
processor = AutoProcessor.from_pretrained(
    "microsoft/Florence-2-large",
    trust_remote_code=True,
)

image = Image.open("receipt.jpg")

# Task-specific prompts
tasks = {
    "caption": "<CAPTION>",
    "detailed_caption": "<DETAILED_CAPTION>",
    "ocr": "<OCR>",
    "object_detection": "<OD>",
    "region_proposal": "<REGION_PROPOSAL>",
}

for task, prompt in tasks.items():
    inputs = processor(text=prompt, images=image, return_tensors="pt")
    output = model.generate(**inputs, max_new_tokens=100)
    result = processor.decode(output[0], skip_special_tokens=True)
    print(f"{task}: {result}")
```

## Qwen-VL (Multilingual)

```python
from transformers import Qwen2VLForConditionalGeneration, AutoProcessor

model = Qwen2VLForConditionalGeneration.from_pretrained(
    "Qwen/Qwen2-VL-7B-Instruct",
    torch_dtype="float16",
    device_map="auto",
)
processor = AutoProcessor.from_pretrained("Qwen/Qwen2-VL-7B-Instruct")

image = Image.open("diagram.png")
messages = [
    {
        "role": "user",
        "content": [
            {"type": "image", "image": image},
            {"type": "text", "text": "Explain this diagram in Chinese."},
        ],
    },
]
prompt = processor.apply_chat_template(messages, tokenize=False, add_generation_prompt=True)
inputs = processor(text=prompt, images=[image], return_tensors="pt").to("cuda")
output = model.generate(**inputs, max_new_tokens=256)
response = processor.decode(output[0], skip_special_tokens=True)
```

## Prompting VLMs

```python
# Best practices for VLM prompts

# 1. Be explicit about image content
prompt = "Describe only the person in the foreground, ignoring the background."

# 2. Specify output format for VQA
prompt = "Answer yes or no: Is there a traffic light in this image?"

# 3. Multi-image comparison
from transformers import CLIPProcessor, CLIPModel

model = CLIPModel.from_pretrained("openai/clip-vit-large-patch14")
processor = CLIPProcessor.from_pretrained("openai/clip-vit-large-patch14")

image1 = Image.open("photo1.jpg")
image2 = Image.open("photo2.jpg")
text = "Which image shows a beach?"

inputs = processor(text=text, images=[image1, image2], return_tensors="pt", padding=True)
outputs = model(**inputs)
probs = outputs.logits_per_text.softmax(dim=1)
beach_idx = probs.argmax().item()
print(f"Image {beach_idx + 1} shows a beach (confidence: {probs[0][beach_idx]:.2%})")
```

## Use Case Selection

| Use Case | Recommended Model | Why |
|---|---|---|
| Image search | CLIP ViT-L/14 | Shared embedding space, fast retrieval |
| General captioning | LLaVA-1.6 | Best open-source quality |
| OCR / document | Florence-2 | Specialized for text understanding |
| Multilingual VQA | Qwen-VL | Strong non-English performance |
| Complex reasoning | GPT-4V | Best overall, supports multiple images |
| Zero-shot classification | CLIP | No training needed, label any categories |
