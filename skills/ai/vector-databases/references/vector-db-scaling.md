# Vector Database Scaling

## Overview
Vector databases must scale across multiple dimensions: data volume (number of vectors), query throughput (QPS), index build speed, and geographic distribution. Different scaling strategies apply at different scales.

## Scale Dimensions

### Scale Tiers
```
Tier 1: <1M vectors
- Single node, in-memory (FAISS, HNSWlib)
- No sharding needed
- Index rebuild: seconds
- Query latency: <5ms

Tier 2: 1M-100M vectors
- Single node or small cluster
- IVF or HNSW indexing
- Optional sharding by tenant
- Index rebuild: minutes
- Query latency: 5-20ms

Tier 3: 100M-1B vectors
- Distributed cluster (Milvus, Qdrant, Weaviate)
- Required: sharding, replication
- SSD-based DiskANN for very large
- Index rebuild: hours
- Query latency: 20-100ms

Tier 4: 1B+ vectors
- Multi-region distributed
- Custom sharding strategy
- Tiered storage (hot/warm/cold)
- Incremental index building
- Query latency: <200ms
```

## Sharding Strategies

### Hash-Based Sharding
```python
class HashShardManager:
    def __init__(self, n_shards: int):
        self.n_shards = n_shards
        self.shards = [{"id": i, "client": self._connect_shard(i)} for i in range(n_shards)]

    def _get_shard(self, vector_id: str) -> int:
        return int(hashlib.md5(vector_id.encode()).hexdigest(), 16) % self.n_shards

    async def insert(self, vector_id: str, vector: list[float], metadata: dict):
        shard_id = self._get_shard(vector_id)
        shard = self.shards[shard_id]
        await shard["client"].upsert(id=vector_id, vector=vector, metadata=metadata)

    async def search(self, query_vector: list[float], top_k: int = 10):
        # Search all shards in parallel
        tasks = [
            shard["client"].search(vector=query_vector, top_k=top_k)
            for shard in self.shards
        ]
        results = await asyncio.gather(*tasks)

        # Merge results
        all_results = []
        for shard_results in results:
            all_results.extend(shard_results)

        all_results.sort(key=lambda x: x["score"], reverse=True)
        return all_results[:top_k]
```

### Tenant-Based Sharding
```python
class TenantShardManager:
    def __init__(self, shard_map: dict):
        self.shard_map = shard_map  # tenant_id -> shard_client

    async def search_by_tenant(self, tenant_id: str, query_vector: list[float], top_k: int = 10):
        shard = self.shard_map.get(tenant_id)
        if not shard:
            raise ValueError(f"No shard for tenant: {tenant_id}")
        return await shard.search(vector=query_vector, top_k=top_k)

    async def rebalance(self, new_shard_map: dict):
        old_map = self.shard_map
        self.shard_map = new_shard_map

        for tenant_id, new_shard in new_shard_map.items():
            if tenant_id in old_map and old_map[tenant_id] != new_shard:
                await self._migrate_tenant(tenant_id, old_map[tenant_id], new_shard)
```

## Replication

### Read Replicas
```python
class ReadReplicaSet:
    def __init__(self, primary, replicas: list):
        self.primary = primary
        self.replicas = replicas
        self.current_replica = 0

    async def search(self, query_vector: list[float], top_k: int = 10, consistency: str = "eventual"):
        if consistency == "strong":
            return await self.primary.search(vector=query_vector, top_k=top_k)

        replica = self.replicas[self.current_replica % len(self.replicas)]
        self.current_replica += 1
        return await replica.search(vector=query_vector, top_k=top_k)

    async def insert(self, vector_id: str, vector: list[float], metadata: dict):
        await self.primary.upsert(id=vector_id, vector=vector, metadata=metadata)
        for replica in self.replicas:
            try:
                await replica.upsert(id=vector_id, vector=vector, metadata=metadata)
            except Exception as e:
                logger.error(f"Replication failed: {e}")

    async def health_check(self) -> dict:
        status = {}
        for i, replica in enumerate(self.replicas):
            try:
                await replica.search(vector=[0] * 768, top_k=1)
                status[f"replica_{i}"] = "healthy"
            except Exception as e:
                status[f"replica_{i}"] = f"unhealthy: {e}"
        return status
```

## Index Management

### Incremental Indexing
```python
class IncrementalIndexManager:
    def __init__(self, vector_db, max_buffer_size: int = 10000):
        self.db = vector_db
        self.buffer = []
        self.max_buffer = max_buffer_size

    async def add_vector(self, vector_id: str, vector: list[float], metadata: dict):
        self.buffer.append({"id": vector_id, "vector": vector, "metadata": metadata})

        if len(self.buffer) >= self.max_buffer:
            await self.flush_buffer()

    async def flush_buffer(self):
        if not self.buffer:
            return

        batch = self.buffer
        self.buffer = []

        await self.db.upsert_batch(
            ids=[b["id"] for b in batch],
            vectors=[b["vector"] for b in batch],
            metadatas=[b["metadata"] for b in batch],
        )

    async def optimize_index(self):
        await self.flush_buffer()
        await self.db.optimize()
```

### Tiered Storage
```python
class TieredVectorDB:
    def __init__(self, hot_storage, warm_storage, cold_storage):
        self.hot = hot_storage
        self.warm = warm_storage
        self.cold = cold_storage

    async def insert(self, vector_id: str, vector: list[float], metadata: dict, tier: str = "hot"):
        if tier == "hot":
            await self.hot.upsert(id=vector_id, vector=vector, metadata=metadata)
        elif tier == "warm":
            await self.warm.upsert(id=vector_id, vector=vector, metadata=metadata)
        else:
            await self.cold.upsert(id=vector_id, vector=vector, metadata=metadata)

    async def promote(self, vector_id: str):
        for source in [self.cold, self.warm]:
            try:
                vector, metadata = await source.fetch(vector_id)
                await source.delete(vector_id)
                await self.hot.upsert(id=vector_id, vector=vector, metadata=metadata)
                return
            except Exception:
                continue

    async def demote(self, vector_id: str, target_tier: str = "warm"):
        vector, metadata = await self.hot.fetch(vector_id)
        await self.hot.delete(vector_id)

        if target_tier == "warm":
            await self.warm.upsert(id=vector_id, vector=vector, metadata=metadata)
        else:
            await self.cold.upsert(id=vector_id, vector=vector, metadata=metadata)
```

## Monitoring

```python
class VectorDBScalingMonitor:
    def __init__(self):
        self.metrics = {}

    def observe_shard_balance(self, shard_sizes: dict):
        sizes = list(shard_sizes.values())
        if not sizes:
            return {"balance": 1.0}

        max_size = max(sizes)
        min_size = min(sizes)
        balance = min_size / max(max_size, 1)

        if balance < 0.5:
            logger.warning(f"Shard imbalance detected: {balance:.2f}")

        return {"balance": balance, "max": max_size, "min": min_size}

    def suggest_scale(self, current_metrics: dict) -> dict:
        qps = current_metrics.get("qps", 0)
        latency_p99 = current_metrics.get("latency_p99", 0)
        vector_count = current_metrics.get("vector_count", 0)
        memory_usage = current_metrics.get("memory_usage_pct", 0)

        suggestions = []

        if latency_p99 > 100:
            suggestions.append("Add read replicas")
        if memory_usage > 80:
            suggestions.append("Add shards or increase node memory")
        if qps > 1000 and len(suggestions) == 0:
            suggestions.append("Consider horizontal scaling")
        if vector_count > 10_000_000:
            suggestions.append("Consider IVF or DiskANN index")

        return {"suggestions": suggestions, "needs_scaling": len(suggestions) > 0}
```

## Key Points
- Scale vector DB across data volume, QPS, index speed, and geography
- Hash-based sharding for uniform distribution
- Tenant-based sharding for isolation and targeted queries
- Read replicas for query throughput, primary for writes
- Incremental indexing for real-time更新的数据
- Tiered storage: hot (SSD, in-memory), warm (SSD), cold (HDD, object store)
- Monitor shard balance and rebalance when ratio exceeds 2:1
- Add read replicas before adding shards for read-heavy workloads
- Use IVF for >10M vectors, HNSW for <10M
- Plan for 3x data growth when designing initial cluster size

<!-- COMPRESSION FOOTER -->
<!--
Compression Level: 5 (Comprehensive architectural references & code details preserved)
Strict compliance with HNSW parameters, distance metrics, sharding/replication topology, and vector DB scaling guidelines.
-->
