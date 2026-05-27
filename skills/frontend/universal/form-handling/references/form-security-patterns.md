# Form Security Patterns

## CSRF Token Integration

```typescript
interface CSRFTokenProvider {
  getToken: () => Promise<string>
  refreshToken: () => Promise<string>
}

class CSRFTokenManager implements CSRFTokenProvider {
  private token: string | null = null
  private refreshUrl: string

  constructor(refreshUrl: string) {
    this.refreshUrl = refreshUrl
  }

  async getToken(): Promise<string> {
    if (!this.token) {
      await this.refreshToken()
    }
    return this.token!
  }

  async refreshToken(): Promise<string> {
    const response = await fetch(this.refreshUrl, {
      credentials: 'include',
    })
    const data = await response.json()
    this.token = data.csrfToken
    return this.token
  }
}

function csrfMiddleware(tokenProvider: CSRFTokenProvider) {
  return async (config: RequestInit & { headers?: Record<string, string> }): Promise<RequestInit> => {
    const token = await tokenProvider.getToken()
    return {
      ...config,
      headers: {
        ...config.headers,
        'X-CSRF-Token': token,
      },
    }
  }
}
```

## Input Sanitization

```typescript
function sanitizeInput(input: string, maxLength = 1000): string {
  return input
    .trim()
    .slice(0, maxLength)
    .replace(/[<>]/g, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+=/gi, '')
}

function sanitizeHtml(input: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;',
  }
  return input.replace(/[&<>"'/]/g, char => map[char])
}

function sanitizeObject<T extends Record<string, unknown>>(obj: T): T {
  const result = { ...obj }
  for (const key of Object.keys(result)) {
    if (typeof result[key] === 'string') {
      result[key as keyof T] = sanitizeInput(result[key] as string) as T[keyof T]
    }
  }
  return result
}
```

## Rate Limiting for Form Submissions

```typescript
interface RateLimitConfig {
  maxAttempts: number
  windowMs: number
  onBlocked?: (identifier: string) => void
}

class FormRateLimiter {
  private attempts: Map<string, { count: number; resetAt: number }> = new Map()
  private config: RateLimitConfig

  constructor(config: RateLimitConfig) {
    this.config = config
  }

  check(identifier: string): { allowed: boolean; retryAfter?: number } {
    const now = Date.now()
    const record = this.attempts.get(identifier)

    if (!record || now > record.resetAt) {
      this.attempts.set(identifier, {
        count: 1,
        resetAt: now + this.config.windowMs,
      })
      return { allowed: true }
    }

    record.count++

    if (record.count > this.config.maxAttempts) {
      this.config.onBlocked?.(identifier)
      return {
        allowed: false,
        retryAfter: Math.ceil((record.resetAt - now) / 1000),
      }
    }

    return { allowed: true }
  }

  reset(identifier: string): void {
    this.attempts.delete(identifier)
  }
}

// React hook
function useFormRateLimit(maxAttempts = 5, windowMs = 60000) {
  const limiterRef = useRef(new FormRateLimiter({ maxAttempts, windowMs }))
  const identifier = useMemo(() => {
    return `form-${window.location.pathname}`
  }, [])

  const checkLimit = useCallback(() => {
    return limiterRef.current.check(identifier)
  }, [identifier])

  const resetLimit = useCallback(() => {
    limiterRef.current.reset(identifier)
  }, [identifier])

  return { checkLimit, resetLimit }
}
```

## Server-Side Validation Proxy

```typescript
interface ValidationRule {
  field: string
  type: 'string' | 'number' | 'email' | 'url' | 'regex' | 'custom'
  required?: boolean
  minLength?: number
  maxLength?: number
  pattern?: string
  validate?: (value: unknown) => string | null
}

function createServerValidationHandler(rules: ValidationRule[]) {
  return async (formData: Record<string, unknown>): Promise<Record<string, string[]>> => {
    const errors: Record<string, string[]> = {}

    for (const rule of rules) {
      const value = formData[rule.field]
      const fieldErrors: string[] = []

      if (rule.required && (value === undefined || value === null || value === '')) {
        fieldErrors.push(`${rule.field} is required`)
      } else if (value !== undefined && value !== null && value !== '') {
        if (typeof value === 'string') {
          if (rule.minLength && value.length < rule.minLength) {
            fieldErrors.push(`Minimum ${rule.minLength} characters required`)
          }
          if (rule.maxLength && value.length > rule.maxLength) {
            fieldErrors.push(`Maximum ${rule.maxLength} characters allowed`)
          }
          if (rule.pattern && !new RegExp(rule.pattern).test(value)) {
            fieldErrors.push('Invalid format')
          }
          if (rule.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
            fieldErrors.push('Invalid email address')
          }
          if (rule.type === 'url' && !/^https?:\/\/.+/.test(value)) {
            fieldErrors.push('Invalid URL')
          }
        }
        if (rule.type === 'number' && typeof value !== 'number') {
          fieldErrors.push('Must be a number')
        }
        if (rule.validate) {
          const customError = rule.validate(value)
          if (customError) fieldErrors.push(customError)
        }
      }

      if (fieldErrors.length > 0) {
        errors[rule.field] = fieldErrors
      }
    }

    return errors
  }
}
```

## File Upload Security

```typescript
const ALLOWED_FILE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
  'text/plain',
]

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

function validateFileUpload(file: File): string | null {
  if (!ALLOWED_FILE_TYPES.includes(file.type)) {
    return `File type ${file.type} is not allowed`
  }

  if (file.size > MAX_FILE_SIZE) {
    return `File size exceeds ${MAX_FILE_SIZE / 1024 / 1024}MB limit`
  }

  if (file.name.includes('..') || file.name.includes('/')) {
    return 'Invalid file name'
  }

  return null
}

function scanFileContent(file: File): Promise<boolean> {
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onload = () => {
      const content = reader.result as string
      const suspicious = [
        '<script', '<?php', '<%', 'eval(', 'javascript:',
        'data:text/html', 'onload=', 'onerror=',
      ]
      const isSafe = !suspicious.some(s => content.toLowerCase().includes(s))
      resolve(isSafe)
    }
    reader.readAsText(file.slice(0, 4096))
  })
}
```

## SQL Injection Prevention in Form Queries

```typescript
function sanitizeForSQL(input: string): string {
  return input
    .replace(/'/g, "''")
    .replace(/\\/g, '\\\\')
    .replace(/\0/g, '')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\x1a/g, '\\Z')
}

function buildParameterizedQuery(
  template: string,
  params: Record<string, unknown>
): { text: string; values: unknown[] } {
  const values: unknown[] = []
  let index = 0
  const text = template.replace(/\$(\w+)/g, (_, key) => {
    if (params[key] !== undefined) {
      values.push(params[key])
      index++
      return `$${index}`
    }
    throw new Error(`Missing parameter: ${key}`)
  })
  return { text, values }
}
```

## XSS Prevention in Form Output

```typescript
function encodeForOutput(input: string, context: 'html' | 'attribute' | 'javascript' | 'css'): string {
  switch (context) {
    case 'html':
      return input
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;')
    case 'attribute':
      return input
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
    case 'javascript':
      return input
        .replace(/\\/g, '\\\\')
        .replace(/"/g, '\\"')
        .replace(/'/g, "\\'")
        .replace(/<\/script>/gi, '<\\/script>')
    case 'css':
      return input.replace(/[^\w\s-]/g, '')
    default:
      return input
  }
}

function FormattedOutput({ value, context = 'html' }: { value: string; context?: 'html' | 'attribute' | 'javascript' | 'css' }) {
  const safe = encodeForOutput(value, context)
  if (context === 'html') {
    return <span dangerouslySetInnerHTML={{ __html: safe }} />
  }
  return <span>{safe}</span>
}
```

## Honeypot Field

```typescript
function HoneypotField({ name = 'website' }: { name?: string }) {
  return (
    <div
      style={{
        position: 'absolute',
        left: '-9999px',
        opacity: 0,
        height: 0,
        overflow: 'hidden',
      }}
      aria-hidden="true"
    >
      <label htmlFor={name}>Leave this field empty</label>
      <input
        id={name}
        name={name}
        type="text"
        tabIndex={-1}
        autoComplete="off"
        onChange={(e) => {
          if (e.target.value) {
            e.target.form?.classList.add('honeypot-filled')
          }
        }}
      />
    </div>
  )
}

function checkHoneypot(formData: FormData, fieldName = 'website'): boolean {
  const value = formData.get(fieldName)
  return !value || value === ''
}
```

## Timestamp and HMAC Validation

```typescript
async function generateFormSignature(
  formId: string,
  secret: string
): Promise<{ signature: string; timestamp: number }> {
  const timestamp = Date.now()
  const data = `${formId}:${timestamp}`
  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const signature = await crypto.subtle.sign(
    'HMAC',
    key,
    encoder.encode(data)
  )
  const sigArray = Array.from(new Uint8Array(signature))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')

  return { signature: sigArray, timestamp }
}

function validateFormTimestamp(timestamp: number, maxAgeMs = 3600000): boolean {
  return Date.now() - timestamp < maxAgeMs
}
```

## Key Points

- Implement CSRF tokens on all form submissions
- Sanitize all user inputs client-side and server-side
- Apply rate limiting per user/session to prevent brute force
- Validate file uploads by type, size, and content
- Use parameterized queries for any database operations
- Encode output appropriately for HTML, attributes, JS, and CSS contexts
- Add honeypot fields to detect automated bot submissions
- Sign forms with HMAC timestamps to prevent replay attacks
- Never trust client-side validation alone
- Strip script tags and event handlers from user input
- Limit input lengths to prevent buffer overflow attacks
- Log and monitor suspicious form submission patterns
