# S3-Compatible Object Storage: Providers and Compatibility

Many systems implement the Amazon S3 API: self-hosted (MinIO, Ceph RGW, SeaweedFS, Garage) and cloud services (Cloudflare R2, Backblaze B2, Wasabi, DigitalOcean Spaces, GCS XML API interoperability, Oracle Object Storage). "Compatible" rarely means identical. This reference covers selection criteria, common gaps, and how to test compatibility. Concrete client configuration is in `s3-compatible-configs.md`.

## Provider Landscape

| Provider | Type | Notable traits |
|----------|------|----------------|
| Amazon S3 | Cloud (reference implementation) | Full feature set, storage classes, events, Object Lock, Express One Zone |
| MinIO | Self-hosted, Kubernetes-native | High performance, erasure coding, site replication; AGPLv3 community edition plus commercial AIStor; review current licensing and distribution terms before adopting |
| Ceph RGW | Self-hosted, part of Ceph | Multisite, also S3 + Swift APIs, integrates with block/file in same cluster |
| SeaweedFS | Self-hosted | Optimized for many small files; S3 gateway |
| Garage | Self-hosted, geo-distributed | Lightweight, for small multi-site deployments |
| Cloudflare R2 | Cloud | No egress fees; subset of S3 API |
| Backblaze B2 | Cloud | Low storage cost; S3-compatible API plus native API |
| Wasabi | Cloud | Flat pricing, minimum storage duration policy |
| GCS (XML API interop) | Cloud | HMAC keys for S3 tools; native JSON API has more features |

Prices and policies change frequently; verify current terms (egress, minimum retention, API request charges) before committing.

## Compatibility Areas to Verify

| Feature | Why it matters | Common gaps |
|---------|----------------|-------------|
| Signature V4 | Authentication | Universally supported; V2 deprecated |
| Virtual-hosted vs path-style addressing | Client config | Many self-hosted setups need path-style; AWS is retiring path-style for new buckets |
| Multipart upload | Large files, Spark/Hadoop writes | Part size limits and part count may differ |
| Strong consistency | Table formats, committers | Most modern implementations are strongly consistent; verify LIST after write |
| Conditional writes (`If-None-Match`, `If-Match`) | Lock-free commits for Delta/Iceberg | Newer feature; support varies |
| Versioning | Recovery, replication | Supported by most; behavior of delete markers can differ |
| Object Lock (WORM) | Compliance, ransomware protection | Not available everywhere; must be enabled at bucket creation in many systems |
| Lifecycle rules | Expiry, transitions | Transitions to other classes often unsupported; expiry usually supported |
| Bucket policies / IAM | Access control | Policy language subsets; STS/AssumeRole support varies |
| Server-side encryption (SSE-S3, SSE-KMS, SSE-C) | Compliance | KMS integration differs per platform |
| Event notifications | Pipelines | Targets differ (webhooks, Kafka, NATS for MinIO; AWS uses SNS/SQS/Lambda/EventBridge) |
| Checksums (CRC32/CRC32C/CRC64NVME headers) | Integrity | Newer AWS SDKs send these by default; some providers reject unknown checksum headers |
| S3 Select | Server-side filtering | Deprecated for new AWS customers; rarely implemented elsewhere |
| Storage classes | Tiering | Provider-specific; often a single class |

## Recent SDK Behavior Change

AWS SDKs released from early 2025 compute and send CRC-based integrity checksums by default on uploads. Some S3-compatible services rejected these requests. If uploads fail after an SDK upgrade, set the client option to compute checksums only when required (for example `request_checksum_calculation = when_required` and `response_checksum_validation = when_required` in AWS config/env vars for SDKs that support them) or upgrade the server.

## Addressing Styles

```
Virtual-hosted: https://my-bucket.s3.eu-west-1.amazonaws.com/key
Path-style:     https://minio.internal:9000/my-bucket/key
```

Self-hosted endpoints without wildcard DNS/TLS certificates require path-style. Bucket names with dots break virtual-hosted TLS.

## Choosing Between Cloud S3 and Compatible Alternatives

| Driver | Favors |
|--------|--------|
| Heavy internet egress (serving media, public datasets) | Zero/low-egress providers |
| Deep integration with cloud analytics/IAM/events | Native cloud object store |
| Data sovereignty, on-prem compute, air-gapped | Self-hosted MinIO/Ceph |
| Very small ops team | Managed cloud |
| Compliance WORM requirements | Provider with Object Lock and certifications |

## Self-Hosted Trade-offs

| Factor | MinIO | Ceph RGW |
|--------|-------|----------|
| Scope | Object only | Object + block + file |
| Operational complexity | Lower | Higher, very flexible |
| Scaling unit | Server pools | OSDs/hosts with CRUSH |
| Multi-site | Site replication | Multisite zones |
| Kubernetes | Operator | Rook operator |

## Testing Compatibility

- Run the provider against your actual workloads: Spark/Trino reads and writes, Delta/Iceberg commits, multipart uploads of the largest expected files, concurrent writers.
- Use suites such as Ceph's `s3-tests` to probe API coverage.
- Test failure behavior: throttling responses (503/SlowDown), timeouts, retries, partial multipart cleanup.
- Validate IAM: least-privilege policies actually deny what they should.

## Migration Between Providers

Tools: `rclone sync`, `aws s3 sync` with `--endpoint-url`, MinIO `mc mirror`, cloud transfer services (AWS DataSync, Storage Transfer Service).
- Preserve metadata and checksums; verify object counts and sizes after transfer.
- Budget egress fees from the source provider.
- For table formats, update absolute paths in metadata (Iceberg stores absolute file paths) or use catalog-level migration tooling.

## Checklist

- [ ] Feature matrix verified against actual requirements (conditional writes, Object Lock, lifecycle, events)
- [ ] Addressing style and TLS/DNS settled
- [ ] SDK checksum defaults tested against the provider
- [ ] Workload-level tests with Spark/Trino/table formats
- [ ] Pricing reviewed for storage, requests, egress, minimum durations
- [ ] Exit/migration path documented
