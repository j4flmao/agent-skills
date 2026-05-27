# NLP Model Training

## Text Classification

```python
import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import DataLoader, Dataset
from transformers import (
    AutoTokenizer, AutoModelForSequenceClassification,
    AdamW, get_linear_schedule_with_warmup,
)
import numpy as np

class TextClassificationDataset(Dataset):
    def __init__(self, texts, labels, tokenizer, max_length=512):
        self.texts = texts
        self.labels = labels
        self.tokenizer = tokenizer
        self.max_length = max_length

    def __len__(self):
        return len(self.texts)

    def __getitem__(self, idx):
        text = self.texts[idx]
        label = self.labels[idx]

        encoding = self.tokenizer(
            text,
            truncation=True,
            padding='max_length',
            max_length=self.max_length,
            return_tensors='pt',
        )

        return {
            'input_ids': encoding['input_ids'].flatten(),
            'attention_mask': encoding['attention_mask'].flatten(),
            'label': torch.tensor(label, dtype=torch.long),
        }

def train_text_classifier(
    train_texts: List[str],
    train_labels: List[int],
    val_texts: List[str],
    val_labels: List[int],
    model_name: str = 'bert-base-uncased',
    epochs: int = 3,
    batch_size: int = 16,
    lr: float = 2e-5,
):
    """Fine-tune a transformer model for text classification."""
    tokenizer = AutoTokenizer.from_pretrained(model_name)
    model = AutoModelForSequenceClassification.from_pretrained(
        model_name,
        num_labels=len(set(train_labels)),
    )

    train_dataset = TextClassificationDataset(train_texts, train_labels, tokenizer)
    val_dataset = TextClassificationDataset(val_texts, val_labels, tokenizer)

    train_loader = DataLoader(train_dataset, batch_size=batch_size, shuffle=True)
    val_loader = DataLoader(val_dataset, batch_size=batch_size)

    device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
    model = model.to(device)

    optimizer = AdamW(model.parameters(), lr=lr)
    total_steps = len(train_loader) * epochs
    scheduler = get_linear_schedule_with_warmup(
        optimizer, num_warmup_steps=0, num_training_steps=total_steps,
    )

    for epoch in range(epochs):
        model.train()
        total_loss = 0

        for batch in train_loader:
            input_ids = batch['input_ids'].to(device)
            attention_mask = batch['attention_mask'].to(device)
            labels = batch['label'].to(device)

            optimizer.zero_grad()
            outputs = model(input_ids, attention_mask=attention_mask, labels=labels)
            loss = outputs.loss
            loss.backward()
            optimizer.step()
            scheduler.step()

            total_loss += loss.item()

        model.eval()
        val_loss = 0
        correct = 0
        total = 0

        with torch.no_grad():
            for batch in val_loader:
                input_ids = batch['input_ids'].to(device)
                attention_mask = batch['attention_mask'].to(device)
                labels = batch['label'].to(device)

                outputs = model(input_ids, attention_mask=attention_mask, labels=labels)
                val_loss += outputs.loss.item()

                _, predicted = torch.max(outputs.logits, 1)
                total += labels.size(0)
                correct += (predicted == labels).sum().item()

        accuracy = correct / total
        print(f"Epoch {epoch + 1}: Train Loss: {total_loss / len(train_loader):.4f}, "
              f"Val Loss: {val_loss / len(val_loader):.4f}, "
              f"Val Accuracy: {accuracy:.4f}")

    return model, tokenizer
```

## Named Entity Recognition

```python
import spacy
from spacy.training import Example
from spacy.util import minibatch, compounding
import random

def train_ner_model(
    train_data: List[tuple],
    model_name: str = 'en_core_web_sm',
    n_iter: int = 10,
) -> spacy.language.Language:
    """Train a custom NER model."""
    nlp = spacy.load(model_name)

    if 'ner' not in nlp.pipe_names:
        ner = nlp.add_pipe('ner', last=True)
    else:
        ner = nlp.get_pipe('ner')

    for _, annotations in train_data:
        for ent in annotations.get('entities'):
            ner.add_label(ent[2])

    other_pipes = [pipe for pipe in nlp.pipe_names if pipe != 'ner']
    with nlp.disable_pipes(*other_pipes):
        optimizer = nlp.begin_training()

        for iteration in range(n_iter):
            random.shuffle(train_data)
            losses = {}
            batches = minibatch(train_data, size=compounding(4.0, 32.0, 1.001))

            for batch in batches:
                examples = []
                for text, annotations in batch:
                    doc = nlp.make_doc(text)
                    example = Example.from_dict(doc, annotations)
                    examples.append(example)

                nlp.update(examples, drop=0.5, losses=losses)

            print(f"Iteration {iteration + 1}: Loss = {losses['ner']:.4f}")

    return nlp

def extract_entities(text: str, nlp_model) -> List[dict]:
    """Extract named entities from text."""
    doc = nlp_model(text)
    entities = []

    for ent in doc.ents:
        entities.append({
            'text': ent.text,
            'label': ent.label_,
            'start': ent.start_char,
            'end': ent.end_char,
        })

    return entities
```

## Word Embeddings

```python
from gensim.models import Word2Vec, FastText
import numpy as np

def train_word2vec(
    sentences: List[List[str]],
    vector_size: int = 100,
    window: int = 5,
    min_count: int = 2,
    workers: int = 4,
) -> Word2Vec:
    """Train Word2Vec embeddings."""
    model = Word2Vec(
        sentences=sentences,
        vector_size=vector_size,
        window=window,
        min_count=min_count,
        workers=workers,
        sg=1,
        epochs=50,
    )
    return model

def train_fasttext(
    sentences: List[List[str]],
    vector_size: int = 100,
    min_count: int = 2,
) -> FastText:
    """Train FastText embeddings (handles OOV words)."""
    model = FastText(
        sentences=sentences,
        vector_size=vector_size,
        min_count=min_count,
        workers=4,
        epochs=50,
    )
    return model

def get_sentence_embedding(tokens: List[str], model, embedding_size: int = 100) -> np.ndarray:
    """Compute average word embedding for a sentence."""
    embeddings = []
    for token in tokens:
        try:
            embedding = model.wv[token]
            embeddings.append(embedding)
        except KeyError:
            continue

    if not embeddings:
        return np.zeros(embedding_size)

    return np.mean(embeddings, axis=0)
```

## Key Points

- Fine-tune transformers for text classification tasks
- Use Hugging Face AutoModel for easy model loading
- Train custom NER models with spaCy
- Use Word2Vec for dense word representations
- Use FastText to handle out-of-vocabulary words
- Compute sentence embeddings from word vectors
- Handle class imbalance in text classification
- Use early stopping to prevent overfitting
- Validate NER with entity-level metrics
- Export models to ONNX for production
- Test on domain-specific edge cases
- Log training metrics for experiment tracking
