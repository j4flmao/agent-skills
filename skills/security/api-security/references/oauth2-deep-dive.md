# OAuth 2.0 Deep Dive

## Grant Types

### Authorization Code (Web Apps)
```
User → Browser → App → Auth Server → App → API
1. User clicks "Login with Google"
2. App redirects to Auth Server with client_id, redirect_uri, scope
3. User authenticates and consents
4. Auth Server redirects to app with authorization code
5. App exchanges code for access token + refresh token (server-side)
6. App calls API with access token
```

### Client Credentials (Server-to-Server)
```
Service A → Auth Server → Service B
1. Service A authenticates with client_id + client_secret
2. Auth Server returns access token
3. Service A calls Service B with access token in Authorization header
```

### Device Code (IoT / Smart TVs)
```
User opens browser on phone/computer
Device shows code on screen
User enters code on auth page
Device polls for token
```

## Security Considerations
- Always use PKCE (Proof Key for Code Exchange) with authorization code flow
- Validate redirect_uri strictly — don't accept wildcards
- Use short-lived access tokens (15 min) with refresh token rotation
- Store refresh tokens securely (httpOnly cookies, secure storage)
- Validate all token fields: issuer, audience, expiration, signature
- Use mTLS for client authentication in server-to-server flows
- Implement token revocation endpoint for logout

## Key Points
- Authorization code flow for web apps (with PKCE)
- Client credentials flow for server-to-server
- Short-lived access tokens, rotated refresh tokens
- Validate all token claims
- Implement proper redirect_uri validation
- Use mTLS for high-security server-to-server scenarios
