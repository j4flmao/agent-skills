# Vector Indexing Algorithms (HNSW & IVF-PQ)

To achieve Approximate Nearest Neighbor (ANN) search, Vector Databases organize high-dimensional data using specialized indexing algorithms. The two most dominant architectures in the industry are **HNSW** and **IVF-PQ**.

## 1. HNSW (Hierarchical Navigable Small World)
*The King of Speed and Recall Accuracy.*

HNSW builds a multi-layered graph (similar to a Skip List).
- **The Bottom Layer (Layer 0)**: Contains every single vector in the database, connected to its nearest neighbors.
- **The Top Layers**: Contain exponentially fewer vectors, with links connecting distant points across the space (like superhighways).

**How Search Works**:
1. The search starts at the absolute top layer. It hops along the "superhighways" to find the general neighborhood of the query vector.
2. It drops down one layer, doing finer hops.
3. It keeps dropping down until it reaches Layer 0, performing a localized, highly accurate search.

- **Pros**: Blazing fast (`O(log N)` complexity). Extremely high recall (99%+ accuracy).
- **Cons**: Massive memory footprint. The graph edges consume significant RAM, often requiring instances with 128GB+ RAM for large datasets.

## 2. IVF-PQ (Inverted File Index + Product Quantization)
*The King of Memory Efficiency and Scale.*

IVF-PQ tackles the memory problem by heavily compressing the vectors.
- **IVF (Clustering)**: It runs K-Means clustering to group vectors into "Voronoi cells". When you search, the DB only compares your query to the centroids of these cells, finds the closest cell, and ignores the rest of the database.
- **PQ (Compression)**: A 1536-dimensional float32 vector takes ~6KB. PQ chops the vector into sub-vectors (e.g., 8 chunks), quantizes them against a codebook, and replaces the floats with 1-byte integers. A 6KB vector becomes 8 bytes.

**How Search Works**:
1. Find the closest IVF cell (e.g., Cell #42).
2. Look inside Cell #42.
3. Use the compressed PQ bytes to rapidly estimate the distance without ever loading the full float32 vectors.

- **Pros**: You can fit 1 Billion vectors in RAM. Highly cost-effective.
- **Cons**: Lower recall accuracy than HNSW. Finding the optimal PQ codebook requires a training phase on your specific data distribution before inserting.

## 3. Which one to choose?
- Use **HNSW** (Default in pgvector, Qdrant) if you have < 100 million vectors, plenty of RAM, and need maximum accuracy for RAG.
- Use **IVF-PQ** (Milvus, Faiss) if you are building web-scale search (1 Billion+ vectors) and infrastructure costs are the primary concern.
