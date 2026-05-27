# SEO Testing Reference

## Meta Tags Testing

```javascript
import { render } from '@testing-library/react';
import { HelmetProvider } from 'react-helmet-async';

test('page has correct meta tags', () => {
  render(
    <HelmetProvider>
      <ProductPage product={product} />
    </HelmetProvider>
  );
  
  const helmet = HelmetProvider.canUseDOM;
  expect(document.title).toBe('Product Name | My Store');
  expect(
    document.querySelector('meta[name="description"]').content
  ).toContain('Buy Product Name');
});
```

## Structured Data Testing

```javascript
test('includes valid JSON-LD', () => {
  render(<ProductPage product={product} />);
  
  const script = document.querySelector(
    'script[type="application/ld+json"]'
  );
  const data = JSON.parse(script.textContent);
  
  expect(data['@type']).toBe('Product');
  expect(data.name).toBe('Product Name');
  expect(data.offers.price).toBe('29.99');
});
```

## Key Points

- Meta tags tested for title, description, and OG tags
- JSON-LD structured data validates against schema.org
- Canonical URLs prevent duplicate content issues
- Robots meta tag controls indexing behavior
- Hreflang tags tested for international pages
- Sitemap.xml validates all public URLs
- robots.txt tested for allowed/disallowed paths
- Lighthouse SEO audit catches common issues
- Open Graph tags verified for social sharing
- Core Web Vitals measured for search ranking
