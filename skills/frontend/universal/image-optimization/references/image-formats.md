# Image Formats & Delivery

AVIF, WebP, JPEG, srcset, picture element, CDN transforms, and placeholder strategies.

---

## Picture Element Pattern

```html
<picture>
  <source srcset="image.avif" type="image/avif" />
  <source srcset="image.webp" type="image/webp" />
  <img src="image.jpg" alt="Description" width="800" height="600" loading="lazy" />
</picture>
```

Always include `width` and `height` attributes on the fallback `<img>` to reserve space and prevent CLS.

---

## srcset + sizes

```html
<img
  srcset="
    image-640.jpg 640w,
    image-768.jpg 768w,
    image-1024.jpg 1024w,
    image-1280.jpg 1280w,
    image-1536.jpg 1536w
  "
  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
  src="image-1024.jpg"
  alt="Description"
/>
```

`srcset` lists width-descriptor pairs. `sizes` tells the browser which width to use at each viewport. The browser selects the closest match based on device pixel ratio and viewport width.

---

## Art Direction with Picture

```html
<picture>
  <source
    media="(max-width: 640px)"
    srcset="image-mobile.jpg"
  />
  <source
    media="(max-width: 1024px)"
    srcset="image-tablet.jpg"
  />
  <img src="image-desktop.jpg" alt="Description" />
</picture>
```

Use `media` queries to serve different crops for different viewports — a portrait crop on mobile, landscape on desktop. This differs from `srcset` which serves the same image at different resolutions.

---

## CDN Transform URLs

| CDN | Resize | Format | Quality |
|-----|--------|--------|---------|
| Cloudinary | `w_800,h_600,c_fill` | `f_avif` | `q_80` |
| Imgix | `?w=800&h=600&fit=crop` | `&fm=avif` | `&q=80` |
| Cloudflare | `/cdn-cgi/image/width=800,height=600,format=avif` | — | `quality=80` |

```html
<picture>
  <source srcset="https://cdn.example.com/image.jpg?w=640&fm=avif&q=80" type="image/avif" />
  <img src="https://cdn.example.com/image.jpg?w=1024&q=85" alt="Description" />
</picture>
```

---

## Placeholder Strategies

### Blur-up (tiny thumbnail)
```css
.image-wrapper {
  background-size: cover;
  background-image: url('data:image/jpeg;base64,...'); /* 20px wide, blurred */
}
.image-wrapper img {
  opacity: 0;
  transition: opacity 300ms;
}
.image-wrapper img.loaded {
  opacity: 1;
}
```

### Dominant color
```html
<div style="background-color: #3a4b5c; aspect-ratio: 16/9;">
  <img src="photo.jpg" alt="..." style="width: 100%; height: 100%; object-fit: cover;" />
</div>
```

### LQIP generation
```bash
# Generate LQIP at build time via sharp
sharp(input).resize(20).jpeg({ quality: 30 }).toBuffer()
```

All placeholders must maintain the same aspect ratio as the final image to prevent layout shift.
