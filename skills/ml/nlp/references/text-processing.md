# NLP Text Processing

## Text Preprocessing

```python
import re
import nltk
from nltk.corpus import stopwords
from nltk.stem import WordNetLemmatizer
from typing import List, Optional
import spacy

nlp = spacy.load('en_core_web_sm')
lemmatizer = WordNetLemmatizer()
stop_words = set(stopwords.words('english'))

def clean_text(text: str) -> str:
    """Basic text cleaning."""
    text = text.lower()
    text = re.sub(r'<[^>]+>', '', text)
    text = re.sub(r'http\S+|www\S+', '', text)
    text = re.sub(r'[^a-zA-Z\s]', '', text)
    text = re.sub(r'\s+', ' ', text).strip()
    return text

def tokenize_and_lemmatize(text: str, remove_stopwords: bool = True) -> List[str]:
    """Tokenize and lemmatize text."""
    doc = nlp(text)
    tokens = []

    for token in doc:
        if remove_stopwords and token.is_stop:
            continue
        if token.is_punct or token.is_space:
            continue
        tokens.append(token.lemma_)

    return tokens

def preprocess_pipeline(texts: List[str]) -> List[List[str]]:
    """Full preprocessing pipeline."""
    processed = []
    for text in texts:
        cleaned = clean_text(text)
        tokens = tokenize_and_lemmatize(cleaned)
        processed.append(tokens)

    return processed
```

## Feature Extraction

```python
from sklearn.feature_extraction.text import TfidfVectorizer, CountVectorizer
import numpy as np

def create_tfidf_features(
    texts: List[str],
    max_features: int = 5000,
    ngram_range: tuple = (1, 2),
    stop_words: str = 'english',
) -> tuple:
    """Create TF-IDF features from text."""
    vectorizer = TfidfVectorizer(
        max_features=max_features,
        ngram_range=ngram_range,
        stop_words=stop_words,
        sublinear_tf=True,
        min_df=2,
        max_df=0.95,
    )

    features = vectorizer.fit_transform(texts)
    feature_names = vectorizer.get_feature_names_out()

    return features, feature_names, vectorizer

def extract_ngrams(tokens: List[str], n: int = 2) -> List[str]:
    """Extract n-grams from token list."""
    ngrams = []
    for i in range(len(tokens) - n + 1):
        ngram = ' '.join(tokens[i:i + n])
        ngrams.append(ngram)
    return ngrams

def get_text_statistics(text: str) -> dict:
    """Compute text statistics."""
    doc = nlp(text)
    sentences = list(doc.sents)
    words = [token for token in doc if not token.is_punct and not token.is_space]

    return {
        'char_count': len(text),
        'word_count': len(words),
        'sentence_count': len(sentences),
        'avg_word_length': float(np.mean([len(token.text) for token in words])),
        'avg_sentence_length': len(words) / len(sentences) if sentences else 0,
        'vocabulary_richness': len(set(token.text for token in words)) / len(words) if words else 0,
    }
```

## Sentiment Analysis

```python
from textblob import TextBlob
from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer

vader_analyzer = SentimentIntensityAnalyzer()

def analyze_sentiment_textblob(text: str) -> dict:
    """Analyze sentiment using TextBlob."""
    blob = TextBlob(text)
    sentiment = blob.sentiment

    return {
        'polarity': sentiment.polarity,
        'subjectivity': sentiment.subjectivity,
        'classification': 'positive' if sentiment.polarity > 0
            else 'negative' if sentiment.polarity < 0
            else 'neutral',
    }

def analyze_sentiment_vader(text: str) -> dict:
    """Analyze sentiment using VADER."""
    scores = vader_analyzer.polarity_scores(text)

    return {
        'positive': scores['pos'],
        'negative': scores['neg'],
        'neutral': scores['neu'],
        'compound': scores['compound'],
        'classification': 'positive' if scores['compound'] >= 0.05
            else 'negative' if scores['compound'] <= -0.05
            else 'neutral',
    }

def extract_keywords(text: str, top_n: int = 10) -> List[tuple]:
    """Extract keywords using TF-IDF and text statistics."""
    doc = nlp(text)
    noun_phrases = [chunk.text for chunk in doc.noun_chunks]
    entities = [ent.text for ent in doc.ents]

    keyword_scores = {}
    for phrase in noun_phrases:
        keyword_scores[phrase] = keyword_scores.get(phrase, 0) + 1
    for entity in entities:
        keyword_scores[entity] = keyword_scores.get(entity, 0) + 2

    return sorted(keyword_scores.items(), key=lambda x: x[1], reverse=True)[:top_n]
```

## Key Points

- Clean text with regex for HTML, URLs, and special characters
- Use spaCy for efficient tokenization and lemmatization
- Remove stop words and punctuation for cleaner features
- Use TF-IDF for feature extraction with n-gram support
- Compute text statistics for exploratory analysis
- Use VADER for social media sentiment analysis
- Use TextBlob for general sentiment analysis
- Extract noun phrases and entities as keywords
- Handle multiple languages with language detection
- Use word embeddings for semantic features
- Balance vocabulary richness with feature dimensionality
- Test preprocessing on domain-specific examples
