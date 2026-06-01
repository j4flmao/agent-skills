# API Documentation Fundamentals

## Overview
API documentation is the reference material that describes how to use an API effectively. Good documentation reduces support burden, improves developer experience, and increases API adoption. It covers endpoints, request/response formats, authentication, error handling, and usage examples.

## Core Concepts

### Documentation Types
Reference documentation: auto-generated from code/API specs (OpenAPI, RAML). Covers endpoints, parameters, responses, schemas. Tutorial documentation: step-by-step guides for common tasks. Conceptual documentation: explains architecture, design decisions, and patterns. Getting started guide: minimal setup to make a first successful API call.

### API Specification Formats
OpenAPI (Swagger): industry standard for REST APIs. YAML/JSON format. Describes endpoints, paths, parameters, request bodies, responses, authentication, and schemas. Supports code generation and documentation tools.

OpenAPI 3.1 uses JSON Schema for request/response validation. OpenAPI 3.0 uses a subset. OpenAPI 2.0 (Swagger) is legacy but still widely used.

### Design-First vs Code-First
Design-first: write OpenAPI spec before implementation. Enables contract testing, client code generation, and documentation generation. Better for public APIs or teams with separate frontend/backend.

Code-first: generate OpenAPI spec from code annotations (Swashbuckle for .NET, drf-spectacular for Django). Faster for internal APIs. Risk of implementation details leaking into API contract.

## Essential Documentation Elements

### Endpoint Reference
- HTTP method and URL path
- Path parameters with type, format, and description
- Query parameters with type, default, required/optional
- Request body schema with example
- Response body schema with example
- Response status codes and descriptions
- Authentication requirements per endpoint

### Authentication
- Authentication method (API key, OAuth2, JWT, Basic Auth)
- How to obtain credentials
- Token lifecycle and refresh
- Scopes and permissions
- Error responses for auth failures

### Error Handling
- Error response format (consistent structure)
- Error codes and messages table
- HTTP status code mapping
- Retry recommendations and rate limiting headers
- Common error scenarios and resolutions

### Usage Examples
- curl example for every endpoint
- Multiple language examples (Python, JavaScript, Java, Go)
- Copy-paste ready code snippets
- Realistic request/response pairs
- Step-by-step workflow sequences

## OpenAPI Structure
```yaml
openapi: 3.1.0
info:
  title: Pet Store API
  version: 1.0.0
  description: API for managing pets in a pet store
  contact:
    name: API Support
    email: support@petstore.com
servers:
  - url: https://api.petstore.com/v1
    description: Production server
  - url: https://staging-api.petstore.com/v1
    description: Staging server
paths:
  /pets:
    get:
      summary: List all pets
      parameters:
        - name: limit
          in: query
          schema:
            type: integer
            maximum: 100
          description: Maximum number of pets to return
      responses:
        "200":
          description: A list of pets
          content:
            application/json:
              schema:
                type: array
                items:
                  $ref: "#/components/schemas/Pet"
```

## Best Practices
- Write clear, concise descriptions for every field and endpoint.
- Provide at least one example per endpoint with realistic data.
- Use consistent naming conventions across the API.
- Document all possible response codes, including errors.
- Keep documentation in version control alongside API code.
- Use API description linting (spectral, vacuum) to enforce standards.
- Include rate limiting information in documentation.
- Provide SDK and client library documentation where applicable.

## Common Tools
- Swagger UI: interactive API documentation browser.
- Redoc: responsive three-panel documentation.
- Stoplight: visual API design and documentation platform.
- Postman: API client with documentation generation.
- ReadMe: hosted developer hub with analytics.
- Docusaurus + OpenAPI plugin: docs-as-code approach.

## References
- api-documentation-advanced.md -- Advanced API documentation topics
- openapi-spec.md -- OpenAPI Specification Guide
- api-style-guide.md -- API Style Guide
- api-docs-workflow.md -- API Documentation Workflow
