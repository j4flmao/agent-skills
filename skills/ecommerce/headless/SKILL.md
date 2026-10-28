---
name: headless-ecommerce
description: >
  Use this skill when the user says 'headless commerce', 'shopify hydrogen', 'storefront api', 'oxygen', 'composable commerce', 'headless shopify', 'commerce frontend caching'. It designs headless storefronts (Shopify Hydrogen/Storefront API and other commerce APIs): data fetching, caching per data type, cart handling, and deployment. Do NOT use for: checkout conversion tactics (use checkout-optimization), cart/order backend modeling (use ecommerce-checkout-cart), payment gateways (use ecommerce-payment-processing).
version: "2.0.0"
author: "j4flmao"
license: "MIT"
tags: [ecommerce, headless, shopify, hydrogen, storefront-api, caching]
---

# Headless E-commerce

## Purpose
Build a custom storefront on top of a commerce backend (Shopify, commercetools, BigCommerce, Saleor, Medusa) while keeping catalog pages fast and cacheable and keeping personalized data (cart, customer) uncached and correct. Checkout usually stays on the platform's hosted checkout.

## Agent Protocol

### Trigger
"headless commerce", "hydrogen", "storefront api", "oxygen", "composable commerce", "headless shopify", "storefront caching".

### Input Context
- Commerce platform and plan; whether hosted checkout is required.
- Frontend framework preference (Hydrogen on React Router, Next.js, Astro).
- Catalog size, update frequency, markets/currencies.

### Output Artifact
Architecture + data-fetching/caching plan; route loader code on request.

### Response Format
```
Platform: {backend}  Frontend: {framework}  Hosting: {Oxygen|Vercel|Cloudflare|...}
Data -> cache: {products: long, collections: short, cart/customer: none}
Checkout: {hosted|custom}
Risks: {list}
```

## When Headless Is Worth It

| Situation | Recommendation |
|-----------|---------------|
| Standard store, theme customization enough | Stay on platform themes (Shopify Online Store 2.0) |
| Custom UX, content-heavy storytelling, multiple frontends (web/app/kiosk) | Headless |
| Small team without frontend ops capacity | Avoid — you now own SEO, performance, analytics, a11y |
| Many markets/brands on one catalog | Headless with shared component library |

## Caching by Data Type

| Data | Cache | Why |
|------|-------|-----|
| Product details, collections, menus | `CacheLong()` / CDN with stale-while-revalidate | Changes rarely; revalidate via webhook-driven purge if available |
| Inventory/price-sensitive listings | `CacheShort()` | Minutes of staleness acceptable |
| Cart, customer account, buyer-specific pricing | `CacheNone()` | Personalized; caching leaks data between users |
| Search results | Short or none | High cardinality |

## Hydrogen Loader (React Router based)

Hydrogen queries use template strings tagged with `#graphql` (enables codegen and editor support). Cache strategy is passed per query.

```typescript
import { CacheLong } from '@shopify/hydrogen';
import type { LoaderFunctionArgs } from 'react-router';

const PRODUCT_QUERY = `#graphql
  query Product($handle: String!, $country: CountryCode, $language: LanguageCode)
    @inContext(country: $country, language: $language) {
    product(handle: $handle) {
      id
      title
      descriptionHtml
      selectedOrFirstAvailableVariant {
        id
        availableForSale
        price { amount currencyCode }
      }
    }
  }
` as const;

export async function loader({ params, context }: LoaderFunctionArgs) {
  if (!params.handle) throw new Response('Missing product handle', { status: 400 });
  const { product } = await context.storefront.query(PRODUCT_QUERY, {
    variables: { handle: params.handle },
    cache: CacheLong(),
  });
  if (!product) throw new Response(`Product not found: ${params.handle}`, { status: 404 });
  return { product };
}
```

Older Hydrogen versions import loader types from `@shopify/remix-oxygen`; check the project's `package.json` before generating imports.

## Cart
- Use the Storefront API Cart object (`cartCreate`, `cartLinesAdd`, `cartLinesUpdate`); persist cart ID in a cookie. Hydrogen's `createCartHandler` wraps this.
- Never cache cart reads; perform cart mutations in actions (POST), not loaders.
- Send the shopper to `cart.checkoutUrl` for hosted checkout.

## Query Discipline
- Colocate GraphQL fragments with the components that render them; request only rendered fields.
- Paginate with `first`/`after` cursors; avoid `first: 250` everywhere.
- Storefront API rate limits are generous but not infinite — cache at the edge and avoid N+1 per product card (fetch lists in one query).
- Use `@inContext(country, language)` for market-specific pricing/translations.

## Deployment
- Hydrogen deploys to Oxygen (Shopify's hosting) or any Workers-compatible/Node host.
- Set `Cache-Control` headers deliberately on documents; personalized routes `private, no-store`.
- Preserve SEO: canonical URLs, `hreflang` for markets, structured data (`Product`, `Offer`), sitemap generation.

## Anti-Patterns
| Anti-pattern | Consequence |
|--------------|-------------|
| Caching responses that include cart/customer data | Data leak across users |
| Client-side fetching of all catalog data | Poor LCP and SEO |
| Rebuilding the whole site on every price change (pure SSG) | Stale prices; use SSR + cache or ISR-style revalidation |
| Rebuilding checkout from scratch | Loses platform fraud, tax, payments compliance |
| Exposing private Admin API tokens in the frontend | Store compromise; only public Storefront tokens client-side |

## Checklist
- [ ] Cache strategy defined for every query
- [ ] No personalized data in cached responses
- [ ] Product/collection 404s handled
- [ ] Market/locale context passed to queries
- [ ] Structured data + canonical tags on product pages
- [ ] Hosted checkout via `checkoutUrl`

## References
- `skills/ecommerce/checkout-cart/references/cart-architecture.md`
- `skills/ecommerce/checkout-cart/references/checkout-ux.md`
