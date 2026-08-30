# Zero Trust: PKI Management

## 1. The Role of PKI in Zero Trust
Public Key Infrastructure (PKI) is the cryptographic backbone of a Zero Trust Architecture. It enables mTLS, code signing, and identity verification. Without a secure and scalable PKI, Zero Trust cannot exist.

## 2. Architecture of an Enterprise PKI
A flat PKI (a single CA issuing all certificates) is a severe security risk. If the key is compromised, the entire organization falls.

### The Tiered CA Model
1. **Offline Root CA**: 
   - Kept powered off in a physical safe. 
   - Its only job is to sign the certificates of Intermediate CAs. 
   - Lifespan: 10-20 years.
2. **Intermediate CAs**: 
   - Online and highly secured (often backed by Hardware Security Modules - HSMs).
   - Issues certificates to sub-CAs or directly to infrastructure components.
   - Lifespan: 3-5 years.
3. **Issuing CAs**: 
   - Handles the high-velocity issuance of ephemeral certificates to workloads, microservices, and users.
   - Lifespan: 1 year.

## 3. SPIFFE and SPIRE Integration
In modern cloud-native environments, static PKI cannot keep up with the ephemeral nature of containers.
- **SPIRE** acts as an Issuing CA.
- It integrates with the enterprise Intermediate CA (via Upstream Authority plugins like AWS ACM PCA or Vault) to chain its dynamically issued certificates back to the corporate Offline Root CA.
- This ensures that a microservice running in AWS can establish mTLS with a legacy database running on-premise, as both share the same Root of Trust.
