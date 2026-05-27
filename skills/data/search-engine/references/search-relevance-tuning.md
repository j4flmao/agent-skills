# Search Relevance Tuning

## Relevance Scoring
Search relevance determines how well search results match user intent. Tuning requires understanding scoring algorithms and testing.

## Scoring Algorithms
- TF-IDF: Term frequency-inverse document frequency
- BM25: Probabilistic retrieval model, modern default
- Custom scoring with function_score queries
- Learning to Rank: ML-based result ordering
- Vector similarity for semantic search

## A/B Testing Search Results
- Define relevance metrics (NDCG, MRR, precision@k)
- Create test queries covering common use cases
- Compare scoring models with blinded evaluation
- Gather user feedback on result quality
- Iterate based on metrics and feedback

## Key Points
- Understand scoring algorithm characteristics
- Apply BM25 for general-purpose text search
- Consider learning to rank for complex relevance
- A/B test relevance changes with user feedback
- Monitor search quality metrics continuously
