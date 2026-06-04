# Vector Database Security

## Overview
Vector databases store embeddings that can contain sensitive information. Security considerations include access control, encryption, data isolation, and protection against adversarial attacks on embeddings.

## Threat Model

### Security Concerns
```
1. Data Exposure: Embeddings can encode sensitive information
   - PII in document embeddings
   - Proprietary knowledge in index
   - Query patterns revealing user intent

2. Unauthorized Access
   - Reading vectors without permission
   - Extracting training data via membership inference
   - Querying other tenants' data

3. Adversarial Attacks
   - Adversarial queries to extract information
   - Index poisoning with malicious vectors
   - Replay attacks on cached results

4. Compliance
   - GDPR right to deletion
   - Data residency requirements
   - Audit trail for all access
```

## Access Control

### Authentication
```python
from fastapi import FastAPI, Depends, HTTPException, Security
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import hmac
import hashlib

app = FastAPI()
security = HTTPBearer()

class VectorDBAuth:
    def __init__(self):
        self.api_keys = {}

    def generate_api_key(self, client_id: str, permissions: list[str]) -> str:
        import secrets
        key = f"vdb_{secrets.token_hex(32)}"
        self.api_keys[key] = {
            "client_id": client_id,
            "permissions": permissions,
            "created_at": datetime.utcnow().isoformat(),
        }
        return key

    def verify_key(self, api_key: str) -> dict | None:
        return self.api_keys.get(api_key)

    def revoke_key(self, api_key: str):
        self.api_keys.pop(api_key, None)

auth = VectorDBAuth()

async def verify_token(credentials: HTTPAuthorizationCredentials = Security(security)):
    key_data = auth.verify_key(credentials.credentials)
    if not key_data:
        raise HTTPException(status_code=403, detail="Invalid API key")
    return key_data
```

### Tenant Isolation
```python
class TenantIsolatedVectorDB:
    def __init__(self, base_client):
        self.client = base_client

    async def search(self, tenant_id: str, query_vector: list[float], top_k: int = 10):
        return await self.client.search(
            vector=query_vector,
            top_k=top_k,
            filter={"tenant_id": {"$eq": tenant_id}},
        )

    async def insert(self, tenant_id: str, vector_id: str, vector: list[float], metadata: dict):
        return await self.client.upsert(
            id=f"{tenant_id}:{vector_id}",
            vector=vector,
            metadata={**metadata, "tenant_id": tenant_id},
        )

    async def delete_by_tenant(self, tenant_id: str):
        return await self.client.delete(
            filter={"tenant_id": {"$eq": tenant_id}}
        )

    async def verify_isolation(self):
        import numpy as np
        test_vector = np.random.rand(768).tolist()

        tenant_a_results = await self.search("tenant_a", test_vector)
        tenant_b_results = await self.search("tenant_b", test_vector)

        a_ids = {r["id"] for r in tenant_a_results}
        b_ids = {r["id"] for r in tenant_b_results}

        return {"isolated": len(a_ids & b_ids) == 0}
```

## Data Encryption

### Encryption at Rest
```python
from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
import base64

class EncryptedVectorDB:
    def __init__(self, base_client, encryption_key: bytes):
        self.client = base_client
        self.cipher = Fernet(encryption_key)

    async def insert_encrypted(self, vector_id: str, vector: list[float], metadata: dict):
        encrypted_vector = self.cipher.encrypt(
            json.dumps({"v": vector, "m": metadata}).encode()
        )
        await self.client.upsert(
            id=vector_id,
            vector=vector,
            metadata={"encrypted_blob": encrypted_vector.decode(), "encrypted": True},
        )

    async def retrieve_decrypted(self, vector_id: str) -> tuple[list[float], dict]:
        result = await self.client.fetch(vector_id)
        if not result or not result.metadata.get("encrypted"):
            return result.vector, result.metadata or {}

        decrypted = self.cipher.decrypt(
            result.metadata["encrypted_blob"].encode()
        )
        data = json.loads(decrypted)
        return data["v"], data["m"]
```

### Encryption in Transit
```python
# Configure TLS for vector DB connections
VECTOR_DB_TLS_CONFIG = {
    "host": "vdb.example.com",
    "port": 443,
    "use_tls": True,
    "tls_ca_cert": "/etc/ssl/certs/ca-certificates.crt",
    "tls_client_cert": "/etc/ssl/certs/client.crt",
    "tls_client_key": "/etc/ssl/private/client.key",
    "tls_verify": True,
}
```

## Audit Logging

```python
class VectorDBAudit:
    def __init__(self, log_store):
        self.store = log_store

    def log_query(self, user_id: str, query_vector_hash: str, top_k: int, filters: dict, timestamp: str):
        self.store.append({
            "type": "query",
            "user_id": user_id,
            "query_hash": query_vector_hash,
            "top_k": top_k,
            "filters": filters,
            "timestamp": timestamp,
        })

    def log_insert(self, user_id: str, vector_id: str, metadata_keys: list[str]):
        self.store.append({
            "type": "insert",
            "user_id": user_id,
            "vector_id": vector_id,
            "metadata_keys": metadata_keys,
            "timestamp": datetime.utcnow().isoformat(),
        })

    def log_delete(self, user_id: str, vector_ids: list[str]):
        self.store.append({
            "type": "delete",
            "user_id": user_id,
            "vector_ids": vector_ids,
            "timestamp": datetime.utcnow().isoformat(),
        })

    def get_user_activity(self, user_id: str, hours: int = 24) -> list[dict]:
        cutoff = (datetime.utcnow() - timedelta(hours=hours)).isoformat()
        return [
            entry for entry in self.store
            if entry.get("user_id") == user_id and entry.get("timestamp", "") >= cutoff
        ]
```

## Compliance

### Data Deletion
```python
class VectorDBCompliance:
    def __init__(self, db_client):
        self.client = db_client

    async def delete_user_data(self, user_id: str):
        await self.client.delete(filter={"user_id": {"$eq": user_id}})

    async def delete_by_source(self, source: str):
        await self.client.delete(filter={"source": {"$eq": source}})

    async def export_user_data(self, user_id: str) -> dict:
        results = await self.client.search(
            vector=[0] * 768,
            top_k=10000,
            filter={"user_id": {"$eq": user_id}},
        )
        return {"vectors": len(results), "data": results}

    async def verify_deletion(self, user_id: str) -> bool:
        results = await self.client.search(
            vector=[0] * 768,
            top_k=1,
            filter={"user_id": {"$eq": user_id}},
        )
        return len(results) == 0
```

## Rate Limiting

```python
class VectorDBRateLimiter:
    def __init__(self, max_queries_per_minute: int = 1000, max_inserts_per_minute: int = 100):
        self.query_limits = {}
        self.insert_limits = {}
        self.max_queries = max_queries_per_minute
        self.max_inserts = max_inserts_per_minute

    def check_query_limit(self, api_key: str) -> bool:
        now = time.time()
        window = now - 60

        if api_key not in self.query_limits:
            self.query_limits[api_key] = []

        self.query_limits[api_key] = [t for t in self.query_limits[api_key] if t > window]

        if len(self.query_limits[api_key]) >= self.max_queries:
            return False

        self.query_limits[api_key].append(now)
        return True

    def get_remaining_quota(self, api_key: str) -> dict:
        now = time.time()
        window = now - 60
        recent_queries = len([t for t in self.query_limits.get(api_key, []) if t > window])
        recent_inserts = len([t for t in self.insert_limits.get(api_key, []) if t > window])

        return {
            "queries_remaining": self.max_queries - recent_queries,
            "inserts_remaining": self.max_inserts - recent_inserts,
            "resets_in_seconds": 60 - (now % 60),
        }
```

## Key Points
- Authenticate all vector DB connections with API keys or mTLS
- Isolate data per tenant using metadata filters on every query
- Encrypt sensitive metadata at rest using client-side encryption
- Use TLS for all vector DB connections in production
- Log all queries, inserts, and deletes for audit trail
- Implement rate limiting per API key
- Support GDPR compliance: delete and export user data
- Verify tenant isolation with penetration testing
- Use IAM roles in cloud deployments instead of long-lived keys
- Monitor for anomalous query patterns indicating data extraction attacks

<!-- COMPRESSION FOOTER -->
<!--
Compression Level: 5 (Comprehensive architectural references & code details preserved)
Strict compliance with HNSW parameters, distance metrics, sharding/replication topology, and vector DB scaling guidelines.
-->
