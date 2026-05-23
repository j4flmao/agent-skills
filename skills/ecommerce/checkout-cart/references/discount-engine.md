# Discount Engine Design

## Coupon Data Model
`json
{
    "code": "SUMMER20",
    "type": "percentage | fixed | free_shipping",
    "value": 20,
    "minOrderAmount": 50,
    "maxUsageCount": 1000,
    "maxUsagePerUser": 1,
    "validProducts": ["product_id_1", "product_id_2"],
    "validCategories": ["category_id_1"],
    "validFrom": "2024-06-01",
    "validUntil": "2024-08-31",
    "stackable": false
}
`

## Coupon Validation Flow
`
Validate coupon code exists → Not expired → Usage limit not reached
    → User hasn't used it → Min order amount met → Valid products/categories
    → ✅ Apply discount → Recalculate totals
`

## Promotion Types
| Type | Effect | Stacking |
|------|--------|----------|
| Site-wide | All customers, all products | Usually not stackable |
| Category | Specific category only | Stackable with site-wide? |
| Product | Specific products | Stackable with other promotions |
| User segment | VIP, new, returning customers | Usually stackable |
| First purchase | New customers only | Stackable once |
| Referral | Referrer and referee both get discount | Usually not stackable |
