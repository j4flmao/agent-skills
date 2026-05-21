# Azure API Management

## APIM Tiers

| Tier | Features | SLA | Price |
|---|---|---|---|
| **Consumption** | Pay-per-call, auto-scale | 99.95% | Per execution |
| **Developer** | Dev/test, full features | None | Flat monthly |
| **Basic** | Production (1 unit) | 99.95% | Flat monthly |
| **Standard** | Production (scale to 4 units) | 99.95% | Flat monthly |
| **Premium** | Multi-region, VNet, large scale | 99.99% | Flat monthly |

## ARM Template — APIM with API

```json
{
  "$schema": "https://schema.management.azure.com/schemas/2019-04-01/deploymentTemplate.json#",
  "contentVersion": "1.0.0.0",
  "parameters": {
    "apimName": { "type": "string", "defaultValue": "my-apim" },
    "publisherEmail": { "type": "string" },
    "publisherName": { "type": "string", "defaultValue": "API Team" },
    "sku": { "type": "string", "defaultValue": "Developer" }
  },
  "resources": [
    {
      "type": "Microsoft.ApiManagement/service",
      "apiVersion": "2023-05-01-preview",
      "name": "[parameters('apimName')]",
      "location": "[resourceGroup().location]",
      "sku": {
        "name": "[parameters('sku')]",
        "capacity": 1
      },
      "properties": {
        "publisherEmail": "[parameters('publisherEmail')]",
        "publisherName": "[parameters('publisherName')]",
        "hostnameConfigurations": [
          {
            "type": "Proxy",
            "hostName": "[concat(parameters('apimName'), '.azure-api.net')]",
            "negotiateClientCertificate": false
          }
        ]
      }
    },
    {
      "type": "Microsoft.ApiManagement/service/apis",
      "apiVersion": "2023-05-01-preview",
      "name": "[concat(parameters('apimName'), '/user-api')]",
      "dependsOn": [
        "[resourceId('Microsoft.ApiManagement/service', parameters('apimName'))]"
      ],
      "properties": {
        "displayName": "User API",
        "path": "users",
        "protocols": ["https"],
        "serviceUrl": "https://users.internal:8080",
        "subscriptionRequired": true,
        "authenticationSettings": {
          "oAuth2": {
            "authorizationServerId": "auth-server",
            "scope": "read:users"
          }
        }
      }
    }
  ]
}
```

## Bicep Template

```bicep
param apimName string = 'my-apim'
param publisherEmail string
param publisherName string = 'API Team'
param sku string = 'Developer'

resource apim 'Microsoft.ApiManagement/service@2023-05-01-preview' = {
  name: apimName
  location: resourceGroup().location
  sku: {
    name: sku
    capacity: 1
  }
  properties: {
    publisherEmail: publisherEmail
    publisherName: publisherName
  }
}

resource userApi 'Microsoft.ApiManagement/service/apis@2023-05-01-preview' = {
  name: '${apimName}/user-api'
  parent: apim
  properties: {
    displayName: 'User API'
    path: 'users'
    protocols: ['https']
    serviceUrl: 'https://users.internal:8080'
    subscriptionRequired: true
  }
}
```

## API Policy (XML-based)

```xml
<policies>
    <inbound>
        <base />
        <!-- Authentication -->
        <validate-jwt header-name="Authorization" failed-validation-httpcode="401" failed-validation-error-message="Unauthorized">
            <openid-config url="https://auth.example.com/.well-known/openid-configuration" />
            <issuers>
                <issuer>https://auth.example.com</issuer>
            </issuers>
            <required-claims>
                <claim name="aud" match="any">
                    <value>api://default</value>
                </claim>
            </required-claims>
        </validate-jwt>

        <!-- Rate limiting -->
        <rate-limit calls="100" renewal-period="60" remaining-calls-header-name="x-ratelimit-remaining" total-limit-header-name="x-ratelimit-limit" />

        <!-- Forward user context headers -->
        <set-header name="X-User-ID" exists-action="override">
            <value>@(context.Request.Headers.GetValueOrDefault("Authorization","").Substring(7))</value>
        </set-header>

        <!-- CORS -->
        <cors allow-credentials="true">
            <allowed-origins>
                <origin>https://app.example.com</origin>
            </allowed-origins>
            <allowed-methods>
                <method>GET</method>
                <method>POST</method>
                <method>PUT</method>
                <method>DELETE</method>
            </allowed-methods>
            <allowed-headers>
                <header>Authorization</header>
                <header>Content-Type</header>
            </allowed-headers>
            <expose-headers>
                <header>X-Request-ID</header>
            </expose-headers>
        </cors>

        <!-- Add correlation ID -->
        <set-header name="X-Request-ID" exists-action="override">
            <value>@(context.RequestId)</value>
        </set-header>
    </inbound>
    <backend>
        <base />
        <retry condition="@(context.Response.StatusCode == 503)" count="2" interval="1" first-fast-retry="false">
            <forward-request />
        </retry>
        <timeout seconds="30" />
    </backend>
    <outbound>
        <base />
        <set-header name="X-Frame-Options" exists-action="override">
            <value>DENY</value>
        </set-header>
        <set-header name="X-Content-Type-Options" exists-action="override">
            <value>nosniff</value>
        </set-header>
        <set-header name="Cache-Control" exists-action="override">
            <value>@(context.Response.StatusCode == 200 ? "public, max-age=30" : "no-store")</value>
        </set-header>
    </outbound>
    <on-error>
        <base />
        <set-header name="X-Error-Code" exists-action="override">
            <value>@(context.LastError.Reason)</value>
        </set-header>
        <return-response>
            <set-status code="@(context.Response.StatusCode == 0 ? 500 : context.Response.StatusCode)" reason="Error" />
            <set-body>@{
                var error = new JObject(
                    new JProperty("error", new JObject(
                        new JProperty("code", context.LastError.Reason),
                        new JProperty("message", context.LastError.Message),
                        new JProperty("requestId", context.RequestId)
                    ))
                );
                return error.ToString();
            }</set-body>
        </return-response>
    </on-error>
</policies>
```

## Product and Subscription

```xml
<!-- Product with rate limit policy -->
{
    "name": "free-tier",
    "displayName": "Free Tier",
    "description": "Free API access with rate limits",
    "terms": "Subject to 100 req/min limit",
    "subscriptionRequired": true,
    "approvalRequired": false,
    "subscriptionsLimit": 100,
    "state": "published"
}
```

```xml
<!-- Product policy to override rate limit -->
<policies>
    <inbound>
        <rate-limit calls="10" renewal-period="60" />
        <quota calls="1000" renewal-period="86400" />
    </inbound>
</policies>
```

## VNet Integration (Premium)

```json
{
  "type": "Microsoft.ApiManagement/service",
  "properties": {
    "virtualNetworkType": "Internal",
    "virtualNetworkConfiguration": {
      "subnetResourceId": "/subscriptions/.../subnets/apim-subnet"
    }
  },
  "sku": {
    "name": "Premium",
    "capacity": 2
  }
}
```

## Multi-Region Deployment

```bicep
resource apim 'Microsoft.ApiManagement/service@2023-05-01-preview' = {
  name: apimName
  location: 'eastus'
  sku: { name: 'Premium', capacity: 1 }
  properties: {
    additionalLocations: [
      {
        location: 'westeurope'
        sku: { name: 'Premium', capacity: 1 }
        virtualNetworkConfiguration: {
          subnetResourceId: '.../subnets/apim-weu-subnet'
        }
        gatewayRegionalUrlEnabled: true
      }
    ]
    virtualNetworkType: 'Internal'
    virtualNetworkConfiguration: {
      subnetResourceId: '.../subnets/apim-eus-subnet'
    }
  }
}
```

## Policy Snippets

### IP Whitelist
```xml
<inbound>
    <base />
    <choose>
        <when condition="@(!context.Request.IpAddress.CIDRMatch("10.0.0.0/8", "172.16.0.0/12"))">
            <return-response>
                <set-status code="403" reason="Forbidden" />
                <set-body>{"error":{"code":"FORBIDDEN","message":"Access denied from your IP"}}</set-body>
            </return-response>
        </when>
    </choose>
</inbound>
```

### Request Validation
```xml
<inbound>
    <base />
    <choose>
        <when condition="@(context.Request.Body.As<JObject>(preserveContent: true)["email"] == null)">
            <return-response>
                <set-status code="400" reason="Bad Request" />
                <set-body>{"error":{"code":"VALIDATION_ERROR","message":"email is required"}}</set-body>
            </return-response>
        </when>
    </choose>
</inbound>
```

### Transform Response
```xml
<outbound>
    <base />
    <set-body>@{
        var response = context.Response.Body.As<JObject>();
        return new JObject(
            new JProperty("data", response),
            new JProperty("meta", new JObject(
                new JProperty("requestId", context.RequestId),
                new JProperty("timestamp", DateTime.UtcNow)
            ))
        ).ToString();
    }</set-body>
</outbound>
```

### Cache Response
```xml
<outbound>
    <base />
    <cache-store duration="30" />
</outbound>
<cache-lookup vary-by-developer="false" vary-by-developer-groups="false" downstream-caching-type="none">
    <vary-by-query-parameter>limit</vary-by-query-parameter>
    <vary-by-query-parameter>offset</vary-by-query-parameter>
</cache-lookup>
```

## Developer Portal

The Azure APIM Developer Portal provides:
- API documentation (auto-generated from OpenAPI)
- Interactive API console (try it)
- Subscription management (self-service API key generation)
- Product catalog
- Analytics and reports
- Customizable theme and pages

Configuration via Azure Portal: Developer Portal → Portal Overview → Publish.
