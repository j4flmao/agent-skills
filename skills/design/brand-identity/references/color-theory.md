# Color Theory for Brand Identity

## Overview

Color theory provides a structured framework for selecting and combining colors in brand identity systems. This guide covers color psychology, harmony principles, accessibility requirements, and systematic palette construction for brands.

## Color Psychology in Branding

```yaml
color_associations:
  red:
    emotions: ["Energy", "Passion", "Urgency", "Excitement"]
    brand_personality: "Bold, youthful, adventurous"
    industries: ["Food (stimulates appetite)", "Entertainment", "Retail (clearance/sale)"]
    examples: ["Coca-Cola", "Netflix", "YouTube", "Target"]
    use_with_care: "Can signal danger or aggression — balance with calming neutrals"
    
  blue:
    emotions: ["Trust", "Professionalism", "Calm", "Stability"]
    brand_personality: "Reliable, corporate, authoritative"
    industries: ["Finance", "Healthcare", "Technology", "Enterprise SaaS"]
    examples: ["IBM", "Facebook", "LinkedIn", "American Express"]
    use_with_care: "Can feel cold or conservative — warm accent colors balance this"
    
  green:
    emotions: ["Growth", "Health", "Nature", "Prosperity"]
    brand_personality: "Organic, sustainable, balanced"
    industries: ["Environment/Sustainability", "Healthcare/Wellness", "Finance (money)"]
    examples: ["Starbucks", "Whole Foods", "Spotify", "John Deere"]
    use_with_care: "Avoid association with illness (pale green) or envy"
    
  yellow:
    emotions: ["Optimism", "Clarity", "Warmth", "Attention"]
    brand_personality: "Friendly, accessible, affordable"
    industries: ["Food", "Children's products", "Logistics"]
    examples: ["McDonald's", "IKEA", "Snapchat", "Best Buy"]
    use_with_care: "Poor readability on white backgrounds — pair with dark text"
    
  purple:
    emotions: ["Creativity", "Luxury", "Wisdom", "Spirituality"]
    brand_personality: "Premium, imaginative, sophisticated"
    industries: ["Beauty", "Luxury goods", "Spirituality/Wellness"]
    examples: ["Cadbury", "Hallmark", "Twitch", "Yahoo"]
    use_with_care: "Can feel artificial or pretentious — use as accent rather than primary"
    
  orange:
    emotions: ["Enthusiasm", "Playfulness", "Confidence", "Friendliness"]
    brand_personality: "Fun, energetic, approachable"
    industries: ["Entertainment", "Food", "Children's products"]
    examples: ["Nickelodeon", "Fanta", "Amazon", "Home Depot"]
    use_with_care: "High visibility — can overwhelm if overused"
    
  black:
    emotions: ["Sophistication", "Power", "Elegance", "Exclusivity"]
    brand_personality: "Premium, minimal, authoritative"
    industries: ["Luxury", "Fashion", "High-end technology"]
    examples: ["Chanel", "Apple (product)", "Mercedes-Benz", "Prada"]
    use_with_care: "Can feel heavy or oppressive — use as accent or for high-contrast typography"
    
  white:
    emotions: ["Simplicity", "Cleanliness", "Clarity", "Purity"]
    brand_personality: "Minimal, modern, transparent"
    industries: ["Healthcare", "Technology", "Design"]
    examples: ["Apple (brand)", "Nike", "Adidas", "Google (background)"]
    use_with_care: "Can feel sterile — warm off-whites add human touch"
```

## Color Harmony Principles

```yaml
color_harmonies:
  monochromatic:
    description: "Single hue with variations in saturation and lightness"
    application: "Minimalist brands, clean UI, affordable fashion"
    strengths: "Cohesive, elegant, difficult to get wrong"
    weaknesses: "Lacks visual contrast, can feel boring at large scale"
    palette_construction: "Base color → 3-4 tints (lighter) + 3-4 shades (darker)"
    
  analogous:
    description: "Colors adjacent on the color wheel (3-5 colors within 90-degree arc)"
    application: "Natural/organic brands, calm and harmonious identity"
    strengths: "Serene, naturally pleasing, rich without being overwhelming"
    weaknesses: "Low contrast between colors, lacks pop for calls to action"
    palette_construction: "Select dominant color → 1-2 neighbors on each side → vary saturation"
    
  complementary:
    description: "Colors opposite on the color wheel (180-degree opposite)"
    application: "High-energy brands, entertainment, retail with strong calls to action"
    strengths: "Maximum contrast, attention-grabbing, dynamic"
    weaknesses: "Can be jarring if both used at full saturation, hard to balance"
    palette_construction: "Primary color + direct complement → use one as dominant (70%), other as accent (30%)"
    
  split_complementary:
    description: "Base color + two colors adjacent to its complement"
    application: "Versatile brand identity, works across digital and print"
    strengths: "High contrast of complementary with more nuance and flexibility"
    weaknesses: "More complex to balance, can get muddy if not managed"
    palette_construction: "Base color → find complement → use the two colors on either side of the complement"
    
  triadic:
    description: "Three colors evenly spaced on the color wheel (120-degree apart)"
    application: "Playful brands, children's products, multi-service platforms"
    strengths: "Vibrant, balanced, offers variety while maintaining harmony"
    weaknesses: "Hard to balance — one color should dominate, others accent"
    palette_construction: "Choose dominant color → find its triadic partners → assign 60-30-10 ratio"
    
  tetradic:
    description: "Two complementary pairs (rectangle on color wheel)"
    application: "Complex brand systems with multiple sub-brands"
    strengths: "richest palette, works for large brand ecosystems"
    weaknesses: "Hardest to balance — can look chaotic without disciplined application"
    palette_construction: "Choose one dominant pair → other pair as accents → strict usage rules per context"
```

## Accessibility Requirements

### WCAG Contrast Ratios

```yaml
wcag_contrast:
  normal_text:
    ratio: "4.5:1 minimum (AA)"
    description: "Text smaller than 18px or bold text smaller than 14px"
    exception: "Large text (18px+ or 14px+ bold) requires 3:1 (AA)"
    
  enhanced_text:
    ratio: "7:1 minimum (AAA)"
    description: "Preferred for body text to ensure readability for low-vision users"
    
  ui_components:
    ratio: "3:1 minimum"
    description: "Graphical objects, UI component boundaries, focus indicators"
    
  non_text_contrast:
    ratio: "3:1 minimum"
    description: "Icons, charts, infographics — any visual information beyond decorative"
```

### Color Blindness Considerations

```yaml
color_blindness:
  types:
    deuteranopia:
      prevalence: "6% of males — green cone deficiency"
      problem_colors: "Red-green confusion — avoid red/green as sole differentiator"
    protanopia:
      prevalence: "2% of males — red cone deficiency"
      problem_colors: "Red appears dark/brown — avoid red-on-dark backgrounds"
    tritanopia:
      prevalence: "0.01% — blue cone deficiency"
      problem_colors: "Blue-yellow confusion — rare but significant"
      
  design_rules:
    - "Never use color alone to convey information — pair with icons, patterns, or labels"
    - "Avoid red-green and blue-yellow color combinations for critical differentiation"
    - "Test all color palettes with color blindness simulators (Color Blindness Simulator, Stark)"
    - "Provide text labels and patterns alongside color-coded information"
    - "Use high contrast (7:1+) for critical information"
```

## Palette Construction Process

```yaml
palette_construction:
  step_1_define_brand_personality:
    activity: "Map brand personality to color associations"
    questions:
      - "What 3-5 adjectives describe the brand?"
      - "What emotions should the brand evoke?"
      - "Who is the target audience and what colors resonate with them?"
      - "What colors do competitors use? Differentiate or align?"
    output: "Color direction (warm, cool, neutral, vibrant, muted)"
    
  step_2_select_primary_color:
    activity: "Choose the core brand color (appears in logo, headlines, primary buttons)"
    considerations: ["Brand personality alignment", "Industry expectations", "Differentiation", "Scalability across mediums"]
    testing: "Test primary color against both white (#FFFFFF) and black (#000000) backgrounds for WCAG AA"
    
  step_3_build_palette:
    activity: "Expand primary into full color system"
    components:
      primary: "Main brand color — logo, primary actions, headlines"
      secondary: "Supporting color — secondary elements, accents, sub-brands"
      neutrals: "Text, backgrounds, borders, UI — warm or cool based on brand tone"
      semantic: "Success (green), warning (amber), error (red), info (blue)"
      accents: "Optional supplementary colors for illustrations, highlights"
    ratios:
      primary: "60% of color usage"
      secondary: "20% of color usage"
      neutrals: "15% of color usage"
      accents: "5% of color usage"
      
  step_4_define_application_rules:
    activity: "Document when and how to use each color"
    rules:
      - "Primary color reserved for logo and primary CTA — never dilute with excessive use"
      - "Neutral colors for readability — body text never uses primary color"
      - "Semantic colors only for their designated meaning — never decorative"
      - "Accent colors used sparingly — one accent per layout, consistent with hierarchy"
      
  step_5_accessibility_validation:
    activity: "Test all color combinations against WCAG standards"
    pairs_to_test:
      - "Primary color on white background (text)"
      - "Primary color on black background (text)"
      - "Primary color on neutral light background"
      - "Primary color on neutral dark background"
      - "Semantic colors on relevant backgrounds"
      - "Secondary color on primary (if used together)"
```

## Color Variables and Theming

### Defining Color as Design Tokens

```css
/* CSS custom properties for brand colors */
:root {
  /* Primary palette */
  --color-primary-50: #E8F0FE;
  --color-primary-100: #C5D9F7;
  --color-primary-200: #9EBEF2;
  --color-primary-300: #75A3EC;
  --color-primary-400: #548DE7;
  --color-primary-500: #3578E2;  /* Primary base */
  --color-primary-600: #2B69CB;
  --color-primary-700: #1F56AF;
  --color-primary-800: #14448F;
  --color-primary-900: #0A2F6B;
  
  /* Neutral palette */
  --color-neutral-50: #F8F9FA;
  --color-neutral-100: #F1F3F5;
  --color-neutral-200: #E9ECEF;
  --color-neutral-300: #DEE2E6;
  --color-neutral-400: #CED4DA;
  --color-neutral-500: #ADB5BD;
  --color-neutral-600: #868E96;
  --color-neutral-700: #495057;
  --color-neutral-800: #343A40;
  --color-neutral-900: #212529;
  
  /* Semantic colors */
  --color-success: #2B8A3E;
  --color-warning: #E67700;
  --color-error: #C92A2A;
  --color-info: #1864AB;
  
  /* Text colors */
  --color-text-primary: var(--color-neutral-900);
  --color-text-secondary: var(--color-neutral-700);
  --color-text-disabled: var(--color-neutral-500);
  --color-text-on-primary: #FFFFFF;
  
  /* Background colors */
  --color-bg-primary: #FFFFFF;
  --color-bg-secondary: var(--color-neutral-50);
  --color-bg-tertiary: var(--color-neutral-100);
}

/* Dark mode overrides */
[data-theme="dark"] {
  --color-text-primary: var(--color-neutral-50);
  --color-text-secondary: var(--color-neutral-200);
  --color-bg-primary: var(--color-neutral-900);
  --color-bg-secondary: var(--color-neutral-800);
}
```

## Common Palette Recipes

```yaml
palette_recipes:
  professional_blue:
    primary: "#1565C0"  /* Deep blue */
    secondary: "#42A5F5"  /* Light blue */
    accent: "#FF7043"  /* Coral */
    neutrals: ["#F5F5F5", "#E0E0E0", "#9E9E9E", "#424242", "#212121"]
    semantic: ["#4CAF50", "#FF9800", "#F44336", "#2196F3"]
    brands: ["IBM", "Deloitte", "PwC"]
    
  vibrant_purple:
    primary: "#7B1FA2"  /* Deep purple */
    secondary: "#CE93D8"  /* Light purple */
    accent: "#FFD54F"  /* Amber */
    neutrals: ["#FAFAFA", "#F5F5F5", "#BDBDBD", "#616161", "#212121"]
    semantic: ["#66BB6A", "#FFA726", "#EF5350", "#42A5F5"]
    brands: ["Twitch", "Yahoo", "Hallmark"]
    
  natural_green:
    primary: "#2E7D32"  /* Forest green */
    secondary: "#66BB6A"  /* Soft green */
    accent: "#8D6E63"  /* Warm brown */
    neutrals: ["#FFF8E1", "#FFF3E0", "#BCAAA4", "#5D4037", "#3E2723"]
    semantic: ["#43A047", "#FB8C00", "#E53935", "#1E88E5"]
    brands: ["Starbucks", "Whole Foods", "Patagonia"]
    
  luxury_black:
    primary: "#1A1A1A"  /* Off-black */
    secondary: "#C6A962"  /* Gold */
    accent: "#8B4513"  /* Warm brown */
    neutrals: ["#F5F0EB", "#E8E0D8", "#A89F95", "#5A534D", "#2D2823"]
    semantic: ["#2E7D32", "#E65100", "#C62828", "#1565C0"]
    brands: ["Chanel", "Mercedes-Benz", "Tiffany & Co."]
```

## Color Application by Medium

```yaml
color_by_medium:
  digital:
    format: "hex (#3578E2) or rgb (53, 120, 226)"
    considerations: "Test on multiple screen types (OLED, LCD, low brightness) — colors vary significantly"
    accessibility: "WCAG contrast testing mandatory — less forgiving than print"
    file: "Use sRGB color space for web — wider gamuts (P3, Adobe RGB) may look different on different screens"
    
  print:
    format: "CMYK breakdown (C:70 M:35 Y:0 K:0)"
    considerations: "Process vs spot color (Pantone) — spot is more accurate for branded materials"
    testing: "Always request a printed proof before large print runs"
    paper_effect: "Uncoated paper absorbs ink — colors appear duller; coated paper keeps vibrancy"
    pantone: "Select PMS equivalent of primary brand color for consistent print reproduction"
    
  physical:
    format: "Specific color system reference (Pantone, RAL, NCS)"
    considerations: "Materials (metal, plastic, fabric) reflect color differently — get physical samples"
    tolerance: "Define acceptable Delta E variation for production runs"
    lighting: "Test under multiple lighting conditions (daylight, warm, cool, retail lighting)"
```

## Color Naming Convention

```yaml
color_naming:
  do_not_use:
    - "Emotional names (Happy Blue, Calm Green) — subjective and meaningless to new team members"
    - "Generic names (Light Blue, Dark Gray) — not precise enough"
    - "Product-specific names — color usage outlives the product"
    
  recommended:
    - "Semantic names when usage is fixed: --color-primary, --color-error"
    - "Scale-based names when usage varies: --color-blue-500, --color-neutral-200"
    - "Functional names for specific applications: --color-text-primary, --color-bg-surface"
    
  hybrid_approach:
    token_structure: "--color-{role}-{variant}"
    examples:
      - "--color-primary-500" (base primary)
      - "--color-primary-50" (lightest primary — for backgrounds)
      - "--color-primary-900" (darkest primary — for text on light backgrounds)
      - "--color-bg-primary" (main background)
      - "--color-text-on-primary" (text on primary backgrounds)
```
