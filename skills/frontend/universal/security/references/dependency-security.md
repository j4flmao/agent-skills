# Dependency Security

## Audit Configuration

```json
{
  "scripts": {
    "audit": "npm audit --audit-level=high",
    "audit:fix": "npm audit fix --audit-level=moderate",
    "outdated": "npm outdated",
    "snyk": "snyk test --all-projects",
    "supply-chain": "npm audit --json | node scripts/audit-report.js"
  }
}
```

## Automated Dependency Updates

```yaml
# .github/dependabot.yml
version: 2
updates:
  - package-ecosystem: "npm"
    directory: "/"
    schedule:
      interval: "weekly"
      day: "monday"
    open-pull-requests-limit: 10
    labels:
      - "dependencies"
      - "security"
    reviewers:
      - "security-team"
    assignees:
      - "dependabot"
    allow:
      - dependency-type: "direct"
    ignore:
      - dependency-name: "react"
        versions: [">18.x"]
    commit-message:
      prefix: "chore"
      include: "scope"
```

## Vulnerability Scan Script

```typescript
import { exec } from 'node:child_process'
import { readFile } from 'node:fs/promises'
import path from 'node:path'

interface Vulnerability {
  severity: 'low' | 'moderate' | 'high' | 'critical'
  package: string
  title: string
  patchedIn: string
  vulnerableVersions: string
  cvssScore?: number
  cve?: string
  cwe?: string
}

async function scanDependencies(projectPath: string): Promise<Vulnerability[]> {
  return new Promise((resolve, reject) => {
    exec('npm audit --json', { cwd: projectPath }, (error, stdout) => {
      if (error && !stdout) return reject(error)

      try {
        const audit = JSON.parse(stdout)
        const vulnerabilities: Vulnerability[] = []

        for (const [pkg, data] of Object.entries(audit.vulnerabilities ?? {})) {
          const vuln = data as any
          vulnerabilities.push({
            severity: vuln.severity,
            package: pkg,
            title: vuln.title ?? `Vulnerability in ${pkg}`,
            patchedIn: vuln.patchedRange ?? 'N/A',
            vulnerableVersions: vuln.vulnerableRange ?? 'N/A',
            cvssScore: vuln.cvss?.score,
            cve: vuln.cve?.join(', '),
            cwe: vuln.cwe?.join(', '),
          })
        }

        resolve(vulnerabilities)
      } catch (parseError) {
        reject(parseError)
      }
    })
  })
}
```

## Dependency License Checker

```typescript
interface LicenseInfo {
  package: string
  version: string
  license: string
  author: string
  repository: string
}

const ALLOWED_LICENSES = [
  'MIT',
  'Apache-2.0',
  'BSD-2-Clause',
  'BSD-3-Clause',
  'ISC',
  'CC0-1.0',
  'Unlicense',
  '0BSD',
]

async function checkLicenses(): Promise<LicenseInfo[]> {
  const { exec } = require('child_process')
  return new Promise((resolve, reject) => {
    exec('npx license-checker --json', (error: any, stdout: string) => {
      if (error) return reject(error)
      const licenses: LicenseInfo[] = []

      for (const [pkg, info] of Object.entries(JSON.parse(stdout))) {
        const licenseInfo = info as any
        if (!ALLOWED_LICENSES.includes(licenseInfo.licenses)) {
          licenses.push({
            package: pkg,
            version: licenseInfo.version,
            license: licenseInfo.licenses,
            author: licenseInfo.author,
            repository: licenseInfo.repository,
          })
        }
      }

      resolve(licenses)
    })
  })
}
```

## SBOM Generation

```typescript
interface SBOMEntry {
  name: string
  version: string
  type: 'library' | 'application' | 'framework'
  licenses: string[]
  dependencies: string[]
  vulnerabilities: Vulnerability[]
}

async function generateSBOM(projectPath: string): Promise<SBOMEntry[]> {
  const packageJson = JSON.parse(
    await readFile(path.join(projectPath, 'package.json'), 'utf-8')
  )

  const sbom: SBOMEntry[] = []
  const allDeps = {
    ...packageJson.dependencies,
    ...packageJson.devDependencies,
  }

  for (const [name, version] of Object.entries(allDeps)) {
    sbom.push({
      name,
      version: (version as string).replace('^', '').replace('~', ''),
      type: packageJson.dependencies[name] ? 'library' : 'development',
      licenses: [],
      dependencies: [],
      vulnerabilities: [],
    })
  }

  return sbom
}

async function exportSBOM(sbom: SBOMEntry[]): Promise<string> {
  return JSON.stringify({
    bomFormat: 'CycloneDX',
    specVersion: '1.4',
    version: 1,
    metadata: {
      timestamp: new Date().toISOString(),
      tools: [{ name: 'dependency-security', version: '1.0.0' }],
    },
    components: sbom.map(entry => ({
      type: entry.type,
      name: entry.name,
      version: entry.version,
      licenses: entry.licenses.map(l => ({ license: { name: l } })),
    })),
  }, null, 2)
}
```

## Lock File Security

```typescript
async function validateLockFile(): Promise<{ valid: boolean; issues: string[] }> {
  const issues: string[] = []

  try {
    const lockContent = await readFile('package-lock.json', 'utf-8')
    const lock = JSON.parse(lockContent)

    if (lock.lockfileVersion < 2) {
      issues.push('Lockfile version should be >= 2 for integrity checks')
    }

    for (const [pkg, info] of Object.entries(lock.packages ?? {})) {
      const pkgInfo = info as any
      if (!pkgInfo.integrity) {
        issues.push(`Missing integrity hash for ${pkg}`)
      }

      if (pkgInfo.resolved && !pkgInfo.resolved.startsWith('https://')) {
        issues.push(`Non-HTTPS resolved URL for ${pkg}: ${pkgInfo.resolved}`)
      }
    }
  } catch (error) {
    issues.push(`Failed to parse lockfile: ${error}`)
  }

  return { valid: issues.length === 0, issues }
}
```

## Supply Chain Verification

```typescript
interface PackageVerification {
  name: string
  version: string
  integrity: string
  signatures: Array<{
    keyid: string
    sig: string
  }>
}

async function verifyPackageIntegrity(
  name: string,
  version: string
): Promise<boolean> {
  try {
    const response = await fetch(
      `https://registry.npmjs.org/${name}/${version}`
    )
    const manifest = await response.json()

    const tarball = manifest.dist.tarball
    const integrity = manifest.dist.integrity

    const tarballResponse = await fetch(tarball)
    const buffer = await tarballResponse.arrayBuffer()
    const hashBuffer = await crypto.subtle.digest('SHA-512', buffer)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')

    const expectedHash = Buffer.from(integrity.split('-')[1], 'base64')
      .toString('hex')

    return hashHex === expectedHash
  } catch {
    return false
  }
}
```

## Key Points

- Run npm audit regularly in CI/CD with high severity threshold
- Configure Dependabot or Renovate for automated dependency updates
- Scan for license compliance and block unapproved licenses
- Generate SBOM (Software Bill of Materials) for all dependencies
- Use lockfiles with integrity hashes (lockfileVersion >= 2)
- Prefer dependencies with proven maintenance and security track records
- Pin dependency versions in production, use ranges in development
- Review dependency diff before merging updates
- Monitor for abandoned or unmaintained dependencies
- Use tools like Snyk or Socket.dev for continuous monitoring
- Verify package signatures and integrity when possible
- Remove unused dependencies to reduce attack surface
