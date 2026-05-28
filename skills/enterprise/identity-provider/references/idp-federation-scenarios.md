# IdP Federation Scenarios

## Overview

Identity federation enables users from one identity domain to access resources in another without duplicate credentials. This reference covers federation architecture patterns, protocol deep-dives, scenario-specific configurations, operational considerations, and troubleshooting for enterprise federation deployments.

## Federation Fundamentals

### Core Concepts

- **Identity Provider (IdP)**: The authoritative source that authenticates users and issues identity assertions. The IdP maintains user credentials and attributes.
- **Service Provider (SP)**: The relying party that consumes identity assertions to grant access to applications or resources. The SP trusts the IdP's assertions.
- **Federation**: A trust relationship between IdP and SP that enables cross-domain authentication using standardized protocols (SAML, OIDC, WS-Federation).
- **Trust Establishment**: The process of exchanging metadata, certificates, and configuration between IdP and SP to establish a federation relationship.

### Federation vs SSO

| Aspect | SSO | Federation |
|---|---|---|
| Scope | Within single organization | Across organizational boundaries |
| User Directory | Same directory | Different directories |
| Trust Model | Inherent (same domain) | Explicit (metadata exchange) |
| Protocols | OIDC, SAML, Kerberos | SAML, OIDC Federation, WS-Fed |
| Account Linking | Not needed | Required (mapping between identities) |
| Attribute Exchange | Internal directory attributes | Mapped cross-org attributes |
| Complexity | Low to medium | Medium to high |

### Federation Protocols Comparison

| Protocol | Message Format | Transport | Bindings | Best For |
|---|---|---|---|---|
| SAML 2.0 | XML (signed) | HTTP Redirect, POST, Artifact | IdP/SP-initiated | Enterprise apps, government |
| OIDC Federation | JSON (JWT) | HTTP Redirect | OAuth2 flows | Modern apps, mobile, SPAs |
| WS-Federation | XML (signed) | HTTP POST/Redirect | Passive | Microsoft/.NET ecosystem |
| SCIM 2.0 | JSON/XML | REST API (HTTP) | Provisioning | User lifecycle management |

## Federation Topologies

### Star Topology (Hub-and-Spoke)

This is the most common federation topology where a central IdP federates with multiple SPs.

```
         [SP: Salesforce]
              |
         [SP: Workday]
              |
[IdP Hub] ---+--- [SP: Confluence]
              |
         [SP: Custom App]
              |
         [SP: AWS IAM]
```

**Characteristics**:
- Single IdP manages all federation relationships
- Each SP only needs to trust the central IdP
- Users authenticate at the central IdP
- Attributes and assertions are standardized across all SPs

**Configuration approach**:
- Central IdP generates SAML metadata or OIDC discovery document
- Each SP imports IdP metadata
- SP-specific attribute mapping configured at IdP
- Session management centralized at IdP

**Pros**: Simple to manage, consistent user experience, centralized policy enforcement.
**Cons**: Single point of failure, IdP must be highly available, SP onboarding creates central bottleneck.

### Mesh Topology

Multiple IdPs federate directly with each other, suitable for cross-company collaboration scenarios.

```
[IdP: Org A] ---+--- [IdP: Org B]
                |
                +--- [IdP: Org C]
                |
                +--- [IdP: Org D]
```

**Characteristics**:
- Each IdP establishes pairwise trust with every other IdP
- Users from any org can access SPs in any other org
- Attribute mapping customized per federation pair
- Trust decisions decentralized

**Configuration approach**:
- Bilateral metadata exchange between each org pair
- Attribute mapping agreements per pair
- Separate federation configuration per relationship

**Pros**: Decentralized, no single point of failure, flexible per-relationship configuration.
**Cons**: N*(N-1)/2 trust relationships, inconsistent policies, complex metadata management.

### Hub-and-Spoke with Satellite IdPs

Combines central governance with regional autonomy.

```
              [Satellite IdP: EU Region]
             /
[Hub IdP] --+--- [Satellite IdP: US Region]
             \
              [Satellite IdP: APAC Region]
                  \
                   [SPs per region]
```

**Characteristics**:
- Hub IdP provides global governance, policy, and attribute schema
- Satellite IdPs handle local authentication and user directory
- Federation between hub and satellites using SAML/OIDC
- Satellites federate with local SPs

**Configuration approach**:
- Hub publishes global metadata and policies
- Satellites register with hub
- Satellites handle local SP onboarding
- Cross-region authentication flows through hub

**Pros**: Regional autonomy, centralized governance, reduced hub load.
**Cons**: Complex routing, metadata management overhead, regional policy divergence risk.

### Bridge Topology

Connects two enterprise IdPs, typically during mergers and acquisitions.

```
[IdP: Acquiring Corp] === Federation Bridge === [IdP: Acquired Corp]
```

**Characteristics**:
- Bidirectional trust between two established IdPs
- Used during M&A integration periods (typically 6-24 months)
- Users from either org can access both orgs' applications
- Gradual migration path toward unified IdP

**Configuration approach**:
- Attribute mapping between disparate schemas
- Group/role mapping for application access
- Concurrent access to both sets of applications
- Parallel-run period before directory consolidation

**Pros**: Enables immediate collaboration, gradual migration, preserves autonomy during transition.
**Cons**: Complex attribute mapping, dual directories to maintain, extended operational period.

## Federation Scenario Deep Dives

### Scenario 1: Cross-Organization B2B Federation

**Use Case**: Organization A's customers or partners need to access Organization A's applications using their own corporate identities.

**Architecture**:
```
[Partner IdP] === SAML/OIDC ===> [Org A IdP] ---> [Org A SPs]
```

**Configuration Steps**:

1. **Partner Onboarding**:
   - Partner provides SAML metadata or OIDC discovery URL
   - Org A registers partner as trusted IdP in federation service
   - Attribute mapping agreement established (email, name, roles)
   - Test accounts created for validation

2. **Metadata Exchange**:
   - Partner shares metadata XML (SAML) or openid-configuration (OIDC)
   - Metadata includes: entity ID, SSO endpoint, signing certificate, logout URL
   - Validate certificate chain and expiry dates
   - Store metadata in federation registry

3. **Attribute Mapping**:
   - SAML: Map partner's NameID format to Org A's user identifier
   - Map SAML attributes (mail, givenName, sn) to Org A's schema
   - Map group membership to application roles
   - Handle attribute name variations across partners

4. **Just-in-Time Provisioning**:
   - Create Org A accounts on first successful federation login
   - Seed account attributes from federation assertion
   - Assign default roles based on mapped attributes
   - Trigger SCIM provisioning to downstream applications

5. **Session and Access Control**:
   - Respect partner IdP session lifetime (sessionNotOnOrAfter for SAML)
   - Enforce Org A's conditional access policies (geo, device compliance)
   - Apply session timeout policies per application
   - Force re-authentication for sensitive operations

**SAML Configuration Example**:

SAML AuthnRequest (SP-initiated):
```xml
<samlp:AuthnRequest
    xmlns:samlp="urn:oasis:names:tc:SAML:2.0:protocol"
    xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion"
    ID="_1234567890"
    Version="2.0"
    IssueInstant="2025-03-15T10:00:00Z"
    Destination="https://partner-idp.com/saml/sso"
    AssertionConsumerServiceURL="https://org-a-idp.com/saml/acs"
    ProtocolBinding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST"
    ForceAuthn="false"
    IsPassive="false">
  <saml:Issuer>https://org-a-app.com/saml/metadata</saml:Issuer>
  <samlp:NameIDPolicy
      Format="urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress"
      AllowCreate="true"/>
</samlp:AuthnRequest>
```

SAML Response (IdP to SP):
```xml
<samlp:Response
    xmlns:samlp="urn:oasis:names:tc:SAML:2.0:protocol"
    xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion"
    ID="_0987654321"
    InResponseTo="_1234567890"
    Version="2.0"
    IssueInstant="2025-03-15T10:00:05Z"
    Destination="https://org-a-app.com/saml/acs">
  <saml:Issuer>https://partner-idp.com/saml/metadata</saml:Issuer>
  <samlp:Status>
    <samlp:StatusCode
        Value="urn:oasis:names:tc:SAML:2.0:status:Success"/>
  </samlp:Status>
  <saml:Assertion ID="_abc123"
      IssueInstant="2025-03-15T10:00:05Z"
      Version="2.0">
    <saml:Issuer>https://partner-idp.com/saml/metadata</saml:Issuer>
    <ds:Signature xmlns:ds="http://www.w3.org/2000/09/xmldsig#">
      <ds:SignedInfo>
        <ds:CanonicalizationMethod Algorithm="http://www.w3.org/2001/10/xml-exc-c14n#"/>
        <ds:SignatureMethod Algorithm="http://www.w3.org/2001/04/xmldsig-more#rsa-sha256"/>
        <ds:Reference URI="#_abc123">
          <ds:Transforms>
            <ds:Transform Algorithm="http://www.w3.org/2000/09/xmldsig#enveloped-signature"/>
            <ds:Transform Algorithm="http://www.w3.org/2001/10/xml-exc-c14n#"/>
          </ds:Transforms>
          <ds:DigestMethod Algorithm="http://www.w3.org/2001/04/xmlenc#sha256"/>
          <ds:DigestValue>Base64DigestValueHere</ds:DigestValue>
        </ds:Reference>
      </ds:SignedInfo>
      <ds:SignatureValue>Base64SignatureValueHere</ds:SignatureValue>
    </ds:Signature>
    <saml:Subject>
      <saml:NameID Format="urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress"
          SPNameQualifier="https://org-a-app.com/saml/metadata">
        user@partner-company.com
      </saml:NameID>
      <saml:SubjectConfirmation Method="urn:oasis:names:tc:SAML:2.0:cm:bearer">
        <saml:SubjectConfirmationData
            NotOnOrAfter="2025-03-15T10:10:05Z"
            Recipient="https://org-a-app.com/saml/acs"
            InResponseTo="_1234567890"/>
      </saml:SubjectConfirmation>
    </saml:Subject>
    <saml:Conditions
        NotBefore="2025-03-15T09:59:55Z"
        NotOnOrAfter="2025-03-15T11:00:05Z">
      <saml:AudienceRestriction>
        <saml:Audience>https://org-a-app.com/saml/metadata</saml:Audience>
      </saml:AudienceRestriction>
    </saml:Conditions>
    <saml:AuthnStatement
        AuthnInstant="2025-03-15T10:00:00Z"
        SessionIndex="_session123">
      <saml:AuthnContext>
        <saml:AuthnContextClassRef>
          urn:oasis:names:tc:SAML:2.0:ac:classes:PasswordProtectedTransport
        </saml:AuthnContextClassRef>
      </saml:AuthnContext>
    </saml:AuthnStatement>
    <saml:AttributeStatement>
      <saml:Attribute Name="email" NameFormat="urn:oasis:names:tc:SAML:2.0:attrname-format:basic">
        <saml:AttributeValue>user@partner-company.com</saml:AttributeValue>
      </saml:Attribute>
      <saml:Attribute Name="firstName" NameFormat="urn:oasis:names:tc:SAML:2.0:attrname-format:basic">
        <saml:AttributeValue>John</saml:AttributeValue>
      </saml:Attribute>
      <saml:Attribute Name="lastName" NameFormat="urn:oasis:names:tc:SAML:2.0:attrname-format:basic">
        <saml:AttributeValue>Doe</saml:AttributeValue>
      </saml:Attribute>
      <saml:Attribute Name="groups" NameFormat="urn:oasis:names:tc:SAML:2.0:attrname-format:basic">
        <saml:AttributeValue>external-users</saml:AttributeValue>
        <saml:AttributeValue>partner-admins</saml:AttributeValue>
      </saml:Attribute>
    </saml:AttributeStatement>
  </saml:Assertion>
</samlp:Response>
```

### Scenario 2: Merger and Acquisition Integration

**Use Case**: Two companies merge, requiring identity system integration during a transition period.

**Architecture Evolution**:

Phase 1 (Days 1-30): Federation Bridge
```
[Acquirer IdP] <=== Federation ===> [Acquired IdP]
```

Phase 2 (Months 1-6): Directory Synchronization
```
[Acquirer AD] ---SCIM---> [Acquirer IdP] <===> [Acquired IdP]
                                                     |
                                               [Acquired AD]
```

Phase 3 (Months 6-18): Consolidation
```
[Unified AD] ---SCIM---> [Unified IdP]
                              |
                    [All Applications]
```

**Key Challenges**:

1. **Schema Mapping**: Different attribute names, formats, and structures
   - Map acq:givenName to acq:firstName
   - Handle different group naming conventions
   - Normalize phone number formats (+1 vs 011)
   - Map different department/org structures

2. **Application Migration**: Move applications from acquired IdP to unified IdP
   - Identify all SPs registered with each IdP
   - Categorize by migration complexity (SAML vs direct integration)
   - Schedule migration waves by dependency
   - Test each application post-migration
   - Maintain access during transition via federation

3. **Credential Harmonization**:
   - Users from both orgs maintain existing credentials initially
   - MFA policies may differ between orgs
   - Gradual rollout of unified password policy
   - Self-service credential migration portal

4. **Access Auditing**:
   - Normalize audit logs from both IdPs
   - Track access during transition period
   - Identify orphaned accounts post-migration
   - Generate unified compliance reports

### Scenario 3: Social Login Federation

**Use Case**: Allow users to authenticate using their existing social identities (Google, GitHub, Facebook, Apple).

**Architecture**:
```
[Google] ---+
[GitHub] ---+--- [IdP] ---> [Application]
[Apple]  ---+
```

**Configuration**:

1. **OIDC Provider Registration**:
   - Register application with each social provider
   - Configure redirect URIs (one per provider per environment)
   - Obtain client ID and client secret
   - Configure scopes (profile, email, openid)

2. **Account Linking**:
   - Default: new account created per social provider
   - Option: Link multiple social identities to same account
   - Matching: use verified email as linking key
   - Allow users to link/unlink social accounts in profile

3. **Attribute Mapping**:
   ```json
   {
     "google": {
       "sub": "external_id",
       "email": "email",
       "given_name": "first_name",
       "family_name": "last_name",
       "picture": "avatar_url"
     },
     "github": {
       "login": "username",
       "email": "email",
       "name": "display_name",
       "avatar_url": "avatar_url"
     }
   }
   ```

4. **Security Considerations**:
   - Verify email ownership (Google/GitHub email may not be verified)
   - Handle email collisions (same email from different providers)
   - Rate-limit per social provider (prevent abuse)
   - Implement account takeover detection (unusual login locations)

**OIDC Configuration (Google)**:
```yaml
client_id: "1234567890-abcdef.apps.googleusercontent.com"
client_secret: "GOCSPX-xxxxxxxxxxxx"
redirect_uri: "https://idp.example.com/auth/oidc/google/callback"
scopes:
  - openid
  - profile
  - email
authorization_endpoint: "https://accounts.google.com/o/oauth2/v2/auth"
token_endpoint: "https://oauth2.googleapis.com/token"
userinfo_endpoint: "https://openidconnect.googleapis.com/v1/userinfo"
issuer: "https://accounts.google.com"
jwks_uri: "https://www.googleapis.com/oauth2/v3/certs"
```

### Scenario 4: Cross-Cloud Identity Federation

**Use Case**: Users authenticated by on-premises or cloud IdP need access to resources across AWS, Azure, and GCP.

**Architecture**:
```
[Corporate IdP] ---+--- [AWS IAM Identity Center]
                   +--- [Azure AD External Identities]
                   +--- [GCP Workforce Identity Federation]
```

**AWS IAM Identity Center Configuration**:

1. **Setup**:
   - Enable IAM Identity Center (successor to AWS SSO)
   - Choose identity source: external IdP (SAML 2.0)
   - Configure SAML application in corporate IdP
   - Map SAML attributes to AWS roles

2. **Attribute Mapping**:
   ```
   SAML Attribute: Role -> AWS role (arn:aws:iam::123456:role/AdminAccess)
   SAML Attribute: RoleSessionName -> AWS session name (user@company.com)
   SAML Attribute: email -> mapped to username
   ```

3. **Permission Sets**:
   - AdminAccess: Full admin role
   - PowerUserAccess: All services except IAM
   - ReadOnlyAccess: Read-only across all services
   - Custom: Scoped per-team per-account

**Azure AD External Identities Configuration**:

1. **B2B Collaboration**:
   - Invite external users via email
   - Users authenticate with their home IdP
   - Azure AD handles federation protocol translation
   - Self-service redemption for invited guests

2. **B2B Direct Connect**:
   - Mutual trust with partner Azure AD tenants
   - No explicit invitation required
   - Access based on configured trust settings
   - Requires mutual Azure AD tenant configuration

**GCP Workforce Identity Federation**:

1. **Setup**:
   - Configure workforce pool in GCP
   - Map corporate IdP as OIDC or SAML provider
   - Configure attribute conditions for access
   - Map to GCP IAM roles

2. **Configuration Example**:
```hcl
resource "google_iam_workforce_pool" "corporate" {
  workforce_pool_id = "corporate-pool"
  parent            = "organizations/123456789"
  location          = "global"
  display_name      = "Corporate Workforce Pool"
  description       = "Federation with corporate IdP"
  disabled          = false
  session_duration  = "3600s"
}

resource "google_iam_workforce_pool_provider" "oidc" {
  workforce_pool_id   = google_iam_workforce_pool.corporate.workforce_pool_id
  provider_id         = "corporate-oidc"
  location            = "global"
  display_name        = "Corporate OIDC Provider"
  description         = "OIDC federation with corporate IdP"
  disabled            = false
  attribute_mapping   = {
    "google.subject"         = "assertion.sub"
    "attribute.email"       = "assertion.email"
    "attribute.groups"      = "assertion.groups"
  }
  oidc {
    issuer_uri        = "https://corporate-idp.example.com/auth/realms/prod"
    client_id         = "gcp-workforce-client"
    client_secret     = null
    web_sso_config {
      response_type             = "id_token"
      assertion_claims_behavior = "ONLY_ID_TOKEN_CLAIMS"
    }
  }
}
```

### Scenario 5: B2C Identity Federation

**Use Case**: Consumer-facing application that allows users to authenticate via multiple social and enterprise IdPs.

**Architecture**:
```
[Google]
[Facebook]
[Apple]    ---+--- [IdP Proxy/Frontend] ---> [Application: API + SPA]
[Email/Pass]  |
[Enterprise SAML clients]
```

**Key Design Decisions**:

1. **IdP Proxy vs Direct Integration**:
   - Proxy (Keycloak, Auth0, Firebase Auth): Single integration point
   - Direct: Each provider integrated separately in application
   - Proxy recommended for multi-provider, multi-app scenarios

2. **User Registration Flow**:

   First-time social login:
   ```
   User clicks "Sign in with Google"
   Google consent screen -> User approves
   Redirect to IdP proxy with authorization code
   IdP proxy exchanges code for tokens
   IdP proxy looks up user by email
   If exists: link social identity to existing account
   If not: create new account, prompt for additional info
   Return session token to application
   ```

3. **Progressive Profiling**:
   - Collect minimal data on first login (email, name from provider)
   - Request additional attributes as needed (phone, address, preferences)
   - Use incremental consent for new data collection
   - Allow profile completion later

4. **Multiple Identity Linking**:
   - One user account can have multiple linked identities
   - Link by: email match, manual linking in profile, magic link
   - Primary identity determined by first-exist or user preference

### Scenario 6: Government and Regulated Industry Federation

**Use Case**: Government agencies or regulated industries requiring high-assurance identity federation (e.g., IAL2/IAL3, eIDAS).

**Architecture**:
```
[Government IdP] === SAML 2.0 (with enhanced assurance) ===> [SP: Agency A]
                        |
                   [SP: Agency B]
                        |
                   [SP: Partner System]
```

**Key Requirements**:

1. **Identity Assurance Levels**:
   - IAL1: Self-asserted identity (email registration)
   - IAL2: Remote identity proofing (government ID, biometric)
   - IAL3: In-person identity proofing
   - Federation must convey assurance level in assertions

2. **Authenticator Assurance Levels**:
   - AAL1: Single-factor authentication
   - AAL2: Multi-factor authentication
   - AAL3: Phishing-resistant MFA (FIDO2/WebAuthn, PIV/CAC)

3. **Federation Assurance**:
   - SAML authentication context class reflects AAL
   - SP uses auth context to enforce minimum assurance
   - IdP must not downgrade assurance for federation
   - Audit records must include assurance levels

**High-Assurance SAML AuthnRequest**:
```xml
<samlp:AuthnRequest
    xmlns:samlp="urn:oasis:names:tc:SAML:2.0:protocol"
    xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion"
    ID="_high-assurance-request-1"
    Version="2.0"
    IssueInstant="2025-03-15T10:00:00Z"
    Destination="https://gov-idp.gov/saml/sso"
    AssertionConsumerServiceURL="https://agency-a.gov/saml/acs"
    ProtocolBinding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST"
    ForceAuthn="true">
  <saml:Issuer>https://agency-a.gov/saml/metadata</saml:Issuer>
  <samlp:RequestedAuthnContext Comparison="minimum">
    <saml:AuthnContextClassRef>
      https://refeds.org/profile/mfa
    </saml:AuthnContextClassRef>
    <saml:AuthnContextClassRef>
      urn:gov:nist:levels:authentication:3
    </saml:AuthnContextClassRef>
  </samlp:RequestedAuthnContext>
  <samlp:Scoping>
    <samlp:IDPList>
      <samlp:IDPEntry ProviderID="https://gov-idp.gov/saml/metadata"/>
    </samlp:IDPList>
  </samlp:Scoping>
</samlp:AuthnRequest>
```

4. **Metadata Security Requirements**:
   - Metadata must be signed
   - Certificates must meet organizational PKI requirements
   - Key sizes: RSA 2048+ or ECDSA P-256+
   - Certificate rotation with overlap period
   - Signed metadata via federation registry or secure exchange

## Federation Protocol Deep Dives

### SAML 2.0 Federation

**SAML Profiles**:

| Profile | Description | Best For |
|---|---|---|
| Web Browser SSO | User authenticates at IdP, redirected to SP | Most web application scenarios |
| Single Logout | User logs out of IdP, all SPs notified | Compliance, security |
| Artifact Binding | SAML messages exchanged via backchannel reference | Large assertions, privacy |
| Name Identifier Mapping | Map between different user identifiers | Cross-domain identity correlation |
| Attribute Query | SP queries IdP for additional user attributes | Dynamic attribute retrieval |
| Enhanced Client/Proxy | IdP profile for proxied federation | Complex federation topologies |

**SAML Bindings**:

| Binding | Mechanism | Pros | Cons |
|---|---|---|---|
| HTTP Redirect | URL-encoded parameters, GET | Simple, fast | URL length limit (8KB) |
| HTTP POST | Form auto-submit | No size limit, more reliable | Requires JavaScript |
| Artifact | Backchannel SOAP call for assertion | Privacy (no assertion in browser) | Two round trips required |
| SOAP | Direct IdP-SP communication | Backchannel, no browser | Requires network connectivity |

**SAML Metadata Structure**:
```xml
<md:EntityDescriptor
    xmlns:md="urn:oasis:names:tc:SAML:2.0:metadata"
    entityID="https://idp.example.com/metadata">
  <md:IDPSSODescriptor
      protocolSupportEnumeration="urn:oasis:names:tc:SAML:2.0:protocol">
    <md:KeyDescriptor use="signing">
      <ds:KeyInfo xmlns:ds="http://www.w3.org/2000/09/xmldsig#">
        <ds:X509Data>
          <ds:X509Certificate>Base64CertHere</ds:X509Certificate>
        </ds:X509Data>
      </ds:KeyInfo>
    </md:KeyDescriptor>
    <md:KeyDescriptor use="encryption">
      <ds:KeyInfo xmlns:ds="http://www.w3.org/2000/09/xmldsig#">
        <ds:X509Data>
          <ds:X509Certificate>Base64EncryptionCertHere</ds:X509Certificate>
        </ds:X509Data>
      </ds:KeyInfo>
    </md:KeyDescriptor>
    <md:SingleSignOnService
        Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-Redirect"
        Location="https://idp.example.com/saml/sso"/>
    <md:SingleSignOnService
        Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST"
        Location="https://idp.example.com/saml/sso"/>
    <md:SingleLogoutService
        Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-Redirect"
        Location="https://idp.example.com/saml/slo"/>
    <md:SingleLogoutService
        Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST"
        Location="https://idp.example.com/saml/slo"/>
    <md:NameIDFormat>
      urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress
    </md:NameIDFormat>
    <md:NameIDFormat>
      urn:oasis:names:tc:SAML:2.0:nameid-format:persistent
    </md:NameIDFormat>
    <md:NameIDFormat>
      urn:oasis:names:tc:SAML:2.0:nameid-format:transient
    </md:NameIDFormat>
  </md:IDPSSODescriptor>
</md:EntityDescriptor>
```

### OIDC Federation (OpenID Connect Federation 1.0)

OIDC Federation extends OpenID Connect with automated trust establishment and metadata exchange.

**Key Concepts**:

- **Federation Entity**: Any participant in the federation (IdP, SP, Trust Anchor)
- **Trust Anchor**: Root of trust that signs entity statements
- **Entity Statement**: Signed metadata document containing entity configuration
- **Entity Configuration**: RFC 8414 OIDC Discovery document
- **Subordinate Statement**: Entity statement signed by an intermediate authority
- **Trust Chain**: Chain of entity statements from Trust Anchor to entity

**Trust Chain Resolution**:

```
Trust Root
    |
    v
[Trust Anchor] - signs - [Intermediate Authority] - signs - [Entity]
```

**Configuration Metadata Structure (OIDC Federation Entity Configuration)**:
```json
{
  "iss": "https://idp.example.com",
  "sub": "https://idp.example.com",
  "iat": 1742000000,
  "exp": 1742600000,
  "jwks": {
    "keys": [{
      "kty": "RSA",
      "kid": "signing-key-2025-01",
      "use": "sig",
      "n": "base64url-encoded-modulus",
      "e": "AQAB"
    }]
  },
  "metadata": {
    "openid_provider": {
      "issuer": "https://idp.example.com",
      "authorization_endpoint": "https://idp.example.com/auth",
      "token_endpoint": "https://idp.example.com/token",
      "jwks_uri": "https://idp.example.com/jwks",
      "scopes_supported": ["openid", "profile", "email"],
      "response_types_supported": ["code", "id_token"],
      "grant_types_supported": ["authorization_code", "implicit"],
      "subject_types_supported": ["public", "pairwise"]
    }
  },
  "authority_hints": ["https://trust-anchor.example.com"]
}
```

**Federation API Endpoints**:
```
GET https://idp.example.com/.well-known/openid-federation
    -> Entity Configuration for idp.example.com

GET https://trust-anchor.example.com/resolve?
    subject=https://idp.example.com&
    anchor=https://trust-anchor.example.com
    -> Trust chain for idp.example.com

GET https://trust-anchor.example.com/fetch?
    iss=https://idp.example.com
    -> Most recent entity statement
```

**OIDC Federation Advantages over SAML**:
- Automated metadata exchange vs manual XML exchange
- Trust chain verification (RFC-based, standardized)
- Hierarchical trust (PKI-like) vs pairwise trust with SAML
- Built-in metadata and key rotation via entity statements
- JSON-based (lighter than XML SAML metadata)

### WS-Federation

Used primarily in Microsoft/.NET environments with Active Directory Federation Services (ADFS).

**Key Bindings**:
- **Passive**: Browser-based via HTTP redirects and form POST
- **Active**: SOAP-based for thick client applications

**Claim Types**:
```yaml
claim_types:
  "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress": Email
  "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name": Full Name
  "http://schemas.microsoft.com/ws/2008/06/identity/claims/groups": Group SIDs
  "http://schemas.microsoft.com/ws/2008/06/identity/claims/role": Role Membership
  "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/upn": User Principal Name
```

**WS-Federation vs SAML**:
| Aspect | WS-Federation | SAML 2.0 |
|---|---|---|
| Origin | Microsoft | OASIS |
| Message Format | SOAP/XML | SAML XML |
| Token Type | SAML, JWT (ADFS) | SAML assertions |
| Maturity | Legacy | Industry standard |
| Ecosystem | Microsoft-only | Cross-platform |
| Recommendation | Avoid unless Microsoft | Prefer for new integration |

## Federation Implementation Patterns

### Pattern 1: IdP-Initiated SSO

User accesses IdP portal and clicks on an application link.

**Flow**:
```
1. User logs into IdP portal (e.g., Okta dashboard)
2. User clicks on an application
3. IdP generates SAML response / constructs OIDC request
4. Browser POSTs to SP's assertion consumer / redirect URI
5. SP validates assertion and creates session
6. User is logged into application
```

**Advantages**: Centralized application access point, consistent user experience, IdP controls application visibility.
**Disadvantages**: Users must start at IdP, not at application URL, SP must handle unsolicited responses.

**SAML Configuration**:
- SP must accept unsolicited responses (IdP-initiated)
- RelayState can encode target application URL
- SP validates InResponseTo = null for IdP-initiated
- Ensure AudienceRestriction matches intended SP

### Pattern 2: SP-Initiated SSO

User accesses application first, redirected to IdP for authentication.

**Flow**:
```
1. User visits application URL (e.g., salesforce.com)
2. Application generates SAML AuthnRequest
3. Browser redirected to IdP SSO URL
4. User authenticates at IdP
5. IdP generates SAML response for SP
6. Browser POSTs response to SP ACS URL
7. SP validates assertion, creates session
8. User is logged into application
```

**Advantages**: Supports deep linking (user can bookmark app URL), standard pattern, most applications support this.
**Disadvantages**: Requires SP configuration for each application, user may see redirect to IdP.

### Pattern 3: Identity Broker / Proxy

An intermediary IdP that sits between users and downstream SPs.

```
[User] -> [Broker IdP] -> [Upstream IdP (corporate, social)]
         Broker authenticates user via upstream IdP
         Broker issues assertion to SP
         Broker translates protocols: SAML <-> OIDC
```

**Use Cases**:
- Protocol translation (SAML app, OIDC upstream IdP)
- Unified dashboard across multiple upstream IdPs
- Centralized policy enforcement point
- Gradual IdP migration

**Implementation** (Keycloak as broker):
```yaml
keycloak:
  realm: "company-realm"
  identity_providers:
    - alias: "corporate-adfs"
      provider_id: "saml"
      display_name: "Corporate Active Directory"
      config:
        entity_id: "https://adfs.company.com/adfs/services/trust"
        single_sign_on_service_url: "https://adfs.company.com/adfs/ls/"
        single_logout_service_url: "https://adfs.company.com/adfs/ls/"
        name_id_policy_format: "urn:oasis:names:tc:SAML:2.0:nameid-format:persistent"
        principal_type: "SUBJECT"
        store_token: "true"
        add_read_token_role_on_create: "false"
        authenticate_by_default: "false"
    - alias: "social-google"
      provider_id: "google"
      display_name: "Google"
      config:
        client_id: "123-abc.apps.googleusercontent.com"
        client_secret: "GOCSPX-secret"
        hosted_domain: "company.com"
        user_ip: "true"
  clients:
    - client_id: "internal-app"
      protocol: "saml"
      redirect_uris:
        - "https://internal-app.company.com/*"
      saml_config:
        assertion_consumer_url: "https://internal-app.company.com/saml/acs"
        single_logout_url: "https://internal-app.company.com/saml/slo"
        signature_algorithm: "RSA_SHA256"
```

### Pattern 4: Just-in-Time (JIT) Provisioning

User accounts created on-demand during first federation login.

**JIT Provisioning Flow**:
```
1. First-time user federates from IdP to SP
2. SP receives assertion with user attributes
3. SP checks if user exists in local directory
4. User not found -> SP creates account automatically
5. Account attributes seeded from assertion attributes
6. Default roles/groups assigned based on mapped attributes
7. User logged into application with new account
8. Subsequent logins: normal authentication (account exists)
```

**JIT Provisioning Configuration (Azure AD)**:
```json
{
  "automaticProvisioning": {
    "enabled": true,
    "matchingAttribute": "mail",
    "defaultRole": "user",
    "defaultGroups": ["external-users", "jit-provisioned"],
    "attributeMappings": {
      "mail": "email",
      "givenName": "first_name",
      "sn": "last_name",
      "displayName": "display_name",
      "telephoneNumber": "phone",
      "department": "department",
      "company": "organization"
    },
    "welcomeEmail": {
      "enabled": true,
      "template": "welcome-template"
    }
  }
}
```

**JIT vs SCIM**:
| Aspect | JIT Provisioning | SCIM Bulk Provisioning |
|---|---|---|
| Timing | On first login | Scheduled or event-driven |
| Data Source | Federation assertion | Directory/HR system |
| Account Creation | Automatic per user | Batch or streaming |
| Deprovisioning | Not handled (no trigger) | Sync deletions from source |
| Attribute Updates | On login only (may be stale) | Continuous sync |
| Complexity | Low | Medium-High |
| Compliance Gap | Orphan accounts possible | Complete lifecycle |

**Recommendation**: Use JIT for initial access, combined with SCIM for ongoing lifecycle management.

## Attribute Mapping and Claims Transformation

### SAML Attribute Mapping

**Standard SAML Attributes**:
```yaml
urn:oid:0.9.2342.19200300.100.1.3: "mail"         # Email
urn:oid:2.5.4.42:                    "givenName"    # First Name
urn:oid:2.5.4.4:                     "sn"           # Last Name
urn:oid:0.9.2342.19200300.100.1.1:   "uid"          # User ID
urn:oid:2.5.4.10:                    "o"            # Organization
urn:oid:2.5.4.11:                    "ou"           # Organizational Unit
urn:oid:1.3.6.1.4.1.5923.1.1.1.6:   "eduPersonPrincipalName"  # Education
urn:oid:1.3.6.1.4.1.5923.1.1.1.7:   "eduPersonEntitlement"    # Entitlements
```

**Transform Function Examples**:
```
Rule: Transform email to UPN
Source: mail attribute
Transform: toLower(extractBefore(@, '@') + '@company.com')
Target: upn attribute

Rule: Transform AD groups to application roles
Source: memberOf attribute (list of DNs)
Transform: forEach(memberOf, extractGroupName(@))
Target: Role attribute (list of role names)

Rule: Derive display name from parts
Source: givenName, sn
Transform: givenName + ' ' + sn
Target: displayName attribute
```

### OIDC Claims Mapping

**Standard OIDC Claims**:
```json
{
  "sub": "unique-identifier",
  "email": "user@company.com",
  "email_verified": true,
  "name": "John Doe",
  "given_name": "John",
  "family_name": "Doe",
  "preferred_username": "jdoe",
  "groups": ["engineering", "admin"],
  "roles": ["developer"],
  "department": "Engineering",
  "company": "Acme Corp"
}
```

**Claims Mapping Rules (Keycloak)**:
```json
{
  "claims": {
    "mappers": [
      {
        "name": "email mapper",
        "protocol": "openid-connect",
        "protocolMapper": "oidc-usermodel-attribute-mapper",
        "config": {
          "user.attribute": "email",
          "claim.name": "email",
          "claim.value": null,
          "jsonType.label": "String",
          "id.token.claim": true,
          "access.token.claim": true,
          "userinfo.token.claim": true
        }
      },
      {
        "name": "groups mapper",
        "protocol": "openid-connect",
        "protocolMapper": "oidc-group-membership-mapper",
        "config": {
          "full.path": false,
          "claim.name": "groups",
          "id.token.claim": true,
          "access.token.claim": true,
          "userinfo.token.claim": true
        }
      }
    ]
  }
}
```

## Federation Troubleshooting

### Common Issues and Solutions

| Issue | Symptom | Root Cause | Solution |
|---|---|---|---|
| Clock skew | Assertion NotBefore/NotOnOrAfter errors | IdP and SP clocks differ | Synchronize clocks via NTP, configure allowed skew (5 min typical) |
| Certificate mismatch | Signature validation failure | Expired or wrong cert in metadata | Update metadata, rotate certs with overlap period |
| Mismatched ACS URL | Invalid assertion consumer URL | Wrong URL configured | Verify ACS URL matches SP metadata exactly |
| Audience mismatch | Invalid audience restriction | Wrong audience value | Set audience to match SP entity ID |
| Attribute not received | Missing user data after SSO | Attribute not configured or named differently | Check attribute mapping, use SAML tracer |
| RelayState error | Return to wrong application after login | Corrupted or expired RelayState | Reduce timeout, use encrypted RelayState |
| Session mismatch | User redirected back to IdP repeatedly | SP session timeout < IdP session | Synchronize session timeouts, use refresh tokens |
| CORS error | Cross-origin request blocked | Incomplete CORS config | Allow IdP origin in SP CORS policy |

### Debugging SAML Federations

**Step 1: Capture SAML Traffic**
Use browser SAML tracer extensions or proxy tools:
- SAML Chrome DevTools panel
- Postman Interceptor
- Fiddler / Charles Proxy

**Step 2: Validate XML Signature**
```bash
# Extract assertion XML and verify signature
xmlsec1 --verify --id-attr:ID assertion.xml

# Check certificate chain
openssl x509 -in cert.pem -text -noout
openssl verify -CAfile ca.pem cert.pem
```

**Step 3: Check XML Validity**
```bash
# Validate against SAML schema
xmllint --noout --schema saml-schema-assertion-2.0.xsd assertion.xml
xmllint --noout --schema saml-schema-protocol-2.0.xsd protocol.xml
```

**Step 4: Verify Conditions**
```python
# Pseudocode for assertion validation
assertion = parse_saml_assertion(xml)
current_time = datetime.utcnow()

if current_time < assertion.conditions.not_before:
    raise ClockSkewError("Assertion not yet valid")

if current_time > assertion.conditions.not_on_or_after:
    raise ExpiredAssertionError("Assertion expired")

if sp_entity_id not in assertion.conditions.audience_restriction:
    raise AudienceMismatchError("SP not in audience")

if assertion.subject.confirmation.method != BEARER:
    raise InvalidConfirmationMethod()
```

### Debugging OIDC Federations

**Step 1: Validate ID Token (JWT)**
```python
import jwt
import requests

# Fetch JWKS from IdP
jwks_uri = "https://idp.example.com/auth/realms/prod/protocol/openid-connect/certs"
jwks = requests.get(jwks_uri).json()

# Get the key ID from token header
unverified_header = jwt.get_unverified_header(id_token)
key = next(k for k in jwks["keys"] if k["kid"] == unverified_header["kid"])

# Verify token
try:
    decoded = jwt.decode(
        id_token,
        key=jwk.construct(key),
        algorithms=["RS256"],
        audience=client_id,
        issuer=issuer_url,
        options={
            "verify_signature": True,
            "verify_aud": True,
            "verify_iss": True,
            "verify_exp": True,
            "verify_iat": True,
        }
    )
    print("Token valid:", decoded)
except jwt.ExpiredSignatureError:
    print("Token expired")
except jwt.InvalidAudienceError:
    print("Invalid audience")
except jwt.InvalidIssuerError:
    print("Invalid issuer")
except jwt.InvalidSignatureError:
    print("Invalid signature")
```

**Step 2: Validate Nonce for Replay Protection**
```python
# During authorization request, store nonce in session
session["oidc_nonce"] = generate_nonce()

# During token validation
if decoded_token.get("nonce") != session.get("oidc_nonce"):
    raise ReplayAttackError("Nonce mismatch")

# Nonces should expire (15 minute window)
if datetime.utcnow() - session["oidc_nonce_time"] > timedelta(minutes=15):
    raise ReplayAttackError("Nonce too old")
```

## Federation Security

### Metadata Security

| Practice | Implementation |
|---|---|
| Signed metadata | All metadata must be digitally signed |
| Validate signatures | Verify metadata signatures at import and on refresh |
| Encrypt metadata for sensitive deployments | Use TLS + XML encryption |
| Pin metadata URLs | Configure specific metadata fetch URLs |
| Validate entity IDs | Verify entity ID in metadata matches expected value |
| Certificate rotation | Overlap period between old and new cert minimum 72 hours |

### Assertion Security

1. **Signing**: All assertions must be signed (SAML) or use signed JWTs (OIDC)
   - SAML: `<ds:Signature>` on Assertion element
   - OIDC: JWS signed ID token
   - Algorithm: RSA-SHA256 or ECDSA-P256 minimum

2. **Encryption**: Encrypt assertions for sensitive attributes
   - SAML: `<xenc:EncryptedData>` for encrypted attributes
   - OIDC: JWE encrypted ID token for sensitive claims
   - Encrypt to SP's public key from metadata

3. **Audience Restriction**: Assertion must target specific SP
   - SAML: `AudienceRestriction` in Conditions
   - OIDC: `aud` claim must match client_id
   - Prevents assertion reuse across SPs

4. **Timeliness**: Assertions have limited validity window
   - SAML: NotBefore to NotOnOrAfter (5-10 minute typical)
   - OIDC: `iat` and `exp` claims (1-2 hour typical)
   - Replay prevention via nonce or assertion ID tracking

5. **Subject Confirmation**: Verify subject is real user
   - SAML: Bearer, Holder-of-Key, Sender-Vouches
   - OIDC: `c_hash` (code hash), `at_hash` (access token hash)
   - Bearer alone is vulnerable; use HoK for high-security

### Session Security

1. **IdP Session**:
   - Store as HTTP-only, Secure, SameSite session cookie
   - Set idle timeout (15 minutes) and absolute max (8 hours)
   - Revoke on password change, MFA reset, or admin action

2. **SP Session**:
   - SP session must not exceed IdP session
   - Use refresh tokens for seamless re-authentication
   - Implement forced logout on IdP session revocation

3. **Cross-Domain Session Management**:
   - SAML Single Logout Profile
   - OIDC Session Management (RP-Initiated Logout)
   - Back-Channel Logout (OIDC) for server-side notification
   - Logout tokens (OpenID Connect Logout)

## Federation Operations

### Metadata Lifecycle

1. **Initial Exchange**:
   - IdP exports metadata (XML or JSON)
   - SP imports and validates metadata
   - SP configures assertion consumer / redirect URL
   - Test federation with SP-Initiated and IdP-Initiated flows

2. **Rotating Certificates**:
   - Generate new certificate pair 30 days before expiry
   - Add new certificate to metadata (keep old one)
   - Wait for metadata propagation (cache TTL dependent)
   - Remove old certificate 72 hours after rotation confirmed
   - Test signature verification with new certificate

3. **Updating Metadata**:
   - Publish new metadata version
   - Notify federation partners and provide grace period
   - Validate at SP that old metadata still works (backward compatible)
   - Schedule cut-off for old metadata
   - Remove old endpoints, certificates after cut-off

### Monitoring Federation Health

**Health Metrics**:
```
Successful authentications: Count/minute, trend
Failed authentications: Count/minute, by error code
Federation latency: p50, p95, p99 (IdP response time)
Metadata refresh: Last successful refresh, age
Certificate expiry: Days until expiration (alert at 30 days)
DLQ depth: Failed assertion processing events
```

**Federation Dashboard**:
```
Logon Health
  Total authentications: 1,234/hr (last 24h)
  Success rate: 99.7%
  Average response time: 320ms (p95: 890ms)
  
Top Failed Providers
  provider-evil.example.com: 45 failures (cert expired)
  legacy-partner.com: 23 failures (clock skew)
  
Top Failed SPs
  cloud-app.example.com: 12 failures (audience mismatch)
  
Certificate Expiry
  IdP signing cert: 87 days (OK)
  Partner metadata certs: 4 expiring within 30 days
```

## Federation Policy and Governance

### Federation Agreement Template

```yaml
federation_agreement:
  partner_org:
    name: "Partner Company Inc."
    entity_id: "https://partner.com/saml/metadata"
    
  trust_parameters:
    protocol: SAML 2.0
    profile: Web Browser SSO
    bindings:
      - HTTP-POST
      - HTTP-Redirect
    encryption_required: true
    signing_algorithm: RSA-SHA256
    digest_algorithm: SHA256
    min_key_size: 2048
    
  attribute_contract:
    required_attributes:
      email:
        source: "mail"
        format: "emailAddress"
        signed: true
      name_id:
        format: "persistent"
        encrypted: true
    optional_attributes:
      - "firstName"
      - "lastName"
      - "groups"
    attribute_encryption:
      enabled: true
      algorithm: "aes256-cbc"
      
  session_policy:
    max_session_lifetime: 480  # minutes
    reauth_interval: 1440  # minutes (24h)
    single_logout_required: true
    
  certificate_management:
    rotation_period_days: 365
    overlap_period_days: 30
    notification_period_days: 60
    
  sla:
    availability: "99.9%"
    max_auth_time: "5 seconds"
    support_response: "4 hours"
    escalation: "critical issue: 1 hour"
```

### Compliance Mapping

| Framework | Requirement | Federation Control |
|---|---|---|
| SOC 2 CC6.1 | Logical access controls | Federation authentication, SSO |
| SOC 2 CC6.6 | Transmission security | TLS for all federation endpoints |
| HIPAA 164.312(a) | Access control | Unique user identification via federation |
| HIPAA 164.312(d) | Integrity controls | Signed assertions |
| PCI DSS 8.3.1 | MFA for remote access | Federation with MFA enforcement |
| FedRAMP IA-2 | Identification and auth | SAML AAL2/AAL3 Federation |
| GDPR Art. 32 | Security of processing | Encrypted assertions, access logging |

## References

- `idp-security-best-practices.md` -- IdP Security Best Practices
- `saml-oidc.md` -- SAML vs OIDC
- `federation-sso.md` -- Federation and SSO Patterns
- `idp-setup.md` -- Identity Provider Setup
