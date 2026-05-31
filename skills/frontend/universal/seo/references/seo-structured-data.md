# SEO Structured Data

## Overview

Structured data (JSON-LD) helps search engines understand page content and enables rich results in search engine result pages. This reference covers every major Schema.org type, implementation patterns, testing, and optimization strategies for breadcrumbs, products, articles, FAQs, reviews, organizations, local business, events, videos, recipes, and custom schemas.

## JSON-LD Fundamentals

### Basic Structure

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "WebPage",
  "name": "Page Title",
  "description": "Page description",
  "url": "https://example.com/page",
  "mainEntity": {
    "@type": "Article",
    "headline": "Article Headline"
  }
}
</script>
```

### Placement Guidelines

- Place JSON-LD in the `<head>` or at the end of `<body>`.
- Multiple JSON-LD blocks are fine — one per entity type.
- Each block must be a complete, valid JSON object.
- Do not use comments inside JSON-LD (strips during minification).
- Use CDATA wrapping only if serving as XHTML.

## Organization Schema

### Basic Organization

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "Acme Corp",
  "alternateName": "Acme",
  "url": "https://acme.com",
  "logo": "https://acme.com/logo.png",
  "description": "Leading provider of widgets since 1999.",
  "foundingDate": "1999-01-01",
  "foundingLocation": "San Francisco, CA",
  "contactPoint": {
    "@type": "ContactPoint",
    "telephone": "+1-800-555-0199",
    "contactType": "customer service",
    "availableLanguage": ["English", "Spanish"]
  },
  "sameAs": [
    "https://facebook.com/acme",
    "https://twitter.com/acme",
    "https://linkedin.com/company/acme",
    "https://instagram.com/acme"
  ],
  "address": {
    "@type": "PostalAddress",
    "streetAddress": "123 Main St",
    "addressLocality": "San Francisco",
    "addressRegion": "CA",
    "postalCode": "94105",
    "addressCountry": "US"
  }
}
</script>
```

## BreadcrumbList

### Standard Breadcrumbs

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  "itemListElement": [
    {
      "@type": "ListItem",
      "position": 1,
      "name": "Home",
      "item": "https://example.com"
    },
    {
      "@type": "ListItem",
      "position": 2,
      "name": "Products",
      "item": "https://example.com/products"
    },
    {
      "@type": "ListItem",
      "position": 3,
      "name": "Widgets",
      "item": "https://example.com/products/widgets"
    }
  ]
}
</script>
```

### Dynamic Breadcrumb Generation

```typescript
function generateBreadcrumbJsonLd(path: string): Record<string, unknown> {
  const segments = path.split('/').filter(Boolean)
  const items = segments.map((segment, index) => {
    const url = `https://example.com/${segments.slice(0, index + 1).join('/')}`
    const name = segment.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
    return {
      '@type': 'ListItem',
      position: index + 1,
      name,
      item: url,
    }
  })

  // Prepend home
  items.unshift({
    '@type': 'ListItem',
    position: 1,
    name: 'Home',
    item: 'https://example.com',
  })

  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items,
  }
}
```

## Product Schema

### Simple Product

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Product",
  "name": "Premium Widget",
  "description": "A high-quality widget for all your needs.",
  "sku": "WID-001",
  "mpn": "925872",
  "brand": {
    "@type": "Brand",
    "name": "Acme"
  },
  "image": [
    "https://example.com/images/widget-1.jpg",
    "https://example.com/images/widget-2.jpg"
  ],
  "offers": {
    "@type": "Offer",
    "url": "https://example.com/products/widget",
    "priceCurrency": "USD",
    "price": "29.99",
    "priceValidUntil": "2024-12-31",
    "itemCondition": "https://schema.org/NewCondition",
    "availability": "https://schema.org/InStock",
    "shippingDetails": {
      "@type": "OfferShippingDetails",
      "shippingRate": {
        "@type": "MonetaryAmount",
        "value": "5.99",
        "currency": "USD"
      },
      "shippingDestination": [
        {
          "@type": "DefinedRegion",
          "addressCountry": "US"
        }
      ],
      "deliveryTime": {
        "@type": "ShippingDeliveryTime",
        "handlingTime": {
          "@type": "QuantitativeValue",
          "minValue": 1,
          "maxValue": 2,
          "unitCode": "DAY"
        },
        "transitTime": {
          "@type": "QuantitativeValue",
          "minValue": 3,
          "maxValue": 5,
          "unitCode": "DAY"
        }
      }
    }
  },
  "aggregateRating": {
    "@type": "AggregateRating",
    "ratingValue": "4.5",
    "reviewCount": "128"
  }
}
</script>
```

### Product with Variants

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Product",
  "name": "T-Shirt",
  "description": "Comfortable cotton t-shirt",
  "variesBy": ["size", "color"],
  "hasVariant": [
    {
      "@type": "Product",
      "name": "T-Shirt - Small Blue",
      "sku": "TS-S-BL",
      "offers": {
        "@type": "Offer",
        "price": "19.99",
        "priceCurrency": "USD",
        "availability": "https://schema.org/InStock"
      }
    },
    {
      "@type": "Product",
      "name": "T-Shirt - Medium Blue",
      "sku": "TS-M-BL",
      "offers": {
        "@type": "Offer",
        "price": "19.99",
        "priceCurrency": "USD",
        "availability": "https://schema.org/OutOfStock"
      }
    }
  ]
}
</script>
```

## Article Schema

### News Article

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "NewsArticle",
  "headline": "Breaking: Major Discovery in Quantum Computing",
  "description": "Scientists have achieved a breakthrough in quantum computing...",
  "author": {
    "@type": "Person",
    "name": "Jane Smith",
    "url": "https://example.com/authors/jane-smith"
  },
  "publisher": {
    "@type": "Organization",
    "name": "Acme News",
    "logo": {
      "@type": "ImageObject",
      "url": "https://example.com/logo.png"
    }
  },
  "datePublished": "2024-01-15T08:00:00+00:00",
  "dateModified": "2024-01-15T14:30:00+00:00",
  "image": {
    "@type": "ImageObject",
    "url": "https://example.com/images/article.jpg",
    "width": 1200,
    "height": 630
  },
  "mainEntityOfPage": {
    "@type": "WebPage",
    "@id": "https://example.com/article/quantum-breakthrough"
  },
  "articleSection": "Technology",
  "keywords": ["quantum computing", "science", "breakthrough"],
  "wordCount": 1250,
  "timeRequired": "PT8M"
}
</script>
```

### Blog Post

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "BlogPosting",
  "headline": "10 Tips for Better SEO",
  "description": "Practical SEO tips that actually work in 2024.",
  "author": {
    "@type": "Person",
    "name": "John Doe"
  },
  "datePublished": "2024-01-10",
  "dateModified": "2024-01-12",
  "image": "https://example.com/images/blog/seo-tips.jpg",
  "mainEntityOfPage": {
    "@type": "WebPage",
    "@id": "https://example.com/blog/seo-tips"
  }
}
</script>
```

## FAQ Schema

### FAQ Page

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "How do I reset my password?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Go to Settings > Security > Reset Password. Enter your email and follow the instructions sent to your inbox."
      }
    },
    {
      "@type": "Question",
      "name": "What payment methods do you accept?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "We accept Visa, Mastercard, American Express, PayPal, and Apple Pay."
      }
    },
    {
      "@type": "Question",
      "name": "Can I cancel my subscription?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Yes, you can cancel anytime from your account settings. Your access continues until the end of the billing period."
      }
    }
  ]
}
</script>
```

### FAQ in Article Body

When FAQ is part of a larger page, nest it:

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Article",
  "headline": "Complete Guide to SEO",
  "mainEntity": {
    "@type": "FAQPage",
    "mainEntity": [
      {
        "@type": "Question",
        "name": "What is SEO?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "SEO stands for Search Engine Optimization..."
        }
      }
    ]
  }
}
</script>
```

## Review Schema

### Single Review

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Review",
  "itemReviewed": {
    "@type": "Product",
    "name": "Premium Widget",
    "sku": "WID-001"
  },
  "reviewRating": {
    "@type": "Rating",
    "ratingValue": "5",
    "bestRating": "5",
    "worstRating": "1"
  },
  "author": {
    "@type": "Person",
    "name": "Sarah Johnson"
  },
  "datePublished": "2024-01-14",
  "reviewBody": "This is the best widget I have ever used. Highly recommended!"
}
</script>
```

### Aggregate Rating

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Product",
  "name": "Premium Widget",
  "aggregateRating": {
    "@type": "AggregateRating",
    "ratingValue": "4.3",
    "reviewCount": "256",
    "bestRating": "5",
    "worstRating": "1"
  }
}
</script>
```

## Local Business Schema

### Complete Local Business

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  "@id": "https://example.com",
  "name": "Joe's Coffee Shop",
  "description": "Artisanal coffee and pastries in downtown San Francisco.",
  "url": "https://example.com",
  "telephone": "+1-415-555-0123",
  "email": "hello@joescoffee.com",
  "image": "https://example.com/images/shop.jpg",
  "logo": "https://example.com/logo.png",
  "priceRange": "$$",
  "currenciesAccepted": "USD",
  "paymentAccepted": ["Cash", "Credit Card", "Apple Pay"],
  "areaServed": "San Francisco Bay Area",
  "openingHoursSpecification": [
    {
      "@type": "OpeningHoursSpecification",
      "dayOfWeek": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
      "opens": "06:00",
      "closes": "18:00"
    },
    {
      "@type": "OpeningHoursSpecification",
      "dayOfWeek": "Saturday",
      "opens": "07:00",
      "closes": "17:00"
    },
    {
      "@type": "OpeningHoursSpecification",
      "dayOfWeek": "Sunday",
      "opens": "08:00",
      "closes": "14:00"
    }
  ],
  "address": {
    "@type": "PostalAddress",
    "streetAddress": "456 Market St",
    "addressLocality": "San Francisco",
    "addressRegion": "CA",
    "postalCode": "94105",
    "addressCountry": "US"
  },
  "geo": {
    "@type": "GeoCoordinates",
    "latitude": 37.7749,
    "longitude": -122.4194
  },
  "sameAs": [
    "https://facebook.com/joescoffee",
    "https://instagram.com/joescoffee"
  ],
  "makesOffer": [
    {
      "@type": "Offer",
      "itemOffered": {
        "@type": "Service",
        "name": "Coffee Tasting"
      }
    }
  ]
}
</script>
```

### Restaurant

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Restaurant",
  "name": "Bella Italia",
  "servesCuisine": "Italian",
  "menu": "https://example.com/menu",
  "acceptsReservations": "Yes",
  "hasMenu": {
    "@type": "Menu",
    "name": "Dinner Menu",
    "hasMenuItem": [
      {
        "@type": "MenuItem",
        "name": "Spaghetti Carbonara",
        "price": "18.99",
        "priceCurrency": "USD"
      }
    ]
  },
  "starRating": {
    "@type": "Rating",
    "ratingValue": "4.5"
  }
}
</script>
```

## Event Schema

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Event",
  "name": "Tech Conference 2024",
  "description": "Annual technology conference featuring industry leaders.",
  "startDate": "2024-06-15T09:00:00-07:00",
  "endDate": "2024-06-17T18:00:00-07:00",
  "eventStatus": "https://schema.org/EventScheduled",
  "eventAttendanceMode": "https://schema.org/OfflineEventAttendanceMode",
  "location": {
    "@type": "Place",
    "name": "Moscone Center",
    "address": {
      "@type": "PostalAddress",
      "streetAddress": "747 Howard St",
      "addressLocality": "San Francisco",
      "addressRegion": "CA",
      "postalCode": "94103",
      "addressCountry": "US"
    }
  },
  "image": "https://example.com/images/event.jpg",
  "offers": {
    "@type": "Offer",
    "url": "https://example.com/tickets",
    "price": "599.00",
    "priceCurrency": "USD",
    "availability": "https://schema.org/InStock",
    "validFrom": "2024-01-01T00:00:00-07:00"
  },
  "performer": {
    "@type": "Person",
    "name": "Keynote Speaker"
  },
  "organizer": {
    "@type": "Organization",
    "name": "Tech Events Inc",
    "url": "https://techevents.com"
  }
}
</script>
```

## Video Schema

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "VideoObject",
  "name": "How to Build a PWA",
  "description": "Step-by-step guide to building a Progressive Web App from scratch.",
  "thumbnailUrl": "https://example.com/videos/thumb.jpg",
  "uploadDate": "2024-01-10",
  "duration": "PT15M30S",
  "contentUrl": "https://example.com/videos/pwa-guide.mp4",
  "embedUrl": "https://www.youtube.com/embed/abc123",
  "interactionStatistic": {
    "@type": "InteractionCounter",
    "interactionType": "https://schema.org/WatchAction",
    "userInteractionCount": 15234
  },
  "author": {
    "@type": "Person",
    "name": "Tech Tutorials"
  }
}
</script>
```

## Recipe Schema

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Recipe",
  "name": "Chocolate Chip Cookies",
  "description": "Classic homemade chocolate chip cookies, crispy on the outside, chewy on the inside.",
  "image": "https://example.com/images/cookies.jpg",
  "author": {
    "@type": "Person",
    "name": "Chef Maria"
  },
  "datePublished": "2024-01-10",
  "prepTime": "PT15M",
  "cookTime": "PT12M",
  "totalTime": "PT27M",
  "recipeYield": "24 cookies",
  "recipeCategory": "Dessert",
  "recipeCuisine": "American",
  "nutrition": {
    "@type": "NutritionInformation",
    "calories": "250 calories",
    "fatContent": "14g",
    "carbohydrateContent": "32g",
    "proteinContent": "3g"
  },
  "recipeIngredient": [
    "2 1/4 cups all-purpose flour",
    "1 cup butter, softened",
    "3/4 cup sugar",
    "3/4 cup brown sugar",
    "2 eggs",
    "1 tsp vanilla extract",
    "1 tsp baking soda",
    "1/2 tsp salt",
    "2 cups chocolate chips"
  ],
  "recipeInstructions": [
    {
      "@type": "HowToStep",
      "position": 1,
      "name": "Preheat",
      "text": "Preheat oven to 375 degrees F."
    },
    {
      "@type": "HowToStep",
      "position": 2,
      "name": "Mix",
      "text": "Cream together butter and sugars. Add eggs and vanilla."
    },
    {
      "@type": "HowToStep",
      "position": 3,
      "name": "Combine",
      "text": "Mix dry ingredients separately, then combine with wet mixture."
    },
    {
      "@type": "HowToStep",
      "position": 4,
      "name": "Bake",
      "text": "Drop dough onto baking sheet and bake for 10-12 minutes."
    }
  ],
  "aggregateRating": {
    "@type": "AggregateRating",
    "ratingValue": "4.8",
    "reviewCount": "342"
  }
}
</script>
```

## HowTo Schema

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "HowTo",
  "name": "Change a Flat Tire",
  "description": "Step-by-step guide to changing a flat tire safely.",
  "totalTime": "PT30M",
  "tool": [
    {
      "@type": "HowToTool",
      "name": "Car jack"
    },
    {
      "@type": "HowToTool",
      "name": "Lug wrench"
    }
  ],
  "supply": [
    {
      "@type": "HowToSupply",
      "name": "Spare tire"
    }
  ],
  "step": [
    {
      "@type": "HowToStep",
      "position": 1,
      "text": "Find a safe, level surface to park the vehicle.",
      "image": "https://example.com/images/step1.jpg"
    },
    {
      "@type": "HowToStep",
      "position": 2,
      "text": "Loosen the lug nuts before jacking up the vehicle.",
      "image": "https://example.com/images/step2.jpg"
    },
    {
      "@type": "HowToStep",
      "position": 3,
      "text": "Jack up the vehicle until the tire clears the ground.",
      "image": "https://example.com/images/step3.jpg"
    }
  ]
}
</script>
```

## Job Posting Schema

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "JobPosting",
  "title": "Senior Frontend Engineer",
  "description": "We are looking for an experienced frontend engineer to join our team.",
  "identifier": {
    "@type": "PropertyValue",
    "name": "Acme Corp",
    "value": "JOB-2024-001"
  },
  "datePosted": "2024-01-01",
  "validThrough": "2024-03-01T23:59:59+00:00",
  "employmentType": "FULL_TIME",
  "hiringOrganization": {
    "@type": "Organization",
    "name": "Acme Corp",
    "sameAs": "https://acme.com",
    "logo": "https://acme.com/logo.png"
  },
  "jobLocation": {
    "@type": "Place",
    "address": {
      "@type": "PostalAddress",
      "streetAddress": "123 Main St",
      "addressLocality": "San Francisco",
      "addressRegion": "CA",
      "postalCode": "94105",
      "addressCountry": "US"
    }
  },
  "baseSalary": {
    "@type": "MonetaryAmount",
    "currency": "USD",
    "value": {
      "@type": "QuantitativeValue",
      "value": 150000,
      "unitText": "YEAR"
    }
  },
  "educationRequirements": "Bachelor's degree in Computer Science or equivalent experience",
  "experienceRequirements": "5+ years of frontend development experience",
  "skills": ["JavaScript", "React", "TypeScript", "CSS"],
  "applicantLocationRequirements": {
    "@type": "Country",
    "name": "US"
  },
  "workHours": "40 hours per week"
}
</script>
```

## Software App Schema

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  "name": "TaskMaster Pro",
  "description": "The ultimate task management app for teams.",
  "applicationCategory": "BusinessApplication",
  "operatingSystem": "Web, iOS, Android",
  "offers": {
    "@type": "Offer",
    "price": "9.99",
    "priceCurrency": "USD",
    "priceValidUntil": "2024-12-31"
  },
  "aggregateRating": {
    "@type": "AggregateRating",
    "ratingValue": "4.6",
    "ratingCount": "890"
  },
  "author": {
    "@type": "Organization",
    "name": "AppDev Inc"
  },
  "releaseNotes": "New dashboard and reporting features",
  "softwareVersion": "3.0.0",
  "datePublished": "2024-01-01"
}
</script>
```

## Multiple Entities on One Page

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": "https://example.com/#organization",
      "name": "Acme Corp",
      "url": "https://example.com",
      "logo": "https://example.com/logo.png"
    },
    {
      "@type": "WebSite",
      "@id": "https://example.com/#website",
      "url": "https://example.com",
      "name": "Acme Corp",
      "publisher": {
        "@id": "https://example.com/#organization"
      }
    },
    {
      "@type": "BreadcrumbList",
      "@id": "https://example.com/#breadcrumb",
      "itemListElement": [
        { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://example.com" },
        { "@type": "ListItem", "position": 2, "name": "Products", "item": "https://example.com/products" }
      ]
    },
    {
      "@type": "WebPage",
      "@id": "https://example.com/products/#webpage",
      "url": "https://example.com/products",
      "inLanguage": "en",
      "name": "Products - Acme Corp",
      "isPartOf": {
        "@id": "https://example.com/#website"
      },
      "breadcrumb": {
        "@id": "https://example.com/#breadcrumb"
      }
    }
  ]
}
</script>
```

## Dynamic JSON-LD Generation

### React Component

```typescript
function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify({
          '@context': 'https://schema.org',
          ...data,
        }),
      }}
    />
  )
}

// Usage
function ProductPage({ product }) {
  return (
    <>
      <JsonLd
        data={{
          '@type': 'Product',
          name: product.name,
          description: product.description,
          offers: {
            '@type': 'Offer',
            price: product.price,
            priceCurrency: 'USD',
            availability: product.inStock
              ? 'https://schema.org/InStock'
              : 'https://schema.org/OutOfStock',
          },
        }}
      />
      <ProductContent product={product} />
    </>
  )
}
```

### Next.js generateMetadata

```typescript
import type { Metadata } from 'next'

export async function generateMetadata({ params }): Promise<Metadata> {
  const product = await getProduct(params.slug)

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.description,
    offers: {
      '@type': 'Offer',
      price: product.price,
      priceCurrency: 'USD',
    },
  }

  return {
    title: product.name,
    description: product.description,
    other: {
      'application/ld+json': JSON.stringify(jsonLd),
    },
  }
}
```

## Testing and Validation

```bash
# Google Rich Results Test
npx @google/generative-ai-testing rich-results https://example.com/page

# Schema.org Validator
curl -X POST https://validator.schema.org/validate \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com/page"}'

# Structured Data Linter
npx structured-data-linter https://example.com/page

# Manual validation in Search Console
# URL Inspection > View crawled page > Structured data
```

## Common Errors

| Error | Fix |
|-------|-----|
| Missing `@id` for cross-referencing | Add `@id` to entities that are referenced |
| Invalid enum value | Use exact values from Schema.org/docs |
| Missing required field | Check Schema.org requirements for your type |
| URL not accessible | Ensure all image/video URLs return 200 |
| Wrong date format | Use ISO 8601: `2024-01-15T08:00:00+00:00` |
| Price without currency | Always include `priceCurrency` |
| Duplicate types | Use `@graph` for multiple schemas |