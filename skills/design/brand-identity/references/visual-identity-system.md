# Visual Identity System

## Overview

A visual identity system extends beyond the logo to create a cohesive visual language across all brand touchpoints. This guide covers visual system architecture, grid systems, imagery guidelines, iconography, motion principles, and application standards.

## Visual Identity Architecture

```yaml
visual_identity_layers:
  layer_1_foundation:
    components: ["Logo", "Color palette", "Typography", "Grid system"]
    description: "The building blocks — must be defined before any other layer"
    deliverables: ["Logo files (SVG, PNG, EPS)", "Color specification document", "Typeface files + license", "Grid templates"]
    
  layer_2_elements:
    components: ["Iconography style", "Illustration style", "Photography style", "Patterns and textures"]
    description: "Visual elements that compose layouts"
    deliverables: ["Icon library (SVG)", "Illustration guidelines", "Photography mood board", "Pattern files"]
    
  layer_3_composition:
    components: ["Layout principles", "Spacing system", "Responsive behavior", "Motion principles"]
    description: "Rules for combining elements into cohesive layouts"
    deliverables: ["Layout templates", "Spacing scale", "Breakpoint specifications", "Animation guidelines"]
    
  layer_4_applications:
    components: ["Digital (web, app, email)", "Print (cards, brochures, signage)", "Environmental (office, events, packaging)"]
    description: "Specific guidelines for each medium"
    deliverables: ["Application-specific template files", "Production specifications"]
```

## Grid Systems

```yaml
grid_systems:
  column_grids:
    description: "Standard responsive grid for web and digital layouts"
    structure:
      mobile: "4 columns, 16px gutter"
      tablet: "8 columns, 24px gutter"
      desktop: "12 columns, 32px gutter"
      wide: "12 columns, 40px gutter"
    usage: "Page layouts, marketing sites, product interfaces"
    rules: "Content spans full columns — never half-columns. Gutters are for spacing, not content."
    
  modular_grids:
    description: "Grid with both columns and rows — creates consistent modules"
    structure: "12 columns × 8px row unit (baseline grid)"
    usage: "Dashboard layouts, card grids, gallery views"
    rules: "Content aligns to both vertical and horizontal grid lines. Cards span column multiples and row multiples."
    
  baseline_grid:
    description: "Vertical rhythm grid — consistent spacing between text elements"
    baseline: "8px (or 4px for small-scale layouts)"
    usage: "Typography spacing, form layouts, component spacing"
    rules: "All margins and padding are multiples of baseline. Line heights snap to baseline."
```

## Spacing System

```yaml
spacing_system:
  scale:
    name: "8-point grid"
    values:
      xs: "4px"     /* 0.5× — compact spacing */
      sm: "8px"     /* 1× — tight spacing */
      md: "16px"    /* 2× — default spacing */
      lg: "24px"    /* 3× — section spacing */
      xl: "32px"    /* 4× — component spacing */
      xxl: "48px"   /* 6× — page section spacing */
      xxxl: "64px"  /* 8× — major section spacing */
      
  application:
    padding:
      card: "16px or 24px"
      section: "48px (mobile) / 80px (desktop)"
      page: "24px (mobile) / 40px (desktop)"
    gaps:
      between_components: "8px or 16px"
      between_sections: "48px"
      between_cards_in_grid: "24px"
```

## Iconography Guidelines

```yaml
iconography:
  style:
    weight:
      stroke: "1.5px or 2px for outlined icons"
      filled: "Use for active states, primary actions"
    corner: "2px rounded corners — approachable but precise"
    size: "16px, 20px, 24px, 32px base sizes"
    
  design_principles:
    - "Describe the meaning, not the object — a 'delete' icon should communicate removal, not just a trash can"
    - "Consistent stroke weight across all icons in the set"
    - "Consistent corner radius — all corners within an icon use same radius"
    - "Optical alignment — geometric center differs from visual center"
    - "Minimum 1px clear space inside icon bounding box"
    
  grid_and_construction:
    bounding_box: "24×24px standard, 16×16px compact"
    internal_padding: "1-2px from bounding box edge"
    alignment: "Center icon on pixel grid — avoid sub-pixel rendering"
    
  usage_rules:
    - "Never stretch or distort icons"
    - "Color follows brand color system — icons use single color unless semantic"
    - "Action icons use primary color. Neutral icons use text-secondary color."
    - "Semantic icons (success, warning, error) use respective semantic colors"
```

## Photography Guidelines

```yaml
photography:
  style_definition:
    lighting: "Natural light preferred, soft diffused for studio shots"
    color_treatment: "Consistent color grading across all brand imagery"
    composition: "Rule of thirds, leading lines, negative space for text overlay"
    subjects: "Real people in authentic settings — avoid staged stock photography look"
    
  image_types:
    hero: "Wide aspect ratio (16:9 or 2:1), strong focal point, space for text overlay"
    product: "Consistent lighting (45-degree product shot), clean background, multiple angles"
    portrait: "Environmental portraits — subjects in their natural context"
    detail: "Close-up macro shots that show texture and craft"
    
  do_not:
    - "Use cliché stock photography (handshake, office team laughing, headphones guy)"
    - "Over-edit or apply heavy filters"
    - "Mix color treatments across different images on the same page"
    - "Use images with no clear focal point"
```

## Illustration Style

```yaml
illustration:
  style_attributes:
    approach: "Flat vector with subtle depth through layered shadows"
    palette: "Brand primary + secondary + 2 accent colors. Limited to 4 colors per illustration."
    lines: "No outlines — color-block style. 2px rounded strokes for internal details."
    faces: "Abstract/minimal facial features — simple eyes, no mouths unless expressing"
    backgrounds: "Brand neutral light or gradient backgrounds — never compete with foreground"
    
  usage:
    empty_states: "Friendly illustrations for empty lists, errors, success states"
    onboarding: "Narrative sequences explaining product value"
    feature_highlight: "Abstract representations of product features"
    marketing: "Brand storytelling scenes for landing pages and campaigns"
    
  sizing:
    inline: "64×64px — in-app component level"
    card: "120×120px — card and module level"
    section: "240×240px — page section level"
    hero: "400×300px — full width hero sections"
```

## Motion Principles

```yaml
motion:
  principles:
    purposeful: "Motion must communicate meaning — never animate for decoration"
    responsive: "Animation responds to user input within 100ms"
    natural: "Easing curves mimic physical movement — ease-in-out for property changes"
    performant: "Animate only transform and opacity — GPU-accelerated. Never animate layout properties."
    
  timing:
    micro_interaction: "100-200ms — button press, toggle, hover state"
    transition: "200-400ms — page transitions, modal open/close, accordion expand"
    narrative: "400-800ms — onboarding sequences, loading animations"
    
  easing:
    standard: "cubic-bezier(0.4, 0, 0.2, 1) — material-style, natural feel"
    decelerate: "cubic-bezier(0.0, 0, 0.2, 1) — elements entering screen"
    accelerate: "cubic-bezier(0.4, 0, 1, 1) — elements leaving screen"
    sharp: "cubic-bezier(0.4, 0, 0.6, 1) — quick, responsive feedback"
```

## Application-Specific Standards

```yaml
application_standards:
  digital_applications:
    website:
      header: "Logo left, navigation center/right, CTA button right. Fixed on scroll."
      footer: "Logo + tagline, primary nav links, secondary links, social icons, copyright"
      spacing: "Section padding: 80px desktop, 40px mobile. Content max-width: 1200px."
    email:
      header: "Logo centered, max 600px width. Background: brand-neutral-50."
      body: "Single column layout. 16px padding. Buttons 44px height minimum."
      footer: "Small text (12px), legal info, unsubscribe link. Brand neutral-500 color."
    social_media:
      profile: "Logo centered in circle crop on profile images. Brand color for header backgrounds."
      post_images: "Consistent template per post type (quote, stat, product, announcement)"
      story: "Brand gradient background, logo top left, text center, CTAs bottom"
      
  print_applications:
    business_cards:
      size: "85×55mm (standard) or 90×50mm (premium)"
      front: "Logo top left, name center, title below name. Brand-neutral-900 text on white."
      back: "Contact details. Brand primary color for accent elements."
      paper: "350gsm uncoated matte or 400gsm textured"
    letterhead:
      header: "Logo top left or centered. Contact info in single row below."
      body: "Clean, generous margins (20mm). Body text in brand secondary typeface."
      footer: "Brand-neutral-300 thin line. Company name, address, website."
    packaging:
      primary_panel: "Logo prominent, product name, key benefit tagline"
      secondary_panel: "Features, ingredients/specifications, usage instructions"
      tertiary_panel: "Legal information, barcode, recycling info, serial numbers"
```
