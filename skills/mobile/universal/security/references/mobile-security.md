# Mobile Security Fundamentals

## Data Encryption

```swift
import Security
import CommonCrypto

class EncryptionManager {
    static let shared = EncryptionManager()
    private let keychain = KeychainManager()

    func encrypt(data: Data, keyIdentifier: String) throws -> Data {
        guard let key = keychain.getKey(identifier: keyIdentifier) else {
            throw EncryptionError.keyNotFound
        }

        var error: Unmanaged<CFError>?
        guard let encryptedData = SecKeyCreateEncryptedData(
            key,
            algorithm: .eciesEncryptionCofactorX963SHA256AESGCM,
            data as CFData,
            &error
        ) else {
            throw EncryptionError.encryptionFailed
        }

        return encryptedData as Data
    }

    func decrypt(data: Data, keyIdentifier: String) throws -> Data {
        guard let key = keychain.getPrivateKey(identifier: keyIdentifier) else {
            throw EncryptionError.keyNotFound
        }

        var error: Unmanaged<CFError>?
        guard let decryptedData = SecKeyCreateDecryptedData(
            key,
            algorithm: .eciesEncryptionCofactorX963SHA256AESGCM,
            data as CFData,
            &error
        ) else {
            throw EncryptionError.decryptionFailed
        }

        return decryptedData as Data
    }
}

class KeychainManager {
    func storeKey(_ key: SecKey, identifier: String) -> Bool {
        let query: [String: Any] = [
            kSecClass as String: kSecClassKey,
            kSecAttrApplicationTag as String: identifier.data(using: .utf8)!,
            kSecValueRef as String: key,
            kSecAttrAccessible as String: kSecAttrAccessibleWhenUnlockedThisDeviceOnly,
        ]

        SecItemDelete(query as CFDictionary)
        let status = SecItemAdd(query as CFDictionary, nil)
        return status == errSecSuccess
    }

    func getKey(identifier: String) -> SecKey? {
        let query: [String: Any] = [
            kSecClass as String: kSecClassKey,
            kSecAttrApplicationTag as String: identifier.data(using: .utf8)!,
            kSecReturnRef as String: true,
            kSecAttrKeyType as String: kSecAttrKeyTypeEC,
        ]

        var item: CFTypeRef?
        let status = SecItemCopyMatching(query as CFDictionary, &item)
        return status == errSecSuccess ? (item as! SecKey) : nil
    }
}
```

## Certificate Pinning

```swift
import CommonCrypto

class CertificatePinner {
    private let pinnedHashes: Set<String>

    init(pinnedHashes: Set<String>) {
        self.pinnedHashes = pinnedHashes
    }

    func validate(challenge: URLAuthenticationChallenge) -> (URLSession.AuthChallengeDisposition, URLCredential?) {
        guard let serverTrust = challenge.protectionSpace.serverTrust else {
            return (.cancelAuthenticationChallenge, nil)
        }

        let policies = [SecPolicyCreateSSL(true, challenge.protectionSpace.host as CFString)]
        SecTrustSetPolicies(serverTrust, policies as CFTypeRef)

        var result: CFError?
        guard SecTrustEvaluateWithError(serverTrust, &result) else {
            return (.cancelAuthenticationChallenge, nil)
        }

        guard let certificateChain = SecTrustCopyCertificateChain(serverTrust) as? [SecCertificate],
              certificateChain.count > 0 else {
            return (.cancelAuthenticationChallenge, nil)
        }

        for certificate in certificateChain {
            if let hash = sha256Hash(of: certificate),
               pinnedHashes.contains(hash) {
                return (.useCredential, URLCredential(trust: serverTrust))
            }
        }

        return (.cancelAuthenticationChallenge, nil)
    }

    private func sha256Hash(of certificate: SecCertificate) -> String? {
        guard let data = SecCertificateCopyData(certificate) as Data? else { return nil }

        var hash = [UInt8](repeating: 0, count: Int(CC_SHA256_DIGEST_LENGTH))
        data.withUnsafeBytes { buffer in
            _ = CC_SHA256(buffer.baseAddress, CC_LONG(data.count), &hash)
        }

        return Data(hash).base64EncodedString()
    }
}

class PinnedURLSessionDelegate: NSObject, URLSessionDelegate {
    let pinner: CertificatePinner

    func urlSession(_ session: URLSession,
                    didReceive challenge: URLAuthenticationChallenge,
                    completionHandler: @escaping (URLSession.AuthChallengeDisposition, URLCredential?) -> Void) {
        let (disposition, credential) = pinner.validate(challenge: challenge)
        completionHandler(disposition, credential)
    }
}
```

## Key Points

- Use Keychain for secure credential storage
- Encrypt sensitive data at rest and in transit
- Implement certificate pinning for network security
- Use biometric authentication for sensitive operations
- Implement jailbreak detection and response
- Use App Transport Security for network requests
- Implement secure random for cryptographic operations
- Use secure enclave for key storage when available
- Implement data wiping on logout
- Use anti-debugging measures for release builds
- Implement runtime integrity checks
- Follow OWASP mobile security guidelines
