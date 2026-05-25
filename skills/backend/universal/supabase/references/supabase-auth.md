# Supabase Auth

## Overview
Supabase Authentication — email/password, OAuth providers, magic link, phone auth, Row Level Security integration, user management, SSO, session handling.

## Auth Providers

```typescript
import { createClient } from '@supabase/supabase-js';
const supabase = createClient(url, anonKey);

// Email/Password sign up
const { data, error } = await supabase.auth.signUp({
  email: 'user@example.com',
  password: 'securePassword123',
  options: {
    data: { full_name: 'John Doe', role: 'user' },
    emailRedirectTo: 'https://app.com/welcome',
  },
});

// Email/Password sign in
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'user@example.com',
  password: 'securePassword123',
});

// Magic link (passwordless)
const { data, error } = await supabase.auth.signInWithOtp({
  email: 'user@example.com',
  options: { shouldCreateUser: true },
});

// OAuth (Google)
const { data, error } = await supabase.auth.signInWithOAuth({
  provider: 'google',
  options: {
    redirectTo: 'https://app.com/auth/callback',
    scopes: 'email profile',
  },
});

// OAuth (GitHub, Apple, Azure, etc.)
await supabase.auth.signInWithOAuth({ provider: 'github' });
await supabase.auth.signInWithOAuth({ provider: 'apple' });

// Phone auth
const { data, error } = await supabase.auth.signInWithOtp({
  phone: '+1234567890',
});
// Then verify OTP
const { data, error } = await supabase.auth.verifyOtp({
  phone: '+1234567890',
  token: '123456',
  type: 'sms',
});

// Sign out
await supabase.auth.signOut();
```

## Session Management

```typescript
// Get current session
const { data: { session } } = await supabase.auth.getSession();

// Listen to auth state changes
supabase.auth.onAuthStateChange((event, session) => {
  if (event === 'SIGNED_IN') {
    console.log('User signed in:', session?.user);
  } else if (event === 'SIGNED_OUT') {
    console.log('User signed out');
  } else if (event === 'TOKEN_REFRESHED') {
    console.log('Token refreshed');
  }
});

// Get current user
const { data: { user } } = await supabase.auth.getUser();

// Refresh session
const { data, error } = await supabase.auth.refreshSession();

// Set session from cookie (server-side)
await supabase.auth.setSession({
  access_token: cookies.get('sb-access-token'),
  refresh_token: cookies.get('sb-refresh-token'),
});
```

## Server-Side Auth (Next.js example)

```typescript
// app/auth/callback/route.ts
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');

  if (code) {
    const supabase = createRouteHandlerClient({ cookies });
    await supabase.auth.exchangeCodeForSession(code);
  }

  return NextResponse.redirect(requestUrl.origin);
}

// Middleware (app/middleware.ts)
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse } from 'next/server';

export async function middleware(req: any) {
  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req, res });
  await supabase.auth.getSession();
  return res;
}
```

## User Management

```typescript
// Admin API (requires service role key)
import { createClient } from '@supabase/supabase-js';
const supabaseAdmin = createClient(url, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// List users (Admin API)
const { data: { users }, error } = await supabaseAdmin.auth.admin.listUsers({
  page: 1,
  perPage: 100,
});

// Get user by ID
const { data: { user }, error } = await supabaseAdmin.auth.admin.getUserById(uid);

// Create user
const { data, error } = await supabaseAdmin.auth.admin.createUser({
  email: 'new@example.com',
  password: 'password123',
  email_confirm: true,
  user_metadata: { full_name: 'New User' },
});

// Update user
await supabaseAdmin.auth.admin.updateUserById(uid, {
  email: 'updated@example.com',
  user_metadata: { role: 'admin' },
});

// Delete user
await supabaseAdmin.auth.admin.deleteUser(uid);

// Impersonate user (generate a valid session)
const { data, error } = await supabaseAdmin.auth.admin.generateLink({
  type: 'magiclink',
  email: user.email,
});
```

## RLS Integration

```sql
-- auth.uid() returns the user ID from JWT (available in every RLS policy)
-- auth.role() returns 'authenticated' or 'anon'
-- auth.jwt() returns full JWT payload

-- Example: only return user's own posts
CREATE POLICY "user_own_posts" ON public.posts
  FOR SELECT USING (auth.uid() = author_id);

-- Example: user can edit own profile
CREATE POLICY "profile_self" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- Example: admin can do anything (using JWT claim)
CREATE POLICY "admin_all" ON public.posts
  FOR ALL USING (
    auth.jwt() ->> 'role' = 'admin'
  );

-- Example: team-based access (via helper function)
CREATE OR REPLACE FUNCTION public.is_team_member(team_id UUID)
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.team_members
    WHERE team_id = $1 AND user_id = auth.uid()
  );
$$ LANGUAGE sql STABLE;

CREATE POLICY "team_content" ON public.documents
  FOR SELECT USING (
    public.is_team_member(team_id)
  );
```

## Custom Auth (Edge Functions)

```typescript
// supabase/functions/custom-auth/index.ts
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

serve(async (req) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return new Response('Unauthorized', { status: 401 });
  }

  // Your custom logic here
  return new Response(JSON.stringify({ user }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
```

## SSO (Enterprise)

```typescript
// Supabase SSO requires SAML 2.0
// Enable in Supabase Dashboard → Authentication → SSO

// Initiate SSO
const { data, error } = await supabase.auth.signInWithSSO({
  domain: 'company.com',  // Email domain
  options: { redirectTo: 'https://app.com/auth/callback' },
});

// Or by provider ID
await supabase.auth.signInWithSSO({
  providerId: 'sso-provider-id',
});
```

## Key Points
- Use `supabase.auth.getSession()` on app load (not `getUser()`) — `getSession` reads locally cached tokens.
- `getUser()` makes an API call — use sparingly for performance.
- RLS policies use `auth.uid()` — this is automatically populated from JWT.
- Service role key bypasses RLS — never expose on client.
- Auth hooks (on signup, on login) are configured in Supabase Dashboard → Auth → Hooks.
- Supabase Auth sessions auto-refresh — tokens last 1 hour.
- For Next.js: use `@supabase/auth-helpers-nextjs` for server-side auth handling.
- SSO requires Supabase Team/Enterprise plan.
