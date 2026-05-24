# SSO and Federation

## Overview

Single Sign-On (SSO) and federation enable users to authenticate once and access multiple applications. This reference covers SAML 2.0, OIDC/OAuth 2.0, LDAP, and the major identity provider platforms.

## SAML 2.0

### SAML Flow
```
User → SP (Service Provider) → Redirect to IdP → User authenticates
                                                      ↓
User ← SP (grants access) ← SAML Response (POST/Redirect) ← IdP sends SAML Assertion
```

### SAML Request
```xml
<samlp:AuthnRequest xmlns:samlp="urn:oasis:names:tc:SAML:2.0:protocol"
                    ID="a1b2c3d4e5f6"
                    Version="2.0"
                    IssueInstant="2026-05-24T09:00:00Z"
                    Destination="https://idp.example.com/saml/sso"
                    AssertionConsumerServiceURL="https://app.example.com/saml/acs">
  <saml:Issuer xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion">
    https://app.example.com
  </saml:Issuer>
  <samlp:NameIDPolicy Format="urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress"
                      AllowCreate="true"/>
</samlp:AuthnRequest>
```

### SAML Response (Assertion)
```xml
<samlp:Response xmlns:samlp="urn:oasis:names:tc:SAML:2.0:protocol"
                ID="response-xyz"
                InResponseTo="a1b2c3d4e5f6"
                Destination="https://app.example.com/saml/acs"
                IssueInstant="2026-05-24T09:00:05Z">
  <saml:Issuer>https://idp.example.com</saml:Issuer>
  <samlp:Status>
    <samlp:StatusCode Value="urn:oasis:names:tc:SAML:2.0:status:Success"/>
  </samlp:Status>
  <saml:Assertion ID="assertion-123" IssueInstant="2026-05-24T09:00:05Z">
    <saml:Issuer>https://idp.example.com</saml:Issuer>
    <ds:Signature>...</ds:Signature>
    <saml:Subject>
      <saml:NameID Format="urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress">
        jane.doe@example.com
      </saml:NameID>
      <saml:SubjectConfirmation Method="urn:oasis:names:tc:SAML:2.0:cm:bearer">
        <saml:SubjectConfirmationData NotOnOrAfter="2026-05-24T09:10:05Z"
                                       Recipient="https://app.example.com/saml/acs"/>
      </saml:SubjectConfirmation>
    </saml:Subject>
    <saml:Conditions NotBefore="2026-05-24T09:00:00Z"
                     NotOnOrAfter="2026-05-24T09:10:00Z">
      <saml:AudienceRestriction>
        <saml:Audience>https://app.example.com</saml:Audience>
      </saml:AudienceRestriction>
    </saml:Conditions>
    <saml:AttributeStatement>
      <saml:Attribute Name="email">
        <saml:AttributeValue>jane.doe@example.com</saml:AttributeValue>
      </saml:Attribute>
      <saml:Attribute Name="groups">
        <saml:AttributeValue>engineering</saml:AttributeValue>
        <saml:AttributeValue>admin</saml:AttributeValue>
      </saml:Attribute>
      <saml:Attribute Name="firstName">
        <saml:AttributeValue>Jane</saml:AttributeValue>
      </saml:Attribute>
      <saml:Attribute Name="lastName">
        <saml:AttributeValue>Doe</saml:AttributeValue>
      </saml:Attribute>
    </saml:AttributeStatement>
    <saml:AuthnStatement AuthnInstant="2026-05-24T09:00:04Z">
      <saml:AuthnContext>
        <saml:AuthnContextClassRef>
          urn:oasis:names:tc:SAML:2.0:ac:classes:PasswordProtectedTransport
        </saml:AuthnContextClassRef>
      </saml:AuthnContext>
    </saml:AuthnStatement>
  </saml:Assertion>
</samlp:Response>
```

### SAML Security Checklist
- [ ] Sign SAML requests (optional but recommended)
- [ ] Sign SAML responses (mandatory)
- [ ] Encrypt SAML assertions for sensitive attributes
- [ ] Validate Issuer in responses
- [ ] Validate response signatures against IdP's certificate
- [ ] Check NotOnOrAfter / NotBefore timestamps (clock skew tolerance: 5 min)
- [ ] Validate AudienceRestriction matches the SP
- [ ] Prevent replay attacks (check Assertion ID uniqueness, InResponseTo)
- [ ] Use HTTPS for ACS URL and IdP endpoints
- [ ] Use strong XML digital signatures (RSA-SHA256 minimum)

## OIDC / OAuth 2.0

### OpenID Connect Flow (Authorization Code + PKCE)
```
1. User → App: "Login with Google"
2. App → Browser: Redirect to Google OIDC endpoint
   GET https://accounts.google.com/o/oauth2/v2/auth?
     response_type=code&
     client_id=CLIENT_ID&
     redirect_uri=https://app.example.com/callback&
     scope=openid%20profile%20email&
     state=ANTI_CSRF_TOKEN&
     code_challenge=SHA256(verifier)&
     code_challenge_method=S256

3. Google → User: Authenticate and consent
4. Google → Browser: Redirect to app with authorization code
   GET https://app.example.com/callback?code=AUTH_CODE&state=ANTI_CSRF_TOKEN

5. App → Google: Exchange code for tokens
   POST https://oauth2.googleapis.com/token
   grant_type=authorization_code&
   code=AUTH_CODE&
   client_id=CLIENT_ID&
   client_secret=CLIENT_SECRET&
   redirect_uri=https://app.example.com/callback&
   code_verifier=PKCE_VERIFIER

6. Google → App: Return tokens
   {
     "access_token": "eyJhbGci...",
     "token_type": "Bearer",
     "expires_in": 3600,
     "refresh_token": "1//abc123...",
     "id_token": "eyJraWQ..."
   }

7. App validates id_token:
   - Verify JWT signature against JWKS
   - Check iss, aud, exp, iat claims
   - Extract user claims
```

### ID Token (JWT)
```json
{
  "iss": "https://accounts.google.com",
  "sub": "123456789012345678901",
  "aud": "CLIENT_ID.apps.googleusercontent.com",
  "exp": 1716548400,
  "iat": 1716544800,
  "auth_time": 1716544800,
  "nonce": "NONCE_VALUE",
  "at_hash": "ABC123",
  "email": "jane.doe@example.com",
  "email_verified": true,
  "name": "Jane Doe",
  "picture": "https://lh3.googleusercontent.com/a/photo",
  "given_name": "Jane",
  "family_name": "Doe",
  "locale": "en"
}
```

## LDAP Integration

### LDAP Authentication Flow
```
Application → LDAP Bind (username + password) → Directory Server
                        ↓
                  Search for user DN
                  Compare password hash
                        ↓
                  Return: Success/Failure + Attributes
```

### LDAP Configuration for Application
```yaml
ldap_configuration:
  server:
    url: "ldaps://ldap.corp.example.com:636"
    base_dn: "dc=corp,dc=example,dc=com"
    bind_dn: "cn=app-svc,ou=ServiceAccounts,dc=corp,dc=example,dc=com"
    bind_password: "${LDAP_BIND_PASSWORD}"
    timeout: 10s
    follow_referrals: false

  authentication:
    user_search_base: "ou=Users,dc=corp,dc=example,dc=com"
    user_search_filter: "(&(objectClass=user)(sAMAccountName={0}))"
    username_attribute: "sAMAccountName"

  authorization:
    group_search_base: "ou=Groups,dc=corp,dc=example,dc=com"
    group_search_filter: "(&(objectClass=group)(member={0}))"
    group_membership_attribute: "memberOf"
```

## Identity Provider Configurations

### Keycloak Configuration
```json
{
  "realm": "corp",
  "enabled": true,
  "sslRequired": "external",
  "registrationAllowed": false,
  "loginWithEmailAllowed": true,
  "duplicateEmailsAllowed": false,
  "resetPasswordAllowed": true,
  "editUsernameAllowed": false,
  "passwordPolicy": "length(12) and digits(1) and specialChars(1) and upperCase(1) and lowerCase(1)",
  "defaultRoles": ["user"],
  "requiredCredentials": ["password"],
  "smtpServer": {
    "host": "smtp.corp.example.com",
    "port": 587,
    "from": "noreply@corp.example.com"
  },
  "identityProviders": [
    {
      "providerId": "saml",
      "alias": "hr-saml-idp",
      "enabled": true,
      "config": {
        "singleSignOnServiceUrl": "https://hr-idp.example.com/saml/sso",
        "singleLogoutServiceUrl": "https://hr-idp.example.com/saml/slo",
        "nameIDPolicyFormat": "urn:oasis:names:tc:SAML:2.0:nameid-format:persistent",
        "signingCertificate": "MIID...base64...cert...",
        "entityId": "https://hr-idp.example.com/metadata"
      }
    }
  ]
}
```

### Okta Configuration
```yaml
# Okta application configuration
okta_app:
  name: "internal-saas-app"
  label: "Internal SaaS Application"
  sign_on_mode: "OPENID_CONNECT"
  settings:
    oauth_client:
      client_uri: "https://app.example.com"
      logo_uri: "https://app.example.com/logo.png"
      redirect_uris:
        - "https://app.example.com/oauth/callback"
        - "com.example.app:/oauthredirect"
      grant_types:
        - "authorization_code"
        - "refresh_token"
      response_types:
        - "code"
      application_type: "web"
      consent_method: "REQUIRED"
      initiate_login_uri: "https://app.example.com/login"
  
  access_policy:
    rules:
      - name: "Allow Corporate Network"
        conditions:
          network:
            connection: "ZONE"
            zones: ["CORPORATE_NETWORK"]
          device:
            managed: true
            platforms: ["WINDOWS", "MACOS"]
        actions:
          sign_on:
            access: "ALLOW"
            session_lifetime_minutes: 480
            re_authentication_frequency: "PT4H"

      - name: "Require MFA from External Networks"
        conditions:
          network:
            connection: "ZONE"
            zones: ["ANYWHERE"]
          device:
            managed: false
        actions:
          sign_on:
            access: "DENY"
```

### Azure AD / Entra ID Configuration
```json
{
  "displayName": "Corporate SSO App",
  "signInAudience": "AzureADMyOrg",
  "identifierUris": ["https://app.corp.example.com"],
  "web": {
    "redirectUris": ["https://app.corp.example.com/auth/callback"],
    "implicitGrantSettings": {
      "enableIdTokenIssuance": true,
      "enableAccessTokenIssuance": false
    }
  },
  "requiredResourceAccess": [
    {
      "resourceAppId": "00000003-0000-0000-c000-000000000000",
      "resourceAccess": [
        {"id": "e1fe6dd8-ba31-4d61-89e7-88639da4923d", "type": "Scope"},
        {"id": "37f7f235-527c-4136-accd-4a02d197296e", "type": "Scope"}
      ]
    }
  ],
  "optionalClaims": {
    "idToken": [
      {"name": "email", "source": "user", "essential": true},
      {"name": "upn", "source": "user", "essential": false}
    ]
  }
}
```

## Federation Best Practices

1. **Use short-lived tokens** (15-60 min for access, 24h for refresh)
2. **Implement PKCE** for all OIDC flows (never use implicit grant)
3. **Validate all tokens server-side** — never trust client-side validation
4. **Use HTTP-Only + Secure cookies** for session storage
5. **Rotate client secrets** (90-day rotation for service principals)
6. **Monitor for token replay** (jti tracking, token reuse detection)
7. **Implement logout** (RP-initiated logout, session management)
8. **Separate public and confidential clients** (different secrets/regs)
9. **Audit all authentication events** (login, logout, token refresh)
10. **Implement step-up authentication** for sensitive operations

## Protocol Comparison

| Feature | SAML 2.0 | OIDC/OAuth 2.0 | LDAP |
|---------|----------|-----------------|------|
| Use case | Enterprise SSO | Modern web/mobile apps | Directory lookup |
| Auth protocol | XML-based | JSON/JWT | Binary protocol |
| Token format | SAML Assertion (XML) | JWT (JSON) | N/A |
| Mobile support | Poor | Excellent | Poor |
| API auth | No | Yes (OAuth scopes) | No |
| Delegation | No | Yes (OAuth tokens) | No |
| Session mgmt | SP-managed | RP-managed | Server-managed |
| Standard since | 2005 | 2014 (OAuth 2.0), 2019 (OIDC) | 1993 |
| Complexity | High | Medium | Low |
| Encryption | XML Enc | JWE | TLS |
