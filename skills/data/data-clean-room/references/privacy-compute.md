# Privacy Compute Patterns Reference

## Homomorphic Encryption

Homomorphic encryption allows computation on encrypted data without decryption.

### Types of Homomorphic Encryption

| Scheme | Operations Supported | Performance | Use Case |
|--------|---------------------|-------------|----------|
| Partially HE (PHE) | Addition OR multiplication | Fast | Simple aggregation |
| Somewhat HE (SWHE) | Both, limited depth | Moderate | Basic analytics |
| Leveled HE (LHE) | Both, configurable depth | Slow | Complex circuits |
| Fully HE (FHE) | Both, unlimited | Very slow | General computation |

### Python Example: Encrypted Sum

```python
# Using PySEAL (simplified example)
import seal

# Setup
parms = seal.EncryptionParameters(seal.scheme_type.bfv)
parms.set_poly_modulus_degree(4096)
parms.set_coeff_modulus(seal.CoeffModulus.BFVDefault(4096))
parms.set_plain_modulus(1024)

context = seal.SEALContext.Create(parms)
keygen = seal.KeyGenerator(context)
public_key = keygen.public_key()
secret_key = keygen.secret_key()
relin_keys = keygen.relin_keys()

encryptor = seal.Encryptor(context, public_key)
evaluator = seal.Evaluator(context)
decryptor = seal.Decryptor(context, secret_key)

# Party A encrypts their values
values_a = [100, 200, 150]
encrypted_a = [encryptor.encrypt(seal.Plaintext(str(v))) for v in values_a]

# Party B encrypts their values
values_b = [50, 75, 100]
encrypted_b = [encryptor.encrypt(seal.Plaintext(str(v))) for v in values_b]

# Compute on encrypted values (without decrypting)
encrypted_sum = []
for a, b in zip(encrypted_a, encrypted_b):
    sum_ab = seal.Ciphertext()
    evaluator.add(sum_ab, a, b)
    encrypted_sum.append(sum_ab)

# Only the party with the secret key can decrypt
for encrypted in encrypted_sum:
    plain = decryptor.decrypt(encrypted)
    print(f"Decrypted sum: {plain.to_string()}")

# Without the secret key, the encrypted values reveal nothing
```

## Secure Multi-Party Computation (MPC)

MPC allows multiple parties to jointly compute a function over their inputs while keeping those inputs private.

### MPC Protocols

| Protocol | Rounds | Communication | Computation | Parties |
|----------|--------|---------------|-------------|---------|
| Garbled Circuits (GC) | Constant | O(|C|) | Moderate | 2-3 |
| Secret Sharing (SS) | O(depth) | O(n|C|) | Fast | 3+ |
| GMW | O(depth) | O(n^2) | Moderate | 2+ |
| SPDZ | Preprocessing | O(|C|) | Moderate | 2+ |

### Example: Private Set Intersection (PSI) with ECDH

```python
# ECDH-based PSI for two parties
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.asymmetric import ec
import secrets

class ECDHPSI:
    def __init__(self):
        self.private_key = ec.generate_private_key(
            ec.SECP256R1(), secrets.randbelow
        )

    def blind(self, identifiers: list[str]) -> list[bytes]:
        """Blind identifiers with private key."""
        blinded = []
        for identifier in identifiers:
            # Hash identifier to curve point
            digest = hashes.Hash(hashes.SHA256())
            digest.update(identifier.encode())
            point_bytes = digest.finalize()

            # Blind with private key
            blinded_point = self.private_key.public_key().exchange(
                ec.ECDH(), self._bytes_to_public_key(point_bytes)
            )
            blinded.append(blinded_point)
        return blinded

    def compute_intersection(
        self,
        my_blinded: list[bytes],
        their_blinded: list[bytes],
        my_identifiers: list[str]
    ) -> list[str]:
        """Find intersection of blinded sets."""
        # Double-blind each other's blinded values
        double_blinded = {}
        for blinded in their_blinded:
            key = self.private_key.public_key().exchange(
                ec.ECDH(), self._bytes_to_public_key(blinded)
            )
            double_blinded[key] = blinded

        # Match against our own double-blinded set
        intersection = []
        for i, my_blind in enumerate(my_blinded):
            my_double = self.private_key.public_key().exchange(
                ec.ECDH(), self._bytes_to_public_key(my_blind)
            )
            if my_double in double_blinded:
                intersection.append(my_identifiers[i])

        return intersection

# Two parties each run:
# party_a = ECDHPSI()
# party_b = ECDHPSI()
# a_blinded = party_a.blind(party_a_identifiers)
# b_blinded = party_b.blind(party_b_identifiers)
# Exchange blinded sets, then:
# intersection = party_a.compute_intersection(a_blinded, b_blinded, party_a_identifiers)
```

## Trusted Execution Environments (TEE)

TEEs provide hardware-enforced isolation for code and data in memory.

### TEE Technologies

| Technology | Provider | Memory Limit | Attestation | Data Types |
|------------|----------|-------------|-------------|------------|
| Intel SGX | Intel | 128-512 MB | EPID, ECDSA | Structured |
| Intel TDX | Intel | Full system | TD-Quote | Any |
| AMD SEV-SNP | AMD | Full system | SNP Report | Any |
| Nitro Enclaves | AWS | Configurable | Nitro Attestation | Any |
| Confidential VMs | Azure | Full system | vTPM | Any |

### Example: TEE-Based Aggregation

```python
# Simplified TEE-based clean room computation
class TEECleanRoom:
    def __init__(self, attestation_service: str):
        self.attestation_service = attestation_service
        self._verify_enclave()

    def _verify_enclave(self) -> bool:
        """Verify enclave identity via attestation."""
        # In practice: verify MRENCLAVE, MRSIGNER, etc.
        return True

    def ingest_data(self, data: list[dict], party: str):
        """Receive encrypted data inside the enclave."""
        # Data is encrypted at rest and in transit
        # Inside TEE, it's decrypted and processed
        self._store_encrypted(data, party)

    def compute_aggregation(
        self,
        metric: str,
        group_by: list[str],
        min_count: int = 100
    ) -> dict:
        """Compute privacy-preserving aggregation inside TEE."""
        # All data processing happens inside the enclave
        # No party can see another party's raw data
        result = self._aggregate_in_enclave(metric, group_by)

        # Apply privacy controls before output
        for group in result:
            if group["count"] < min_count:
                del group  # Suppress small groups
        return result

    def _aggregate_in_enclave(self, metric: str, group_by: list[str]) -> list[dict]:
        """Perform aggregation inside the enclave memory."""
        # The host system cannot inspect enclave memory
        # Only the final result leaves the enclave
        ...
```

## Federated Learning

Federated learning trains ML models across decentralized data without moving the data to a central location.

### Federated Learning Workflow

```
Round 1..N:
  1. Central server sends current model to all parties
  2. Each party trains model on their local data
  3. Each party sends model updates (gradients) to server
  4. Server aggregates updates (Federated Averaging)
  5. Server updates global model
  6. Repeat until convergence
```

### FedAvg Implementation

```python
import numpy as np

class FederatedAveraging:
    def __init__(self, model_weights: dict):
        self.global_weights = model_weights
        self.participants = []

    def local_training(self, local_data: np.ndarray, local_labels: np.ndarray, epochs: int) -> dict:
        """Simulate local model training (in practice: train a real model)."""
        # In production: run on-premise, data never leaves the party
        # Local model update: Δw_i = w_i_trained - w_global
        local_weights = self._train(self.global_weights, local_data, local_labels, epochs)
        update = {
            "weights": local_weights,
            "num_samples": len(local_data)
        }
        return update

    def aggregate_updates(self, local_updates: list[dict]) -> dict:
        """Federated averaging of model updates."""
        total_samples = sum(u["num_samples"] for u in local_updates)
        aggregated = {}

        for key in self.global_weights:
            weighted_sum = np.zeros_like(self.global_weights[key])
            for update in local_updates:
                weight = update["num_samples"] / total_samples
                weighted_sum += weight * update["weights"][key]
            aggregated[key] = weighted_sum

        self.global_weights = aggregated
        return self.global_weights

    def _train(self, weights, data, labels, epochs):
        """Local model training."""
        # Placeholder: in practice, train neural network, XGBoost, etc.
        return weights  # Return updated weights
```

### Differential Privacy in Federated Learning

```python
class DPFederatedLearning:
    def __init__(self, epsilon: float = 1.0, delta: float = 1e-5):
        self.epsilon = epsilon
        self.delta = delta
        self.sensitivity = 1.0  # Depends on model and data

    def add_noise_to_gradients(self, gradients: dict) -> dict:
        """Add Gaussian noise for differential privacy."""
        noise_scale = np.sqrt(2 * np.log(1.25 / self.delta)) / self.epsilon
        noisy_gradients = {}
        for key, grad in gradients.items():
            clip_norm = 1.0
            grad_norm = np.linalg.norm(grad)
            clipped_grad = grad * min(1.0, clip_norm / grad_norm)
            noise = np.random.normal(0, noise_scale, size=grad.shape)
            noisy_gradients[key] = clipped_grad + noise
        return noisy_gradients

    def compute_privacy_spent(self, num_rounds: int, sampling_rate: float) -> float:
        """Compute cumulative privacy loss (Renyi DP composition)."""
        # Moments accountant for tight privacy accounting
        epsilon_spent = num_rounds * sampling_rate * self.epsilon
        return epsilon_spent
```

## Rules
- Homomorphic encryption is computationally expensive — use only for small aggregations
- MPC is practical for 2-3 parties with moderate data volumes
- TEEs provide the best performance but depend on hardware trust assumptions
- Federated learning trains models without moving raw data from source
- Differential privacy provides formal privacy guarantees with calibrated noise
- Always combine multiple privacy techniques for defense in depth
- Document privacy guarantees (epsilon, delta) for each computation
- Test privacy-preserving computations with synthetic data before production
- Consider the trust model: who are you protecting data from?
- Privacy budget management is essential for repeated computations
