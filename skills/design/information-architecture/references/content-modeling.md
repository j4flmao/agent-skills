# Content Modeling Reference

## Content Types

A content type defines the structure of a piece of content. Each type has a set of attributes (fields) and relationships.

### Common Content Types
```yaml
content_types:
  article:
    description: "Blog post or news article"
    attributes: [title, slug, body, excerpt, author, publishDate, status, featuredImage]
    relationships: [categories, tags, relatedArticles]
  
  product:
    description: "E-commerce product"
    attributes: [name, sku, description, price, compareAtPrice, inventory, weight]
    relationships: [categories, variants, images, reviews]
  
  landing_page:
    description: "Marketing landing page"
    attributes: [title, slug, seo, heroHeading, heroSubtext, sections]
    relationships: [ctaButtons, featuredProducts]
  
  author:
    description: "Content contributor"
    attributes: [name, email, bio, avatar, socialLinks]
    relationships: [articles]
```

### Content Type Design Principles

- **Singular focus**: One content type = one concept. Don't create a "blog post" that also has product fields
- **Composable**: Use components/sections for flexible page building
- **Future-proof**: Add optional fields rather than creating new types
- **Reusable**: Authors and categories should be shared reference types, not embedded

## Attributes (Fields)

| Field Type | Example | Validation | Storage |
|-----------|---------|-----------|---------|
| Short text | Title, name | Max length, required | VARCHAR |
| Long text | Body, description | Rich text, markdown | TEXT / JSON |
| Number | Price, quantity | Min, max, decimal | INTEGER / FLOAT |
| Boolean | Is published, featured | None | BOOLEAN |
| Date/Time | Publish date, expiry | Date range | TIMESTAMP |
| Media | Image, video, file | MIME type, size | Asset reference |
| JSON | Sections, flexible blocks | JSON schema | JSONB |
| Reference | Author, category | Reference type, cascade | ID / relation |

### Attribute Best Practices
- **Slug**: Auto-generated from title, URL-safe, unique
- **Status**: Draft / Published / Archived — never delete, always archive
- **Order**: Use position/weight integers for sortable content
- **SEO fields**: Meta title, description, og:image per content type
- **Timestamps**: Always include createdAt, updatedAt

## Relationships

### Relationship Types

| Type | Example | Cardinality |
|------|---------|-------------|
| One-to-one | Article → SEO metadata | 1:1 |
| One-to-many | Category → Articles | 1:n |
| Many-to-many | Article → Tags | n:m |
| Self-referential | Category → Parent Category | Recursive |
| Polymorphic | Asset → (Article | Product | Author) | Variable |

```sql
-- Many-to-many: articles_tags join table
CREATE TABLE articles_tags (
  article_id UUID REFERENCES articles(id) ON DELETE CASCADE,
  tag_id UUID REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (article_id, tag_id)
);

-- Polymorphic: assets_attachments
CREATE TABLE asset_attachments (
  asset_id UUID REFERENCES assets(id) ON DELETE CASCADE,
  attachable_id UUID NOT NULL,
  attachable_type VARCHAR(50) NOT NULL,  -- 'Article', 'Product', 'Author'
  position INTEGER DEFAULT 0
);
```

## Taxonomies

### Flat Taxonomy
Simple list of terms within a namespace.
```
Tags: [JavaScript, CSS, React, Design, Performance]
```

### Hierarchical Taxonomy
Terms with parent-child relationships.
```
Categories:
  Technology
    Frontend
      React
      Vue
      Angular
    Backend
      Node.js
      Python
      Go
  Design
    UX Research
    Visual Design
    Motion
```

### Faceted Taxonomy
Multi-dimensional classification using independent facets.
```yaml
product_facets:
  - facet: size
    values: [XS, S, M, L, XL, XXL]
  - facet: color
    values: [Red, Blue, Black, White, Green]
  - facet: material
    values: [Cotton, Polyester, Wool, Linen]
  - facet: price_range
    values: [Under $25, $25-$50, $50-$100, $100+]
```

## Metadata Schemas

```typescript
// TypeScript content type definition
interface Article {
  id: string;
  type: 'article';
  attributes: {
    title: string;
    slug: string;
    body: RichText;
    excerpt: string;
    author: Reference<Author>;
    publishDate: DateTime | null;
    status: 'draft' | 'published' | 'archived';
    featuredImage: Asset | null;
    metadata: {
      metaTitle: string;
      metaDescription: string;
      ogImage: Asset | null;
    };
  };
  relationships: {
    categories: Reference<Category[]>;
    tags: Reference<Tag[]>;
    relatedArticles: Reference<Article[]>;
  };
}
```

## Structured Content (Headless CMS)

### JSON Content Model (Contentful-style)
```json
{
  "sys": { "id": "article-123", "contentType": "article" },
  "fields": {
    "title": { "en-US": "Hello World" },
    "slug": { "en-US": "hello-world" },
    "body": {
      "en-US": {
        "data": {},
        "content": [
          { "nodeType": "paragraph", "content": [{ "nodeType": "text", "value": "Hello world!" }] }
        ]
      }
    }
  }
}
```

### Structured Content Principles
- **Presentation-independent**: Content has no layout/styling information
- **Omnichannel**: Same content serves web, mobile, email, API, and print
- **Granular**: Smaller content chunks are more reusable
- **Versioned**: Every change is tracked and revertible
- **Localized**: Content per locale, fallback chains for untranslated content

## Headless CMS Comparison

| CMS | Content API | Content Modeling | Hosting | Best For |
|-----|------------|-----------------|---------|----------|
| Contentful | REST + GraphQL | Flexible, rich UI | Cloud | Enterprise teams |
| Sanity | GROQ + GraphQL | Portable Text, customizable | Cloud + Edge | Custom presentations |
| Strapi | REST + GraphQL | Visual builder, plugin system | Self-hosted | Teams needing control |
| Prismic | REST + GraphQL | Slice machine, repeatable zones | Cloud | Marketing sites |
| Ghost | REST | Limited (posts, pages, tags) | Self-hosted | Blogs, newsletters |
