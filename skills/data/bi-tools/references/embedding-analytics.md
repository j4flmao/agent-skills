# Embedded Analytics

## Embedded Analytics Patterns
Embedded analytics integrates data visualization and reporting directly into applications, providing end-users with insights without switching contexts.

## Embedding Strategies

### iframe Embedding
```html
<!-- Simple iframe embed -->
<iframe
  src="https://analytics.example.com/embed/dashboard/123?token=embed_token_here"
  width="100%"
  height="800"
  frameborder="0"
  allowfullscreen
></iframe>

<!-- Responsive iframe with resize observer -->
<script>
function resizeIframe(dashboardId, token, containerId) {
  const container = document.getElementById(containerId);
  const iframe = document.createElement("iframe");
  iframe.src = `https://analytics.example.com/embed/dashboard/${dashboardId}?token=${token}`;
  iframe.style.width = "100%";
  iframe.style.border = "none";

  window.addEventListener("message", (event) => {
    if (event.origin === "https://analytics.example.com") {
      iframe.height = event.data.height + "px";
    }
  });

  container.appendChild(iframe);
}
</script>
```

### SDK Embedding
```javascript
// Looker embed SDK
import { LookerEmbedSDK } from "@looker/embed-sdk";

LookerEmbedSDK.init("analytics.example.com", "/api/3.0");

const dashboard = LookerEmbedSDK.createDashboardWithId(123)
  .withTheme("embedded_theme")
  .withFilters({ region: "North America", date_range: "last_30_days" })
  .on("dashboard:loaded", () => console.log("Dashboard loaded"))
  .on("dashboard:run:complete", (e) => {
    console.log(`Dashboard run complete: ${e}`);
  })
  .on("dashboard:download:start", (e) => {
    checkDownloadPermissions(e);
  })
  .build()
  .connect()
  .then((dk) => {
    dk.run();
  })
  .catch(console.error);
```

## Authentication Patterns

### Signed URL Embedding
```python
import hmac
import hashlib
import time
import jwt

class EmbedTokenGenerator:
    def __init__(self, secret_key, embed_service_url):
        self.secret = secret_key
        self.service_url = embed_service_url

    def generate_signed_url(self, dashboard_id, user_context, expiry_hours=24):
        payload = {
            "dashboard_id": dashboard_id,
            "user_id": user_context["user_id"],
            "role": user_context.get("role", "viewer"),
            "permissions": user_context.get("permissions", ["view"]),
            "filters": user_context.get("filters", {}),
            "exp": int(time.time()) + (expiry_hours * 3600),
            "iat": int(time.time())
        }
        token = jwt.encode(payload, self.secret, algorithm="HS256")
        return f"{self.service_url}/embed/{dashboard_id}?token={token}"

    def validate_embed_request(self, token):
        try:
            payload = jwt.decode(token, self.secret, algorithms=["HS256"])
            return {
                "valid": True,
                "user_id": payload["user_id"],
                "role": payload["role"],
                "filters": payload["filters"]
            }
        except jwt.ExpiredSignatureError:
            return {"valid": False, "reason": "token_expired"}
        except jwt.InvalidTokenError:
            return {"valid": False, "reason": "invalid_token"}
```

### OAuth2 Token Exchange
```python
from requests_oauthlib import OAuth2Session

class OAuthEmbedFlow:
    def __init__(self, client_id, client_secret, token_url):
        self.client_id = client_id
        self.client_secret = client_secret
        self.token_url = token_url

    def exchange_for_embed_token(self, user_session_token):
        client = OAuth2Session(self.client_id)
        token = client.fetch_token(
            self.token_url,
            client_secret=self.client_secret,
            assertion=user_session_token,
            grant_type="urn:ietf:params:oauth:grant-type:jwt-bearer"
        )
        return token["access_token"]
```

## Multi-Tenant Embedding

### Tenant Isolation
```python
class MultiTenantEmbedManager:
    def __init__(self, analytics_client):
        self.client = analytics_client

    def create_tenant_dashboard(self, tenant_id, dashboard_template_id, filters):
        """Clone a dashboard template for a specific tenant."""
        dashboard = self.client.create_dashboard(
            title=f"Dashboard - {tenant_id}",
            copy_from=dashboard_template_id
        )

        # Apply tenant filters
        for filter_config in filters:
            self.client.add_dashboard_filter(
                dashboard["id"],
                field=filter_config["field"],
                value=tenant_id,
                type=filter_config["type"]
            )

        return dashboard["id"]

    def generate_tenant_token(self, tenant_id, user_id, dashboard_id):
        token = self.client.create_embed_token(
            dashboard_id=dashboard_id,
            user_id=user_id,
            permissions=["view"],
            filters={"tenant_id": tenant_id},
            session_length_minutes=480
        )
        return token["url"]
```

## Performance Optimization

### Lazy Loading
```javascript
class LazyDashboardLoader {
  constructor(options) {
    this.dashboards = options.dashboards || [];
    this.observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            this.loadDashboard(entry.target.dataset.dashboardId);
            this.observer.unobserve(entry.target);
          }
        });
      },
      { rootMargin: "200px" }
    );
  }

  observe(container) {
    this.observer.observe(container);
  }

  loadDashboard(dashboardId) {
    const container = document.querySelector(`[data-dashboard-id="${dashboardId}"]`);
    container.innerHTML = `<div class="loading">Loading dashboard...</div>`;

    LookerEmbedSDK.createDashboardWithId(dashboardId)
      .build()
      .connect()
      .then(dk => dk.run());
  }
}
```

## Key Points
- Choose iframe or SDK embedding based on customization needs
- Implement secure token-based authentication for embed access
- Support multi-tenant isolation with tenant-specific dashboards and filters
- Use lazy loading for pages with multiple embedded dashboards
- Implement responsive sizing for cross-device compatibility
- Monitor embed performance and usage analytics
- Whitelist embed origins to prevent clickjacking
- Implement row-level security enforced at the embed token level
- Cache dashboard data for frequently accessed embeds
- Provide fallback content for users without JavaScript
