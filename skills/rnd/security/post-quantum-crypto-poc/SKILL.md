---
name: post-quantum-crypto-poc
description: >
  Use this skill when the user says 'PQC proof of concept', 'hybrid TLS', 'X25519MLKEM768', 'ML-KEM in TLS', 'test post-quantum handshake', 'liboqs', 'oqs-provider', 'OpenSSL 3.5 PQC', 'harvest now decrypt later test'. Builds a hands-on PoC of post-quantum and hybrid key exchange and signatures: enabling X25519MLKEM768 in TLS stacks, running ML-KEM/ML-DSA with liboqs, measuring handshake size/latency, and finding middlebox/interop breakage. Do NOT use for: migration strategy, inventory, and standards overview (quantum-computing/post-quantum-crypto), or general TLS hardening (security skills).
version: "2.0.0"
author: "j4flmao"
license: "MIT"
tags: [rnd, security, post-quantum-crypto-poc, ml-kem, ml-dsa, hybrid-tls, liboqs]
---

# Post-Quantum Crypto PoC (Hybrid TLS & PQ Primitives)

## Purpose
Prove in your own environment that post-quantum key exchange works end to end: clients and servers negotiate a hybrid group (classical X25519 + ML-KEM-768), larger handshakes pass through load balancers and proxies, and the latency/size cost is acceptable. Separately, exercise ML-KEM and ML-DSA directly to understand key and signature sizes before designing protocols around them.

## Agent Protocol

### Trigger
"hybrid TLS", "X25519MLKEM768", "ML-KEM", "Kyber in TLS", "ML-DSA", "Dilithium", "liboqs", "oqs-provider", "OpenSSL 3.5", "PQC PoC".

### Input Context
- TLS stack(s): OpenSSL version, Go, BoringSSL/Chrome, Java, nginx/HAProxy/Envoy, cloud load balancers.
- Network path: proxies, WAFs, IDS, TLS-inspecting middleboxes.
- Success metrics: negotiation rate, handshake latency, failure modes.

### Output Artifact
PoC plan and commands: enable hybrid groups, test matrix, measurement results template, findings on interop.

### Response Format
```
Stack: {component: version, PQ support}
Group: X25519MLKEM768 (codepoint 0x11EC) + fallback X25519
Test: {client} -> {path} -> {server}: negotiated={group}, handshake={ms}, ClientHello={bytes}
Breakage: {component, symptom}
Signatures: classical certs (PQ certs out of scope unless testing ML-DSA offline)
```

### Completion Criteria
- [ ] Hybrid group negotiated on the full real network path, not just localhost.
- [ ] Classical fallback verified for non-PQ clients.
- [ ] Handshake size and latency measured vs X25519-only.
- [ ] Middlebox issues (ClientHello > one packet) identified.

## Background (short)
- NIST finalized FIPS 203 (ML-KEM, from Kyber), FIPS 204 (ML-DSA, from Dilithium), and FIPS 205 (SLH-DSA, from SPHINCS+) in August 2024; FN-DSA (Falcon) is the forthcoming FIPS 206; HQC was selected in 2025 as an additional KEM.
- Hybrid key exchange combines X25519 and ML-KEM so the session stays secure if either holds. `X25519MLKEM768` is the IETF hybrid group deployed by major browsers and CDNs and supported natively in OpenSSL 3.5+ and Go 1.24+ (enabled by default in both).
- ML-KEM-768 sizes: encapsulation key 1,184 bytes, ciphertext 1,088 bytes, shared secret 32 bytes. ML-DSA-65: public key 1,952 bytes, signature 3,309 bytes. Larger ClientHellos can exceed one TCP segment and break buggy middleboxes.

## TLS Tests

OpenSSL 3.5+:
```bash
openssl version                                    # expect 3.5 or newer
openssl list -kem-algorithms | grep -i mlkem
# Server
openssl s_server -accept 8443 -cert server.crt -key server.key -groups X25519MLKEM768:X25519
# Client: shows negotiated group in the handshake summary
openssl s_client -connect localhost:8443 -groups X25519MLKEM768 -brief </dev/null
```
For OpenSSL 3.0-3.4, the Open Quantum Safe `oqs-provider` adds PQ groups via `-provider oqsprovider -provider default`.

nginx built against OpenSSL 3.5:
```nginx
ssl_protocols TLSv1.3 TLSv1.2;
ssl_ecdh_curve X25519MLKEM768:X25519:prime256v1;
```

Go 1.24+ client (hybrid is the default; set explicitly to test):
```go
package main

import (
	"crypto/tls"
	"fmt"
	"log"
	"net/http"
	"time"
)

func main() {
	tr := &http.Transport{TLSClientConfig: &tls.Config{
		MinVersion:       tls.VersionTLS13,
		CurvePreferences: []tls.CurveID{tls.X25519MLKEM768, tls.X25519},
	}}
	client := &http.Client{Transport: tr, Timeout: 10 * time.Second}
	resp, err := client.Get("https://pq.example.internal:8443/")
	if err != nil {
		log.Fatalf("handshake/request failed: %v", err)
	}
	defer resp.Body.Close()
	fmt.Println("TLS version:", resp.TLS.Version, "status:", resp.Status)
}
```
To confirm which group was negotiated, check the server side (`openssl s_server` prints it) or a packet capture of the key_share extension.

Browser check: recent Chrome/Firefox negotiate X25519MLKEM768 by default; inspect with the browser's security panel or a packet capture (Wireshark shows the key_share group).

## PQ Primitives with liboqs (Python)

```python
import oqs   # liboqs-python; requires the liboqs C library

with oqs.KeyEncapsulation("ML-KEM-768") as client:
    public_key = client.generate_keypair()
    with oqs.KeyEncapsulation("ML-KEM-768") as server:
        ciphertext, secret_server = server.encap_secret(public_key)
    secret_client = client.decap_secret(ciphertext)
    if secret_client != secret_server:
        raise RuntimeError("ML-KEM shared secrets differ")
    print(len(public_key), len(ciphertext), len(secret_client))   # 1184 1088 32

with oqs.Signature("ML-DSA-65") as signer:
    pk = signer.generate_keypair()
    msg = b"release-manifest-v1"
    sig = signer.sign(msg)
    with oqs.Signature("ML-DSA-65") as verifier:
        if not verifier.verify(msg, sig, pk):
            raise RuntimeError("ML-DSA signature failed to verify")
```
liboqs is a research/prototyping library; for production use FIPS-validated or mainstream implementations (OpenSSL 3.5, BoringSSL, AWS-LC, Go `crypto/mlkem`).

## Test Matrix
| Client | Path | Server | Check |
|---|---|---|---|
| OpenSSL 3.5 s_client | direct | nginx+OpenSSL 3.5 | Negotiates hybrid |
| Chrome stable | corporate proxy | nginx | Hybrid or clean fallback |
| Legacy client (OpenSSL 1.1) | direct | nginx | Falls back to X25519 |
| Go 1.24 service | L4/L7 load balancer | service mesh sidecar | Every hop supports or terminates correctly |

Record: negotiated group, ClientHello size, handshake time p50/p95 (e.g. `curl -w '%{time_appconnect}'`), error rate.

## Findings to Expect
- TLS-terminating load balancers/proxies decide the group on their hop; PQ at the edge says nothing about internal hops.
- Some middleboxes drop or reset ClientHellos split across packets.
- Certificates and signatures remain classical in WebPKI for now; PQ signatures mainly affect internal PKI, code signing, and firmware where you control verifiers.

## Anti-Patterns
- Pure-PQ key exchange without a classical component in production (hybrid is the deployment norm).
- Testing only on localhost.
- Hand-rolling KEM combiners instead of using the standardized hybrid group.
- Disabling classical fallback before inventorying clients.

## Checklist
- [ ] Versions with PQ support identified per hop.
- [ ] Hybrid + fallback configured and tested.
- [ ] Size/latency measurements recorded.
- [ ] Middlebox issues logged with owners.
- [ ] Findings fed into the migration plan (quantum-computing/post-quantum-crypto).

## References
- NIST FIPS 203, 204, 205 (August 2024).
- IETF draft "Post-quantum hybrid ECDHE-MLKEM Key Agreement for TLSv1.3" (X25519MLKEM768).
- OpenSSL 3.5 release notes; Go `crypto/tls` and `crypto/mlkem` docs; Open Quantum Safe (liboqs, oqs-provider).
