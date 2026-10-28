# dApp Frontend Security

Defensive guidance for web3 front ends: the attack surface between user, browser, wallet, RPC and contracts; supply-chain and DNS risks; approval and signature hygiene; and deployment controls. Contract-level security belongs to `blockchain-security` / `smart-contract-security`.

## Attack Surface

```text
user ─► browser ─► your JS bundle ─► wallet (EIP-1193) ─► RPC ─► chain
          ▲            ▲                    ▲                 ▲
     phishing     supply chain,       malicious request   lying / censoring
     clones       compromised CDN,    content (approve,   provider
                  DNS / registrar     permit, setApproval)
```

Most user losses in web3 come from users signing something harmful, not from cryptographic breaks. The front end's job is to never ask for more than needed and to make what is asked legible.

## Supply Chain

| Risk | Control |
|------|---------|
| Compromised npm dependency injecting a drainer | Lockfile committed, `npm ci`, review dependency updates, pin wallet SDKs to exact versions, minimal dependency count |
| Loading wallet connectors or SDKs from a CDN at runtime | Bundle them; if a CDN is unavoidable, use Subresource Integrity (`integrity=`) |
| Malicious install scripts | `npm ci --ignore-scripts` in CI where builds allow; audit packages that need scripts |
| Build pipeline compromise | Protected branches, required reviews, OIDC-based deploy credentials, provenance |

The December 2023 compromise of Ledger's Connect Kit package (a drainer served through a dependency loaded from a CDN) is the reference case: every dApp that loaded the latest version at runtime was affected.

## DNS, Domain and Hosting

- Registrar lock, MFA and hardware keys on registrar and DNS provider accounts; DNS-hijack incidents have redirected dApp domains to drainer clones.
- DNSSEC where the registrar supports it; CAA records restricting certificate issuers.
- HSTS (with preload once stable).
- Consider an IPFS/ENS-hosted build as an alternative access path, with published content hashes.

## Content Security Policy

```text
Content-Security-Policy:
  default-src 'self';
  script-src 'self' 'nonce-{random}' 'strict-dynamic';
  connect-src 'self' https://rpc.example.com wss://rpc.example.com https://*.walletconnect.com wss://*.walletconnect.com https://*.walletconnect.org wss://*.walletconnect.org;
  frame-src https://verify.walletconnect.com https://verify.walletconnect.org;
  img-src 'self' data: https:;
  object-src 'none';
  base-uri 'self';
  frame-ancestors 'none'
```

- `connect-src` allow-lists RPC and wallet relay endpoints, limiting where injected code can exfiltrate or fetch payloads.
- `frame-ancestors 'none'` prevents clickjacking of approval buttons.
- Check the WalletConnect/Reown documentation for its current required domains when upgrading SDKs.

## Approvals and Permits

| Practice | Why |
|----------|-----|
| Request exact amounts, not `type(uint256).max`, by default | Limits loss if spender is later exploited |
| Prefer Permit2 (`0x000000000022D473030F116dDEE9F6B43aC78BA3`) signature transfers with expiry | Time-bounded, revocable allowances |
| Show spender name and address, amount, expiry before the wallet prompt | Users verify against the wallet's display |
| Offer revoke links (to the token or a revocation tool) | Lets users clean up |
| Never request `setApprovalForAll` unless the flow needs it (marketplaces) | Grants all NFTs of a collection |

## Signature Requests

- Use EIP-712 so wallets show structured fields; avoid `eth_sign` entirely.
- Bind every signature to your domain (`verifyingContract`, `chainId`; SIWE `domain`/`uri`).
- Keep deadlines short; include nonces.
- Never ask users to sign something you cannot explain in one sentence in your UI.

See `reference_guide_2.md` for implementations.

## Transaction Safety in the UI

- Simulate every write (`simulateContract`) and show expected balance changes; abort on revert.
- Verify the connected chain before building a transaction; offer `switchChain` rather than sending to the wrong network.
- Hard-code contract addresses per chain in reviewed config; never take a contract address from URL parameters or API responses without allow-list validation.
- Display addresses with checksum and ENS name (resolved forward and reverse) but use the address for the transaction.

## RPC Trust

| Concern | Mitigation |
|---------|------------|
| Provider returns wrong data | Use reputable providers; for high-value reads, cross-check or verify proofs |
| Provider logs user IP + addresses | Privacy policy disclosure; allow custom RPC |
| API keys exposed in bundle | Use domain-restricted/public keys; proxy sensitive keys through your backend with rate limits |
| Single provider outage | `fallback` transport |

## Backend Endpoints Serving the dApp

- Quote and pricing APIs: sign responses or bind them to the transaction parameters the contract verifies; the front end must not trust unsigned API data for amounts and addresses.
- Rate-limit and authenticate admin endpoints; never expose private keys or deployer keys to the front-end build environment.

## Monitoring and Response

- Monitor deployed bundle hashes; alert on unexpected changes in production assets.
- Monitor DNS records and certificate transparency logs for your domains.
- Watch on-chain for unusual approvals to unknown spenders originating from your app's flows.
- Have an incident runbook: take the site down (or show a warning banner) quickly, communicate through official channels, publish revoke instructions.

## Checklist

- [ ] Dependencies pinned and reviewed; no runtime-loaded wallet SDKs without SRI
- [ ] Registrar/DNS accounts locked down; HSTS, CAA, DNSSEC
- [ ] CSP with allow-listed `connect-src`, `frame-ancestors 'none'`
- [ ] Exact-amount approvals or Permit2 with expiry; revoke path offered
- [ ] EIP-712 signatures bound to domain with nonce and deadline
- [ ] Writes simulated; chain and contract addresses validated from config
- [ ] Bundle, DNS and certificate monitoring with an incident runbook
