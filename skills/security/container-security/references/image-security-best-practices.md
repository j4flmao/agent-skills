# Container Image Security Best Practices

## Multi-Stage Builds
```dockerfile
# Use multi-stage builds to exclude build tools from final image
FROM node:20-alpine AS build
RUN apk add --no-cache python3 make g++
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine
COPY --from=build /app/dist /app
COPY --from=build /app/node_modules /app/node_modules
USER node
CMD ["node", "dist/server.js"]
```

## Image Scanning Tools

| Tool | Type | Output | CI Integration | Speed | Coverage |
|------|------|--------|---------------|-------|----------|
| Trivy | Scanner | SARIF, JSON, HTML | Excellent | Fast | OS + language packages |
| Grype | Scanner | JSON, table | Good | Fast | OS + language packages |
| Snyk | Scanner + Monitor | JSON, HTML | Excellent | Moderate | OS + language + IaC |
| Docker Scout | Scanner | Dashboard | Good | Fast | OS packages only |
| Anchore | Scanner + Policy | JSON, HTML | Good | Moderate | OS + language + policies |

## Image Signing with Cosign
```bash
# Generate key pair
cosign generate-key-pair

# Sign image
cosign sign --key cosign.key myregistry.com/myapp:latest

# Verify image
cosign verify --key cosign.pub myregistry.com/myapp:latest

# Sign with keyless (OIDC)
cosign sign myregistry.com/myapp:latest
cosign verify myregistry.com/myapp:latest
```

## Key Points
- Multi-stage builds remove build tools from runtime images
- Use distroless or scratch base images for minimal attack surface
- Pin base image digests for reproducible, non-mutable builds
- Scan images for CVEs before every deployment
- Sign images with cosign for supply chain integrity
- Use image policy webhooks to enforce signing verification
