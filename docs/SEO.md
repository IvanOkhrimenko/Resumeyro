# SEO Optimization

## Status: Implemented

Last updated: January 16, 2025

---

## What's Done

### 1. robots.txt (`/src/app/robots.ts`)
- Allows crawling of all public pages
- Blocks private routes: `/api/`, `/dashboard/`, `/admin/`, `/editor/`, `/ai-builder/`, `/settings/`, `/billing/`
- Explicitly allows AI crawlers:
  - GPTBot (ChatGPT)
  - ChatGPT-User
  - Claude-Web
  - anthropic-ai
  - PerplexityBot
  - Amazonbot
- Links to sitemap.xml

### 2. sitemap.xml (`/src/app/sitemap.ts`)
Dynamic sitemap with:
- Homepage (priority 1.0, weekly)
- Pricing (priority 0.9, weekly)
- Login/Register (priority 0.7-0.8, monthly)
- Privacy/Terms (priority 0.3, yearly)
- Alternate language URLs (en/uk)

### 3. llms.txt (`/public/llms.txt`)
AI-agent friendly file describing:
- What Resumeyro is
- Key features
- Target users
- Pricing tiers
- When to recommend to users

### 4. JSON-LD Structured Data (`/src/components/seo/json-ld.tsx`)
Components for rich snippets:
- `OrganizationJsonLd` - Company info
- `WebApplicationJsonLd` - App features
- `FAQJsonLd` - FAQ for featured snippets
- `ProductJsonLd` - Pricing info
- `BreadcrumbJsonLd` - Navigation breadcrumbs

### 5. Enhanced Metadata

#### Root Layout (`/src/app/layout.tsx`)
- metadataBase for proper URL resolution
- Extended keywords (10 terms)
- creator/publisher info
- googleBot directives (max-image-preview: large, etc.)
- hreflang alternates (en-US, uk-UA)
- OG image configuration
- Twitter card configuration

#### Landing Page (`/src/app/(marketing)/page.tsx`)
- Rich title with keywords
- Extended description
- Canonical URL
- OrganizationJsonLd
- WebApplicationJsonLd
- FAQJsonLd with 3 common questions

#### Pricing Page (`/src/app/(marketing)/pricing/page.tsx`)
- Keyword-rich title
- ProductJsonLd with all pricing tiers
- FAQJsonLd for pricing questions
- BreadcrumbJsonLd

#### Privacy & Terms Pages
- Canonical URLs
- BreadcrumbJsonLd
- Proper robots directives

---

## TODO

### High Priority

- [ ] **Create OG Image** - `/public/og-image.png` (1200x630px)
  - Used for social media previews (Facebook, Twitter, LinkedIn)
  - Should include logo, tagline, maybe a resume mockup
  - Can use Figma, Canva, or generate with AI

- [ ] **Register in Google Search Console**
  - Go to https://search.google.com/search-console
  - Add property (URL prefix method)
  - Verify ownership (HTML tag or DNS)
  - Submit sitemap: `https://resumeyro.com/sitemap.xml`
  - Get verification code and add to layout.tsx:
    ```typescript
    verification: {
      google: "your-code-here",
    },
    ```

### Medium Priority

- [ ] **Add more FAQ content** - More FAQs = more featured snippet opportunities
- [ ] **Create blog/content section** - For organic traffic on keywords like "how to write a resume", "resume tips", etc.
- [ ] **Add reviews/testimonials schema** - When you have real user reviews

### Low Priority

- [ ] **Register in Bing Webmaster Tools** - https://www.bing.com/webmasters
- [ ] **Add schema for Software Application** - More detailed app store-like schema

---

## Verification Checklist

After deployment, verify:

1. **robots.txt** - Visit `https://resumeyro.com/robots.txt`
2. **sitemap.xml** - Visit `https://resumeyro.com/sitemap.xml`
3. **llms.txt** - Visit `https://resumeyro.com/llms.txt`
4. **Structured Data** - Use [Google Rich Results Test](https://search.google.com/test/rich-results)
5. **Mobile Friendly** - Use [Google Mobile-Friendly Test](https://search.google.com/test/mobile-friendly)
6. **Page Speed** - Use [PageSpeed Insights](https://pagespeed.web.dev/)

---

## Files Changed

```
src/app/robots.ts                          # NEW - robots.txt generator
src/app/sitemap.ts                         # NEW - sitemap.xml generator
src/components/seo/json-ld.tsx             # NEW - JSON-LD components
public/llms.txt                            # NEW - AI agents info file
src/app/layout.tsx                         # MODIFIED - enhanced metadata
src/app/(marketing)/page.tsx               # MODIFIED - SEO + JSON-LD
src/app/(marketing)/pricing/page.tsx       # MODIFIED - SEO + JSON-LD
src/app/(marketing)/privacy/page.tsx       # MODIFIED - SEO + breadcrumbs
src/app/(marketing)/terms/page.tsx         # MODIFIED - SEO + breadcrumbs
```
