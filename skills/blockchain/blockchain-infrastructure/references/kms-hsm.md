# KMS & HSM for Blockchain

## KMS Types

### Cloud HSMs
| Service                  | Provider | Compliance       | Key Types                    | Pricing                  |
|--------------------------|----------|------------------|------------------------------|--------------------------|
| AWS CloudHSM             | AWS      | FIPS 140-2 L3    | ECDSA, EdDSA, BLS, RSA      | ~$1.50/hr + usage       |
| Azure Managed HSM        | Azure    | FIPS 140-2 L3    | ECDSA, RSA, AES             | ~$1.20/hr + storage     |
| GCP Cloud HSM            | GCP      | FIPS 140-2 L3    | ECDSA, RSA, AES             | ~$3.00/key-version/yr   |
| IBM Cloud HSM            | IBM      | FIPS 140-2 L4    | ECDSA, RSA, BLS             | ~$2.50/hr               |

### KMS Services
| Service        | Provider | HSM Backed | Key Types                | Use Case                     |
|----------------|----------|------------|--------------------------|------------------------------|
| AWS KMS        | AWS      | Optional   | ECDSA (NIST), RSA, AES   | Validator key operations     |
| GCP Cloud KMS  | GCP      | Optional   | ECDSA (NIST/P-256), RSA  | Signing blockchain txs       |
| Azure Key Vault| Azure    | Standard   | ECDSA, RSA (BYOK)        | Key storage + signing        |

### On-Premise HSMs
- **HSM Luna (Thales)**: FIPS 140-2 L3/L4, PKCS#11, JCE, CNG/KSP interfaces, high-throughput signing (3000+ ECDSA sigs/sec per partition)
- **YubiHSM 2**: USB-connected, low-cost, PKCS#11, 100 ECDSA sigs/sec, suitable for validator backup signing
- **Nitrokey HSM**: USB key form factor, PKCS#11, open-source firmware, affordable (€50-200), limited throughput
- **Securosys Primus X**: High-performance HSM for blockchain, 10000+ ECDSA sigs/sec, BLS support, Ethereum validator staking

## Blockchain-Specific KMS

### Fireblocks
- MPC-based (GG18/GG20 threshold ECDSA), no single private key
- Policy engine: multi-user approval, time-based rules, whitelist-only destinations
- Network: dedicated peer-to-peer encrypted channel between Fireblocks nodes and exchange/wallet
- Integration: REST API, WebSocket for transaction status, Python/JS SDKs
- Supports: 50+ chains (BTC, ETH, SOL, MATIC, AVAX, etc.), staking, DeFi interactions

### Web3Auth
- MPC-based key management with social recovery (email, OAuth, passkeys)
- Threshold key sharding: 2-of-2 (Web3Auth node + user device) or custom TSS
- Integration: JS/React SDK, wallet adapter for MetaMask-style UX
- Use cases: non-custodial wallets, dApp onboarding without seed phrases

### Simplehold
- HSM-backed validator management for Ethereum PoS
- Secure enclave for signing key, withdrawal key in cold storage
- Dashboard for validator monitoring, balance tracking, exit management

### Metamask Institutional
- Multi-sig and MPC policy vault
- Integration with custody partners (Fireblocks, BitGo, Qredo)
- Delegated staking, DeFi portfolio management with policy controls

## HSM Integration

### PKCS#11 Interface
```c
// pkcs11_session.c — Open PKCS#11 session and sign
#include <pkcs11.h>
#include <stdio.h>

CK_FUNCTION_LIST_PTR funcs;
CK_SESSION_HANDLE session;
CK_SLOT_ID slot = 0;

void init_hsm() {
    CK_C_GetFunctionList(&funcs);

    // Initialize & open session
    funcs->C_Initialize(NULL);
    funcs->C_OpenSession(slot, CKF_SERIAL_SESSION | CKF_RW_SESSION,
                         NULL, NULL, &session);

    // Login with HSM SO (security officer) PIN
    funcs->C_Login(session, CKU_USER, "hsm-pin", 7);
}

void sign_ecdsa(CK_BYTE *hash, CK_ULONG hash_len, CK_BYTE *sig, CK_ULONG *sig_len) {
    CK_OBJECT_HANDLE key;
    CK_ATTRIBUTE key_template[] = {
        {CKA_CLASS, &(CK_OBJECT_CLASS){CKO_PRIVATE_KEY}, sizeof(CK_OBJECT_CLASS)},
        {CKA_KEY_TYPE, &(CK_KEY_TYPE){CKK_EC}, sizeof(CK_KEY_TYPE)},
        {CKA_LABEL, "eth-validator-key", 17},
    };

    CK_ULONG count;
    funcs->C_FindObjectsInit(session, key_template, 2);
    funcs->C_FindObjects(session, &key, 1, &count);
    funcs->C_FindObjectsFinal(session);

    if (count == 0) return;

    CK_MECHANISM mech = {CKM_ECDSA, NULL, 0};
    funcs->C_SignInit(session, &mech, key);
    funcs->C_Sign(session, hash, hash_len, sig, sig_len);
}

void close_hsm() {
    funcs->C_CloseSession(session);
    funcs->C_Finalize(NULL);
}
```

### Signing Operations
| Algorithm | Curve            | Signature Size | Use Case                        |
|-----------|------------------|----------------|---------------------------------|
| ECDSA     | secp256k1        | 64-72 bytes    | Ethereum, BTC, Cosmos, Polygon  |
| ECDSA     | NIST P-256       | 64 bytes       | Solana, Avalanche C-Chain       |
| ECDSA     | NIST P-384       | 96 bytes       | Hyperledger, enterprise chains  |
| EdDSA     | Ed25519          | 64 bytes       | Solana, Near, Cardano, Stellar  |
| BLS       | BLS12-381        | 48-96 bytes    | Ethereum consensus, Chia, Dfinity|
| Schnorr   | secp256k1        | 64 bytes       | Bitcoin (Taproot), BIP-340      |

### Key Import/Export
```bash
# PKCS#11 key import using pkcs11-tool (OpenSC)
pkcs11-tool --module /usr/lib/softhsm/libsofthsm2.so \
  --slot 0 --login --pin 1234 \
  --write-object eth-privkey.der \
  --type privkey --label "eth-validator-1" \
  --usage-sign

# Export public key
pkcs11-tool --module /usr/lib/softhsm/libsofthsm2.so \
  --slot 0 --login --pin 1234 \
  --read-object --label "eth-validator-1" \
  --type pubkey --output-file eth-pubkey.der
```

### Slot/Token Management
```bash
# Initialize a token (SO PIN + user PIN)
pkcs11-tool --slot 0 --init-token --so-pin 12345678 --label "BlockchainHSM"
pkcs11-tool --slot 0 --init-pin --so-pin 12345678 --pin 4321

# List slots and tokens
pkcs11-tool --list-slots
pkcs11-tool --list-tokens

# Generate key directly on HSM
pkcs11-tool --slot 0 --login --pin 4321 \
  --keypairgen --key-type EC:secp256k1 \
  --label "eth-withdrawal-1" --usage-sign
```

## Validator Key Management

### Ethereum (EIP-2335 Keystore)
```json
{
  "crypto": {
    "kdf": {
      "function": "scrypt",
      "params": { "dklen": 32, "n": 262144, "r": 8, "p": 1 },
      "message": ""
    },
    "checksum": {
      "function": "sha256",
      "params": {},
      "message": "0x..."
    },
    "cipher": {
      "function": "aes-128-ctr",
      "params": { "iv": "0x..." },
      "message": "0x..."
    }
  },
  "description": "",
  "pubkey": "0x...",
  "path": "m/12381/3600/0/0/0",
  "uuid": "abc12345-..."
}
```

**Key Separation**:
- **Withdrawal key**: controls withdrawal of staked ETH + rewards; should be in cold storage / HSM
- **Signing key**: active validator duties (attestations, proposals); stored on validator node (HSM or encrypted keystore)
- EIP-2335 encrypts the signing key with a password using scrypt + AES-128-CTR

### Solana
- **Stake authority**: manages staking operations (delegate, deactivate, withdraw); stored in HSM
- **Withdraw authority**: controls reward withdrawal; separate key from stake authority
- **Identity key**: validator identity for block production; kept on validator node with high availability
- Key management via `solana-keygen` with `--outfile` and passphrase encryption

### Cosmos
- `priv_validator_key.json`: JSON key file with `address`, `pub_key`, `priv_key`
- Key stored in `~/.<chaind>/config/priv_validator_key.json` by default
- Recommended: use Cosmos HSM integration via `tmkms` (Tendermint KMS) — supports Ledger, YubiHSM, SoftHSM
- `tmkms` configuration points to validator key on HSM via Chain ID:
```toml
# tmkms.toml
[[validator]]
chain_id = "cosmoshub-4"
addr = "tcp://127.0.0.1:26658"
secret_key = "/etc/tmkms/secret.key"
protocol = "grpc"

[[providers.softsign]]
path = "/etc/tmkms/priv_validator_key.json"
```

## MPC vs HSM

### Threshold Signatures (GG20, CMP)
| Protocol | Participants | Rounds | Security Model | Use Case                    |
|----------|-------------|--------|----------------|-----------------------------|
| GG18     | 2-n         | 3-4    | Honest-majority| Fireblocks, multi-party ETH |
| GG20     | 2-n         | 2-3    | Honest-majority| Improved over GG18          |
| CMP      | 2-n         | 2-3    | Malicious      | High-security MPC           |
| FROST    | 2-n         | 2      | Honest-majority| Threshold Schnorr (EdDSA)   |

### Multi-Party Computation for Distributed Key Signing
- Key never exists in a single location — shards stored across N parties
- Signing requires t-of-n shards to cooperate (e.g., 2-of-3)
- Communication via peer-to-peer channels (libp2p, websocket, gRPC)
- Pros: no single point of failure, no HSM hardware required, flexible quorum
- Cons: higher latency (network round trips), complex setup, key resharing overhead

### TEE-Based Approaches
- Signing inside Trusted Execution Environment (Intel SGX, AMD SEV, AWS Nitro)
- Key material sealed to TEE identity (attestation verified at boot)
- Examples: Oasis Network, Secret Network, Lit Protocol
- Pros: code-level security policies, remote attestation, composable with MPC
- Cons: SGX side-channel vulnerabilities, TCB size, supply chain trust

## Disaster Recovery

### Key Backup (Sharding)
```
Original key
      │
      ├── shard 1 (geographic: us-east-1)
      ├── shard 2 (geographic: eu-west-1)
      └── shard 3 (geographic: ap-southeast-1)
          
Any 2-of-3 shards reconstruct the key
```

### Shamir Secret Sharing (SLIP-39)
```python
# Example: Generate 3-of-5 shards for validator key
from mnemonic import Mnemonic
from slip39 import Shamir

mnemo = Mnemonic("english")
master_seed = mnemo.to_entropy("valid entropy phrase")

shares = Shamir.split(
    master_seed=master_seed,
    identifier=b"ETH-VAL1",
    extendable=True,
    group_threshold=1,
    groups=[
        ("primary", 3, 5),     # 3-of-5 in primary group
        ("backup",  2, 3),     # 2-of-3 in backup group
    ],
)
```

### Key Rotation
- **Scheduled rotation**: rotate signing keys every 6-12 months; no on-chain impact for most protocols
- **Post-compromise rotation**: emergency rotation when key leak suspected
  - 1. Generate new key pair on HSM
  - 2. Update validator registration (Ethereum: `set_validator_signing_key`)
  - 3. Revoke old key at HSM level
  - 4. Audit all signatures from compromised key period
- **Withdrawal key rotation**: Ethereum EIP-3030-like mechanism (requires full withdrawal credential change)

### Incident Response for Key Compromise
1. **Containment**: disconnect compromised system, revoke HSM user access, isolate network
2. **Mitigation**: rotate all signing keys, transfer funds from associated wallets to new safe addresses
3. **Recovery**: reconstruct key from shamir shards only if absolutely necessary (and only on clean HSM/air-gapped machine)
4. **Root cause**: audit logs, access patterns, physical security review
5. **Post-mortem**: update key management policy, increase monitoring (signature volume anomalies, unauthorized access attempts)

## Compliance

### SOC 2 Type II
- Cloud KMS/HSM providers typically SOC 2 certified (AWS, GCP, Azure)
- On-premise HSMs require organizational SOC 2 audit covering:
  - Key lifecycle management (creation → usage → rotation → destruction)
  - Access controls (PIV/smart card + PIN for HSM admin)
  - Audit logging (all key operations timestamped and logged)
  - Physical security (datacenter access logs, camera surveillance for on-prem HSMs)

### Auditable Signing Logs
```json
{
  "timestamp": "2025-06-15T14:30:00Z",
  "operation": "sign",
  "key_id": "eth-validator-1",
  "algorithm": "ECDSA_SECP256K1",
  "hash_hex": "0xabc123...",
  "signature_hex": "0xdef456...",
  "session_id": "sess-789",
  "user": "automation/signing-service",
  "result": "success"
}
```
- All signing operations logged to tamper-evident audit trail (SIEM / Splunk / Elasticsearch)
- Logs include: key ID, algorithm, hash, signature, timestamp, requesting service user
- Retention: minimum 7 years for financial compliance (SOC, SOX, MiFID II)

### Quorum Approval Policies
```yaml
# Approval policy for high-value transactions
policies:
  - name: "validator-stake-withdrawal"
    required_approvals: 3
    approver_pool:
      - "ops-team@company.com"
      - "security-team@company.com"
      - "compliance-officer@company.com"
    timeout_hours: 72

  - name: "hot-wallet-signing"
    required_approvals: 2
    approver_pool:
      - "ops-team@company.com"
    timeout_minutes: 30
    auto_approve: false
    rate_limit: 10_per_minute
```

### BIP-327 (MuSig2)
- Multi-signature scheme for Bitcoin Taproot (P2TR)
- Combines multiple signers into a single aggregate public key and signature
- Use cases: multi-sig vaults, quorum signing policies without on-chain overhead
- HSM support: requires HSM firmware that supports MuSig2 key aggregation algorithm

## Code: AWS KMS Sign with ECDSA secp256k1
```python
#!/usr/bin/env python3
"""aws-kms-sign.py — Sign Ethereum tx with AWS KMS"""

import boto3, eth_keys, hashlib, json
from eth_account import Account
from eth_account.messages import encode_defunct

kms = boto3.client("kms", region_name="us-east-1")
KEY_ID = "arn:aws:kms:us-east-1:123456789012:key/abc123-..."

def get_kms_public_key(key_id: str) -> bytes:
    resp = kms.get_public_key(KeyId=key_id)
    return resp["PublicKey"]

def sign_with_kms(key_id: str, digest: bytes) -> bytes:
    resp = kms.sign(
        KeyId=key_id,
        Message=digest,
        MessageType="DIGEST",
        SigningAlgorithm="ECDSA_SHA_256",
    )
    return resp["Signature"]

# Convert DER-encoded KMS signature to raw (r,s) format
def der_to_raw(der_sig: bytes) -> tuple:
    # DER encoding: 0x30 0x<len> 0x02 0x<rlen> <r> 0x02 0x<slen> <s>
    assert der_sig[0] == 0x30
    r_len = der_sig[3]
    r = int.from_bytes(der_sig[4:4+r_len], "big")
    s_len = der_sig[5+r_len]
    s = int.from_bytes(der_sig[6+r_len:6+r_len+s_len], "big")
    # Normalize s (low-s form for ECDSA)
    half_curve = 0x7FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF5D576E7357A4501DDFE92F46681B20A0
    if s > half_curve:
        s = int("0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141", 16) - s
    return (r, s)

# Sign an Ethereum transaction hash
tx_hash = bytes.fromhex("abc123...")
sig_der = sign_with_kms(KEY_ID, tx_hash)
r, s = der_to_raw(sig_der)
v = 27 + (1 if s != sig_der else 0)  # quick v calculation

signed_tx = f"0x{tx_hash.hex()}{r:064x}{s:064x}{v:02x}"
```

## Code: PKCS#11 C Session
```c
// pkcs11_sign.c — Full ECDSA sign cycle via PKCS#11
#include <pkcs11.h>
#include <stdio.h>
#include <string.h>

int main() {
    CK_FUNCTION_LIST_PTR funcs;
    CK_SESSION_HANDLE session;
    CK_RV rv;

    // Load PKCS#11 module
    // On Linux: /usr/lib/softhsm/libsofthsm2.so
    // On macOS: /usr/local/lib/softhsm/libsofthsm2.so
    // On Luna: /usr/luna/lib/libCryptoki2_64.so
    CK_C_GetFunctionList(&funcs);

    rv = funcs->C_Initialize(NULL);
    if (rv != CKR_OK) { fprintf(stderr, "C_Initialize failed: %lu\n", rv); return 1; }

    CK_SLOT_ID slot = 0;
    rv = funcs->C_OpenSession(slot, CKF_SERIAL_SESSION | CKF_RW_SESSION, NULL, NULL, &session);
    rv = funcs->C_Login(session, CKU_USER, (CK_UTF8CHAR_PTR)"1234", 4);

    // Find signing key
    CK_OBJECT_HANDLE key;
    CK_OBJECT_CLASS cls = CKO_PRIVATE_KEY;
    CK_KEY_TYPE kt = CKK_EC;
    CK_ATTRIBUTE tmpl[] = {
        {CKA_CLASS, &cls, sizeof(cls)},
        {CKA_KEY_TYPE, &kt, sizeof(kt)},
        {CKA_LABEL, "eth-validator-1", 16},
    };

    CK_ULONG count;
    funcs->C_FindObjectsInit(session, tmpl, 3);
    funcs->C_FindObjects(session, &key, 1, &count);
    funcs->C_FindObjectsFinal(session);

    if (count == 0) {
        fprintf(stderr, "Key not found\n");
        return 1;
    }

    // Sign message hash (32 bytes for keccak256)
    CK_BYTE hash[32] = {0xab, 0xcd, ...};  // 32-byte hash
    CK_BYTE sig[72];
    CK_ULONG sig_len = sizeof(sig);

    CK_MECHANISM mech = {CKM_ECDSA, NULL, 0};
    rv = funcs->C_SignInit(session, &mech, key);
    rv = funcs->C_Sign(session, hash, sizeof(hash), sig, &sig_len);

    printf("Signature (%lu bytes): ", sig_len);
    for (CK_ULONG i = 0; i < sig_len; i++) printf("%02x", sig[i]);
    printf("\n");

    funcs->C_CloseSession(session);
    funcs->C_Finalize(NULL);
    return 0;
}
```

## Code: Fireblocks API Transaction
```python
#!/usr/bin/env python3
"""fireblocks-tx.py — Submit transaction via Fireblocks API"""

import json, time, requests, hashlib
from cryptography.hazmat.primitives import serialization, hashes
from cryptography.hazmat.primitives.asymmetric import ec
from cryptography.hazmat.backends import default_backend

FIREBLOCKS_API = "https://api.fireblocks.io/v1"
API_KEY = "your-api-key"
API_SECRET = open("fireblocks_secret.key", "rb").read()

def sign_jwt(secret_key: bytes, payload: dict) -> str:
    # Fireblocks uses RS256 JWT
    from jwt import JWT
    from jwt.jwk import RSAJWK
    private_key = serialization.load_pem_private_key(secret_key, password=None, backend=default_backend())
    rsa_key = RSAJWK.from_pyca(private_key)
    return JWT().encode(payload, rsa_key, alg="RS256")

def create_transaction(asset: str, amount: str, destination: str, note: str):
    body = {
        "assetId": asset,
        "amount": amount,
        "destination": {"type": "ONE_TIME_ADDRESS", "oneTimeAddress": {"address": destination}},
        "note": note,
        "feeLevel": "MEDIUM",
    }

    # JWT for authentication
    jwt_payload = {
        "uri": "/v1/transactions",
        "nonce": str(int(time.time() * 1000)),
        "iat": int(time.time()),
        "exp": int(time.time()) + 30,
        "sub": API_KEY,
        "bodyHash": hashlib.sha256(json.dumps(body, sort_keys=True).encode()).hexdigest(),
    }
    token = sign_jwt(API_SECRET, jwt_payload)

    headers = {
        "X-API-Key": API_KEY,
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
    }

    resp = requests.post(f"{FIREBLOCKS_API}/transactions", json=body, headers=headers)
    return resp.json()

# Usage
# result = create_transaction("ETH", "0.1", "0x...", "withdrawal to cold wallet")
# print(json.dumps(result, indent=2))
```
