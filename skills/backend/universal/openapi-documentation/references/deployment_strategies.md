# Deploying and Publishing API Documentation

How to build, version and publish API docs automatically: CI pipelines, hosting options, versioned URLs, preview environments for pull requests, and keeping published docs in sync with deployed APIs.

## Principles

- Docs are built from the same spec version that is deployed; publish in the same pipeline as the API release.
- Every pull request gets a preview of the rendered docs.
- Published URLs are stable and versioned; old versions stay available until sunset.
- Internal docs are never published to public hosting by accident (separate build targets, filtered specs).

## Hosting Options

| Option | Fit | Notes |
|--------|-----|-------|
| GitHub Pages / GitLab Pages | Static public docs | Free, simple; limited access control |
| Netlify, Vercel, Cloudflare Pages | Static sites with PR previews | Preview URLs per PR built in |
| Object storage + CDN (S3 + CloudFront, GCS + Cloud CDN) | Full control | Configure cache headers and invalidation |
| Docs platform (Redocly, ReadMe, Bump.sh, Mintlify) | Managed portal, analytics, try-it | Sync via CLI/Git integration |
| Internal portal (Backstage, intranet behind SSO) | Internal APIs | Access controlled |
| Served by the API itself (`/docs`) | Dev/staging convenience | Disable or protect in production |

## GitHub Actions: Lint, Diff, Build, Publish

```yaml
name: api-docs
on:
  pull_request:
    paths: ['openapi/**']
  push:
    branches: [main]
    tags: ['v*']

permissions:
  contents: read
  pages: write
  id-token: write

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with: { fetch-depth: 0 }
      - uses: actions/setup-node@v4
        with: { node-version: 22 }
      - run: npx @redocly/cli@latest lint
      - name: Breaking change check
        if: github.event_name == 'pull_request'
        run: |
          git show origin/${{ github.base_ref }}:openapi/openapi.yaml > /tmp/base.yaml
          docker run --rm -v /tmp:/base -v "$PWD/openapi":/head tufin/oasdiff \
            breaking /base/base.yaml /head/openapi.yaml --fail-on ERR

  build:
    needs: validate
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22 }
      - run: npx @redocly/cli@latest bundle openapi/openapi.yaml -o site/openapi.yaml
      - run: npx @redocly/cli@latest build-docs site/openapi.yaml -o site/index.html
      - uses: actions/upload-pages-artifact@v3
        with: { path: site }

  deploy:
    if: github.ref == 'refs/heads/main'
    needs: build
    runs-on: ubuntu-latest
    environment: { name: github-pages, url: '${{ steps.deployment.outputs.page_url }}' }
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

Pin tool versions (`@redocly/cli@<version>`, oasdiff image tag) for reproducible builds rather than `latest`.

## Versioned Publishing

```
https://docs.example.com/orders/v1/        latest v1.x
https://docs.example.com/orders/v2/        latest v2.x
https://docs.example.com/orders/v2/openapi.yaml
https://docs.example.com/orders/changelog/
```

- Tag-based releases publish into the matching major version folder.
- Keep the downloadable spec at a predictable URL for SDK generators and API clients.
- Show a banner on deprecated versions with the sunset date and migration guide link.

## PR Previews

- Netlify/Vercel/Cloudflare Pages create preview URLs automatically for each PR.
- For S3, publish to `previews/pr-<number>/` with a lifecycle rule to expire after N days.
- Post the preview link and the oasdiff changelog as a PR comment for reviewers.

## Syncing with Deployments

| Pattern | How |
|---------|-----|
| Publish on API release tag | Same tag triggers API deploy and docs publish |
| Environment-specific docs | Staging docs show staging servers and unreleased endpoints (`x-beta`) |
| Spec served by running API | Portal fetches `/openapi.json` from each environment; guarantees match but couples docs uptime to API |
| Registry push | CI pushes bundled spec to a registry (Bump.sh, Redocly, Backstage) with version metadata |

Avoid publishing docs for features not yet deployed in production; gate with release tags or feature flags (`x-feature-flag` filtered at build).

## CDN and Caching

- Hashed asset filenames with long `Cache-Control: max-age=31536000, immutable`.
- `index.html` and `openapi.yaml` with short TTL or `no-cache` plus `ETag`, so updates appear quickly.
- Invalidate CDN paths for the spec and HTML after publish.

## Access Control for Non-Public Docs

- Partner docs: SSO-protected portal or platform with per-audience access.
- Internal docs: Backstage or intranet behind the identity provider; never rely on "unlisted" URLs.
- Production API `/docs` endpoints: disable, or require authentication and restrict "Try it out".

## SDK and Postman Collection Publishing

Generate and release alongside docs:
- SDKs via OpenAPI Generator/Speakeasy/Fern, published to npm/PyPI/Maven with versions mapped to API versions.
- Postman collection via `openapi-to-postmanv2`, published to a public workspace.

## Rollback

Docs are static artifacts: keep previous builds (object versioning or deploy history) and redeploy the prior artifact if a broken build ships.

## Checklist

- [ ] Lint and breaking-change diff gate PRs
- [ ] PR previews with changelog comment
- [ ] Publish triggered by the same release as the API
- [ ] Versioned URLs and downloadable bundled spec
- [ ] Cache headers distinguish immutable assets from spec/HTML
- [ ] Internal/partner docs access controlled
- [ ] Prior builds retained for rollback
