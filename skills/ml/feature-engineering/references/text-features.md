# Text Feature Engineering

## Text Preprocessing

| Technique | Description | When |
|-----------|-------------|------|
| Lowercasing | Convert all text to lowercase | Most NLP tasks (not NER) |
| Stemming | Reduce words to root form (e.g., "running" → "run") | TF-IDF, bag-of-words |
| Lemmatization | Reduce to dictionary form (e.g., "better" → "good") | Semantic tasks |
| Stop word removal | Remove common words (the, a, is) | Classification, search |
| Punctuation removal | Remove .,!?;: | Bag-of-words models |
| HTML unescaping | Convert &amp; → & | Web-scraped text |
| Unicode normalization | NFC, NFD, NFKC normalization | Multi-language text |
| Regex cleaning | Remove emails, URLs, phone numbers | User-generated content |

```python
import re
import unicodedata

def clean_text(text: str) -> str:
    text = unicodedata.normalize('NFKC', text)
    text = re.sub(r'http\S+|www\.\S+', '<URL>', text)
    text = re.sub(r'\S+@\S+', '<EMAIL>', text)
    text = re.sub(r'[^\w\s]', '', text)
    text = re.sub(r'\d+', '<NUM>', text)
    return text.lower().strip()
```

## Text Feature Representations

| Method | Dimensionality | Context | When |
|--------|---------------|---------|------|
| Bag of Words | V (vocab size) | None | Baseline, fast |
| TF-IDF | V | Corpus frequency | Information retrieval, keywords |
| Word2Vec (SG/CBOW) | 100-300 | Local window | Classic embeddings |
| GloVe | 100-300 | Global co-occurrence | Pre-trained embeddings |
| FastText | 100-300 | Subword (character n-grams) | Rare words, morphologically rich |
| Sentence-BERT | 384-768 | Sentence-level | Semantic similarity |
| LLM embeddings (OpenAI, Cohere) | 1024-4096 | Full context | SOTA semantic tasks |

```python
# TF-IDF with n-grams
from sklearn.feature_extraction.text import TfidfVectorizer

vectorizer = TfidfVectorizer(
    ngram_range=(1, 3),
    max_features=10000,
    min_df=5,      # Ignore very rare terms
    max_df=0.8,    # Ignore very common terms
    sublinear_tf=True,  # Use 1 + log(tf)
    norm='l2'
)
X_tfidf = vectorizer.fit_transform(documents)
```

## Topic Modeling

| Model | Type | Strengths | Limitations |
|-------|------|-----------|-------------|
| LDA | Probabilistic bag-of-words | Interpretable topics | Sensitive to k, no correlation |
| NMF | Matrix factorization | Fast, deterministic | No probabilistic interpretation |
| BERTopic | Embedding + clustering | Contextual, dynamic topics | Computationally expensive |
| Top2Vec | Doc/word embeddings | Joint document/topic embedding | Harder to interpret topics |

```python
# BERTopic
from bertopic import BERTopic

topic_model = BERTopic(
    embedding_model="all-MiniLM-L6-v2",
    min_topic_size=10,
    nr_topics='auto',
    calculate_probabilities=True
)
topics, probs = topic_model.fit_transform(documents)
topic_model.visualize_topics()
topic_model.get_topic_info()
```

## Text Feature Extraction Pipeline

```python
from sklearn.pipeline import Pipeline, FeatureUnion

text_pipeline = Pipeline([
    ('features', FeatureUnion([
        ('tfidf', TfidfVectorizer(max_features=5000, ngram_range=(1, 2))),
        ('sentiment', SentimentFeatureExtractor()),
        ('readability', ReadabilityFeatureExtractor()),
        ('length', LengthFeatureExtractor()),
    ])),
    ('classifier', LogisticRegression())
])
```

## Validation for Text Features

| Check | Method | Signal |
|-------|--------|--------|
| Vocabulary drift | Jaccard similarity of top-k terms between train/test | < 0.7 indicates distribution shift |
| Feature importance shift | Top-10 TF-IDF terms change | Monitor for new terms |
| OOV rate | % of test tokens not in training vocab | > 10% flags domain shift |
| Embedding coverage | % of tokens with pre-trained embedding | < 80% flags rare vocabulary |
