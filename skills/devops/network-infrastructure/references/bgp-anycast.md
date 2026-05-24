# BGP + Anycast — Policy, RPKI, Multi-Homing

## BGP Fundamentals (TL;DR)

```
ASN          Autonomous System Number; your network's identity
Prefix       A network block you announce or accept (e.g., 198.51.100.0/24)
Best path    BGP attributes determine which path is chosen:
              1. LOCAL_PREF (higher wins, outbound preference)
              2. AS-PATH length (shorter wins)
              3. ORIGIN (IGP < EGP < incomplete)
              4. MED (lower wins, inbound preference, same neighbor)
              5. eBGP > iBGP
              6. IGP metric to next-hop
              7. Lowest router-id (tiebreaker)
```

## Get Your Own AS + Address Space

```
PI (provider-independent) space + own ASN  →  carrier-portable, expensive
PA (provider-aggregated) space             →  borrowed from upstream, cheap, locked
```

Apply to your RIR (ARIN, RIPE, APNIC, LACNIC, AfriNIC) for:
- ASN (~$500 one-time + small annual)
- /24 IPv4 (scarce; ~$30-50/IP on transfer market) or
- /48 IPv6 (free, plentiful)

## Inbound + Outbound Policy

```bash
# FRR example — typical edge config
router bgp 65001
 bgp router-id 198.51.100.1
 no bgp ebgp-requires-policy   # off for explicit policy below

 ! Cogent (transit)
 neighbor 192.0.2.1 remote-as 174
 neighbor 192.0.2.1 description Cogent
 neighbor 192.0.2.1 password cogent-secret
 neighbor 192.0.2.1 timers 10 30
 neighbor 192.0.2.1 maximum-prefix 1000000

 ! Lumen (transit)
 neighbor 192.0.2.5 remote-as 3356
 neighbor 192.0.2.5 description Lumen

 ! IX peer (Cloudflare)
 neighbor 206.81.81.13 remote-as 13335
 neighbor 206.81.81.13 description Cloudflare-IX

 address-family ipv4 unicast
  network 198.51.100.0/24

  ! Outbound — announce only your own space
  neighbor 192.0.2.1 prefix-list own-prefixes-out out
  neighbor 192.0.2.5 prefix-list own-prefixes-out out
  neighbor 206.81.81.13 prefix-list own-prefixes-out out

  ! Inbound — apply LOCAL_PREF, drop bogons + RPKI invalids
  neighbor 192.0.2.1 route-map transit-in in
  neighbor 192.0.2.5 route-map transit-in in
  neighbor 206.81.81.13 route-map peer-in in
 exit-address-family
!
ip prefix-list own-prefixes-out seq 10 permit 198.51.100.0/24

route-map peer-in permit 10
 match rpki valid
 set local-preference 200          ! prefer peers over transit (cheaper)
!
route-map transit-in permit 10
 match rpki valid
 set local-preference 100
```

## RPKI ROA — Publish + Validate

```
Publish ROA at your RIR:
  Prefix: 198.51.100.0/24
  Origin AS: 65001
  Max-length: 24

Validate inbound: run rpki-rtr-server (Routinator, GoRTR, Stayrtr).
Drop "invalid" routes; allow valid + notfound.
```

```bash
# rpki-client / routinator
docker run -p 3323:3323 nlnetlabs/routinator
# Then on router:
rpki cache 192.0.2.50 3323
```

## Prefix Filtering — MUST do on every eBGP

```bash
# Inbound — drop bogons + your own prefixes coming back
ip prefix-list bogons seq 5 permit 0.0.0.0/8 le 32
ip prefix-list bogons seq 10 permit 10.0.0.0/8 le 32
ip prefix-list bogons seq 15 permit 100.64.0.0/10 le 32
ip prefix-list bogons seq 20 permit 127.0.0.0/8 le 32
ip prefix-list bogons seq 25 permit 169.254.0.0/16 le 32
ip prefix-list bogons seq 30 permit 172.16.0.0/12 le 32
ip prefix-list bogons seq 35 permit 192.0.0.0/24 le 32
ip prefix-list bogons seq 40 permit 192.168.0.0/16 le 32
ip prefix-list bogons seq 45 permit 198.18.0.0/15 le 32
ip prefix-list bogons seq 50 permit 224.0.0.0/3 le 32
ip prefix-list bogons seq 60 permit 0.0.0.0/0 ge 25       ! more-specific than /24

! Outbound — only own
ip prefix-list own-prefixes-out seq 10 permit 198.51.100.0/24
```

## AS-PATH Filtering

```
Block transit through customer (prevent leak):
ip as-path access-list 10 permit ^$              ! locally originated
ip as-path access-list 10 permit ^65002_         ! customer ASN
```

## Anycast

Same IP from multiple locations. BGP routes traffic to "closest" announcer by AS-PATH.

```
POP-1 (us-east) → announce 192.0.2.0/24 from AS 65001
POP-2 (eu-west) → announce 192.0.2.0/24 from AS 65001
POP-3 (ap-south) → announce 192.0.2.0/24 from AS 65001

User in Tokyo → closest POP (likely ap-south) via shortest AS-PATH
On POP failure: BGP withdrawal → traffic shifts to next-closest in seconds
```

Use cases that work:
- DNS (UDP, no session state)
- Stateless HTTP API behind shared session store
- Anycast HTTPS with TLS session resumption

Doesn't work for: long-lived TCP / WebSocket — mid-flight reroute kills session.

## DDoS Mitigation via BGP

```
RTBH (Remotely Triggered Blackhole)
  Tag prefix with community 65001:666 → upstream drops all traffic
  Sacrifice victim IP to save the rest

FlowSpec (RFC 5575)
  Push fine-grained filters (5-tuple) via BGP to upstreams
  Surgical drops without blackholing entire prefix

Scrubbing
  Redirect via BGP to scrubbing provider (Cloudflare Magic Transit, Voxility, Akamai Prolexic)
  Clean traffic returned via GRE/IPsec tunnel
```

## Multi-Homing Patterns

```
Active-passive transit + IX     announce same prefix to all; use LOCAL_PREF for outbound;
                                AS-prepend on backup transit for inbound preference

Hot potato                      send traffic to nearest exit (default)
Cold potato                     keep traffic on own network as long as possible (paid peering / quality)
```

## Common Failures

- No prefix filtering → AS hijack accepted, traffic blackholed
- No RPKI → invalid announcements treated equal
- Single transit → outage when transit has issues
- IX peering only → no path to non-peered destinations
- Forgetting IPv6 BGP → only half the Internet reachable
- MED set across different upstreams → MED only meaningful with same neighbor
- max-prefix unset → memory exhaustion if peer leaks the DFZ
