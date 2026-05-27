# PII Detection

## Pattern-Based Detection

```typescript
interface PIIDetectionResult {
  type: PIIType
  value: string
  position: { start: number; end: number }
  confidence: number
  masked: string
}

enum PIIType {
  EMAIL = 'email',
  PHONE = 'phone',
  SSN = 'ssn',
  CREDIT_CARD = 'credit_card',
  IP_ADDRESS = 'ip',
  DATE_OF_BIRTH = 'dob',
  ADDRESS = 'address',
  PASSPORT = 'passport',
  DRIVERS_LICENSE = 'drivers_license',
}

const patterns: Record<PIIType, RegExp> = {
  [PIIType.EMAIL]: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
  [PIIType.PHONE]: /\b(\+?1?[-.\s]?)?\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}\b/g,
  [PIIType.SSN]: /\b\d{3}-\d{2}-\d{4}\b/g,
  [PIIType.CREDIT_CARD]: /\b(?:\d{4}[-\s]?){3}\d{4}\b/g,
  [PIIType.IP_ADDRESS]: /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g,
}

function detectPII(text: string): PIIDetectionResult[] {
  const results: PIIDetectionResult[] = []

  for (const [type, pattern] of Object.entries(patterns)) {
    const matches = text.matchAll(pattern)
    for (const match of matches) {
      results.push({
        type: type as PIIType,
        value: match[0],
        position: { start: match.index!, end: match.index! + match[0].length },
        confidence: calculateConfidence(type as PIIType, match[0]),
        masked: maskValue(type as PIIType, match[0]),
      })
    }
  }

  return results.sort((a, b) => a.position.start - b.position.start)
}

function calculateConfidence(type: PIIType, value: string): number {
  switch (type) {
    case PIIType.EMAIL:
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? 0.95 : 0.7
    case PIIType.CREDIT_CARD:
      return luhnCheck(value.replace(/[-\s]/g, '')) ? 0.98 : 0.5
    case PIIType.SSN:
      return /^\d{3}-\d{2}-\d{4}$/.test(value) ? 0.97 : 0.6
    default:
      return 0.9
  }
}
```

## Masking Strategies

```typescript
type MaskingStrategy = 'full' | 'partial' | 'last_four' | 'show_first' | 'custom'

interface MaskConfig {
  strategy: MaskingStrategy
  visibleChars?: number
  maskChar?: string
  preserveFormat?: boolean
}

const maskConfigs: Record<PIIType, MaskConfig> = {
  [PIIType.EMAIL]: { strategy: 'partial', visibleChars: 2, maskChar: '*' },
  [PIIType.PHONE]: { strategy: 'last_four', maskChar: '*' },
  [PIIType.SSN]: { strategy: 'last_four', maskChar: '*', preserveFormat: true },
  [PIIType.CREDIT_CARD]: { strategy: 'last_four', maskChar: '*', preserveFormat: true },
  [PIIType.IP_ADDRESS]: { strategy: 'partial', visibleChars: 0, maskChar: 'x' },
}

function maskValue(type: PIIType, value: string): string {
  const config = maskConfigs[type] || { strategy: 'full', maskChar: '*' }

  switch (config.strategy) {
    case 'full':
      return config.maskChar!.repeat(value.length)

    case 'partial': {
      const visible = value.slice(0, config.visibleChars)
      const masked = config.maskChar!.repeat(value.length - config.visibleChars)
      return visible + masked
    }

    case 'last_four': {
      if (config.preserveFormat) {
        return maskPreservingFormat(value, config.maskChar!)
      }
      const lastFour = value.slice(-4)
      return config.maskChar!.repeat(value.length - 4) + lastFour
    }

    case 'show_first':
      return value.charAt(0) + config.maskChar!.repeat(value.length - 1)

    default:
      return config.maskChar!.repeat(value.length)
  }
}

function maskPreservingFormat(value: string, maskChar: string): string {
  return value.replace(/[^-\s]/g, (char, index) => {
    const digits = value.replace(/[-\s]/g, '')
    return index >= digits.length - 4 ? char : maskChar
  })
}
```

## Structured Data Masking

```typescript
interface MaskingPolicy {
  fields: Record<string, MaskConfig>
  detectPatterns?: boolean
}

const userMaskingPolicy: MaskingPolicy = {
  fields: {
    email: { strategy: 'partial', visibleChars: 3 },
    phone: { strategy: 'last_four' },
    ssn: { strategy: 'last_four', preserveFormat: true },
    creditCard: { strategy: 'last_four', preserveFormat: true },
    password: { strategy: 'full' },
    ipAddress: { strategy: 'partial', visibleChars: 0, maskChar: 'x' },
  },
  detectPatterns: true,
}

function maskObject<T extends Record<string, unknown>>(
  data: T,
  policy: MaskingPolicy,
): T {
  const masked = { ...data }

  for (const [key, value] of Object.entries(masked)) {
    if (policy.fields[key]) {
      masked[key as keyof T] = maskValueByType(value as string, policy.fields[key])
    } else if (typeof value === 'object' && value !== null) {
      masked[key as keyof T] = maskObject(value as Record<string, unknown>, policy)
    }
  }

  return masked
}
```

## Key Points

- Use regex patterns for common PII types
- Implement confidence scoring to reduce false positives
- Support multiple masking strategies per PII type
- Preserve format characters when masking structured values
- Apply recursive masking to nested objects
- Detect and mask PII in unstructured text
- Use Luhn check for credit card validation
- Mask data at the API boundary before logging
- Implement field-level masking policies
- Support custom masking characters and patterns
- Test masking with diverse PII examples
- Log masking operations for audit compliance
