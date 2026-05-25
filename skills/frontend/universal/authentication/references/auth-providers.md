# Auth Providers

## Provider Comparison

| Provider | OAuth/SSO | MFA | Magic Link | Social Login | Pricing |
|----------|-----------|-----|------------|--------------|---------|
| Auth0 | Yes | Yes | Yes | 30+ providers | Free tier: 7K users |
| Clerk | Yes | Yes | Yes | 10+ providers | Free tier: 10K users |
| Supabase | Yes | Yes | Yes | Built-in | Free tier: 50K users |
| Firebase Auth | Yes | Yes | No | 10+ providers | Free tier: 50K users |
| Cognito | Yes | Yes | No | Social via OIDC | Pay per MAU |
| Custom JWT | DIY | DIY | DIY | DIY | Infrastructure only |

## Auth0 Setup

```typescript
import { Auth0Provider } from '@auth0/auth0-react'

function AuthRoot({ children }: { children: React.ReactNode }) {
  return (
    <Auth0Provider
      domain={import.meta.env.VITE_AUTH0_DOMAIN}
      clientId={import.meta.env.VITE_AUTH0_CLIENT_ID}
      authorizationParams={{
        redirect_uri: window.location.origin,
        audience: import.meta.env.VITE_AUTH0_AUDIENCE,
        scope: 'openid profile email',
      }}
      cacheLocation="memory"
      useRefreshTokens={true}
    >
      {children}
    </Auth0Provider>
  )
}
```

## Clerk Setup

```typescript
import { ClerkProvider, SignedIn, SignedOut, SignIn } from '@clerk/clerk-react'

function AuthRoot({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider publishableKey={import.meta.env.VITE_CLERK_PUBLISHABLE_KEY}>
      <SignedIn>{children}</SignedIn>
      <SignedOut>
        <SignIn routing="path" path="/sign-in" />
      </SignedOut>
    </ClerkProvider>
  )
}
```

## Supabase Auth

```typescript
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

// Email + password
async function login(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw error
  return data.session
}

// Magic link
async function sendMagicLink(email: string) {
  const { error } = await supabase.auth.signInWithOtp({ email })
  if (error) throw error
}

// Social login
async function loginWithGitHub() {
  const { error } = await supabase.auth.signInWithOAuth({ provider: 'github' })
  if (error) throw error
}
```

## Firebase Auth

```typescript
import { initializeApp } from 'firebase/app'
import {
  getAuth, signInWithEmailAndPassword, signInWithPopup,
  GoogleAuthProvider, onAuthStateChanged, signOut,
} from 'firebase/auth'

const app = initializeApp(firebaseConfig)
const auth = getAuth(app)

// Listen to auth state
onAuthStateChanged(auth, (user) => {
  if (user) {
    // user.getIdToken() for custom backend auth
  }
})

// Login
async function login(email: string, password: string) {
  const cred = await signInWithEmailAndPassword(auth, email, password)
  return cred.user
}
```

## Custom Provider Abstraction

```typescript
interface AuthProvider {
  login(email: string, password: string): Promise<Session>
  loginWithOAuth(provider: string): Promise<void>
  logout(): Promise<void>
  getAccessToken(): Promise<string | null>
  onAuthStateChanged(cb: (session: Session | null) => void): () => void
}

// Switch provider by changing this one import
const authProvider: AuthProvider = new SupabaseAuthProvider()

// Or factory based on env
function createAuthProvider(): AuthProvider {
  switch (import.meta.env.VITE_AUTH_PROVIDER) {
    case 'auth0': return new Auth0Provider()
    case 'clerk': return new ClerkProvider()
    case 'supabase': return new SupabaseAuthProvider()
    default: return new CustomJWTProvider()
  }
}
```

## Provider Selection Decision

```
Team size / infra preference?
├── Want managed auth + SSO + MFA out of box?
│   ├── Small team → Clerk (easiest DX)
│   ├── Enterprise → Auth0 (most features)
│   └── Already on Firebase → Firebase Auth
├── Need PostgreSQL + auth combined?
│   └── Supabase Auth
├── AWS shop?
│   └── Cognito
└── Full control, custom backend?
    └── Custom JWT + httpOnly cookies
```
