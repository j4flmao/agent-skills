# Network Isolation Policies for Agent Sandboxes

Controlling network access from sandboxed agent code: default-deny, allow-listed egress through a proxy, DNS control, metadata-endpoint blocking, and the enforcement options in Docker, Kubernetes and microVMs. The main risks are data exfiltration, attacks on internal services (SSRF-style), credential theft from cloud metadata, and abuse of the sandbox as an attack origin.

## Policy Tiers

| Tier | Access | Use for |
|------|--------|---------|
| None | No network interface except loopback | Pure computation, code execution on provided inputs |
| Package mirrors only | Egress to internal package proxies (PyPI/npm mirrors) | Installing dependencies |
| Allow-listed egress | HTTPS to named domains via proxy | Calling specific APIs |
| Broad internet via proxy | All public HTTPS with logging, blocked internal ranges | Browsing/research agents |

Default to "None" and grant the smallest tier the task needs, per task.

## Always-Blocked Destinations

| Destination | Why |
|-------------|-----|
| `169.254.169.254`, `fd00:ec2::254` (cloud metadata) | Instance credentials |
| `169.254.0.0/16` link-local, `127.0.0.0/8` of the host | Local services |
| RFC 1918 ranges `10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`, `100.64.0.0/10`, IPv6 ULA `fc00::/7` | Internal network |
| Kubernetes API server and service CIDR | Cluster control |
| Docker/containerd sockets via TCP | Host control |

Enforce these at the network layer, not only in the proxy, so raw sockets cannot bypass them.

## Docker

```bash
# no network at all
docker run --network none sandbox-runtime:2026.10 python main.py

# internal network whose only route out is the egress proxy
docker network create --internal sandbox-net
docker run -d --name egress-proxy --network sandbox-net egress-proxy:1.0
docker network connect bridge egress-proxy           # proxy alone reaches the outside
docker run --network sandbox-net \
  -e HTTPS_PROXY=http://egress-proxy:3128 -e HTTP_PROXY=http://egress-proxy:3128 \
  sandbox-runtime:2026.10 python main.py
```

An `--internal` network has no external route, so code ignoring the proxy variables simply fails to connect.

## Kubernetes

Default-deny for sandbox namespaces, then allow DNS and the proxy only:

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: default-deny
  namespace: agent-sandboxes
spec:
  podSelector: {}
  policyTypes: [Ingress, Egress]
---
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-dns-and-proxy
  namespace: agent-sandboxes
spec:
  podSelector:
    matchLabels: { role: sandbox }
  policyTypes: [Egress]
  egress:
    - to:
        - namespaceSelector:
            matchLabels: { kubernetes.io/metadata.name: kube-system }
          podSelector:
            matchLabels: { k8s-app: kube-dns }
      ports:
        - { protocol: UDP, port: 53 }
        - { protocol: TCP, port: 53 }
    - to:
        - namespaceSelector:
            matchLabels: { kubernetes.io/metadata.name: egress }
          podSelector:
            matchLabels: { app: egress-proxy }
      ports:
        - { protocol: TCP, port: 3128 }
```

- NetworkPolicy needs a CNI that enforces it (Cilium, Calico, etc.).
- Standard NetworkPolicy is IP/port based; for FQDN allow-lists use the proxy or CNI extensions (e.g. Cilium `toFQDNs`).
- Set `automountServiceAccountToken: false` on sandbox pods so code cannot call the API server with a token.

## Egress Proxy

The proxy is the policy enforcement point for domains and the audit log.

```text
# Squid example: allow-list by domain, HTTPS via CONNECT only
acl allowed_domains dstdomain .pypi.org .files.pythonhosted.org .github.com
acl SSL_ports port 443
acl CONNECT method CONNECT
http_access deny CONNECT !SSL_ports
http_access allow CONNECT allowed_domains
http_access deny all
```

Requirements:
- Resolve and check the destination IP after DNS resolution; deny private/link-local ranges even for allowed names (DNS rebinding).
- Log task ID, destination, bytes in/out, and decision.
- Per-task allow-lists: the harness generates the policy from the task's declared needs.
- Rate and volume limits per sandbox to cap exfiltration and abuse.
- TLS interception is optional and invasive; domain-level allow-listing via SNI/CONNECT host is often sufficient.

## DNS

- Point sandboxes at a resolver you control; block direct UDP/TCP 53 to other resolvers and DNS-over-HTTPS endpoints at the network layer.
- Log queries; DNS is a common exfiltration channel (data encoded in subdomains). Alert on high-entropy or high-volume query patterns.
- In "None" tier, no resolver at all.

## MicroVMs

Firecracker gives each VM a TAP device; isolation is enforced on the host:
- Put each VM's TAP in its own network namespace or bridge with nftables rules allowing only the proxy.
- Apply Firecracker's per-interface rate limiters (bandwidth and ops token buckets) to bound throughput.
- No metadata service route from VM namespaces.

```bash
# host nftables sketch for one VM tap (tap-vm1): only the proxy at 10.200.0.2:3128
nft add table inet sandbox
nft add chain inet sandbox fwd '{ type filter hook forward priority 0; policy drop; }'
nft add rule inet sandbox fwd iifname "tap-vm1" ip daddr 10.200.0.2 tcp dport 3128 accept
nft add rule inet sandbox fwd oifname "tap-vm1" ct state established,related accept
```

## Ingress

Sandboxes should not accept inbound connections from outside. If an agent runs a dev server for preview, expose it through an authenticated reverse proxy bound to that task, with a short-lived URL.

## Detection and Response

| Signal | Action |
|--------|--------|
| Denied connections to metadata or internal ranges | Flag task; likely injection or malicious code |
| Large upload volume | Throttle and alert |
| Unusual DNS patterns | Alert, consider kill |
| Proxy bypass attempts (direct IP connections) | Kill sandbox, preserve logs |

## Checklist

- [ ] Default "no network"; per-task tier granted explicitly
- [ ] Metadata, link-local, private and cluster ranges blocked at L3/L4
- [ ] Single egress path through an allow-listing, logging proxy
- [ ] DNS through controlled resolver; DoH/DoT and external 53 blocked
- [ ] Service-account tokens not mounted; ingress closed
- [ ] Bandwidth/volume limits and alerts on denied attempts
