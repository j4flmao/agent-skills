# Roadmapping Tools & Integrations

## Overview

Modern product roadmapping cannot exist in a silo. To prevent drift between strategy and execution, roadmapping platforms must integrate bi-directionally with issue tracking and task management systems (such as Jira, Linear, and GitHub Issues). This document defines the architectural patterns, webhook schemas, syncing algorithms, and integration APIs for bidirectional roadmap synchronization.

## 1. Bi-directional Sync Architecture

A robust syncing engine must handle updates originating from either the strategic roadmap (e.g., Aha!, Productboard) or the execution tracking tool (e.g., Jira, Linear) without causing infinite update loops.

```
┌──────────────────────────┐                  ┌──────────────────────────┐
│   Roadmapping Platform   │                  │  Execution Tool (Jira)   │
│  - Strategic Horizon     │                  │  - Epics & Issues        │
│  - Outcomes & Themes     │                  │  - Sprints & Story Points│
└────────────┬─────────────┘                  └────────────▲─────────────┘
             │                                             │
             │ HTTP POST (Webhook)                         │ HTTP PUT (REST API)
             ▼                                             │
┌──────────────────────────────────────────────────────────┴─────────────┐
│                       Bi-directional Sync Service                      │
│  1. Event Broker (Kafka/RabbitMQ)                                      │
│  2. Conflict Resolver (State Machine & Version Tracking)                │
│  3. Schema Mapping Layer                                               │
└────────────────────────────────────────────────────────────────────────┘
```

### Conflict Resolution State Machine

To prevent infinite loops (A updates B, which triggers B to update A, etc.), the Sync Service tracks event signatures and utilizes a state machine with a lock registry.

```
           ┌────────────────────────┐
           │     Idle / Synced      │
           └───────────┬────────────┘
                       │
             Webhook / API Trigger
                       │
                       ▼
           ┌────────────────────────┐
     ┌────►│   Acquire Lock for ID  │
     │     └───────────┬────────────┘
     │                 │
     │                 ▼
     │     ┌────────────────────────┐
     │     │   Validate Signatures  │
     │     └───────────┬────────────┘
     │                 │
     │       Success   ├─── Collision ──► [Discard Event / Log Conflict]
     │                 ▼
     │     ┌────────────────────────┐
     │     │  Compute Entity Diff   │
     │     └───────────┬────────────┘
     │                 │
     │                 ▼
     │     ┌────────────────────────┐
     │     │  Apply Target Update   │
     │     └───────────┬────────────┘
     │                 │
     │                 ▼
     │     ┌────────────────────────┐
     │     │  Release Lock for ID   │
     │     └────────────────────────┘
```

## 2. Syncing Engine Implementation

Below is a Python implementation of the syncing engine featuring a lock registry, state transition logic, and idempotency tracking.

```python
import hashlib
import json
import time
import logging
from typing import Dict, Any, Optional

logger = logging.getLogger("SyncEngine")

class SyncLockRegistry:
    def __init__(self, ttl_seconds: int = 5):
        self.locks: Dict[str, float] = {}
        self.ttl = ttl_seconds

    def acquire(self, entity_id: str) -> bool:
        now = time.time()
        if entity_id in self.locks:
            if now - self.locks[entity_id] < self.ttl:
                return False  # Lock is active
        self.locks[entity_id] = now
        return True

    def release(self, entity_id: str):
        if entity_id in self.locks:
            del self.locks[entity_id]

class SyncConflictResolver:
    @staticmethod
    def resolve(local_ver: int, remote_ver: int, local_data: dict, remote_data: dict) -> dict:
        if local_ver > remote_ver:
            logger.info("Local version is newer. Overwriting remote.")
            return local_data
        elif remote_ver > local_ver:
            logger.info("Remote version is newer. Overwriting local.")
            return remote_data
        else:
            # Timestamp fallback
            if local_data.get("updated_at", 0) >= remote_data.get("updated_at", 0):
                return local_data
            return remote_data

class BidirectionalSyncEngine:
    def __init__(self, lock_registry: SyncLockRegistry):
        self.locks = lock_registry
        self.signature_store: Dict[str, str] = {}

    def _compute_signature(self, data: Dict[str, Any]) -> str:
        # Exclude volatile fields like timestamps
        normalized = {k: v for k, v in data.items() if k not in ["updated_at", "sync_time"]}
        serialized = json.dumps(normalized, sort_keys=True)
        return hashlib.sha256(serialized.encode()).hexdigest()

    def process_sync_event(
        self, 
        entity_id: str, 
        source: str, 
        payload: Dict[str, Any], 
        target_client: Any
    ) -> bool:
        if not self.locks.acquire(entity_id):
            logger.warning(f"Lock active for entity {entity_id}. Skipping sync event from {source} to prevent loop.")
            return False

        try:
            new_sig = self._compute_signature(payload)
            if self.signature_store.get(entity_id) == new_sig:
                logger.info(f"Entity {entity_id} signature unchanged. No sync needed.")
                return False

            # Execute remote update
            success = target_client.update_entity(entity_id, payload)
            if success:
                self.signature_store[entity_id] = new_sig
                logger.info(f"Successfully synced entity {entity_id} to target.")
                return True
            return False
        finally:
            self.locks.release(entity_id)
```

## 3. Jira & Linear Webhook Schemas

### Jira Webhook Payload (Epic Link & Status Update)
When an epic is modified in Jira, the following schema payload is received by the webhook listener.

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "JiraEpicWebhookPayload",
  "type": "object",
  "required": ["timestamp", "webhookEvent", "issue_event_type_name", "user", "issue"],
  "properties": {
    "timestamp": { "type": "integer" },
    "webhookEvent": { "type": "string", "const": "jira:issue_updated" },
    "issue_event_type_name": { "type": "string", "enum": ["issue_updated", "issue_generic"] },
    "user": {
      "type": "object",
      "required": ["accountId", "displayName"],
      "properties": {
        "accountId": { "type": "string" },
        "displayName": { "type": "string" }
      }
    },
    "issue": {
      "type": "object",
      "required": ["id", "key", "fields"],
      "properties": {
        "id": { "type": "string" },
        "key": { "type": "string" },
        "fields": {
          "type": "object",
          "required": ["summary", "status", "issuetype", "customfield_10014"],
          "properties": {
            "summary": { "type": "string" },
            "status": {
              "type": "object",
              "required": ["name", "id"],
              "properties": {
                "name": { "type": "string" },
                "id": { "type": "string" }
              }
            },
            "issuetype": {
              "type": "object",
              "required": ["name"],
              "properties": {
                "name": { "type": "string", "const": "Epic" }
              }
            },
            "customfield_10014": {
              "type": "string",
              "description": "Epic Link / Strategic Theme Identifier mapping to the roadmap portal."
            }
          }
        }
      }
    }
  }
}
```

### Linear Webhook Payload (Issue Status & Target Date Change)
Linear utilizes a standardized webhook structure mapping direct database model changes.

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "LinearWebhookPayload",
  "type": "object",
  "required": ["action", "type", "createdAt", "data", "url"],
  "properties": {
    "action": { "type": "string", "enum": ["create", "update", "remove"] },
    "type": { "type": "string", "const": "Issue" },
    "createdAt": { "type": "string", "format": "date-time" },
    "url": { "type": "string" },
    "data": {
      "type": "object",
      "required": ["id", "title", "state", "targetDate"],
      "properties": {
        "id": { "type": "string", "format": "uuid" },
        "title": { "type": "string" },
        "targetDate": { "type": "string", "format": "date" },
        "state": {
          "type": "object",
          "required": ["name", "type"],
          "properties": {
            "name": { "type": "string" },
            "type": { "type": "string", "enum": ["backlog", "unstarted", "started", "completed", "canceled"] }
          }
        }
      }
    }
  }
}
```

## 4. Integration APIs

### Roadmap Integration Endpoint Implementation (FastAPI REST Routing)

```python
from fastapi import FastAPI, Header, HTTPException, Depends, status
from pydantic import BaseModel, Field
import hmac
import hashlib

app = FastAPI(title="RoadmapIntegrationAPI", version="1.0.0")

WEBHOOK_SECRET = b"super_secret_webhook_signing_token"

class WebhookPayload(BaseModel):
    event: str = Field(..., description="Event action category")
    entity_id: str = Field(..., description="Unified target identifier")
    properties: dict = Field(default_factory=dict, description="Payload attributes")

def verify_signature(
    x_hub_signature: str = Header(..., alias="X-Hub-Signature-256"),
    body: bytes = None
):
    expected = "sha256=" + hmac.new(WEBHOOK_SECRET, body, hashlib.sha256).hexdigest()
    if not hmac.compare_digest(x_hub_signature, expected):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid signature hash verification failed."
        )

@app.post("/v1/webhooks/jira", status_code=status.HTTP_202_ACCEPTED)
async def handle_jira_webhook(
    payload: WebhookPayload,
    is_valid: bool = Depends(verify_signature)
):
    # Route payload internally to the synchronization engine queue
    logger.info(f"Ingested webhook event: {payload.event} for entity {payload.entity_id}")
    return {"status": "queued", "id": payload.entity_id}
```

## Key Points

- Bidirectional syncing requires concurrency locks to avoid update loop cascades.
- Webhook payloads must be verified using SHA-256 HMAC tokens.
- Keep mapping metadata schemas flexible using unified middleware adapters.
- Custom fields in Jira/Linear should map directly to strategic themes or objectives.
- Monitor lag and sync latency metrics to flag bottleneck queue states.

<!-- COMPRESSION FOOTER -->
<!--
Compression Level: 5 (Comprehensive architectural references & code details preserved)
Strict compliance with strategic roadmapping, Jira/Linear webhook schemas, conflict resolution models, and API definitions.
-->
