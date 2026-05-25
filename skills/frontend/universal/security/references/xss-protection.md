# XSS Protection

## XSS Types

| Type | Vector | Example | Severity |
|------|--------|---------|----------|
| Stored XSS | Persisted in database | Comment with `<script>` | Critical |
| Reflected XSS | URL parameter | `?q=<script>alert(1)</script>` | High |
| DOM-based XSS | Client-side script | `innerHTML = userInput` | High |
| Mutation XSS | Browser parser quirks | `<noscript><p title="</noscript><img src=x onerror=alert(1)>">` | Medium |

## Framework Escaping

```tsx
// React — auto-escapes by default (JSX)
const userInput = '<script>alert("xss")</script>'
return <div>{userInput}</div>  // renders as text, safe

// ❌ Dangerous: dangerouslySetInnerHTML
return <div dangerouslySetInnerHTML={{ __html: userInput }} />

// ✅ Safe: sanitize first
import DOMPurify from 'dompurify'
return <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(userInput) }} />

// Vue — auto-escapes with {{ }}
<div>{{ userInput }}</div>  // safe

// ❌ Dangerous: v-html
<div v-html="userInput"></div>

// ✅ Safe: sanitize first
<div v-html="sanitize(userInput)"></div>
```

## DOMPurify Configuration

```typescript
import DOMPurify from 'dompurify'

// Strict (default) — only safe tags
const clean = DOMPurify.sanitize(dirtyHtml)
// Result: strips <script>, <style>, on* handlers, etc.

// Allow specific tags
const clean = DOMPurify.sanitize(dirtyHtml, {
  ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br'],
  ALLOWED_ATTR: ['href', 'target', 'rel'],
  ALLOW_DATA_ATTR: false,
})

// Allow specific protocols
const clean = DOMPurify.sanitize(dirtyHtml, {
  ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto):|[^a-z]|[a-z+.-]+(?:[^a-z+.-:]|$))/i,
})

// Hooks for custom processing
DOMPurify.addHook('uponSanitizeElement', (node, data) => {
  if (data.tagName === 'style') {
    node.textContent = ''  // strip style content
  }
})
```

## Context-Specific Encoding

```typescript
// HTML context
function encodeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
}

// URL context
function encodeUrl(str: string): string {
  return encodeURI(str)
    .replace(/'/g, '%27')
    .replace(/"/g, '%22')
}

// JavaScript string context
function encodeJs(str: string): string {
  return str
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
}
```

## URL Validation

```typescript
function isSafeUrl(url: string): boolean {
  try {
    const parsed = new URL(url, window.location.origin)
    const allowedProtocols = ['https:', 'http:', 'mailto:', 'tel:']
    return allowedProtocols.includes(parsed.protocol)
  } catch {
    return false
  }
}

// Usage for links
function SafeLink({ href, children }: { href: string; children: React.ReactNode }) {
  if (!isSafeUrl(href)) {
    return <span>{children}</span>  // render as text, not link
  }
  return <a href={href} rel="noopener noreferrer">{children}</a>
}
```

## Inline Script Prevention

```typescript
// ❌ Never do this:
const script = document.createElement('script')
script.textContent = userInput
document.body.appendChild(script)

// ❌ Never use eval or similar
eval(userInput)          // dangerous
new Function(userInput)  // dangerous
setTimeout(userInput, 0) // dangerous in older browsers

// ✅ Safe alternatives:
// 1. Use framework data binding
// 2. Use DOMPurify for HTML
// 3. Use postMessage for cross-origin
// 4. Use JSON.parse for structured data
```

## CSP as XSS Defense

```http
# Strict CSP prevents all but nonced/hashed scripts
Content-Security-Policy:
  default-src 'self';
  script-src 'self' 'nonce-{random}' 'strict-dynamic';
  object-src 'none';
  base-uri 'none';
```

## Input Sanitization Checklist

- [ ] All user input escaped before rendering (framework default)
- [ ] `dangerouslySetInnerHTML` / `v-html` banned unless paired with DOMPurify
- [ ] URL validation on all user-supplied links (protocol allowlist)
- [ ] File upload filenames sanitized (no path traversal)
- [ ] JSON.parse used instead of eval for structured data
- [ ] CSP blocks inline scripts (nonce or hash only)
- [ ] postMessage origin validated
- [ ] Form input validated server-side (defense in depth)
