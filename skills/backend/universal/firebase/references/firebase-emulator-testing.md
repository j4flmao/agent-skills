# Firebase Emulator Testing

## Overview
Test Firebase applications locally with emulators: Firestore, Auth, Functions, Storage, and Hosting emulators, integration testing, CI/CD setup, and data seeding.

## Emulator Setup

```typescript
// firebase.json
{
  "emulators": {
    "auth": { "port": 9099 },
    "firestore": { "port": 8080 },
    "functions": { "port": 5001 },
    "storage": { "port": 9199 },
    "hosting": { "port": 5000 },
    "pubsub": { "port": 8085 },
    "ui": { "enabled": true, "port": 4000 }
  }
}
```

```bash
# Start all emulators
firebase emulators:start

# Start specific emulator
firebase emulators:start --only firestore,auth

# Import data from previous session
firebase emulators:start --import=./emulator-data

# Export data on shutdown
firebase emulators:start --export-on-exit=./emulator-data
```

## Test Configuration

```typescript
// src/test/setup.ts
import { initializeApp } from 'firebase/app';
import { connectFirestoreEmulator, getFirestore } from 'firebase/firestore';
import { connectAuthEmulator, getAuth } from 'firebase/auth';
import { connectStorageEmulator, getStorage } from 'firebase/storage';
import { initializeApp as initializeAdmin, cert } from 'firebase-admin/app';
import { getFirestore as getAdminFirestore } from 'firebase-admin/firestore';

beforeAll(() => {
  // Use local project ID for emulators
  process.env.FIREBASE_PROJECT_ID = 'test-project';

  const firebaseConfig = {
    projectId: 'test-project',
    apiKey: 'test-api-key',
    authDomain: 'test-project.firebaseapp.com',
  };

  const app = initializeApp(firebaseConfig);
  connectFirestoreEmulator(getFirestore(app), 'localhost', 8080);
  connectAuthEmulator(getAuth(app), 'http://localhost:9099');
  connectStorageEmulator(getStorage(app), 'localhost', 9199);
});

afterAll(async () => {
  await fetch('http://localhost:4000/emulator/v1/projects/test-project/databases/(default)/documents', {
    method: 'DELETE',
  });
});
```

## Firestore Integration Tests

```typescript
describe('PostRepository (Firestore Emulator)', () => {
  let postRepo: PostRepository;
  const testUserId = 'test-user-1';

  beforeEach(async () => {
    postRepo = new PostRepository();
  });

  afterEach(async () => {
    // Clear all documents
    const snapshot = await adminDb.collection('posts').get();
    const batch = adminDb.batch();
    snapshot.docs.forEach(doc => batch.delete(doc.ref));
    await batch.commit();
  });

  it('creates and retrieves a post', async () => {
    const post = {
      title: 'Test Post',
      content: 'Test content',
      authorId: testUserId,
      published: true,
    };

    const docRef = await adminDb.collection('posts').add(post);
    const saved = await adminDb.collection('posts').doc(docRef.id).get();

    expect(saved.exists).toBe(true);
    expect(saved.data()!.title).toBe('Test Post');
    expect(saved.data()!.authorId).toBe(testUserId);
  });

  it('queries posts by author', async () => {
    const posts = Array.from({ length: 5 }, (_, i) => ({
      title: `Post ${i}`,
      authorId: testUserId,
      published: true,
      createdAt: new Date(),
    }));

    for (const post of posts) {
      await adminDb.collection('posts').add(post);
    }

    const result = await adminDb.collection('posts')
      .where('authorId', '==', testUserId)
      .orderBy('createdAt', 'desc')
      .get();

    expect(result.docs).toHaveLength(5);
  });

  it('enforces security rules', async () => {
    // Test that unauthenticated writes are rejected
    const db = getFirestore(initializeApp({ projectId: 'test-project' }, 'test-app-2'));
    connectFirestoreEmulator(db, 'localhost', 8080);

    await expect(
      db.collection('posts').add({ title: 'Hacked', authorId: 'hacker' })
    ).rejects.toThrow();
  });
});
```

## Auth Tests

```typescript
describe('Authentication (Auth Emulator)', () => {
  let auth: Auth;

  beforeEach(() => {
    auth = getAuth(initializeApp({ projectId: 'test-project' }, 'auth-test'));
    connectAuthEmulator(auth, 'http://localhost:9099', { disableWarnings: true });
  });

  it('creates user with email and password', async () => {
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      'test@example.com',
      'password123'
    );

    expect(userCredential.user.email).toBe('test@example.com');
    expect(userCredential.user.uid).toBeDefined();
  });

  it('verifies ID token', async () => {
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      'verify@example.com',
      'password123'
    );

    const idToken = await userCredential.user.getIdToken();
    const decoded = await adminAuth.verifyIdToken(idToken);

    expect(decoded.email).toBe('verify@example.com');
  });

  it('sets custom claims', async () => {
    const user = await adminAuth.createUser({
      email: 'admin@example.com',
      password: 'password123',
    });

    await adminAuth.setCustomUserClaims(user.uid, { role: 'admin' });

    const claims = await adminAuth.getUser(user.uid);
    expect(claims.customClaims?.role).toBe('admin');
  });
});
```

## Cloud Functions Tests

```typescript
describe('Cloud Functions (Functions Emulator)', () => {
  it('triggers on Firestore document create', async () => {
    // Set up a listener for the function result
    const functionUrl = 'http://localhost:5001/test-project/us-central1/onPostCreate';

    // Create a document that triggers the function
    const docRef = await adminDb.collection('posts').add({
      title: 'Trigger Test',
      authorId: 'user-1',
      published: true,
    });

    // Wait for function execution
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Verify function side effect (e.g., updated user post count)
    const userDoc = await adminDb.collection('users').doc('user-1').get();
    expect(userDoc.data()!.postCount).toBeGreaterThan(0);
  });

  it('executes scheduled function', async () => {
    // Manually trigger a scheduled function via HTTP
    const response = await fetch(
      'http://localhost:5001/test-project/us-central1/scheduledCleanup',
      { method: 'POST' }
    );

    expect(response.status).toBe(200);
  });
});
```

## CI/CD Integration

```yaml
# .github/workflows/firebase-tests.yml
name: Firebase Tests
on: [push]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci

      - name: Start Firebase Emulators
        run: |
          npm install -g firebase-tools
          firebase emulators:exec --only firestore,auth,functions 'npm test'
        env:
          FIREBASE_TOKEN: ${{ secrets.FIREBASE_TOKEN }}

      - name: Run tests with emulator
        run: firebase emulators:exec --only firestore,auth,functions 'npm run test:ci'
```

## Data Seeding

```typescript
class EmulatorDataSeeder {
  async seedTestData(): Promise<void> {
    const users = [
      { id: 'user-1', name: 'Alice', email: 'alice@test.com', role: 'admin' },
      { id: 'user-2', name: 'Bob', email: 'bob@test.com', role: 'user' },
    ];

    const posts = [
      { title: 'Post 1', authorId: 'user-1', published: true, createdAt: new Date() },
      { title: 'Post 2', authorId: 'user-1', published: false, createdAt: new Date() },
      { title: 'Post 3', authorId: 'user-2', published: true, createdAt: new Date() },
    ];

    for (const user of users) {
      await adminDb.collection('users').doc(user.id).set(user);
    }

    for (const post of posts) {
      await adminDb.collection('posts').add(post);
    }
  }

  async exportSeedData(): Promise<void> {
    // Export emulator data for reuse
    const response = await fetch(
      'http://localhost:4000/emulator/v1/projects/test-project:export',
      { method: 'POST' }
    );
    return response.json();
  }
}
```

## Key Points
- Use Firebase emulators for local development and CI testing
- Connect client and admin SDKs to emulator ports
- Clear emulator data between test runs (afterEach)
- Test security rules with authenticated/unauthenticated scenarios
- Test Auth: user creation, token verification, custom claims
- Test Functions: verify side effects after triggers
- Use `firebase emulators:exec` in CI for isolated test runs
- Seed test data with controlled, reproducible datasets
- Export/import emulator data for consistent test state
