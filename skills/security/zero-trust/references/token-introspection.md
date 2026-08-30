# Zero Trust: Token Introspection

## 1. The Revocation Problem
JWTs are stateless. Once an Identity Provider (IdP) issues a JWT, it cannot "cancel" it. If a token is valid for 1 hour, and the user is fired 5 minutes later, that token remains cryptographically valid for 55 minutes.

## 2. OAuth2 Token Introspection (RFC 7662)
Token Introspection solves this by allowing a resource server (the API) to query the authorization server (IdP) in real-time to determine the active state of an access token.

### The Flow
1. API receives a Bearer token.
2. Instead of (or in addition to) verifying the signature locally, the API sends a POST request to the IdP's `/introspect` endpoint.
3. The IdP checks its database (handling disabled users, revoked sessions).
4. The IdP returns `{"active": true}` or `{"active": false}`.

### Pros and Cons
- **Pros**: Immediate revocation. Absolute security.
- **Cons**: Re-introduces state and centralization. The IdP becomes a massive bottleneck and single point of failure. If the IdP goes down, all API requests fail.

## 3. Hybrid Zero Trust Approach
To balance security and performance:
1. **Short-lived JWTs**: Keep access token lifespans extremely short (e.g., 5-10 minutes). Rely on local, stateless signature validation.
2. **Continuous Evaluation Profile (CAEP)**: An emerging standard where the IdP pushes asynchronous events (e.g., "User Session Revoked") to APIs via webhooks, allowing APIs to maintain local blocklists without synchronous introspection calls.
