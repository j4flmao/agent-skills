# Service Mesh & Envoy Proxy

## 1. Skill Context
**Focus**: Managing network traffic, security, and observability in a microservices architecture without modifying application code.
**Triggers**: service-mesh, envoy-proxy, istio, sidecar-pattern, mtls, circuit-breaking.

## 2. The Sidecar Pattern
Instead of importing a heavy network library into every Java, Node, and Python microservice to handle retries and timeouts, you deploy a **Sidecar Proxy**.
- A proxy container is injected into the exact same Kubernetes Pod as your application container.
- Your application blindly sends HTTP requests to `localhost:8080`.
- The Sidecar intercepts it and handles all the complex routing.

## 3. Envoy Proxy (The Data Plane)
Envoy is a high-performance C++ proxy designed by Lyft. It is the de-facto standard for Service Meshes (powering Istio).
- **Out-of-Process Architecture**: It runs alongside the app.
- **Dynamic Configuration**: It connects to a Control Plane (via gRPC) to receive routing updates in real-time without restarting.
- **Features**: mTLS (Mutual TLS for zero-trust security), Circuit Breaking (stopping requests if a downstream service is failing), and distributed tracing injection.
