# Federation and SSO Patterns

## OIDC Configuration

### Authorization Code Flow with PKCE
```
Browser → App → Authorization Endpoint → Login → Auth Code → Token Endpoint → ID/Access Token
```
- PKCE (S256) required for SPAs
- Client Secret for server-side apps
- State parameter for CSRF protection
- Nonce parameter for replay protection

### Token Handling
```
Access Token:  5 minute expiry, JWT format
Refresh Token: 30 day expiry, rotate on use
ID Token:      1 hour expiry, contains user claims
```

### Claim Mapping
```
sub        → User ID (immutable)
email      → Primary email
name       → Display name
preferred_username → Username
groups     → Array of group memberships
roles      → Application roles
```

## SAML Configuration

### SP-Initiated SSO
```
Service Provider → IdP (AuthnRequest) → Login → IdP → SP (SAML Response)
```

### Assertion Configuration
```
Issuer: https://sp.example.com/saml/metadata
Audience: https://sp.example.com/saml
Recipient: https://sp.example.com/saml/acs
NameID: email or persistent identifier
```

### Metadata Exchange
```xml
<EntityDescriptor entityID="https://sp.example.com/saml/metadata">
  <SPSSODescriptor>
    <AssertionConsumerService
      Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST"
      Location="https://sp.example.com/saml/acs"/>
  </SPSSODescriptor>
</EntityDescriptor>
```

### Signing and Encryption
- Sign AuthnRequest with SP private key
- Sign SAML Response with IdP private key
- Encrypt assertions when containing PII
- Certificate rotation every 2 years
- Metadata must be HTTPS-served

## Federation Between IdPs

### Trust Establishment
```
Primary IdP (Azure AD) ← Trust → Secondary IdP (Keycloak)
- Exchange metadata
- Configure attribute mapping
- Test token exchange
- Validate claim transformation
```

### Attribute Mapping
```
Source Attribute    → Target Attribute
userPrincipalName   → username
objectGUID          → externalId
mail                → email
displayName         → name
memberOf            → groups (DN to name)
```

### Migration Scenarios
```
Acquisition: Federate both IdPs, migrate groups gradually
Cloud Migration: On-prem ADFS → Azure AD, phased cutover
Merger: Multi-IdP federation, unified directory buildout
```

## Security Best Practices

### Token Validation
- Validate signature on every token
- Check issuer matches expected IdP
- Verify audience is the receiving app
- Validate token expiry (allow 5min clock skew)
- Check not-before time (nbf claim)

### Session Management
```
Single Logout: SAML SLO or OIDC RP-initiated logout
Session Timeout: 15 minutes idle, 8 hours absolute
Remember Me: 30 days with refresh token rotation
Session Revocation: Token blacklist or short TTL
```

### Brute Force Protection
```
Account Lockout: 5 failed attempts = 15 min lock
Progressive Delay: +2s per failed attempt
CAPTCHA: After 3 failed attempts
IP Blocking: After 20 failed attempts from same IP
Alert: Notify security on lockout events
```
