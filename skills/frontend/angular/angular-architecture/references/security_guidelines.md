# Security Guidelines

## Preventing XSS (Cross-Site Scripting)
Angular automatically sanitizes untrusted values bound to the DOM, effectively preventing most XSS attacks. However, avoid bypassing this carelessly.

### DomSanitizer
Use `DomSanitizer` ONLY when you absolutely trust the source (e.g., hardcoded internal HTML) and need to bind raw HTML, URLs, or styles.

```typescript
constructor(private sanitizer: DomSanitizer) {}

get safeHtml() {
  // Use with caution!
  return this.sanitizer.bypassSecurityTrustHtml(this.untrustedHtml);
}
```

## Route Protection
Always protect sensitive routes using `CanActivate` guards. Ensure backend APIs also validate authentication, as frontend routing can be bypassed by malicious users altering JS execution.

## Interceptor Security
Use HTTP Interceptors to handle global security concerns:
1. **Attaching Tokens**: Automatically attach JWTs or CSRF tokens to outgoing requests.
2. **Handling 401s**: Globally catch authentication errors and redirect to login.

```typescript
@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  intercept(req: HttpRequest<any>, next: HttpHandler) {
    const authReq = req.clone({
      headers: req.headers.set('Authorization', `Bearer ${getToken()}`)
    });
    return next.handle(authReq);
  }
}
```
