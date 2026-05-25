# Firebase Auth

## Overview
Firebase Authentication — providers, custom claims, Admin SDK, multi-tenancy, security best practices, session management.

## Auth Providers

```typescript
// Email/Password
import { createUserWithEmailAndPassword, signInWithEmailAndPassword,
  sendPasswordResetEmail, updatePassword } from 'firebase/auth';

// Sign up
const userCred = await createUserWithEmailAndPassword(auth, email, password);

// Sign in
const userCred = await signInWithEmailAndPassword(auth, email, password);

// Password reset
await sendPasswordResetEmail(auth, email);

// Google
import { GoogleAuthProvider, signInWithPopup, signInWithRedirect } from 'firebase/auth';
const provider = new GoogleAuthProvider();
provider.addScope('https://www.googleapis.com/auth/contacts.readonly');
const result = await signInWithPopup(auth, provider);
const credential = GoogleAuthProvider.credentialFromResult(result);
const accessToken = credential?.accessToken;

// Apple
import { OAuthProvider } from 'firebase/auth';
const appleProvider = new OAuthProvider('apple.com');
appleProvider.addScope('email');
appleProvider.addScope('name');
const result = await signInWithPopup(auth, appleProvider);

// Phone (SMS)
import { signInWithPhoneNumber, RecaptchaVerifier } from 'firebase/auth';
const appVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {});
const confirmationResult = await signInWithPhoneNumber(auth, phoneNumber, appVerifier);
const verificationCode = prompt('Enter verification code');
const result = await confirmationResult.confirm(verificationCode);

// Anonymous
import { signInAnonymously } from 'firebase/auth';
await signInAnonymously(auth);
// Later: link anonymous account to permanent provider
import { linkWithCredential, EmailAuthProvider } from 'firebase/auth';
const credential = EmailAuthProvider.credential(email, password);
await linkWithCredential(auth.currentUser!, credential);
```

## Custom Claims (Admin SDK)

```typescript
import { getAuth } from 'firebase-admin/auth';
const adminAuth = getAuth();

// Set custom claims
await adminAuth.setCustomUserClaims(uid, {
  role: 'admin',
  tier: 'premium',
  permissions: ['read:all', 'write:all'],
});

// Verify claims on client
import { getAuth, onAuthStateChanged } from 'firebase/auth';
const auth = getAuth();
auth.currentUser?.getIdTokenResult().then((idTokenResult) => {
  if (idTokenResult.claims.role === 'admin') {
    // allow admin actions
  }
});

// Remove claims
await adminAuth.setCustomUserClaims(uid, null);

// List users with claims
const users = await adminAuth.listUsers(1000);
const admins = users.users.filter(u => u.customClaims?.role === 'admin');
```

## Admin SDK

```typescript
import { initializeApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

const adminApp = initializeApp({ credential: cert(serviceAccount) });
const adminAuth = getAuth(adminApp);

// Create user
const userRecord = await adminAuth.createUser({
  email: 'user@example.com',
  emailVerified: false,
  password: 'secretPassword',
  displayName: 'John Doe',
  disabled: false,
});

// Update user
await adminAuth.updateUser(uid, {
  email: 'new@example.com',
  displayName: 'Jane Doe',
});

// Delete user
await adminAuth.deleteUser(uid);

// Import users (batch migration)
const users = await adminAuth.importUsers(
  [{
    uid: 'some-uid',
    email: 'user@example.com',
    passwordHash: Buffer.from('hash'),
    passwordSalt: Buffer.from('salt'),
  }],
  { hash: { algorithm: 'SCRYPT', key: Buffer.from('key'), saltSeparator: Buffer.from('sep') } }
);

// Verify ID token
const decodedToken = await adminAuth.verifyIdToken(idToken);
console.log(decodedToken.uid, decodedToken.role);

// Revoke refresh tokens
await adminAuth.revokeRefreshTokens(uid);
```

## Multi-Tenancy

```typescript
// Enable multi-tenancy in Firebase Console (Identity Platform required)
import { getAuth } from 'firebase-admin/auth';
const adminAuth = getAuth();

// Create tenant
const tenant = await adminAuth.tenantManager().createTenant({
  displayName: 'Acme Corp',
  emailSignInConfig: { enabled: true },
  passwordSignInAllowed: true,
});

// Auth for specific tenant
const tenantAuth = adminAuth.tenantManager().authForTenant(tenant.tenantId);
const user = await tenantAuth.getUser(uid);

// Client-side tenant sign in
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
// Set tenant ID before sign-in
auth.tenantId = 'tenant-id-abc123';
await signInWithEmailAndPassword(auth, email, password);
```

## Session Management

```typescript
// Session cookies (server-side)
import { getAuth } from 'firebase-admin/auth';
const adminAuth = getAuth();

// Create session cookie from ID token
const expiresIn = 60 * 60 * 24 * 14 * 1000; // 14 days
const sessionCookie = await adminAuth.createSessionCookie(idToken, { expiresIn });

// Verify session cookie
const decodedClaims = await adminAuth.verifySessionCookie(sessionCookie);

// Revoke session
await adminAuth.revokeRefreshTokens(decodedClaims.sub);
```

## Security

```typescript
// App Check — block unverified client requests
import { initializeAppCheck, ReCaptchaV3Provider } from 'firebase/app-check';
const appCheck = initializeAppCheck(app, {
  provider: new ReCaptchaV3Provider('6LexampleSiteKey'),
  isTokenAutoRefreshEnabled: true,
});

// Admin SDK: verify ID token on every request
// Server middleware pattern
async function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  try {
    const token = authHeader.split('Bearer ')[1];
    const decoded = await adminAuth.verifyIdToken(token);
    req.user = decoded;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

// Block compromised tokens
// Keep track of token revocation timestamps in Firestore
```

## Email Templates

```
Firebase Console → Authentication → Templates
Customize:
- Email address verification
- Password reset
- Email change

Variables available in templates:
{{displayName}}, {{email}}, {{link}}, {{organization}}

For advanced email: use Cloud Functions + SendGrid/Resend
- Trigger on `auth.user().onCreate()`
- Send custom email via third-party API
```

## Key Points
- Custom claims max size: 1000 bytes — store larger values in Firestore.
- ID tokens expire after 1 hour — use `onAuthStateChanged` for auto-refresh.
- Session cookies max 2 weeks — user must re-authenticate after.
- Multi-tenancy requires Google Cloud Identity Platform (paid).
- App Check is strongly recommended for production — blocks API abuse.
- Rate limiting: Firebase Auth enforces 10 account creation attempts per IP per hour.
- For social sign-in, always request `email` scope for consistent user identification.
