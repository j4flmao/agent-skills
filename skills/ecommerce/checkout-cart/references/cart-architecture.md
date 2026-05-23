# Cart Data Model

## Cart Schema
`json
{
    "cartId": "uuid",
    "userId": "uuid",
    "status": "active | checked_out | abandoned",
    "items": [
        {
            "productId": "uuid",
            "sku": "string",
            "name": "string",
            "quantity": "integer",
            "unitPrice": "decimal",
            "totalPrice": "decimal",
            "image": "url"
        }
    ],
    "subtotal": "decimal",
    "discount": {
        "code": "string",
        "amount": "decimal",
        "type": "percentage | fixed"
    },
    "tax": "decimal",
    "shipping": "decimal",
    "total": "decimal",
    "createdAt": "timestamp",
    "updatedAt": "timestamp"
}
`

## Cart States
`
Active → Checkout Started → Checkout Complete → Order Created
    ↓                                               ↓
Abandoned (TTL expiry)                        Order lifecycle continues
`

## Abandoned Cart Recovery
- Send reminder email after 1 hour
- Send discount offer after 24 hours
- Send final reminder after 72 hours
- Clear cart after 7 days
- Track recovery rate (target: > 10%)
