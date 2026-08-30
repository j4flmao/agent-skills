# Zero Trust: Certificate Rotation

## 1. The Necessity of Ephemeral Certificates
In a Zero Trust Architecture (ZTA), identity is the perimeter. Long-lived certificates pose a massive risk: if compromised, an attacker maintains persistent access until the certificate expires or is manually revoked via CRLs (Certificate Revocation Lists) or OCSP, which are often slow or fail open.

**Zero Trust mandates ephemeral certificates** (lifespans of hours or minutes) to completely eliminate the need for revocation mechanisms.

## 2. Automated Rotation Mechanisms
Certificate rotation must be 100% automated. Human intervention guarantees outages.

### SPIFFE/SPIRE Rotation
SPIRE (SPIFFE Runtime Environment) dynamically issues SVIDs (SPIFFE Verifiable Identity Documents) in the form of X.509 certificates to workloads.
- **TTL (Time to Live)**: SVIDs typically have a TTL of 1-6 hours.
- **Background Rotation**: The SPIRE agent seamlessly fetches a new SVID from the SPIRE server before the current one expires, hot-swapping the certificate in memory for Envoy proxies without dropping active connections.

### HashiCorp Vault PKI Engine
Vault can act as an Intermediate CA.
- **Issuance**: Workloads request certificates via Vault's REST API.
- **Rotation via Agent**: `vault-agent` can be run as a sidecar, configured with a template that writes the cert to a shared memory volume and signals the main application (e.g., via `SIGHUP`) to reload the cert gracefully.

## 3. Graceful Reloads
Replacing a certificate on disk does nothing if the application doesn't read it.
- **Envoy/Istio**: Uses SDS (Secret Discovery Service) via gRPC to stream new certificates to proxies instantly.
- **Nginx/HAProxy**: Requires a configuration reload command which spawns new worker processes with the new cert while letting old workers drain existing connections.
