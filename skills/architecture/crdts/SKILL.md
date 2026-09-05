# Conflict-free Replicated Data Types (CRDTs)

## 1. Skill Context
**Focus**: Building local-first, peer-to-peer, real-time collaborative applications (like Google Docs, Figma, or Notion) where multiple users edit the exact same document simultaneously without locks.
**Triggers**: crdt, real-time-collaboration, yjs, automerge, offline-first.

## 2. The Legacy Approach: Operational Transformation (OT)
Historically (e.g., early Google Docs), systems used Operational Transformation (OT). If Alice types "A" and Bob types "B", a centralized server intercepts both operations, decides the canonical timeline, transforms the operations, and sends them back.
- **Problem**: OT requires a central server and is notoriously difficult to scale. It falls apart in peer-to-peer or offline-first scenarios.

## 3. The CRDT Paradigm
CRDTs are data structures that can be replicated across multiple computers in a network. They can be updated independently and concurrently without coordination.
**Mathematical Magic**: As long as all peers receive the same set of updates (regardless of the order), they are mathematically guaranteed to converge on the exact same state.

### Properties of CRDTs
For operations to merge perfectly regardless of network latency, they must be:
- **Commutative**: A + B = B + A (Order doesn't matter).
- **Associative**: (A + B) + C = A + (B + C).
- **Idempotent**: A + A = A (Receiving the same message twice doesn't break the state).

### Common Types
- **G-Counter (Grow-only Counter)**: Each node has a slot in an array. To increment, it adds 1 to its slot. To merge, you just take the `max()` of each slot across all peers.
- **LWW-Element-Set (Last Write Wins)**: Elements carry timestamps. If there is a conflict, the highest timestamp wins.
- **Sequence CRDTs (Text Editing)**: Instead of saying "Insert 'A' at index 5", elements are assigned fractional IDs (e.g., 'A' is between 0.5 and 0.6). Characters never shift their IDs when other characters are inserted.

## 4. Architectural Implementation
Modern ecosystems use robust libraries like **Yjs** or **Automerge** instead of rolling custom CRDTs. 
The architecture shifts from standard REST APIs to WebSocket/WebRTC sync engines where the Client holds the source of truth, and the Backend is merely a dumb broadcasting relay and persistence layer.
