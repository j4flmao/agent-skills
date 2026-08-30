# Zero Trust: Trust Stores and CA Bundles

## 1. The Foundation of Trust
A Trust Store is a local repository of Certificate Authority (CA) certificates that a system implicitly trusts. In Zero Trust, where mTLS is ubiquitous, managing the Trust Store is critical. If a bad actor's CA is added to the trust store, they can intercept all encrypted traffic via Man-in-the-Middle (MITM).

## 2. Managing Trust across Environments
Different operating systems and language runtimes manage trust differently:
- **Linux (Debian/Ubuntu)**: `/etc/ssl/certs/ca-certificates.crt`
- **Linux (RHEL/CentOS)**: `/etc/pki/tls/certs/ca-bundle.crt`
- **Java**: Uses a proprietary `cacerts` Keystore.
- **Node.js**: Ships with a hardcoded list of Mozilla's Root CAs, ignoring the OS trust store unless specifically configured (e.g., via `NODE_EXTRA_CA_CERTS`).

## 3. Trust Distribution in Zero Trust
In a dynamic ZTA environment, manually updating trust stores across thousands of nodes is impossible.

### Dynamic Provisioning via Service Mesh
Service meshes completely bypass the OS/Runtime trust stores for internal traffic.
- Envoy proxies maintain their own in-memory trust stores.
- The control plane (e.g., Istio `istiod`) dynamically pushes the Root CA bundles to all proxies via the Secret Discovery Service (SDS) API.
- Application code remains unaware of the internal PKI, communicating via plain HTTP to `localhost`, while the sidecar proxy handles the mTLS and trust verification.

### Certificate Pinning Limitations
Historically, mobile apps pinned specific certificates to prevent MITM. In ZTA, where certificates rotate every few hours or days, static pinning causes catastrophic outages. ZTA relies on pinning the **Root CA** or using dynamic pinned public keys (HPKP), rather than leaf certificates.
