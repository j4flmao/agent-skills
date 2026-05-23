# OpenAPI Code Generation

## Tooling Options

### OpenAPI Generator
The most widely used code generator. Supports 40+ languages and frameworks.

```bash
npm install @openapitools/openapi-generator-cli -g
# or via Docker:
docker run --rm -v ${PWD}:/local openapitools/openapi-generator-cli generate ...
```

### Common Generators
| Generator Flag | Output | Best For |
|---------------|--------|----------|
| `typescript-axios` | TypeScript client with Axios | Web frontends |
| `typescript-fetch` | TypeScript client with Fetch | Web, no Axios dep |
| `typescript-angular` | Angular HttpClient service | Angular apps |
| `java` | Java Retrofit2 client | Android |
| `java-resttemplate` | Java RestTemplate client | Spring backend |
| `python` | Python urllib3 client | Python services |
| `go` | Go net/http client | Go services |
| `kotlin` | Kotlin client | Android/Kotlin |
| `csharp-netcore` | .NET Core client | .NET services |
| `spring` | Spring Boot server stub | Java server |
| `nodejs-express` | Express.js server stub | Node.js server |
| `python-flask` | Flask server stub | Python server |

## Client Generation

### Generate TypeScript Client
```bash
npx @openapitools/openapi-generator-cli generate \
  -i api/openapi.yaml \
  -g typescript-axios \
  -o generated/client \
  --additional-properties=withInterfaces=true,useSingleRequestParameter=true,supportsES6=true
```

### Generated Client Usage
```typescript
import { UsersApi, Configuration } from './generated/client';

const api = new UsersApi(new Configuration({ basePath: 'https://api.example.com/v1' }));
const { data } = await api.getUsers({ page: 1, limit: 20 });
```

## Server Stub Generation

### Generate Spring Boot Server
```bash
npx @openapitools/openapi-generator-cli generate \
  -i api/openapi.yaml \
  -g spring \
  -o generated/server \
  --additional-properties=useSpringBoot3=true,delegatePattern=true,interfaceOnly=true
```

The `delegatePattern=true` option generates an interface so you can implement business logic without regenerating over your code.

### Generate Express Server
```bash
npx @openapitools/openapi-generator-cli generate \
  -i api/openapi.yaml \
  -g nodejs-express-server \
  -o generated/server
```

## Custom Templates
Override generator templates for consistent code style:

1. Copy the default templates:
   ```bash
   npx @openapitools/openapi-generator-cli author template -g typescript-axios -o .openapi-templates
   ```
2. Modify the templates in `.openapi-templates/`.
3. Regenerate with custom templates:
   ```bash
   npx @openapitools/openapi-generator-cli generate \
     -i api/openapi.yaml \
     -g typescript-axios \
     -o generated/client \
     -t .openapi-templates
   ```

## OpenAPI Generator Configuration (`openapitools.json`)
```json
{
  "$schema": "node_modules/@openapitools/openapi-generator-cli/config.schema.json",
  "spaces": 2,
  "generator-cli": {
    "version": "7.10.0",
    "generators": {
      "client": {
        "generatorName": "typescript-axios",
        "inputSpec": "api/openapi.yaml",
        "output": "generated/client",
        "additionalProperties": {
          "withInterfaces": true,
          "useSingleRequestParameter": true,
          "supportsES6": true
        }
      },
      "server": {
        "generatorName": "spring",
        "inputSpec": "api/openapi.yaml",
        "output": "generated/server",
        "additionalProperties": {
          "useSpringBoot3": true,
          "delegatePattern": true,
          "interfaceOnly": true
        }
      }
    }
  }
}
```

## Workflow: Spec-First with Codegen

```
1. Edit openapi.yaml ──► 2. Run validation ──► 3. Run codegen
                                                    │
                                          ┌─────────┴──────────┐
                                          ▼                    ▼
                                   Client code (frontend)  Server interfaces (backend)
                                          │                    │
                                          ▼                    ▼
                                   Frontend imports       Backend implements
                                   generated client       generated interface
```

## Best Practices
- Check generated code into version control (teams need stable imports).
- Never hand-edit generated files — change the spec and regenerate.
- Use `openapitools.json` to standardize generation across the team.
- Add codegen to CI — fail the build if the spec has changed but code is not regenerated.
- For breaking spec changes, coordinate codegen regeneration across consumers and providers.
- Use `--additional-properties` to fine-tune output without custom templates.
- For large specs, generate only the operations your service owns using `--api-package`.
