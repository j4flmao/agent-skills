# Supabase Storage

## Overview
Supabase Storage — bucket configuration, file upload/download, security policies, CDN, image optimization, signed URLs, and integration with Edge Functions.

## Storage Setup

```typescript
import { createClient } from '@supabase/supabase-js';
const supabase = createClient(url, anonKey);

// Upload file
const { data, error } = await supabase.storage
  .from('avatars')
  .upload(`public/${userId}.jpg`, file, {
    cacheControl: '3600',
    contentType: 'image/jpeg',
    upsert: false,
  });

// Upload with upsert
const { data, error } = await supabase.storage
  .from('avatars')
  .upload(`public/${userId}.jpg`, file, { upsert: true });

// Download
const { data, error } = await supabase.storage
  .from('avatars')
  .download(`public/${userId}.jpg`);

// Get public URL
const { data: { publicUrl } } = supabase.storage
  .from('avatars')
  .getPublicUrl(`public/${userId}.jpg`);

// List files in folder
const { data, error } = await supabase.storage
  .from('documents')
  .list('user-uploads', {
    limit: 100,
    offset: 0,
    sortBy: { column: 'created_at', order: 'desc' },
  });

// Delete files
const { data, error } = await supabase.storage
  .from('avatars')
  .remove([`public/${userId}.jpg`]);

// Move/rename
const { data, error } = await supabase.storage
  .from('documents')
  .move('old/report.pdf', 'new/report.pdf');

// Copy
const { data, error } = await supabase.storage
  .from('templates')
  .copy('base-template.docx', `users/${userId}/template.docx`);
```

## Bucket Policies

```sql
-- Create buckets via SQL (in SQL Editor or migration)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('avatars', 'avatars', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp']),
  ('documents', 'documents', false, 20971520, ARRAY['application/pdf', 'application/msword']),
  ('public', 'public', true, 10485760, null);

-- Enable RLS on storage
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
ALTER TABLE storage.buckets ENABLE ROW LEVEL SECURITY;
```

## Storage RLS Policies

```sql
-- Avatars: anyone can read, owner can upload
CREATE POLICY "avatars_select" ON storage.objects
  FOR SELECT USING (bucket_id = 'avatars');

CREATE POLICY "avatars_insert" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'avatars'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "avatars_update" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "avatars_delete" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Documents: signed URL access (private bucket)
CREATE POLICY "documents_insert" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'documents'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "documents_select" ON storage.objects
  FOR SELECT USING (bucket_id = 'documents');  -- Supabase checks signed URL server-side

-- Public bucket: anyone can read, authenticated can write
CREATE POLICY "public_select" ON storage.objects
  FOR SELECT USING (bucket_id = 'public');

CREATE POLICY "public_insert" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'public'
    AND auth.role() = 'authenticated'
  );
```

## Signed URLs

```typescript
// Create signed URL (60 seconds expiry)
const { data, error } = await supabase.storage
  .from('documents')
  .createSignedUrl(`private/doc-${id}.pdf`, 60);

// Create signed upload URL
const { data, error } = await supabase.storage
  .from('documents')
  .createSignedUploadUrl(`private/doc-${id}.pdf`);

// Upload to signed URL (curl example)
// curl -X PUT -H "Content-Type: application/pdf" --data-binary @doc.pdf "{signedUrl}"

// Server-side signed URL generation (Edge Function)
// Use service role key for admin access
const { data: { signedUrl } } = await supabaseAdmin.storage
  .from('documents')
  .createSignedUrl(`private/doc-${id}.pdf`, 3600);
```

## Image Optimization

```typescript
// Supabase Storage auto-optimizes images via CDN
// URL format: https://<project>.supabase.co/storage/v1/object/public/<bucket>/<path>

// Transform images with query parameters:
// ?width=200&height=200&resize=cover&quality=80&format=webp

const avatarUrl = supabase.storage
  .from('avatars')
  .getPublicUrl(`public/${userId}.jpg`)
  .data.publicUrl;

// With transformations
const transformedUrl = `${avatarUrl}?width=100&height=100&resize=cover&format=webp`;

// Available transforms:
// width: 1-4096
// height: 1-4096
// resize: 'cover' | 'contain' | 'fill'
// quality: 1-100
// format: 'origin' | 'webp' | 'avif'

// Thumbnail preset
const thumbnailUrl = `${avatarUrl}?width=48&height=48&resize=cover`;
const optimizedUrl = `${avatarUrl}?width=800&quality=80&format=webp`;
```

## CDN & Caching

```typescript
// Supabase Storage uses CDN caching
// Public files: cached at edge (CDN)
// Private files: no edge caching

// Set cache control on upload
await supabase.storage.from('public').upload('image.jpg', file, {
  cacheControl: '31536000',  // 1 year
  upsert: true,
});

// Resend cache for updated file
// Supabase automatically invalidates CDN cache on file update

// Upload progress tracking
// Supabase-js doesn't natively support progress — use XMLHttpRequest or fetch with ReadableStream
```

## Resumable Uploads (TUS Protocol)

```typescript
// Supabase supports TUS resumable uploads for large files
// Default uploads (non-TUS) max: 6MB per request
// TUS uploads: supports multi-GB files with pause/resume

// Client-side TUS (using tus-js-client)
import * as tus from 'tus-js-client';

const upload = new tus.Upload(file, {
  endpoint: `https://${projectId}.supabase.co/storage/v1/upload/resumable`,
  headers: {
    authorization: `Bearer ${supabaseAnonKey}`,
    'x-upsert': 'true',
  },
  metadata: {
    bucketName: 'documents',
    objectName: `uploads/${userId}/${file.name}`,
    contentType: file.type,
    cacheControl: '3600',
  },
  chunkSize: 6 * 1024 * 1024,
  retryDelays: [0, 3000, 5000, 10000, 20000],
  onProgress: (bytesUploaded, bytesTotal) => {
    const percentage = ((bytesUploaded / bytesTotal) * 100).toFixed(2);
    console.log(percentage + '%');
  },
  onError: (error) => { console.error('Upload failed', error); },
  onSuccess: () => { console.log('Upload complete'); },
});

upload.start();

// Pause
upload.abort();

// Resume (start new upload with same file — TUS resumes automatically)
```

## Key Points
- Public buckets: anyone can read files (useful for avatars, images, public assets).
- Private buckets: files require signed URLs for access.
- Max file size without TUS: 6MB per request (configurable at bucket level).
- TUS protocol enables resumable uploads for large files.
- Image transformations via URL parameters — no extra service needed.
- CDN caching: Supabase Storage uses CDN with global edge caching.
- Storage RLS policies work on `storage.objects` and `storage.buckets` tables.
- File paths in storage are not real directories — they're object prefixes with `/` separators.
