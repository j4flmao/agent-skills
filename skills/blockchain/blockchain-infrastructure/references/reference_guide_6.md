# Node and RPC Security Hardening

Defensive hardening for blockchain node hosts and their RPC interfaces: network exposure, dangerous RPC namespaces, method filtering, host and supply-chain controls, and incident signals. Key custody (KMS/HSM/MPC) is in `kms-hsm.md`; RPC load balancing in `rpc-infrastructure.md`.

## Threat Model

| Threat | Example impact |
|--------|---------------|
| Exposed admin/debug RPC | Node reconfiguration, peer manipulation, resource exhaustion |
| Exposed unlocked accounts / signing endpoints | Theft of funds held by node accounts |
| Resource-exhaustion queries | `eth_getLogs` over huge ranges, `debug_traceBlock` floods |
| Engine API exposure | Malicious payloads or forkchoice manipulation if JWT leaks |
| Compromised client binary or image | Full host compromise, key theft |
| Eclipse attacks (P2P) | Node fed a false view of the chain |
| Validator key leakage | Slashing or theft |

## Network Exposure Matrix

| Interface | Default port (Ethereum examples) | Exposure |
|-----------|-------------------------------|----------|
| EL P2P | 30303 tcp/udp | Public |
| CL P2P | 9000 tcp/udp (client-specific) | Public |
| JSON-RPC HTTP/WS | 8545 / 8546 | Private; public only via a filtering proxy |
| Engine API | 8551 | Localhost or pod-local only |
| Beacon REST API | 5052 / 5051 / 3500 | Private |
| Metrics | 6060, etc. | Monitoring network only |
| Admin / IPC | Unix socket | Local users only |

Host firewall (nftables example):

```bash
nft add table inet node
nft add chain inet node input '{ type filter hook input priority 0; policy drop; }'
nft add rule inet node input ct state established,related accept
nft add rule inet node input iif lo accept
nft add rule inet node input tcp dport { 30303, 9000 } accept
nft add rule inet node input udp dport { 30303, 9000 } accept
nft add rule inet node input ip saddr 10.20.0.0/16 tcp dport { 8545, 8546, 5052 } accept
nft add rule inet node input ip saddr 10.30.0.5 tcp dport 22 accept
```

Cloud deployments: equivalent security groups; never `0.0.0.0/0` on RPC ports.

## Client-Side RPC Restrictions

- Enable only needed namespaces: `--http.api eth,net,web3`. Never expose `admin`, `debug`, `personal`, `miner`, `txpool` publicly.
- Do not keep funded or unlocked accounts in node keystores; sign transactions in a separate signer (KMS, HSM, Clef/Web3Signer).
- Restrict `--http.vhosts` and `--http.corsdomain` to known hosts instead of `*` when the endpoint is reachable from browsers.
- Use IPC for local administration rather than enabling `admin` over HTTP.

## Filtering RPC Proxy

Place a proxy (e.g. eRPC, dshackle, a custom NGINX/OpenResty or Envoy filter) in front of public endpoints:

| Control | Example policy |
|---------|---------------|
| Method allow-list | Allow `eth_*` read methods, `eth_sendRawTransaction`, `net_version`, `web3_clientVersion`; deny everything else |
| Range limits | `eth_getLogs` max block range (e.g. 1,000–10,000 blocks) and max results |
| Batch limits | Max requests per JSON-RPC batch |
| Payload size | Reject bodies above a threshold |
| Expensive methods | `debug_trace*`, `trace_*` only for authenticated internal clients |
| Rate limits | Per API key with stricter anonymous limits |
| Timeouts | Per-method timeouts so slow calls cannot pin backends |

Inspect the JSON-RPC `method` (including inside batches) rather than relying on URL paths.

## Engine API and JWT

- Generate a unique 32-byte secret per EL/CL pair; file permission 0400/0600; mount read-only.
- Bind `--authrpc.addr 127.0.0.1` (or pod-local); a leaked JWT plus network reach lets an attacker feed the EL arbitrary forkchoice updates.
- Rotate the secret if a host or backup is compromised.

## Host Hardening

- Minimal OS image, automatic security updates, SSH keys only, no password login, MFA on bastions.
- Run each client as a dedicated unprivileged user with its own data directory (`chmod 700`).
- systemd sandboxing:

```ini
[Service]
User=geth
NoNewPrivileges=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=/data/geth
PrivateTmp=true
CapabilityBoundingSet=
RestrictAddressFamilies=AF_INET AF_INET6 AF_UNIX
```

- Containers: non-root user, read-only root filesystem where the client allows, no privileged mode, drop all capabilities.
- Time sync (chrony/NTP) — required for consensus duties and TLS.

## Supply Chain

- Download clients only from official releases; verify checksums and signatures (e.g. GPG-signed releases where provided) or pin container images by digest.
- Mirror verified images into a private registry; scan with Trivy/Grype.
- Review release notes for security advisories; subscribe to client security channels.
- Avoid curl-pipe-to-shell installers on production hosts.

## P2P Robustness

- Maintain healthy peer counts and diverse peers; static/trusted peers to your own nodes in other regions reduce eclipse risk.
- Do not rely on a single node's view for high-value decisions; cross-check head and finalized blocks with independent nodes or providers.

## Secrets and Keys

- Validator keystores and signer credentials only on hosts that need them; never on RPC nodes.
- Hot wallets used by infrastructure (relayers, batchers, bots) hold minimal balances with automated top-ups and alerts.
- Store secrets in Vault/cloud secret managers; audit access.

## Detection and Response

| Signal | Possible cause |
|--------|----------------|
| Sudden spike in `eth_getLogs`/trace calls from one key/IP | Scraping or DoS |
| Requests for `admin_*`/`personal_*` methods | Scanning for misconfigured nodes |
| Peer count collapse | Network issue or eclipse attempt |
| Unexpected outbound connections from node hosts | Compromise |
| Node head diverging from references | Client bug, fork, or eclipse |

Keep runbooks: isolate host, rotate JWT and API keys, rebuild from known-good image, restore data from snapshot, and review signer logs.

## Checklist

- [ ] Only P2P ports public; RPC behind filtering proxy; Engine API local
- [ ] Minimal RPC namespaces; no node-held funded accounts
- [ ] Method allow-lists, range/batch limits, per-key rate limits
- [ ] Unprivileged, sandboxed services or containers
- [ ] Verified, digest-pinned client binaries/images
- [ ] Independent head cross-checks and peer diversity
- [ ] Alerts for scanning, abuse patterns, and divergence
