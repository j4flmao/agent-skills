# Firebase Storage & Hosting

## Overview
Cloud Storage for Firebase — file uploads, security rules, CDN, image optimization. Firebase Hosting — configuration, rewrites, headers, redirects, Cloud Functions integration.

## Storage Setup

```typescript
import { getStorage, ref, uploadBytes, uploadBytesResumable,
  getDownloadURL, listAll, deleteObject, getMetadata, updateMetadata } from 'firebase/storage';

const storage = getStorage();

// Upload file
const storageRef = ref(storage, `users/${userId}/avatar.jpg`);
const snapshot = await uploadBytes(storageRef, file);
const downloadUrl = await getDownloadURL(snapshot.ref);

// Upload with progress tracking
const uploadTask = uploadBytesResumable(ref(storage, `videos/${videoId}.mp4`), file);
uploadTask.on('state_changed',
  (snapshot) => {
    const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
    console.log('Upload is ' + progress + '% done');
  },
  (error) => { console.error('Upload failed', error); },
  () => { console.log('Upload complete', uploadTask.snapshot.ref); }
);

// List files
const listRef = ref(storage, `users/${userId}/`);
const { items, prefixes } = await listAll(listRef);

// Delete
await deleteObject(ref(storage, `users/${userId}/old.jpg`));

// Update metadata
await updateMetadata(ref(storage, 'file.jpg'), {
  contentType: 'image/jpeg',
  customMetadata: { description: 'Profile photo' },
});
```

## Storage Security Rules

```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    // Helper functions
    function isAuth() { return request.auth != null; }
    function isOwner(userId) { return request.auth.uid == userId; }
    function isImage() { return request.resource.contentType.startsWith('image/'); }
    function maxSize(max) { return request.resource.size < max; }

    // User avatars — 5MB max, images only
    match /users/{userId}/avatar.jpg {
      allow read: if true;
      allow write: if isAuth() && isOwner(userId) && isImage() && maxSize(5 * 1024 * 1024);
    }

    // Public uploads
    match /public/{allPaths=**} {
      allow read: if true;
      allow write: if isAuth() && maxSize(10 * 1024 * 1024);
    }

    // Private documents — signed URL access only
    match /private/{allPaths=**} {
      allow read, write: if false; // backend generates signed URLs
    }

    // Validate file type
    function isValidFileType() {
      return request.resource.contentType in ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    }

    match /documents/{docId} {
      allow write: if isAuth() && isValidFileType() && maxSize(20 * 1024 * 1024);
    }
  }
}
```

## Admin SDK (Server-side)

```typescript
import { getStorage } from 'firebase-admin/storage';

const bucket = getStorage().bucket();

// Upload from server
await bucket.upload('local-file.pdf', {
  destination: `documents/${docId}.pdf`,
  metadata: { contentType: 'application/pdf' },
});

// Generate signed URL (valid for 1 hour)
const [url] = await bucket.file(`private/doc-${id}.pdf`).getSignedUrl({
  action: 'read',
  expires: Date.now() + 60 * 60 * 1000,
});

// Delete files older than 90 days
const [files] = await bucket.getFiles({ prefix: 'temp/' });
const cutoff = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
const old = files.filter(f => f.metadata.timeCreated < cutoff.toISOString());
await Promise.all(old.map(f => f.delete()));
```

## Image Optimization

```typescript
// Firebase Extensions: Generate Image Thumbnails
// Automatically creates webp thumbnails on upload

// Manual optimization with Cloud Functions
import * as functions from 'firebase-functions';
import * as sharp from 'sharp';

export const optimizeImage = functions.storage
  .object()
  .onFinalize(async (object) => {
    const filePath = object.name!;
    if (!filePath.startsWith('uploads/') || object.contentType?.startsWith('image/') === false) return;

    const bucket = admin.storage().bucket(object.bucket);
    const tempFile = path.join('/tmp', path.basename(filePath));

    await bucket.file(filePath).download({ destination: tempFile });

    const optimized = await sharp(tempFile)
      .resize(1200, 1200, { fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 80 })
      .toBuffer();

    await bucket.file(filePath.replace('uploads/', 'optimized/')).save(optimized, {
      metadata: { contentType: 'image/webp' },
    });
  });

// Client-side: use Cloud CDN with image transformations
// https://firebasestorage.googleapis.com/v0/b/{bucket}/o/{path}?alt=media&token={token}
// Append image parameters: ?w=200&h=200&fit=crop (limited to signed URLs)
```

## Hosting Configuration

```yaml
# firebase.json
{
  "hosting": {
    "public": "dist",
    "ignore": [
      "firebase.json",
      "**/.*",
      "**/node_modules/**"
    ],
    "rewrites": [
      {
        "source": "/api/**",
        "function": "api"
      },
      {
        "source": "**",
        "destination": "/index.html"
      }
    ],
    "redirects": [
      {
        "source": "/blog/:slug",
        "destination": "/posts/:slug",
        "type": 301
      }
    ],
    "headers": [
      {
        "source": "/assets/**",
        "headers": [
          { "key": "Cache-Control", "value": "public, max-age=31536000, immutable" }
        ]
      },
      {
        "source": "**/*.@(jpg|jpeg|gif|png|webp)",
        "headers": [
          { "key": "Cache-Control", "value": "public, max-age=86400" }
        ]
      }
    ],
    "appAssociation": "AUTO",
    "cleanUrls": true,
    "trailingSlash": false
  }
}
```

## Custom Domain & SSL

```bash
# Add domain in Firebase Console → Hosting
# 1. Verify domain ownership (TXT record)
# 2. Add A/AAAA or CNAME records
# 3. SSL certificate auto-provisioned (Let's Encrypt)

# CLI deploy
firebase deploy --only hosting

# Preview channels (per branch)
firebase hosting:channel:deploy staging
firebase hosting:channel:deploy --expires 7d feature-branch
```

## Key Points
- Storage files have 750 KB/s upload/download limit per file (fine for most apps).
- Use `uploadBytesResumable` for large files — supports pause/resume/cancel.
- Storage security rules evaluate on every read/write — use `request.resource` for validation.
- Signed URLs expire — set appropriate TTL based on use case.
- Hosting rewrites `/**` → `/index.html` is required for SPAs.
- Set long Cache-Control headers on versioned assets (build hash in filename).
- Firebase Hosting supports up to 10 domains per project — more through Firebase Support.
- Cloud CDN is automatically enabled on Firebase Hosting with edge caching.
