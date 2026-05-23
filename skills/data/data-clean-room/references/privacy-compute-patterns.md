# Privacy Compute Patterns

## Private Set Intersection (PSI) Protocols

### ECDH-PSI (Elliptic Curve Diffie-Hellman)

ECDH-PSI is the most widely deployed PSI protocol for production clean rooms. It requires no trusted third party.

#### Protocol Flow

```
Party A (Publisher)           Party B (Advertiser)
1. Generate EC keypair (skA, pkA)    1. Generate EC keypair (skB, pkB)
2. Hash identifiers to EC points     2. Hash identifiers to EC points
3. Blind: H(id) * skA               3. Blind: H(id) * skB
4. Send blinded set to B ─────────►  4. Re-blind: H(id)*skA*skB
                                      5. Send double-blinded to A
◄───────── Send double-blinded set
6. Re-blind: H(id)*skB*skA
7. Send double-blinded to B ─────────►
8. Compare sets: match = intersection
```

#### Implementation

```python
from cryptography.hazmat.primitives.asymmetric import ec
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.hkdf import HKDF
import hashlib
import secrets

class ECDHPSI:
    def __init__(self):
        self.private_key = ec.generate_private_key(ec.SECP256R1())
        self.public_key = self.private_key.public_key()

    def hash_to_curve(self, identifier: str) -> ec.EllipticCurvePublicKey:
        """Hash an identifier to an EC point."""
        digest = hashlib.sha256(identifier.encode()).digest()
        # Derive EC point from hash (simplified - production uses hash-to-curve)
        hkdf = HKDF(
            algorithm=hashes.SHA256(),
            length=32,
            salt=None,
            info=b"psi-ec-point",
        )
        key_bytes = hkdf.derive(digest)
        # Use key_bytes as x-coordinate to derive point
        return ec.derive_private_key(
            int.from_bytes(key_bytes, 'big'), ec.SECP256R1()
        ).public_key()

    def blind(self, point: ec.EllipticCurvePublicKey) -> ec.EllipticCurvePublicKey:
        """Blind a point with our private key."""
        # ECDH: multiply point by private key scalar
        shared_key = self.private_key.exchange(ec.ECDH(), point)
        return self.hash_to_curve(shared_key.hex())

    def compute_intersection(
        self, our_ids: list[str], their_blinded_set: set[bytes]
    ) -> set[str]:
        """Find intersection of our IDs with their blinded set."""
        intersection = set()
        for ident in our_ids:
            point = self.hash_to_curve(ident)
            blinded = self.blind(point)
            blinded_bytes = blinded.public_bytes_raw()
            if blinded_bytes in their_blinded_set:
                intersection.add(ident)
        return intersection
```

### OPRF-PSI (Oblivious Pseudorandom Function)

OPRF-PSI requires an OPRF server that holds a secret key. Parties query the server for PRF evaluations without revealing their inputs.

```
Party A ──► OPRF Server (sk) ──► PRF(id)^sk
Party B ──► OPRF Server (sk) ──► PRF(id)^sk
Party A sends PRF results to Party B
Party B compares: match = intersection
```

### Circuit-PSI

Circuit-PSI uses generic secure multi-party computation (MPC) circuits for maximum privacy at the cost of performance. Best for small sets (< 10,000 elements) when privacy requirements are extreme.

| PSI Protocol | Communication | Computation | Trust Model | Set Size Limit |
|---|---|---|---|---|
| Naive Hash | O(n) | O(n) | Trusted 3rd party | Unlimited |
| ECDH-PSI | O(n) | O(n log n) | No TTP | 10M+ |
| OPRF-PSI | O(n) | O(n) | OPRF server | 10M+ |
| Circuit-PSI | O(n log n) | O(n log n) | No TTP | 10K |

## Differential Privacy Budget Management

Differential privacy ensures that the output of a query does not reveal whether any individual's data was included.

### Epsilon Budget Tracking

```python
import json
from datetime import datetime, timedelta
from typing import Dict

class PrivacyBudgetTracker:
    def __init__(self, epsilon_total: float, delta_total: float):
        self.epsilon_total = epsilon_total
        self.delta_total = delta_total
        self.epsilon_used = 0.0
        self.delta_used = 0.0
        self.query_log: list[Dict] = []

    def check_budget(self, query_cost: float) -> bool:
        """Check if query can be executed within remaining budget."""
        return (self.epsilon_used + query_cost) <= self.epsilon_total

    def record_query(self, query_id: str, epsilon_cost: float, delta_cost: float):
        self.epsilon_used += epsilon_cost
        self.delta_used += delta_cost
        self.query_log.append({
            "query_id": query_id,
            "epsilon_cost": epsilon_cost,
            "delta_cost": delta_cost,
            "timestamp": datetime.utcnow().isoformat(),
            "epsilon_remaining": self.epsilon_total - self.epsilon_used,
        })

    def budget_status(self) -> Dict:
        return {
            "epsilon_remaining": self.epsilon_total - self.epsilon_used,
            "delta_remaining": self.delta_total - self.delta_used,
            "queries_executed": len(self.query_log),
            "last_query": self.query_log[-1] if self.query_log else None,
        }

# Per-party budget
parties = {
    "publisher_a": PrivacyBudgetTracker(epsilon_total=1.0, delta_total=1e-6),
    "publisher_b": PrivacyBudgetTracker(epsilon_total=1.0, delta_total=1e-6),
    "advertiser": PrivacyBudgetTracker(epsilon_total=2.0, delta_total=1e-6),
}
```

### Query Cost Estimation

| Query Type | Epsilon Cost | Description |
|---|---|---|
| COUNT(*) with noise | 0.01 | Simple count with Laplace noise |
| SUM(revenue) with noise | 0.05 | Aggregate sum with calibrated noise |
| AVG with noise | 0.05 | Average with noise |
| Histogram (10 bins) | 0.1 | 10-bin distribution |
| Percentile (p50, p90) | 0.2 | Two percentile values |
| Full distribution | 0.5 | Complete distribution |
| ML model training | 1.0 - 10.0 | Depends on epochs |
| Multiple queries on same data | Cumulative | Sum of individual costs |

## Output Suppression Techniques

### Cell Suppression

Hide individual cells in a result set when the count is below a threshold:

```sql
-- Suppress small cells
SELECT
    campaign_id,
    CASE
        WHEN COUNT(DISTINCT user_id) < 10 THEN 'SUPPRESSED'
        ELSE CAST(COUNT(DISTINCT user_id) AS STRING)
    END AS unique_reach,
    CASE
        WHEN SUM(revenue) IS NULL OR COUNT(DISTINCT user_id) < 10 THEN NULL
        ELSE ROUND(SUM(revenue) / 10) * 10  -- Ceil to nearest 10
    END AS total_revenue_rounded
FROM publisher.impressions i
JOIN advertiser.conversions c ON i.user_id = c.user_id
GROUP BY campaign_id
HAVING COUNT(DISTINCT user_id) >= 100
```

### Rounding and Thresholding

```python
import math

def suppress_small_counts(value: int, threshold: int = 10) -> int | None:
    """Suppress counts below threshold."""
    if value < threshold:
        return None
    return value

def ceil_round(value: float, base: int = 10) -> float:
    """Round up to nearest base. 123 -> 130"""
    return math.ceil(value / base) * base

def floor_round(value: float, base: int = 10) -> float:
    """Round down to nearest base. 123 -> 120"""
    return math.floor(value / base) * base

def apply_privacy_filters(
    rows: list[dict],
    min_count: int = 100,
    suppress_threshold: int = 10,
    rounding_base: int = 10,
) -> list[dict]:
    """Apply privacy filters to query output rows."""
    filtered = []
    for row in rows:
        # Skip groups below minimum count
        if row.get("count", 0) < min_count:
            continue
        # Suppress small individual cells
        suppressed = {}
        for key, value in row.items():
            if isinstance(value, (int, float)):
                if isinstance(value, int) and value < suppress_threshold:
                    continue
                suppressed[key] = ceil_round(value, rounding_base)
            else:
                suppressed[key] = value
        filtered.append(suppressed)
    return filtered
```

## Secure Multi-Party Computation (MPC) Patterns

### Additive Secret Sharing

Split a value into shares such that only the sum reveals the original value:

```python
import secrets

def share_secret(secret: int, num_parties: int = 3) -> list[int]:
    """Split a secret into additive shares."""
    shares = []
    running_sum = 0
    for _ in range(num_parties - 1):
        share = secrets.randbelow(10**12)
        shares.append(share)
        running_sum += share
    # Last share makes the sum work
    shares.append(secret - running_sum)
    return shares

def reconstruct(shares: list[int]) -> int:
    """Reconstruct secret from shares."""
    return sum(shares)

# Example: three parties each hold a share of revenue
party_a_revenue = 50000
shares = share_secret(party_a_revenue, 3)
# Party 1 gets: shares[0]
# Party 2 gets: shares[1]
# Party 3 gets: shares[2]
# No single party knows the total
total = reconstruct(shares)  # 50000
# Only the sum is revealed, individual values stay private
```

### Secure Aggregation

```python
import random

def secure_aggregate(parties: list[int]) -> int:
    """
    Compute sum of values held by multiple parties without revealing individual values.
    Uses additive secret sharing with random masks.
    """
    n = len(parties)
    masks = [[0] * n for _ in range(n)]

    # Each party generates random masks for their value
    for i in range(n):
        mask_sum = 0
        for j in range(n):
            if i != j:
                masks[i][j] = random.randint(-10**9, 10**9)
                mask_sum += masks[i][j]
        # The sum of all masks for party i is 0
        # This ensures correct final result

    # In practice, parties exchange masks pairwise over secure channels
    # Each party sends mask[i][j] to party j
    # Each party computes: value_i + sum(masks[j][i] for j != i)
    # The result is sent to the aggregator
    # Aggregator sums all results = sum of all values

    # Simplified: trust-based aggregation
    # In production, use proper SPDZ or similar protocol
    return sum(parties)

# Three parties compute total revenue without revealing their individual revenue
total = secure_aggregate([50000, 75000, 62000])
print(f"Total combined revenue: {total}")  # 187000
```

## Compliance Mapping

| Requirement | PSI | Differential Privacy | MPC | Clean Room |
|---|---|---|---|---|
| GDPR Art. 5 (data minimization) | ✅ | ✅ | ✅ | ✅ |
| GDPR Art. 9 (special categories) | ✅ | ✅ | ✅ | ✅ |
| CCPA opt-out | ✅ | ✅ | ✅ | ✅ |
| HIPAA Limited Data Set | ✅ | ✅ | ✅ | ✅ |
| Financial data (GLBA) | ✅ | ✅ | ✅ | ✅ |
| Children's data (COPPA) | ❌ (needs more) | ❌ (needs more) | ❌ | ✅ (with restrictions) |
| Cross-border data transfer | ✅ | ✅ | ✅ | ❌ (jurisdiction locked) |
