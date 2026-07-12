---
name: Structured Data
description: JSON-LD Schema markup for Products, Articles, and FAQs.
---

# Structured Data

Injecting JSON-LD provides explicit clues about the meaning of a page to search engines, enabling rich results in SERP.

## Workflow

```mermaid
graph TD
    A[Extract Page Metadata] --> B[Format as JSON-LD]
    B --> C[Inject into DOM Head]
    C --> D[Google Rich Results Test]
```

## Example Implementation (React Helmet)

```javascript
import { Helmet } from 'react-helmet';

export function ProductSchema({ product }) {
  const schema = {
    "@context": "https://schema.org/",
    "@type": "Product",
    "name": product.title,
    "image": product.images,
    "description": product.description,
    "sku": product.sku,
    "offers": {
      "@type": "Offer",
      "url": product.url,
      "priceCurrency": "USD",
      "price": product.price,
      "itemCondition": "https://schema.org/NewCondition",
      "availability": "https://schema.org/InStock"
    }
  };

  return (
    <Helmet>
      <script type="application/ld+json">
        {JSON.stringify(schema)}
      </script>
    </Helmet>
  );
}
```
