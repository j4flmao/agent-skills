# Zero Trust: Policy Engines & OPA

## 1. Decoupling Policy from Code
In legacy architectures, authorization logic is hardcoded into the application (e.g., `if user.role == 'admin'`). In Zero Trust, authorization is abstracted out of the application and evaluated dynamically by a central Policy Engine.

## 2. Open Policy Agent (OPA)
OPA is the industry standard for cloud-native policy evaluation. It uses a declarative language called **Rego**.

### How it Works
1. A microservice receives a request.
2. Before processing, it queries OPA with the request context (JSON containing user claims, HTTP method, path).
3. OPA evaluates the JSON against its loaded Rego policies.
4. OPA returns a boolean `allow` decision.

### Example Rego Policy
```rego
package envoy.authz

import input.attributes.request.http as http_request

default allow = false

# Allow if the user has the 'finance' role and is accessing the /reports endpoint via GET
allow {
    http_request.method == "GET"
    startswith(http_request.path, "/reports")
    
    # Extract JWT payload
    token := io.jwt.decode(http_request.headers.authorization)
    "finance" == token[1].roles[_]
}
```

## 3. Continuous Verification
Zero Trust policies must evaluate continuous context, not just static RBAC roles.
Policies should factor in:
- **Device Posture**: Is the device patched and running EDR?
- **Location/Network**: Is the request coming from an anonymous proxy?
- **Behavioral Risk**: Has the user downloaded an unusually large amount of data today?
