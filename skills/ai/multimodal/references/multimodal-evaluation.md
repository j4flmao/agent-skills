# Multimodal Evaluation

## Overview
Evaluating multimodal models requires metrics that span vision, language, audio, and cross-modal capabilities. Unlike text-only models, multimodal evaluation must assess alignment between modalities, grounding, and modality-specific quality.

## Evaluation Dimensions

### Vision-Language Tasks
```
Task Categories:
1. Captioning: Generate text description of image
2. VQA: Answer questions about image content
3. Grounding: Locate objects mentioned in text
4. Reasoning: Multi-step reasoning combining visual and textual info
5. Comprehension: Understanding charts, diagrams, documents
6. Generation: Create images from text descriptions
```

### Standard Benchmarks
```python
VLM_BENCHMARKS = {
    "coco_captioning": {
        "type": "captioning",
        "metrics": ["CIDEr", "BLEU-4", "METEOR", "ROUGE-L", "SPICE"],
        "samples": 5000,
    },
    "vqav2": {
        "type": "vqa",
        "metrics": ["accuracy"],
        "samples": 10000,
    },
    "gqa": {
        "type": "vqa",
        "metrics": ["accuracy"],
        "description": "Compositional VQA",
    },
    "vizwiz": {
        "type": "vqa",
        "metrics": ["accuracy"],
        "description": "Blind user VQA",
    },
    "textcaps": {
        "type": "captioning",
        "metrics": ["CIDEr"],
        "description": "Text-based captioning",
    },
    "docvqa": {
        "type": "vqa",
        "metrics": ["ANLS"],
        "description": "Document VQA",
    },
}
```

### Evaluation Runner
```python
class MultimodalEvaluator:
    def __init__(self, model, processor, device: str = "cuda"):
        self.model = model
        self.processor = processor
        self.device = device

    def evaluate_captioning(self, dataset: list[dict]) -> dict:
        from pycocoevalcap.cider.cider import Cider
        from pycocoevalcap.bleu.bleu import Bleu
        from pycocoevalcap.meteor.meteor import Meteor
        from pycocoevalcap.rouge.rouge import Rouge

        hypotheses = {}
        references = {}

        for i, item in enumerate(dataset):
            image = self.load_image(item["image_path"])
            inputs = self.processor(text="Describe this image in detail.", images=image, return_tensors="pt").to(self.device)
            output = self.model.generate(**inputs, max_new_tokens=100)
            caption = self.processor.decode(output[0], skip_special_tokens=True)

            hypotheses[i] = [caption]
            references[i] = item["captions"]

        scorers = [
            (Bleu(4), ["Bleu_1", "Bleu_2", "Bleu_3", "Bleu_4"]),
            (Meteor(), "METEOR"),
            (Rouge(), "ROUGE_L"),
            (Cider(), "CIDEr"),
        ]

        results = {}
        for scorer, method in scorers:
            score, _ = scorer.compute_score(references, hypotheses)
            if isinstance(method, list):
                for m, s in zip(method, score):
                    results[m] = s
            else:
                results[method] = score

        return results

    def evaluate_vqa(self, dataset: list[dict]) -> dict:
        correct = 0
        total = 0
        per_category = defaultdict(lambda: {"correct": 0, "total": 0})

        for item in dataset:
            image = self.load_image(item["image_path"])
            question = item["question"]
            answer = item["answer"]

            inputs = self.processor(text=question, images=image, return_tensors="pt").to(self.device)
            output = self.model.generate(**inputs, max_new_tokens=20)
            prediction = self.processor.decode(output[0], skip_special_tokens=True)

            if self._match_answer(prediction, answer):
                correct += 1
                per_category[item.get("category", "general")]["correct"] += 1
            total += 1
            per_category[item.get("category", "general")]["total"] += 1

        results = {"overall_accuracy": correct / max(total, 1), "total": total}
        for cat, counts in per_category.items():
            results[f"{cat}_accuracy"] = counts["correct"] / max(counts["total"], 1)

        return results
```

## Audio Model Evaluation

### Speech Recognition
```python
class SpeechEvaluator:
    def __init__(self, model, processor):
        self.model = model
        self.processor = processor

    def evaluate_asr(self, dataset: list[dict]) -> dict:
        from jiwer import wer, cer

        total_wer = []
        total_cer = []

        for item in dataset:
            audio = self.load_audio(item["audio_path"])
            inputs = self.processor(audio, sampling_rate=16000, return_tensors="pt")
            output = self.model.generate(**inputs)
            transcription = self.processor.decode(output[0], skip_special_tokens=True)

            w = wer(item["transcript"], transcription)
            c = cer(item["transcript"], transcription)
            total_wer.append(w)
            total_cer.append(c)

        return {
            "WER": statistics.mean(total_wer),
            "CER": statistics.mean(total_cer),
            "samples": len(total_wer),
        }

    def evaluate_noise_robustness(self, dataset: list[dict], snr_levels: list[int]) -> dict:
        results = {}
        for snr in snr_levels:
            noisy_dataset = self.add_noise(dataset, snr)
            wer_score = self.evaluate_asr(noisy_dataset)["WER"]
            results[f"WER@SNR{snr}"] = wer_score
        return results
```

## Grounding Evaluation

### Referring Expression Comprehension
```python
class GroundingEvaluator:
    def evaluate_referring(self, dataset: list[dict]) -> dict:
        correct = 0
        total = 0
        iou_scores = []

        for item in dataset:
            image = self.load_image(item["image_path"])
            expression = item["expression"]
            gt_bbox = item["bbox"]

            inputs = self.processor(text=expression, images=image, return_tensors="pt").to(self.device)
            output = self.model.generate(**inputs, max_new_tokens=50)
            predicted_bbox = self._parse_bbox(output)

            iou = self._compute_iou(predicted_bbox, gt_bbox)
            iou_scores.append(iou)
            if iou > 0.5:
                correct += 1
            total += 1

        return {
            "accuracy@0.5": correct / max(total, 1),
            "mean_iou": statistics.mean(iou_scores),
            "total": total,
        }
```

## Cross-Modal Retrieval

```python
class CrossModalRetrieval:
    def __init__(self, model):
        self.model = model

    def evaluate_image_to_text(self, queries: list[dict], gallery: list[dict], k_values: list[int] = [1, 5, 10]) -> dict:
        results = {}
        for k in k_values:
            recall = self._compute_recall_at_k(queries, gallery, k, direction="i2t")
            results[f"R@{k}"] = recall
        return results

    def evaluate_text_to_image(self, queries: list[dict], gallery: list[dict], k_values: list[int] = [1, 5, 10]) -> dict:
        results = {}
        for k in k_values:
            recall = self._compute_recall_at_k(queries, gallery, k, direction="t2i")
            results[f"R@{k}"] = recall
        return results

    def _compute_recall_at_k(self, queries: list[dict], gallery: list[dict], k: int, direction: str) -> float:
        relevant = 0
        for query in queries:
            if direction == "i2t":
                query_embed = self.model.encode_image(query["image"])
                gallery_embeds = [self.model.encode_text(g["text"]) for g in gallery]
            else:
                query_embed = self.model.encode_text(query["text"])
                gallery_embeds = [self.model.encode_image(g["image"]) for g in gallery]

            scores = np.dot(gallery_embeds, query_embed)
            top_k = np.argsort(scores)[-k:][::-1]
            if query["id"] in [gallery[i]["id"] for i in top_k]:
                relevant += 1

        return relevant / max(len(queries), 1)
```

## Quality Assurance

```python
class MultimodalQA:
    def check_modality_alignment(self, dataset: list[dict], model) -> dict:
        misalignments = 0
        for item in dataset:
            image_text = self.describe_image(item["image"])
            model_text = model.generate(item["query"])
            similarity = self.compute_text_similarity(image_text, model_text)
            if similarity < 0.3:
                misalignments += 1
        return {
            "alignment_score": 1 - (misalignments / max(len(dataset), 1)),
            "misalignment_rate": misalignments / max(len(dataset), 1),
        }

    def test_robustness(self, dataset: list[dict], perturbations: list[str]) -> dict:
        results = {}
        for pert in perturbations:
            perturbed = self.apply_perturbation(dataset, pert)
            clean_score = self.evaluate(dataset)["accuracy"]
            perturbed_score = self.evaluate(perturbed)["accuracy"]
            results[pert] = {"clean": clean_score, "perturbed": perturbed_score, "drop": clean_score - perturbed_score}
        return results
```

## Key Points
- Evaluate on multiple benchmarks: captioning, VQA, grounding, retrieval
- Use task-specific metrics: CIDEr for captions, accuracy for VQA, IoU for grounding
- Compute recall@k for cross-modal retrieval
- Evaluate noise robustness for audio models
- Test modality alignment — does the model correctly associate modalities?
- Measure robustness to image perturbations (blur, crop, noise)
- Track per-category accuracy for VQA
- Compare against baseline models on standard benchmarks
- Report inference speed alongside quality metrics
- Use human evaluation for subjective quality assessment
