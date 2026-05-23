# XSS Prevention Guide

## XSS Types

| Type | Description | Example |
|------|-------------|---------|
| Reflected | Payload in URL/request, reflected immediately | `?q=<script>alert(1)</script>` |
| Stored | Payload saved to DB, served to all users | Comment field with `<script>` tag |
| DOM-based | Payload executed via client-side JS | `location.hash` or `innerHTML` |

## Output Encoding Contexts

| Context | Encoding | Example |
|---------|----------|---------|
| HTML element | HTML entity encode `<>&"'` | `&lt;script&gt;` |
| HTML attribute | Attribute encode, avoid `javascript:` | `&quot;` |
| JavaScript string | Unicode escape | `\u003cscript\u003e` |
| URL | URL encode | `%3Cscript%3E` |
| CSS | CSS escape | `\3C script\3E` |

## DOMPurify Usage

```tsx
import DOMPurify from 'dompurify'

// Basic sanitization
const clean = DOMPurify.sanitize(dirtyHtml)

// Allow specific tags
const clean = DOMPurify.sanitize(dirtyHtml, {
  ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a'],
  ALLOWED_ATTR: ['href', 'target'],
})

// React usage with dangerouslySetInnerHTML
function RichContent({ html }: { html: string }) {
  const clean = useMemo(() => DOMPurify.sanitize(html), [html])
  return <div dangerouslySetInnerHTML={{ __html: clean }} />
}
```

## CSP Nonce Generation

```typescript
// Server-side: generate nonce per request
import crypto from 'node:crypto'

const nonce = crypto.randomBytes(16).toString('base64')

// Pass nonce to template
res.setHeader(
  'Content-Security-Policy',
  `script-src 'nonce-${nonce}' 'strict-dynamic'`
)
```

## React-Specific XSS Rules

```tsx
// SAFE — React escapes by default
<div>{userInput}</div>

// UNSAFE without sanitization
<div dangerouslySetInnerHTML={{ __html: userInput }} />

// SAFE — href is safe if validated
const isUrlSafe = (url: string): boolean =>
  !url.startsWith('javascript:') && !url.startsWith('data:')

// UNSAFE patterns
eval(userInput)                             // NEVER
new Function(userInput)                     // NEVER
setTimeout(`alert(${data})`, 100)          // NEVER
element.innerHTML = userInput              // NEVER
```

## Sanitization Libraries

| Library | Size | Use Case |
|---------|------|----------|
| DOMPurify | ~10KB | HTML sanitization (React, Vue) |
| sanitize-html | ~30KB | Node.js HTML sanitization |
| striptags | ~2KB | Strip all HTML tags |
| express-validator | ~15KB | Server-side input validation |
| zod | ~15KB | Schema-based input validation |

## Input Validation Pattern

```typescript
import { z } from 'zod'

const commentSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
  body: z.string().min(1).max(5000),
})

// Reject on server AND strip on client
function sanitizeComment(input: unknown) {
  const parsed = commentSchema.parse(input)
  return {
    ...parsed,
    body: DOMPurify.sanitize(parsed.body, { ALLOWED_TAGS: [] }),
  }
}
```
