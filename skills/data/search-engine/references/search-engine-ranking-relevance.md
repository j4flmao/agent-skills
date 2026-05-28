# Search Engine Ranking and Relevance

## Overview

Search relevance determines whether users find what they're looking for. A search engine that returns irrelevant results, no matter how fast, provides zero value. This reference covers scoring algorithms, relevance tuning strategies, query-time boosting, function scoring, synonyms, learning-to-rank, and evaluation methodologies for Elasticsearch, OpenSearch, and modern search engines.

## Relevance Fundamentals

### What Makes Search Relevant?

```
Relevance factors (in order of typical importance):

1. Text similarity: how well the query matches document content
   ├── Term frequency (TF): more matches = more relevant
   ├── Inverse document frequency (IDF): rare terms are more significant
   ├── Field-length norm: shorter fields get higher weight
   └── Coord: more matching clauses = higher score

2. Query intent: what the user actually wants
   ├── Exact phrase match > individual term match
   ├── Matches in title > matches in body
   ├── Matches in important fields > matches in trivial fields
   └── Recent content > old content (time decay)

3. Business rules: what the organization wants to surface
   ├── Sponsored/highlighted results first
   ├── Popular items above obscure ones
   ├── In-stock items above out-of-stock
   └── Preferred brands/partners boosted

4. User context: who the user is
   ├── Personalized results based on history
   ├── Geo-localized results (nearby first)
   ├── User segment (B2B vs B2C, new vs returning)
   └── Device/platform-specific results

5. Freshness: how recent the content is
   ├── News: most recent first
   ├── Evergreen: age may not matter
   └── Products: seasonal relevance

Relevance tuning is iterative:
Baseline → Measure → Identify gaps → Adjust → Measure → Repeat
```

### Scoring Algorithms

```
BM25 (default in Elasticsearch 7.x+, OpenSearch):
├── Best for: general full-text search
├── Parameters:
│   ├── k1: term saturation (default 1.2)
│   │   ├── Higher = more impact of repeated terms
│   │   └── Lower = diminishing returns for repeated terms
│   └── b: length normalization (default 0.75)
│       ├── 1.0 = full length normalization (shorter docs preferred)
│       └── 0.0 = no length normalization (regardless of doc length)
├── Formula:
│   score = IDF × ((TF × (k1 + 1)) / (TF + k1 × (1 - b + b × (docLen / avgDocLen))))
└── Tuning:
    ├── k1=1.2, b=0.75: default, good for general text
    ├── k1=0.5, b=0.5: short documents, user queries
    ├── k1=2.0, b=0.9: verbose documents with repeated terms
    └── k1=0.1, b=0.3: exact match preference (long-tail queries)

TF-IDF (legacy, Elasticsearch < 7.x):
├── Best for: compatibility with existing relevance models
├── No saturation: repeated terms continue increasing score
└── Replaced by BM25 in Elasticsearch 7.x

Boolean model (no scoring):
├── Used in: filter context, term queries
├── Score: all matching documents get score 1.0
└── Best for: structured filters where ranking isn't needed

Constant score:
├── All matching documents get a fixed score (e.g., "boost": 1.5)
├── Used in: boosting specific conditions in bool queries
└── Best for: simple boosts without text analysis
```

## Query-Time Tuning

### Boosting Strategies

```
Field boosting:
├── Boost title field higher than body
├── POST /products/_search
│   {
│     "query": {
│       "multi_match": {
│         "query": "wireless headphones",
│         "fields": ["title^3", "description^2", "content"]
│       }
│     }
│   }
├── title gets 3x weight, description 2x, content 1x
└── Rule of thumb: 2-3x for primary field, 1-1.5x for secondary

Term boosting in bool query:
├── Boost specific terms within a query
├── "must": [
│       { "match": { "title": { "query": "wireless headphones", "boost": 2 } } }
│   ],
│   "should": [
│       { "match": { "title": "bluetooth" } },
│       { "match": { "title": "noise cancelling" } }
│   ]
├── should clauses add score if matched
└── must clauses are required

Function score query:
├── Apply custom scoring functions on top of query score
├── POST /products/_search
│   {
│     "query": {
│       "function_score": {
│         "query": { "match": { "title": "wireless headphones" } },
│         "functions": [
│           {
│             "filter": { "term": { "in_stock": true } },
│             "weight": 2
│           },
│           {
│             "filter": { "range": { "rating": { "gte": 4.0 } } },
│             "weight": 1.5
│           },
│           {
│             "gauss": {
│               "price": {
│                 "origin": "75",
│                 "scale": "25",
│                 "decay": 0.5
│               }
│             }
│           }
│         ],
│         "score_mode": "multiply",
│         "boost_mode": "multiply"
│       }
│     }
│   }

Score modes:
├── multiply: query score × function score (default)
├── sum: query score + function score
├── avg: average of function scores, then multiplied
├── first: first function score (no combination)
├── max: maximum function score
└── min: minimum function score

Boost modes:
├── multiply: query score × function result (default)
├── replace: function result only (ignore query score)
├── sum: query score + function result
├── avg: (query score + function result) / 2
├── max: max(query score, function result)
└── min: min(query score, function result)

Available scoring functions:
├── weight: constant multiplier
├── field_value_factor: score from document field value
├── script_score: custom script-based scoring
├── gauss: Gaussian decay (smooth decrease from origin)
├── linear: linear decay
├── exp: exponential decay
└── random_score: random scoring (for A/B testing)
```

### Decay Functions

```
Decay functions model "ideal value and degrade from there":

gauss (smooth bell curve):
├── Best for: graceful degradation from ideal value
├── Example: price near $75, decreasing relevance further from target
├── "gauss": {
│     "price": {
│       "origin": "75",
│       "scale": "25",
│       "decay": 0.5
│     }
│   }
└── At origin=75: score=1.0. At 75±25 (50 or 100): score=0.5

linear (straight line decay):
├── Best for: hard cutoff with linear degradation
├── "linear": {
│     "date": {
│       "origin": "2025-03-15",
│       "scale": "30d",
│       "decay": 0.5
│     }
│   }
└── At origin=today: score=1.0. At 30 days ago: score=0.5

exp (exponential decay):
├── Best for: rapid degradation from ideal value
├── "exp": {
│     "views": {
│       "origin": "10000",
│       "scale": "1000",
│       "decay": 0.5
│     }
│   }
└── Sharp drop after exceeding ideal

Common decay use cases:
├── Time decay: newer content ranked higher
│   "gauss": { "publish_date": { "origin": "now", "scale": "7d", "decay": 0.5 } }
├── Geo distance: results near user location ranked higher
│   "gauss": {
│     "location": {
│       "origin": { "lat": 45.5, "lon": -122.6 },
│       "scale": "10km",
│       "decay": 0.5
│     }
│   }
├── Price preference: results near target price ranked higher
│   "gauss": { "price": { "origin": "75", "scale": "25", "decay": 0.5 } }
└── Popularity: more popular results slightly boosted, diminishing returns
    "field_value_factor": {
      "field": "popularity",
      "modifier": "log1p",
      "factor": 0.1
    }
```

### Rescore

```
Rescore re-ranks the top N results from the initial query:

POST /products/_search
{
  "query": {
    "match": {
      "title": {
        "query": "wireless headphones",
        "boost": 3
      }
    }
  },
  "rescore": {
    "window_size": 100,
    "query": {
      "rescore_query": {
        "match_phrase": {
          "title": {
            "query": "wireless headphones",
            "slop": 2
          }
        }
      },
      "query_weight": 0.7,
      "rescore_query_weight": 1.2
    }
  }
}

Rescore use cases:
├── Expensive scoring on top results only
├── Match phrase rescore: prefer exact phrase matches
├── Function rescore: apply expensive function scoring on top 100
├── Learning-to-rank model inference on top results
└── Performance: rescore is cheap (only N documents, typically 50-200)

Multiple rescore phases:
{
  "rescore": [
    {
      "window_size": 100,
      "query": { "rescore_query": { "match_phrase": { "title": "..." } } }
    },
    {
      "window_size": 50,
      "query": { "rescore_query": { "function_score": { ... } } }
    }
  ]
}

Rescore vs function_score:
├── function_score: applies to all matching documents
├── rescore: applies to top N documents only
└── Choose: rescore for expensive operations, function_score for inexpensive
```

## Text Analysis for Relevance

### Analyzer Selection

```
Choosing analyzers by use case:

Standard analyzer (default):
├── Splits on grammar boundaries (whitespace, punctuation)
├── Lowercases tokens
├── Best for: general English text, mixed content
└── Not ideal for: specialized domains, non-English languages

Language analyzers:
├── English: stemming (jumping → jump), stop words (the, a, an)
├── French, German, Spanish, etc.: language-specific stemming
├── Best for: content in specific languages
├── "analyzer": "english"
└── Note: stemming can be aggressive (organization → organ)

Custom analyzers for specific needs:
├── ngram: substrings of words (for autocomplete/search-as-you-type)
├── edge_ngram: prefix substrings (for search-as-you-type)
├── shingle: word n-grams (for phrase matching)
├── synonym: expand terms to synonyms
├── phonetic: match by sound (for names)
└── pattern: split on regex patterns (for URLs, codes, IDs)

Multi-analyzer fields:
├── "title": {
│     "type": "text",
│     "analyzer": "english",
│     "fields": {
│       "standard": { "type": "text", "analyzer": "standard" },
│       "trigram": { "type": "text", "analyzer": "trigram" },
│       "keyword": { "type": "keyword" }
│     }
│   }
├── Query title.standard for general search
├── Query title.trigram for fuzzy/partial matching
├── Query title.keyword for exact match / sorting
└── Use multi_match to query multiple analyzers concurrently
```

### Synonym Configuration

```
Synonyms expand query terms to related terms:

Synonym formats:
├── Simple: "laptop, notebook" → both terms equivalent
├── One-way: "tv => television, television set" → tv expands to both
├── Explicit: "laptop, notebook, portable computer" → equivalent set
└── File-based: store in synonyms.txt and reference by path

Synonym configuration:
PUT /_ingest/pipeline/synonym_pipeline
{
  "description": "Add synonym tokens",
  "processors": [
    {
      "synonym": {
        "field": "content",
        "synonyms": [
          "laptop, notebook, portable computer",
          "phone, smartphone, mobile phone, cellphone",
          "tv, television, television set",
          "running shoes, sneakers, athletic shoes"
        ],
        "expand": true
      }
    }
  ]
}

Synonym token filter in analyzer:
{
  "filter": {
    "synonym_filter": {
      "type": "synonym",
      "synonyms": [
        "laptop, notebook",
        "phone, smartphone",
        "tv, television"
      ]
    }
  },
  "analyzer": {
    "synonym_analyzer": {
      "tokenizer": "standard",
      "filter": ["lowercase", "synonym_filter"]
    }
  }
}

Synonym best practices:
├── Use at index time for consistent results
├── Use at query time for dynamic synonym updates
├── Avoid: one-way synonyms that cause query explosion
├── Monitor: synonym-related false positives (e.g., "phone" ≠ "telephone" in some contexts)
├── Test: synonym performance impact on index size
└── Review: synonym lists quarterly for relevance drift
```

### Stemming and Lemmatization

```
Stemming reduces words to their root form:

Porter stemmer (default in English analyzer):
├── "running" → "run", "ran" → "run"
├── "organization" → "organ" (can be too aggressive)
├── "stemmer" → "stemmer" (no change)
└── Fast but less accurate than lemmatization

Snowball stemmer:
├── Similar to Porter but supports more languages
├── configurable: "stemmer": { "type": "snowball", "language": "English" }
└── Slightly different rules than Porter

KStem stemmer:
├── Merely based on Krovetz stemmer
├── Less aggressive than Porter
├── "organization" → "organization" (preserved)
├── "running" → "running" (stemming depends)
└── Better precision, lower recall

Minimal stemmer:
├── Removes common suffixes only
├── "running" → "running", "organization" → "organization"
├── Higher precision, lower recall
└── Best for: technical/specialized vocabulary where aggressive stemming hurts

Lemmatization (analysis-lemma plugin):
├── Uses dictionary to find root word
├── "ran" → "run", "better" → "good"
├── More accurate than stemming
├── Slower, memory-intensive
└── Best for: applications where precision matters over index speed

Stemming exclusion:
├── Prevent specific words from being stemmed
├── "stemmer": {
│     "type": "english",
│     "stem_exclusion": ["organization", "analysis", "data"]
│   }
└── Useful for: technical terms that lose meaning when stemmed
```

## Learning to Rank (LTR)

### Overview

```
Learning to Rank uses ML models to rank search results:

Why LTR?
├── BM25 is a generic scoring function
├── Business-specific relevance requires training data
├── LTR learns from user behavior (clicks, conversions, dwell time)
├── Models can incorporate hundreds of features
└── Significantly better relevance than hand-tuned scoring

LTR flow:
1. Collect training data (search logs + relevance judgments)
2. Extract features (query-document pairs)
3. Train ranking model (LambdaMART, neural network)
4. Deploy model to search engine
5. Score documents with model during search

Feature types:
├── Query features: query length, term count, query frequency
├── Document features: document length, freshness, popularity
├── Query-document features: BM25 score, TF-IDF, cosine similarity
├── Field-specific: title_match, description_match, category_match
└── Contextual: user location match, user history match

Implementation in Elasticsearch:
├── elasticsearch-learning-to-rank plugin (Open Source)
├── Store features in document (field_value_factor)
├── Use script_score query with model inference
└── Rescore with model on top N results

Feature logging for training:
POST /products/_search
{
  "query": { "match": { "title": "wireless headphones" } },
  "ext": {
    "ltr": {
      "log": {
        "name": "search_features",
        "index": "search_training_log"
      },
      "model": {
        "name": "product_ranking_model",
        "store": "elasticsearch"
      }
    }
  }
}

Training data schema:
{
  "query": "wireless headphones",
  "doc_id": "PROD-123",
  "features": {
    "bm25_title": 8.2,
    "bm25_description": 3.1,
    "popularity": 0.85,
    "freshness_days": 15,
    "in_stock": 1.0,
    "rating": 4.5,
    "title_match_score": 0.9,
    "description_match_score": 0.4,
    "category_match": 1.0,
    "price_similarity": 0.7
  },
  "relevance": 4  // human rating 1-5, or derived from clicks
}

LTR on rescore (performance):
{
  "query": { "match": { "title": "wireless headphones" } },
  "rescore": {
    "window_size": 100,
    "query": {
      "rescore_query": {
        "script_score": {
          "query": { "match_all": {} },
          "script": {
            "source": "ltr_model('product_ranking_model', ['bm25_title', 'popularity', 'rating', 'in_stock'])",
            "lang": "ltr"
          }
        }
      }
    }
  }
}

LTR tooling:
├── Elasticsearch LTR plugin: `elasticsearch-learning-to-rank`
├── OpenSearch: built-in k-NN for semantic + optional LTR plugin
├── MetaSearch: Elasticsearch LTR platform
├── Quepid: relevance evaluation and tuning UI
├── RRE (Ranking Relevance Evaluation): offline evaluation tool
└── Apache Solr: LTR via `solr.ltr` plugin
```

## Relevance Evaluation

### Offline Evaluation

```
Evaluate search relevance without user traffic:

Metrics:
├── NDCG (Normalized Discounted Cumulative Gain)
│   ├── Measures ranking quality accounting for position
│   ├── Binary relevance: perfect for ecommerce (relevant = bought)
│   ├── Graded relevance: 0-4 rating scale
│   └── Target: NDCG@10 > 0.7 (good), > 0.8 (excellent)
├── Precision@K: fraction of relevant results in top K
│   └── Target: P@10 > 0.5
├── Recall: fraction of all relevant results returned
│   └── Target: depends on use case (ecommerce > 0.8, web search lower)
├── MAP (Mean Average Precision): average precision across queries
│   └── Target: MAP > 0.6
├── MRR (Mean Reciprocal Rank): how early is the first relevant result
│   └── Target: MRR > 0.8
└── ERR (Expected Reciprocal Rank): user satisfaction model
    └── Target: ERR@10 > 0.5

Test queries:
├── Representative: real queries from search logs
├── Edge cases: empty queries, single-character, special characters
├── Traffic-weighted: weight by query frequency
├── Category coverage: equal query count per category
└── Size: minimum 100 queries, ideal 500-1000

Relevance judgment scale:
├── 4: Perfect (exactly what user wanted)
├── 3: Excellent (very useful, may not be exact)
├── 2: Good (somewhat useful)
├── 1: Fair (marginally relevant)
└── 0: Bad (completely irrelevant)

Offline evaluation tools:
├── Quepid: web-based relevance scoring with team features
├── RRE (Ruby): CLI-based offline evaluation
├── Elasticsearch / OpenSearch: _search template for test queries
└── Custom: run test queries, compute metrics, compare systems

A/B testing setup:
├── 50% traffic to control (current ranking)
├── 50% traffic to variant (new ranking)
├── Metrics: CTR, conversion rate, revenue per search, bounce rate
├── Minimum duration: 1 week (capture weekly patterns)
└── Statistical significance: p < 0.05 before rollout
```

### Online Evaluation

```
Evaluate search relevance with real user traffic:

Click-through rate (CTR):
├── CTR = clicks / impressions
├── Measure by: query, position, result type
├── Target: top result CTR > 30%, page 1 CTR > 60%
└── Warning: high CTR may indicate users click the only available result

Conversion rate:
├── CVR = conversions / search sessions
├── Conversions: add-to-cart, purchase, signup, etc.
├── Measure by: query, category, device, user segment
└── Target: varies by industry (ecommerce ~3%, B2B ~10%)

Revenue per search (RPS):
├── RPS = total revenue / search count
├── Best for: ecommerce, subscription platforms
├── Compare: RPS for control vs variant A/B test
└── Target: improvement > 5% statistically significant

Zero result rate (ZRR):
├── ZRR = queries returning 0 results / total queries
├── High ZRR indicates content gaps or indexing problems
├── Target: ZRR < 5% (ecommerce), < 1% (site search)
└── Action: analyze ZRR queries, add content or improve synonyms

Abandonment rate:
├── User leaves after search without clicking any result
├── High abandonment indicates irrelevant results
├── Target: abandonment < 30%
└── Correlate with: loading time, result quality, mobile vs desktop

Long click / short click:
├── Long click: user dwells > 30s on result (satisfied)
├── Short click: user returns quickly (dissatisfied)
├── pSkip: probability user skips result entirely
└── Target: long click rate > 50%

Search refinement rate:
├── User modifies query after seeing results
├── High refinement rate indicates poor first-pass relevance
├── Target: refinement rate < 20%
└── Track: common refinements for relevance insight
```

### Relevance Tuning Checklist

```
Pre-tuning checklist:
├── [ ] Analyze search logs for top 100 queries
├── [ ] Identify queries with poor results (high abandonment, low CTR)
├── [ ] Create test query set with relevance judgments
├── [ ] Measure baseline NDCG/MAP/MRR
├── [ ] Define target metric and improvement goal
├── [ ] Set up A/B testing infrastructure

Content quality:
├── [ ] Complete and consistent metadata (title, description, category)
├── [ ] High-quality images (affects engagement, not ranking directly)
├── [ ] No duplicate content (use document deduplication)
├── [ ] Proper categorization (hierarchical categories for faceted search)
├── [ ] Current and accurate pricing/availability
└── [ ] Enriched content: reviews, ratings, specifications

Query understanding:
├── [ ] Synonym expansion for common queries
├── [ ] Spelling correction (did you mean?)
├── [ ] Query segmentation (keyboard vs keyboard stand)
├── [ ] Stop word handling (of, the, a, an)
├── [ ] Stemming configuration (language-specific)
└── [ ] N-gram analysis for partial/fuzzy matches

Scoring tuning:
├── [ ] Field boosting (title > description > content)
├── [ ] Popularity/relevance signals (ratings, views, sales)
├── [ ] Freshness decay (time-dependent scoring)
├── [ ] Business rules (boost in-stock, preferred brands)
├── [ ] Geo-boosting (nearby results)
└── [ ] Personalized boosting (user history, segment)

Performance:
├── [ ] Search latency under 100ms P95
├── [ ] Zero result rate under 5%
├── [ ] Query timeout at 30s default
├── [ ] Pagination with search_after (no deep from/size)
└── [ ] Cache warming for frequent queries

Post-tuning validation:
├── [ ] Measure NDCG improvement vs baseline
├── [ ] A/B test with real traffic (1 week minimum)
├── [ ] Monitor CTR, CVR, revenue impact
├── [ ] Check for unintended consequences (gaming, bias)
├── [ ] Document tuning changes and rationale
└── [ ] Schedule quarterly relevance review
```

## Advanced Relevance Patterns

### Personalized Search

```
Personalization strategies:

1. Query-time boosting from user history
├── Boost previously purchased categories
├── Boost user's preferred brands
├── Decay boost over time (recent purchases matter more)
└── "functions": [
      { "filter": { "terms": { "category": ["electronics", "audio"] } },
        "weight": 1.5 },
      { "filter": { "terms": { "brand": ["AudioPro", "Sony"] } },
        "weight": 1.2 }
    ]

2. Collaborative filtering signals
├── "users who bought this also bought..."
├── "popular in your region"
├── "trending among similar users"
└── Stored as document field: "collaborative_score": 0.85

3. Session-based personalization
├── Boost recently viewed items
├── Boost items in current search session context
├── Demote previously purchased items (don't show what user already owns)
└── Function score with time-decayed view history

Personalization trade-offs:
├── Benefit: higher CTR, conversion rate, user satisfaction
├── Cost: cold start problem for new users
├── Risk: filter bubble (narrowing results too much)
├── Trade-off: personalization strength vs diversity
└── Solution: balance personalized boost with generic relevance
```

### Freshness Boosting

```
Time-based relevance patterns:

News / blog search:
├── "functions": [{
│     "gauss": {
│       "publish_date": {
│         "origin": "now",
│         "scale": "7d",
│         "decay": 0.5
│       }
│     }
│   }]
├── Breaking news: last hour weighted heavily
├── Today's news: weight decays to 0.5 after 1 day
└── Old news: minimal boost after 30 days

Ecommerce product search:
├── New arrivals get temporary boost
├── "functions": [{
│     "filter": { "range": { "created_at": { "gte": "now-30d" } } },
│     "weight": 1.3
│   }]
├── Seasonal items adjusted by time of year
├── Clearance/sale items may get separate boost
└── Evergreen items: no freshness decay needed

Job / listing search:
├── New listings at top, decaying over posting duration
├── "functions": [{
│     "exp": {
│       "posted_date": {
│         "origin": "now",
│         "scale": "30d",
│         "decay": 0.5
│       }
│     }
│   }]
├── Expiring listings: urgent boost in last 7 days
└── Reposted listings: reset freshness

Freshness implementation:
├── Index-level: store `created_at`, `updated_at`, `publish_date`
├── Query-level: gauss decay on date field
├── Index-level: ILM rollover handles index-level freshness
└── Application-level: client-side boosting for specific date ranges
```

### Result Diversity

```
Diversity ensures results aren't dominated by one category/brand:

Purpose:
├── Avoid: 10 results all from one brand or category
├── Goal: balanced representation across relevant dimensions
└── Use: category diversity, brand diversity, price range diversity

Collapse (field collapsing):
├── Group results by a field (e.g., brand)
├── Show top N results per group
├── POST /products/_search
│   {
│     "collapse": {
│       "field": "brand",
│       "inner_hits": {
│         "name": "top_by_brand",
│         "size": 2,
│         "sort": [{ "_score": "desc" }]
│       }
│     },
│     "sort": ["_score"]
│   }
└── Returns: top result per brand, with inner hits for additional per-brand

Top hits aggregation:
├── Alternative to collapse for multi-field diversity
├── GET /products/_search
│   {
│     "size": 0,
│     "aggs": {
│       "by_category": {
│         "terms": { "field": "category", "size": 5 },
│         "aggs": {
│           "top_by_category": {
│             "top_hits": { "size": 3, "sort": [{ "_score": "desc" }] }
│           }
│         }
│       }
│     }
│   }
└── Returns: top 3 results per top 5 categories

Diversity scoring:
├── Apply diversity penalty to documents from over-represented categories
├── "functions": [{
│     "script_score": {
│       "script": {
│         "source": """
│           double diversity_penalty = 1.0;
│           if (params.seen_categories.contains(doc['category'].value)) {
│             diversity_penalty = 0.5;
│           }
│           return _score * diversity_penalty;
│         """,
│         "params": { "seen_categories": ["electronics", "audio"] }
│       }
│     }
│   }]
└── Performance: client-side diversity often better than script-based

MaxPasserSelector for result diversity:
├── MMR (Maximum Marginal Relevance) algorithm
├── Balances relevance (query match) with diversity (dissimilar from selected)
├── MMR = λ × Sim(query, doc) - (1-λ) × max(Sim(selected, doc))
├── λ = 0.5: equal relevance and diversity
├── λ = 0.7: more relevance-focused
└── λ = 0.3: more diversity-focused
```

## OpenSearch-Specific Relevance

### OpenSearch Scoring

```
OpenSearch scoring differences from Elasticsearch:

├── BM25: same implementation as Elasticsearch
├── Custom scoring via Painless scripting
├── Neural search: k-NN + NLP models for semantic search
│   ├── POST /_plugins/_ml/model_groups/_register
│   ├── POST /_plugins/_ml/models/_deploy
│   └── Neural query with text embedding
├── PPL for SQL-like querying
└── Dashboards (formerly Kibana) for visualization

OpenSearch k-NN for semantic search:
POST /products/_search
{
  "size": 10,
  "query": {
    "knn": {
      "product_embedding": {
        "vector": [0.02, 0.15, ...],
        "k": 10
      }
    }
  }
}

Hybrid search (k-NN + BM25):
POST /products/_search
{
  "query": {
    "hybrid": {
      "queries": [
        { "match": { "title": "wireless headphones" } },
        { "knn": { "product_embedding": { "vector": [0.02, 0.15, ...], "k": 10 } } }
      ]
    }
  }
}
```

## Search Engine Comparison: Relevance

```
Relevance feature comparison:

Feature                    │ Elasticsearch │ OpenSearch   │ Meilisearch  │ Typesense
───────────────────────────────────────────────────────────────────────────────────────
BM25 scoring              │ ✅ Default    │ ✅ Default   │ ✅ Default   │ ✅ Default
Custom scoring functions  │ ✅ Full       │ ✅ Full      │ ❌           │ ✅ Ranking rules
Function score query      │ ✅ Yes        │ ✅ Yes       │ ❌           │ ❌
Script scoring            │ ✅ Painless   │ ✅ Painless  │ ❌           │ ❌
Learning to rank          │ ✅ Plugin     │ ✅ Plugin    │ ❌           │ ❌
k-NN / vector search      │ ✅ 8.x+       │ ✅ Built-in  │ ❌           │ ✅ Built-in
Synonyms                  │ ✅ Full       │ ✅ Full      │ ✅          │ ✅
Typo tolerance            │ ✅ Fuzzy      │ ✅ Fuzzy     │ ✅ Auto      │ ✅ Auto
Custom ranking            │ ✅ Functions  │ ✅ Functions │ ✅ Ranking   │ ✅ Ranking rules
Result collapsing         │ ✅ Collapse   │ ✅ Collapse  │ ❌           │ ❌
Personalization           │ ✅ Script     │ ✅ Script    │ ❌           │ ❌
Geo boosting              │ ✅ Decay      │ ✅ Decay     │ ✅ Geo       │ ✅ Geo
A/B testing framework     │ ❌ 3rd-party  │ ❌ 3rd-party │ ❌           │ ❌
Search-as-you-type        │ ✅ Edge ngram │ ✅ Edge ngram│ ✅ Auto     │ ✅ Auto
Faceted search            │ ✅ Terms agg  │ ✅ Terms agg │ ✅ Filter    │ ✅ Filter
```

## Conclusion

Search relevance tuning is an iterative process that combines text analysis, scoring functions, business rules, and evaluation:

1. **Start with BM25**: Default scoring works well for most use cases. Tune k1 and b.
2. **Boost important fields**: Title > description > body. Use 2-3x multipliers.
3. **Add business rules**: Use function_score for popularity, freshness, stock status.
4. **Handle synonyms**: Expand queries for better recall. Use with caution.
5. **Implement freshness decay**: gauss or exp decay for time-sensitive content.
6. **Consider personalization**: Boost based on user history, geolocation, segment.
7. **Evaluate offline**: Use NDCG, Precision@K, MAP on test query sets.
8. **A/B test**: Validate improvements with real user traffic and business metrics.
9. **Monitor zero results**: Low ZRR is a sign of good content coverage.
10. **Iterate**: Relevance is never done. Quarterly reviews, continuous improvement.

## References

- Elasticsearch Relevance Tuning Guide: `elastic.co/guide/en/elasticsearch/reference/current/relevance-and-scoring.html`
- Elasticsearch Function Score Query: `elastic.co/guide/en/elasticsearch/reference/current/query-dsl-function-score-query.html`
- OpenSearch Scoring: `opensearch.org/docs/latest/search-plugins/scoring`
- Meilisearch Ranking: `meilisearch.com/docs/learn/advanced/ranking`
- Typesense Ranking: `typesense.org/docs/guide/ranking-and-relevance`
- Learning to Rank for Information Retrieval: `link.springer.com/book/10.1007/978-3-031-02765-3`
- Quepid Relevance Tuning: `quepid.com`
- RRE (Ranking Relevance Evaluation): `github.com/spotify/rre`
- NDCG Explanation: `en.wikipedia.org/wiki/Discounted_cumulative_gain`
