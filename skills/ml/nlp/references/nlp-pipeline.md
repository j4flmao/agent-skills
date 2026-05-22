# NLP Pipeline

## spaCy Basics
```
import spacy

nlp = spacy.load("en_core_web_sm")
doc = nlp("Apple is looking at buying U.K. startup for $1 billion.")

# Tokenization + POS + dependency
for token in doc:
    print(f"{token.text:15} {token.lemma_:15} {token.pos_:10} {token.dep_:10}")

# Named Entity Recognition
for ent in doc.ents:
    print(f"{ent.text:20} {ent.label_:10} {ent.start_char}-{ent.end_char}")

# Dependency parse
for token in doc:
    print(f"{token.text:10} <-{token.dep_:10}- {token.head.text:10}")
```

### Pipeline Components
| Component | Description | Model |
|-----------|-------------|-------|
| tokenizer | Segment text | Rule-based |
| tagger | POS tagging | sm/md/lg |
| parser | Dependency parsing | sm/md/lg |
| ner | Named entity recognition | sm/md/lg |
| lemmatizer | Word lemmatization | sm/md/lg |
| textcat | Text categorization | Custom |

Model sizes: sm (15MB, fast), md (50MB, +vectors), lg (600MB, full vectors), trf (500MB, transformer).

## Custom spaCy Training
```
import spacy
from spacy.training import Example
from spacy.util import minibatch, compounding

nlp = spacy.blank("en")
ner = nlp.add_pipe("ner")
ner.add_label("PRODUCT")

TRAIN_DATA = [("iPhone 15 costs $999", {"entities": [(0, 9, "PRODUCT")]})]

optimizer = nlp.begin_training()
for epoch in range(50):
    losses = {}
    for batch in minibatch(TRAIN_DATA, size=compounding(4.0, 32.0, 1.001)):
        for text, annotations in batch:
            doc = nlp.make_doc(text)
            example = Example.from_dict(doc, annotations)
            nlp.update([example], drop=0.2, losses=losses, sgd=optimizer)
```

### Training Config
Save as DocBin: use spacy convert for training data. Train via CLI: `python -m spacy train config.cfg --output ./output`. Disable unused components: `nlp.select_pipes(enable=["ner"])`.

## Tokenization Details
```
from spacy.lang.en import English

nlp = English()
special_case = [{spacy.symbols.ORTH: "gonna", spacy.symbols.LEMMA: "go", spacy.symbols.POS: "VERB"}]
nlp.tokenizer.add_special_case("gonna", special_case)

doc = nlp("I'm gonna buy U.S. stocks (AAPL, GOOGL).")
for token in doc:
    print(f"{token.text:10} {token.lemma_:10} {token.is_punct}")
```

Rules: prefixes (quotes), suffixes (punctuation), infixes (hyphens). Exceptions: U.S. stays together, can't splits.

## Text Normalization
```
import re

def normalize(text):
    text = re.sub(r"http\S+|www\S+", "<URL>", text.lower())
    text = re.sub(r"\S+@\S+", "<EMAIL>", text)
    text = re.sub(r"\d+", "<NUM>", text)
    return re.sub(r"\s+", " ", text).strip()

# spaCy lemmatization
doc = nlp("The cats were running quickly")
lemmas = [token.lemma_ for token in doc if not token.is_stop]
```

## POS Tagging & Dependencies
```
doc = nlp("The quick brown fox jumps over the lazy dog.")
for token in doc:
    print(f"{token.text:10} {token.pos_:8} {token.tag_:8} {token.dep_:10} {token.head.text}")
for chunk in doc.noun_chunks:
    print(f"{chunk.text:20} {chunk.root.text:10} {chunk.root.dep_:10}")
```

Universal POS tags: NOUN, VERB, ADJ, ADV, PROPN, DET, ADP, AUX, CCONJ, PRON, NUM, PUNCT. Dep labels: nsubj, dobj, nmod, amod, advmod, prep, pobj, relcl, conj.

## Word Vectors & Similarity
```
nlp = spacy.load("en_core_web_md")  # or lg
print(nlp("cat").similarity(nlp("dog")))  # ~0.8
print(nlp("I like cats").similarity(nlp("I love dogs")))  # ~0.9
```

## Rule-Based Matching
```
from spacy.matcher import Matcher, PhraseMatcher

matcher = Matcher(nlp.vocab)
matcher.add("COMPANY", [[{"LOWER": "apple"}, {"IS_PUNCT": True, "OP": "?"},
                         {"LOWER": {"IN": ["inc","corp","ltd"]}, "OP": "?"}]])
doc = nlp("Apple, Inc. is based in Cupertino")
for match_id, start, end in matcher(doc):
    print(doc[start:end].text)

# Phrase matcher for large vocab
phrase_matcher = PhraseMatcher(nlp.vocab)
phrase_matcher.add("ML_TERMS", [nlp.make_doc(t) for t in ["machine learning","deep learning"]])
```

## Best Practices
- Disable unused pipeline components for speed: `nlp.select_pipes(enable=["ner"])`.
- Batch: `[nlp(t) for t in texts]` is slow; use `nlp.pipe(texts, batch_size=256)`.
- Max length: `nlp.max_length = 5_000_000` for long docs.
- Custom stop words: `nlp.Defaults.stop_words |= {"custom"}`.
- Save/load: `nlp.to_disk("./pipeline")` / `nlp.from_disk("./pipeline")`.
- Transformers: `nlp.add_pipe("transformer")` with spacy-transformers.
