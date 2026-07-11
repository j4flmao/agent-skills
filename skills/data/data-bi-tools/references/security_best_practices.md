# BI Security Best Practices

## Deep Architectural Analysis
BI security operates on the principle of least privilege, mapping IdP groups to fine-grained RBAC roles within the BI tool. Object-level security controls access to specific dashboards, while Row-Level Security (RLS) and Column-Level Security (CLS) are pushed down to the analytical engine.

## Code Implementation
```java
// Spring Security filter for BI API
http
  .authorizeRequests()
  .antMatchers("/api/v1/dashboard/**").hasRole("VIEWER")
  .antMatchers("/api/v1/admin/**").hasRole("ADMIN")
  .and()
  .oauth2ResourceServer().jwt();
```

## System Architecture
```mermaid
graph TD
    A[User Request] --> B[Auth Filter]
    B --> C[RBAC Evaluator]
    C --> D[Dashboard Object]
    C --> E[Data Engine (RLS)]
```

## Mathematical Formulas Explaining Thresholds
Role Resolution Latency limit:
$$ L_{auth} \le \frac{1}{10} \times L_{total\_req} $$
Ensures authentication checks do not dominate API response times.
