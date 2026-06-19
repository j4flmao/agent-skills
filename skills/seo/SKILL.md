# SEO Skill

## Overview
Search Engine Optimization improves website visibility in search results. This skill covers technical SEO, on-page optimization, structured data, content strategy, and performance optimization.

## Decision Tree: SEO Strategy

### SEO Priority by Site Type
```
What kind of site?
├── E-commerce → Product schema, reviews, images, category optimization (highest ROI)
├── Blog/Content → Content quality, keyword research, internal linking, readability
├── SaaS/Landing page → Technical SEO, Core Web Vitals, conversion optimization
├── Local business → Google Business Profile, local schema, location pages
├── Marketplace → Unique product descriptions, category hierarchy, faceted navigation
└── Enterprise/Portal → Site architecture, crawl efficiency, duplicate content resolution
```

### Indexing Decision
```
Should this page be indexed?
├── Public, useful content → index, follow (default for most pages)
├── Thin content / duplicate → noindex, follow (don't waste crawl budget)
├── Admin, login, internal tools → noindex, nofollow (private pages)
├── Search results pages → noindex (prevents infinite indexation)
├── Filtered/faceted URLs with parameters → noindex or canonical to parent
├── Paginated pages (page 2, 3...) → index (with rel=prev/next or view all)
├── Thank-you / confirmation pages → noindex (no user value)
└── PDF files → index if content-rich, noindex if thin
```

## Technical SEO

### Core Web Vitals Optimization
```
LCP (Largest Contentful Paint) — target < 2.5s:
  - Optimize images (WebP, responsive sizes, lazy loading)
  - Preload hero images / LCP element
  - Minimize render-blocking resources
  - Use CDN with good time-to-first-byte
  - Remove large layout shifting elements

FID (First Input Delay) — target < 100ms:
  - Code-split JavaScript (reduce main thread work)
  - Defer non-critical scripts
  - Minimize polyfills for modern browsers
  - Use web workers for heavy computation

CLS (Cumulative Layout Shift) — target < 0.1:
  - Set explicit width/height on images and embeds
  - Reserve space for ads and dynamic content
  - Use font-display: swap with appropriate fallback sizes
  - Avoid inserting content above existing content after load
  - Use transform animations instead of layout-triggering properties
```

### Robots.txt Patterns
```
# Allow all
User-agent: *
Allow: /
Sitemap: https://example.com/sitemap.xml

# Block admin and API
User-agent: *
Disallow: /admin/
Disallow: /api/
Disallow: /private/
Disallow: /*.pdf$
Allow: /
Sitemap: https://example.com/sitemap.xml

# Block specific crawler
User-agent: GPTBot
Disallow: /

# Crawl-delay for large sites
User-agent: *
Crawl-delay: 10
Allow: /
```

### Sitemap Strategy
```javascript
function generateSitemap(pages) {
  const urls = pages.map((page) => `
    <url>
      <loc>${escapeXml(page.url)}</loc>
      <lastmod>${page.lastModified || new Date().toISOString().split('T')[0]}</lastmod>
      <changefreq>${page.changeFreq || 'weekly'}</changefreq>
      <priority>${page.priority || 0.5}</priority>
      ${page.images?.map((img) => `
        <image:image>
          <image:loc>${escapeXml(img.url)}</image:loc>
          <image:title>${escapeXml(img.title)}</image:title>
        </image:image>
      `).join('') || ''}
    </url>
  `).join('');

  return `<?xml version="1.0" encoding="UTF-8"?>
    <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
            xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
      ${urls}
    </urlset>`;
}
```

### Sitemap Index for Large Sites
```xml
<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap>
    <loc>https://example.com/sitemap-products.xml</loc>
    <lastmod>2025-06-01</lastmod>
  </sitemap>
  <sitemap>
    <loc>https://example.com/sitemap-blog.xml</loc>
    <lastmod>2025-06-01</lastmod>
  </sitemap>
  <sitemap>
    <loc>https://example.com/sitemap-categories.xml</loc>
    <lastmod>2025-06-01</lastmod>
  </sitemap>
</sitemapindex>
```

## Structured Data

### Schema Selection Decision Tree
```
What is this page about?
├── Product → Product + Offer + AggregateRating + Review
├── Article/Blog → Article + BreadcrumbList
├── Local business → LocalBusiness + OpeningHours + GeoCoordinates
├── Event → Event + Place + Offer
├── Recipe → Recipe + NutritionInformation + Video
├── FAQ → FAQPage (question/answer pairs)
├── How-to → HowTo (step-by-step with images)
├── Video → VideoObject (with watch-action)
├── Course → Course + EducationalOccupationalCredential
├── Job posting → JobPosting + Organization
├── Software app → SoftwareApplication + AggregateRating
└── Organization → Organization + ContactPoint + SocialMediaPosting
```

### Product Schema
```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Product",
  "name": "Wireless Bluetooth Headphones",
  "description": "High-quality wireless headphones with noise cancellation",
  "sku": "WBH-2024-001",
  "mpn": "WBH-001",
  "brand": {
    "@type": "Brand",
    "name": "SoundMax"
  },
  "category": "Electronics/Headphones",
  "offers": [
    {
      "@type": "Offer",
      "url": "https://example.com/products/headphones",
      "priceCurrency": "USD",
      "price": "79.99",
      "priceValidUntil": "2025-12-31",
      "availability": "https://schema.org/InStock",
      "itemCondition": "https://schema.org/NewCondition",
      "hasMerchantReturnPolicy": {
        "@type": "MerchantReturnPolicy",
        "returnPolicyCategory": "https://schema.org/MerchantReturnFiniteReturnWindow",
        "merchantReturnDays": 30,
        "returnMethod": "https://schema.org/ReturnByMail"
      }
    }
  ],
  "aggregateRating": {
    "@type": "AggregateRating",
    "ratingValue": "4.5",
    "reviewCount": "234",
    "bestRating": "5"
  },
  "image": "https://example.com/images/headphones.jpg"
}
</script>
```

## On-Page SEO

### Title and Meta Patterns
```
Title tag: 50-60 characters
  Primary Keyword | Brand Name
  Primary Keyword - Secondary Keyword | Brand
  [Action] [Topic]: [Benefit]

Meta description: 150-160 characters
  Include primary keyword naturally
  Include call to action
  Differentiate from competitors
  Match search intent

URL structure:
  /category/product-name         (e-commerce)
  /blog/post-slug                (blog)
  /services/service-name         (services)
  /locations/city/service        (local)
```

## Content Strategy

### Keyword Research Decision
```
What stage of the funnel?
├── Informational (top of funnel) → Long-tail questions, how-to guides, blog posts
│   Search intent: "how to fix leaky faucet"
├── Commercial investigation (middle) → Comparison guides, best-of lists, reviews
│   Search intent: "best wireless headphones 2025"
├── Transactional (bottom) → Product pages, pricing, buy now
│   Search intent: "buy sony wh-1000xm5"
└── Navigation → Brand terms, specific product names
    Search intent: "example.com login"
```

### Internal Linking Pattern
```html
<!-- Breadcrumb → linked navigation -->
<nav aria-label="Breadcrumb">
  <ol>
    <li><a href="/">Home</a></li>
    <li><a href="/electronics">Electronics</a></li>
    <li><a href="/electronics/headphones">Headphones</a></li>
    <li aria-current="page">Wireless Bluetooth Headphones</li>
  </ol>
</nav>

<!-- Contextual links in content -->
<p>Our <a href="/noise-cancelling-headphones">noise-cancelling technology</a>
ensures crystal-clear audio even in noisy environments.
Compare with our <a href="/wired-headphones">wired headphones</a> for studio use.</p>
```

## Key Anti-Patterns
- **Keyword stuffing**: Natural language over repetition
- **Duplicate content across pages**: Use canonical tags or unique content
- **Hidden text / cloaking**: Search engines penalize these heavily
- **Ignoring mobile usability**: Mobile-first indexing means mobile is primary
- **Slow page speed**: Direct ranking factor since 2018
- **No HTTPS**: Security signal and ranking factor
- **Thin affiliate content**: Provide genuine value beyond affiliate links
- **Broken internal links**: Wastes crawl budget and hurts user experience
- **Missing alt text**: Image search traffic + accessibility
- **Auto-generated content without value**: Panda penalty risk
- **Excessive redirect chains**: Each redirect adds latency and crawl cost
- **Blocking CSS/JS in robots.txt**: Modern crawlers need CSS/JS for rendering
- **Not monitoring search console**: Misses critical issues and opportunities

## Implementation Patterns

### Technical SEO Audit Engine

```python
import requests
from typing import List, Dict, Optional
from urllib.parse import urlparse, urljoin
from bs4 import BeautifulSoup
import re

class SEOAuditor:
    def __init__(self, base_url: str):
        self.base_url = base_url
        self.visited = set()
        self.issues = []

    def audit_page(self, url: str) -> Dict:
        try:
            resp = requests.get(url, timeout=10, headers={"User-Agent": "SEOAuditBot/1.0"})
            soup = BeautifulSoup(resp.text, "html.parser")
        except Exception as e:
            return {"url": url, "error": str(e), "issues": []}

        page_issues = []
        title = soup.find("title")
        if not title:
            page_issues.append({"type": "warning", "message": "Missing <title> tag"})
        elif len(title.text) > 60:
            page_issues.append({"type": "warning", "message": f"Title too long ({len(title.text)} chars)"})
        elif len(title.text) < 30:
            page_issues.append({"type": "info", "message": f"Title might be too short ({len(title.text)} chars)"})

        meta_desc = soup.find("meta", attrs={"name": "description"})
        if not meta_desc or not meta_desc.get("content"):
            page_issues.append({"type": "warning", "message": "Missing meta description"})

        canonical = soup.find("link", rel="canonical")
        if not canonical:
            page_issues.append({"type": "info", "message": "Missing canonical URL"})

        h1 = soup.find("h1")
        if not h1:
            page_issues.append({"type": "warning", "message": "Missing H1 tag"})
        elif len(soup.find_all("h1")) > 1:
            page_issues.append({"type": "warning", "message": f"Multiple H1 tags ({len(soup.find_all('h1'))})"})

        images = soup.find_all("img")
        missing_alt = [img for img in images if not img.get("alt")]
        if missing_alt:
            page_issues.append({"type": "warning", "message": f"{len(missing_alt)} images missing alt text"})

        return {"url": url, "title": title.text if title else None, "issues": page_issues}

    def generate_sitemap_xml(self, pages: List[str]) -> str:
        lines = ['<?xml version="1.0" encoding="UTF-8"?>']
        lines.append('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">')
        for page in pages:
            lines.append("  <url>")
            lines.append(f"    <loc>{page}</loc>")
            lines.append(f"    <lastmod>2025-06-01</lastmod>")
            lines.append("    <changefreq>weekly</changefreq>")
            lines.append("    <priority>0.8</priority>")
            lines.append("  </url>")
        lines.append("</urlset>")
        return "\n".join(lines)

class StructuredDataValidator:
    def __init__(self):
        self.schema_store = {}

    def validate_json_ld(self, json_ld: str) -> Dict:
        import json
        try:
            data = json.loads(json_ld)
        except json.JSONDecodeError as e:
            return {"valid": False, "error": f"Invalid JSON: {e}"}
        if "@context" not in data:
            return {"valid": False, "error": "Missing @context"}
        if "@type" not in data:
            return {"valid": False, "error": "Missing @type"}
        return {"valid": True, "type": data["@type"]}

    def generate_product_schema(self, product: Dict) -> str:
        import json
        schema = {
            "@context": "https://schema.org",
            "@type": "Product",
        }
        if product.get("name"):
            schema["name"] = product["name"]
        if product.get("description"):
            schema["description"] = product["description"]
        if product.get("image"):
            schema["image"] = product["image"]
        if product.get("sku"):
            schema["sku"] = product["sku"]
        if product.get("brand"):
            schema["brand"] = {"@type": "Brand", "name": product["brand"]}
        if product.get("price"):
            schema["offers"] = {
                "@type": "Offer",
                "price": product["price"],
                "priceCurrency": product.get("currency", "USD"),
                "availability": f"https://schema.org/{product.get('availability', 'InStock')}",
            }
        if product.get("rating"):
            schema["aggregateRating"] = {
                "@type": "AggregateRating",
                "ratingValue": str(product["rating"]),
                "reviewCount": str(product.get("review_count", 0)),
            }
        return json.dumps(schema, indent=2)

class CoreWebVitalsOptimizer:
    def __init__(self):
        self.lcp_target = 2500
        self.fid_target = 100
        self.cls_target = 0.1

    def analyze_image_optimization(self, images: List[Dict]) -> List[Dict]:
        issues = []
        for img in images:
            if not img.get("srcset"):
                issues.append({"image": img.get("src"), "issue": "Missing srcset for responsive images"})
            if img.get("format", "").lower() not in ("webp", "avif"):
                issues.append({"image": img.get("src"), "issue": "Not using modern format (WebP/AVIF)"})
            if not img.get("loading") == "lazy" and img.get("is_hero") is False:
                issues.append({"image": img.get("src"), "issue": "Missing loading=lazy"})
            if not img.get("width") or not img.get("height"):
                issues.append({"image": img.get("src"), "issue": "Missing explicit width/height (causes CLS)"})
        return issues

    def generate_preload_hints(self, critical_assets: List[str]) -> str:
        hints = []
        for asset in critical_assets:
            if asset.endswith((".css", ".js")):
                hints.append(f'<link rel="preload" href="{asset}" as="script">')
            elif asset.endswith((".png", ".jpg", ".webp", ".avif")):
                hints.append(f'<link rel="preload" href="{asset}" as="image">')
            elif asset.endswith((".woff", ".woff2", ".ttf")):
                hints.append(f'<link rel="preload" href="{asset}" as="font" crossorigin>')
        return "\n".join(hints)

class KeywordAnalyzer:
    def __init__(self):
        self.stop_words = {"a", "an", "the", "and", "or", "but", "in", "on", "at", "to", "for",
                           "of", "with", "by", "from", "as", "is", "was", "are", "were", "be",
                           "been", "being", "have", "has", "had", "do", "does", "did"}

    def extract_keywords(self, text: str, min_length: int = 3) -> List[tuple]:
        words = re.findall(r'\b[a-zA-Z]{%d,}\b' % min_length, text.lower())
        word_freq = {}
        for w in words:
            if w not in self.stop_words:
                word_freq[w] = word_freq.get(w, 0) + 1
        ngrams = self._extract_ngrams(text, 2, min_length)
        return sorted(word_freq.items(), key=lambda x: -x[1])[:20]

    def _extract_ngrams(self, text: str, n: int, min_word_length: int) -> List[tuple]:
        words = re.findall(r'\b[a-zA-Z]{%d,}\b' % min_word_length, text.lower())
        ngrams = {}
        for i in range(len(words) - n + 1):
            phrase = " ".join(words[i:i+n])
            ngrams[phrase] = ngrams.get(phrase, 0) + 1
        return sorted(ngrams.items(), key=lambda x: -x[1])[:10]

    def analyze_search_intent(self, query: str) -> str:
        query_lower = query.lower()
        informational_words = {"how", "what", "why", "when", "where", "which", "who",
                                "guide", "tutorial", "explain", "learn", "tips"}
        commercial_words = {"best", "top", "review", "vs", "comparison", "vs.",
                            "alternative", "rating", "cheap"}
        transactional_words = {"buy", "purchase", "order", "price", "cost", "discount",
                               "coupon", "deal", "shop", "sale"}
        navigation_words = {"login", "signup", "register", "homepage", "official",
                            "download", "app", "site"}

        words = set(query_lower.split())
        if words & navigation_words:
            return "navigational"
        if words & transactional_words:
            return "transactional"
        if words & commercial_words:
            return "commercial_investigation"
        if words & informational_words:
            return "informational"
        return "unknown"

class RedirectChainAnalyzer:
    def __init__(self):
        self.max_chain_length = 3

    def trace_redirect(self, url: str, max_follow: int = 10) -> List[Dict]:
        chain = []
        visited = set()
        current = url
        for _ in range(max_follow):
            if current in visited:
                chain.append({"url": current, "type": "redirect_loop"})
                break
            visited.add(current)
            try:
                resp = requests.get(current, allow_redirects=False, timeout=5)
                chain.append({
                    "url": current,
                    "status": resp.status_code,
                    "type": "redirect" if 300 <= resp.status_code < 400 else "final",
                })
                if 300 <= resp.status_code < 400:
                    current = urljoin(current, resp.headers.get("Location", ""))
                else:
                    break
            except Exception as e:
                chain.append({"url": current, "type": "error", "error": str(e)})
                break
        return chain

## Architecture Decision Trees

### SEO Priority Matrix

```
What's the primary goal?
├── Increase organic traffic
│   ├── New site → Focus on technical SEO + content strategy
│   ├── Existing site → Fix technical issues first, then content
│   └── Stagnant traffic → Content refresh + link building
│
├── Improve conversion rate
│   ├── E-commerce → Product schema + reviews + page speed
│   ├── SaaS → Technical SEO + CRO + case studies
│   └── Lead gen → Landing page optimization + local SEO
│
├── Fix penalty / traffic drop
│   ├── Google update → Audit content quality + backlinks
│   ├── Manual action → Fix specific violation + reconsideration request
│   └── Technical issue → Crawl budget + indexing + core web vitals
│
└── Build brand authority
    ├── Topical clusters → Pillar pages + cluster content
    ├── Linkable assets → Research, tools, original data
    └── E-E-A-T signals → Author pages, citations, credentials
```

### Crawl Budget Decision

```
How many pages does the site have?
├── < 500 pages
│   ├── All pages should be indexable
│   └── Crawl budget not a concern
│
├── 500-10,000 pages
│   ├── Review robots.txt for efficiency
│   ├── Eliminate thin/low-value pages (noindex)
│   └── Optimize internal linking to important pages
│
├── 10,000-100,000 pages
│   ├── Monitor crawl stats in GSC
│   ├── Implement sitemap splitting by category
│   ├── Remove parameter-based duplicate URLs
│   └── Set crawl rate limits during peak traffic
│
└── 100,000+ pages (e-commerce, marketplace)
    ├── Prioritize product/category pages in sitemaps
    ├── Use faceted navigation best practices
    ├── Implement hreflang for international sites
    └── Consider dynamic rendering for JS-heavy pages
```

## Production Considerations

- **SEO monitoring automation**: Set up weekly automated crawls using Screaming Frog or custom bots that check for 404s, redirect chains, missing metadata, and schema validation errors. Report to a dashboard.
- **Content freshness signals**: Update lastmod dates in sitemaps whenever content changes. Implement "last updated" dates on article pages. Google favors fresh content for time-sensitive queries.
- **International SEO**: Use hreflang tags for multi-language sites. Never use IP-based redirects for language detection — users should be able to choose their language.
- **Core Web Vitals monitoring**: Integrate CrUX (Chrome User Experience Report) API monitoring into CI. Set up alerts when LCP, FID, or CLS metrics degrade.

## Security Considerations

- **Hreflang tag validation**: Incorrect hreflang implementation can cause Google to misindex or deindex international pages. Validate bidirectional links and language codes.
- **Structured data injection**: Never accept user-generated structured data without sanitization. Malicious JSON-LD can cause Google Search Console warnings or manual actions.
- **Robots.txt exposure**: robots.txt can leak private paths. Never Disallow a path that shouldn't exist — use noindex instead for pages you don't want indexed.
- **Canonical URL hijacking**: Ensure canonical tags point to your domain. If another site copies your content and uses self-canonical, it can outrank you.

## Anti-Patterns

| Anti-Pattern | Why It Fails | Correct Approach |
|---|---|---|
| Keyword stuffing in content | Google Panda penalty reduces rankings | Natural language with semantic keyword variations |
| Identical meta descriptions across pages | Google ignores them and generates snippets | Unique meta descriptions per page with target keywords |
| Over-optimizing anchor text | Penguin penalty for unnatural link profiles | Varied anchor text: branded, naked URL, natural phrases |
| Blocking CSS/JS in robots.txt | Modern crawlers can't render page content | Allow all CSS/JS in robots.txt |
| Using same H1 and title tag | Missed opportunity for secondary keyword optimization | Different but related H1 and title |
| Paginating without rel=next/prev | Index bloat and duplicate content issues | Use rel=next/prev or implement "view all" for small lists |
| No 301 vs 302 distinction | Search engines treat differently (302 doesn't pass link equity) | 301 for permanent moves, 302 for temporary/AB testing |
| Ignoring mobile usability | Mobile-first indexing means mobile is primary | Test all pages on mobile viewports, fix tap target sizes |
| Auto-generated content at scale | Panda penalty for low-value content | Manual curation with human-written added value |

## Performance Optimization

- **CDN for static assets**: Use CDN with edge caching for CSS, JS, and images. Reduces TTFB by 40-60% for geographically distributed users.
- **Critical CSS extraction**: Inline above-the-fold CSS in `<head>`, defer non-critical CSS. Reduces render-blocking resources and improves LCP.
- **Font subsetting**: Subset fonts to include only needed characters (e.g., Latin subset, specific weights). Reduces font file size by 60-90%.
- **Image CDN with real-time optimization**: Use image CDN that auto-converts to WebP/AVIF, resizes per device, and strips metadata. Reduces image payload by 40-80%.
- **Lazy loading below-fold content**: Defer loading images, iframes, and embeds below the fold. Reduces initial page weight by 30-50%.
- **Preconnect to third-party origins**: Add `<link rel="preconnect">` for analytics, CDN, and font origins. Shaves 100-300ms off connection setup.
- **Server-side rendering for SEO-critical pages**: Use SSR or static generation for pages that need indexing. Client-side rendering can miss crawler requests.
- **Resource hints**: Use `preload` for critical assets, `prefetch` for likely-next-page assets, `preconnect` for cross-origin resources.
