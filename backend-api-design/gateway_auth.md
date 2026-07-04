# Security Threat Model & API Gateway
## Sequence Diagram
+---------+       +---------+       +---------+
| Client  |       | Gateway |       | Service |
+---------+       +---------+       +---------+
     |                 |                 |
     |--- Request ---->|                 |
     |                 |--- Validate --->|
     |                 |<-- Response ----|
     |<-- Response ----|                 |
     |                 |                 |

## Threat Model
- STRIDE Analysis
- Spoofing: Handled via Mutual TLS
- Tampering: JWT Signatures

## API Gateway Code (Python)
```python
from fastapi import FastAPI, Request
app = FastAPI()

@app.middleware("http")
async def gateway_middleware(request: Request, call_next):
    # Authenticate
    print("Authenticating...")
    response = await call_next(request)
    return response
```
