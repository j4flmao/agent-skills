---
name: firebase
description: >
  Use this skill when working with Firebase platform — Firestore, Authentication, Cloud Storage, Cloud Functions, Hosting, Security Rules, Firebase Admin SDK, Firebase Extensions.
  This skill enforces: proper security rules, Firestore data modeling (no nesting >3), auth provider configuration, function cold start mitigation, cost-aware query design.
  Do NOT use for: Supabase, AWS Amplify, custom backend, general PostgreSQL/NoSQL database design.
version: "1.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [backend, universal, firebase, baas, phase-4]
---

# Firebase

## Purpose
Architect serverless backends on Firebase — Firestore document modeling, Authentication providers, Cloud Functions triggers, Storage security, Hosting configuration, and operational best practices.

## Agent Protocol

### Trigger
User request includes: `Firebase`, `Firestore`, `Firebase Auth`, `Cloud Functions`, `Firebase Storage`, `Firebase Hosting`, `security rules`, `Firebase Admin`, `Firebase Extensions`, `Firebase App Check`, `Firebase Remote Config`, `Firebase emulator`, `Firebase cost`.

### Input Context
- All Firebase capabilities needed (DB, auth, storage, functions, hosting)
- Target platforms (web, iOS, Android, Node.js admin)
- Estimated user/request scale
- Auth providers (email, Google, Apple, custom)

### Output Artifact
Firebase project architecture, security rules, data model, function triggers, hosting config.

### Response Format
Produce artifact directly. No preamble, no postamble, no explanations. No filler, no hedging, no transitions. Strip articles a/an/the where unambiguous. Compress output — why use many token when few do trick.

### Completion Criteria
- Firestore data model designed (collections, documents, indexes, subcollections)
- Security rules defined (read/write/validate per collection)
- Auth providers configured (web + mobile SDK setup)
- Cloud Functions triggers mapped (onCreate, onUpdate, onDelete, onRequest, scheduled)
- Storage security rules + Hosting config (rewrites, headers, redirects)
- Cost optimization plan (read/write counts, indexes, function timeout/memory)

### Max Response Length
4096 tokens

## Workflow

### Step 1: Project Setup
```bash
npm install firebase firebase-admin
npm install -g firebase-tools

firebase login
firebase init
# Select: Firestore, Functions, Storage, Hosting, Emulators
```

```typescript
// src/lib/firebase.ts (client SDK)
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY!,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN!,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET!,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID!,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID!,
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);

// Admin SDK (server-side)
import { initializeApp as initializeAdmin, cert } from 'firebase-admin/app';
import { getFirestore as getAdminFirestore } from 'firebase-admin/firestore';
import { getAuth as getAdminAuth } from 'firebase-admin/auth';

const adminApp = initializeAdmin({ credential: cert(serviceAccount) });
export const adminDb = getAdminFirestore(adminApp);
export const adminAuth = getAdminAuth(adminApp);
```

### Step 2: Firestore Data Modeling
```
Collection: users/{userId}
  name, email, avatar, createdAt, role

Collection: posts/{postId}
  title, content, authorId, tags[], published, likeCount, createdAt
  Subcollection: comments/{commentId}
    authorId, content, createdAt

Collection: tags/{tagId}
  name, postCount
```

### Step 3: Security Rules
```
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    function isAuth() { return request.auth != null; }
    function isOwner(userId) { return request.auth.uid == userId; }
    function isAdmin() { return get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin'; }

    match /users/{userId} {
      allow read: if true;
      allow write: if isOwner(userId) || isAdmin();
      allow create: if isAuth() && request.resource.data.email is string;
    }

    match /posts/{postId} {
      allow read: if true;
      allow create: if isAuth() && request.resource.data.authorId == request.auth.uid;
      allow update, delete: if isOwner(resource.data.authorId) || isAdmin();
    }

    match /posts/{postId}/comments/{commentId} {
      allow read: if true;
      allow write: if isAuth();
    }
  }
}

service firebase.storage {
  match /b/{bucket}/o {
    match /users/{userId}/{allPaths=**} {
      allow read: if true;
      allow write: if request.auth.uid == userId;
    }
  }
}
```

### Step 4: Cloud Functions
```typescript
import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

admin.initializeApp();

export const onPostCreate = functions.firestore
  .document('posts/{postId}')
  .onCreate(async (snap, context) => {
    const post = snap.data();
    await admin.firestore().doc(`users/${post.authorId}`).update({
      postCount: admin.firestore.FieldValue.increment(1),
    });
  });

export const scheduledCleanup = functions.pubsub
  .schedule('every 24 hours')
  .onRun(async () => {
    const old = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    const snaps = await admin.firestore()
      .collection('posts')
      .where('createdAt', '<', old)
      .where('published', '==', false)
      .get();
    const batch = admin.firestore().batch();
    snaps.forEach(doc => batch.delete(doc.ref));
    await batch.commit();
  });
```

### Step 5: Authentication
```typescript
// Email/password sign up
import { createUserWithEmailAndPassword } from 'firebase/auth';
await createUserWithEmailAndPassword(auth, email, password);

// Google sign in
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
const provider = new GoogleAuthProvider();
await signInWithPopup(auth, provider);

// Custom claims (Admin SDK)
await adminAuth.setCustomUserClaims(uid, { role: 'admin' });

// Verify ID token
const decoded = await adminAuth.verifyIdToken(idToken);
if (decoded.role === 'admin') { /* allow */ }
```

## Rules
- Firestore: max 1 write per second on a document — use aggregations for counters.
- Use subcollections instead of nested objects when data grows unbounded.
- Security rules evaluate on every read/write — limit get() calls within rules.
- Cloud Functions: set memory/timeout based on workload — 256MB for light triggers, 1GB+ for heavy processing.
- Firebase Pricing: Firestore charges per read/write/delete — index writes count as 1 write + 1 per index.
- Use Firebase App Check to block unauthorized client requests.
- Enable Firestore PITR (point-in-time recovery) for production.
- Functions: use `minInstances` for latency-sensitive endpoints (cost trade-off).
- Store service account JSON outside the repo — use secret manager.

## References

### Reference Files
- `references/firestore-database.md` — Firestore data modeling, queries, indexes, real-time, offline, security rules
- `references/firebase-auth.md` — Auth providers, custom claims, admin SDK, multi-tenancy, security
- `references/firebase-storage-hosting.md` — Cloud Storage, Hosting, CDN, security rules, rewrite config
- `references/cloud-functions.md` — Cloud Functions triggers, deployment, cold starts, memory config, monitoring

### Related Skills
- `mobile/universal/crash-reporting/SKILL.md` — Firebase Crashlytics integration
- `mobile/universal/analytics/SKILL.md` — Firebase Analytics
- `frontend/universal/authentication/SKILL.md` — Client-side auth patterns
- `backend/universal/supabase/SKILL.md` — Supabase (alternative)

## Handoff
Hand off to `mobile/*/SKILL.md` for client-side SDK integration or `devops/monitoring/SKILL.md` for Firebase monitoring setup.
