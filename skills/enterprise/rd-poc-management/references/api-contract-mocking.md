# API Contract Mocking (Unblocking R&D)

## 1. The Dependency Deadlock
A classic R&D blocker:
- The Department is building a shiny new Mobile App PoC.
- The app requires a new recommendation algorithm endpoint from the Global Backend Team.
- The Global Backend Team is busy and says, *"We will have the API ready in 3 weeks."*
- The Department's PoC is completely stalled for 3 weeks.

## 2. API-First Design
To break the deadlock, the enterprise must adopt **API-First Design**. 
Instead of writing backend code first, the Global and Department teams spend 1 hour co-writing a contract using **OpenAPI (Swagger)**.

```yaml
# openapi.yaml
openapi: 3.0.0
info:
  title: Recommendation API
  version: 1.0.0
paths:
  /recommendations:
    get:
      summary: Get user recommendations
      responses:
        '200':
          description: A list of products
          content:
            application/json:
              example:
                - id: 101
                  name: "Wireless Mouse"
```

## 3. Mock Servers (WireMock / Prism)
Once the `.yaml` contract is agreed upon, the Department team does not wait for the Global team to write the Java/Go logic.
They use a tool like **Prism** or **WireMock** to instantly spin up a local server based purely on the YAML file.

```bash
# Start a fake server instantly
prism mock openapi.yaml
```
- The Mobile App PoC makes HTTP requests to `http://localhost:4010/recommendations`.
- Prism intercepts the request, reads the `example` block in the YAML, and returns a perfect JSON response.

## 4. Seamless Integration
- The Department finishes the entire Mobile App PoC using the Mock Server.
- Three weeks later, Global finishes the real Backend API.
- Because both teams strictly adhered to the exact same OpenAPI YAML contract, the Department simply changes the Base URL from `localhost:4010` to `api.global.com`. 
- **The integration works on the very first try**, avoiding weeks of integration testing and finger-pointing.
