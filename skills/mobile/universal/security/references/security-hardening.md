# Mobile Security Hardening

## Jailbreak Detection

```swift
class SecurityChecker {
    static func isJailbroken() -> Bool {
        #if targetEnvironment(simulator)
        return false
        #endif

        let jailbreakPaths = [
            "/Applications/Cydia.app",
            "/Applications/Sileo.app",
            "/Library/MobileSubstrate/MobileSubstrate.dylib",
            "/bin/bash",
            "/usr/sbin/sshd",
            "/etc/apt",
            "/private/var/lib/apt/",
            "/private/var/stash",
        ]

        for path in jailbreakPaths {
            if FileManager.default.fileExists(atPath: path) {
                return true
            }
        }

        if canOpenURL("cydia://package/com.example.package") {
            return true
        }

        let testPath = "/private/jailbreaktest.txt"
        do {
            try "test".write(toFile: testPath, atomically: true, encoding: .utf8)
            try FileManager.default.removeItem(atPath: testPath)
            return true
        } catch { }

        return false
    }

    static func isDebuggerAttached() -> Bool {
        var kinfo = kinfo_proc()
        var size = MemoryLayout<kinfo_proc>.stride
        var mib: [Int32] = [CTL_KERN, KERN_PROC, KERN_PROC_PID, getpid()]

        let result = sysctl(&mib, u_int(mib.count), &kinfo, &size, nil, 0)
        guard result == 0 else { return false }

        return (kinfo.kp_proc.p_flag & P_TRACED) != 0
    }

    static func performIntegrityCheck() -> SecurityStatus {
        let status = SecurityStatus()

        status.isJailbroken = isJailbroken()
        status.isDebuggerAttached = isDebuggerAttached()
        status.isEmulator = isRunningInEmulator()
        status.hasTamperedBundle = checkBundleIntegrity()

        return status
    }

    private static func canOpenURL(_ urlString: String) -> Bool {
        guard let url = URL(string: urlString) else { return false }
        return UIApplication.shared.canOpenURL(url)
    }

    private static func isRunningInEmulator() -> Bool {
        #if targetEnvironment(simulator)
        return true
        #else
        return false
        #endif
    }

    private static func checkBundleIntegrity() -> Bool {
        guard let executablePath = Bundle.main.executablePath,
              let codeSigning = try? Data(contentsOf: URL(fileURLWithPath: executablePath)) else {
            return false
        }

        let hash = sha256(data: codeSigning)
        let expectedHash = Bundle.main.infoDictionary?["ExpectedHash"] as? String
        return expectedHash == nil || hash == expectedHash
    }
}

struct SecurityStatus {
    var isJailbroken = false
    var isDebuggerAttached = false
    var isEmulator = false
    var hasTamperedBundle = false

    var isCompromised: Bool {
        return isJailbroken || isDebuggerAttached || hasTamperedBundle
    }
}
```

## Secure Networking

```swift
class SecureURLProtocol: URLProtocol {
    static let pinnedHashes: Set<String> = [
        "abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890",
    ]

    override func startLoading() {
        guard let request = (request as? NSMutableURLRequest)?.copy() as? URLRequest ?? request as? URLRequest else {
            client?.urlProtocol(self, didFailWithError: NetworkError.invalidRequest)
            return
        }

        let session = URLSession(configuration: .ephemeral, delegate: self, delegateQueue: nil)
        let task = session.dataTask(with: request) { data, response, error in
            if let error {
                self.client?.urlProtocol(self, didFailWithError: error)
                return
            }
            if let response {
                self.client?.urlProtocol(self, didReceive: response, cacheStoragePolicy: .notAllowed)
            }
            if let data {
                self.client?.urlProtocol(self, didLoad: data)
            }
            self.client?.urlProtocolDidFinishLoading(self)
        }
        task.resume()
    }

    override func stopLoading() { }

    enum NetworkError: Error {
        case invalidRequest
    }
}
```

## Key Points

- Implement jailbreak detection on app launch
- Detect debugger attachment for release builds
- Check bundle integrity for tamper detection
- Implement runtime integrity verification
- Use certificate pinning for all API calls
- Encrypt local storage with device-specific keys
- Use secure random for session tokens
- Implement rate limiting for sensitive endpoints
- Use anti-replay protection for API requests
- Clear sensitive data from memory after use
- Implement remote wipe capability
- Use security testing tools in CI pipeline
