# Translation Workflow Reference

## Translation Management Systems

### TMS Comparison

| Platform | Source Control | Auto-Translate | Context Screenshots | API | Pricing |
|----------|---------------|----------------|---------------------|-----|---------|
| Crowdin | GitHub/GitLab/Bitbucket | Google, DeepL, GPT | Yes | Full REST + CLI | Per word |
| Lokalise | GitHub/GitLab/Bitbucket | DeepL, Google, AWS | Yes | Full REST + CLI | Per seat + per project |
| POEditor | GitHub, GitLab | DeepL, Google, GPT | No | REST API | Per project |
| Transifex | GitHub, Bitbucket | Google, DeepL | Yes | REST API | Per seat |
| Phrase | GitHub, GitLab, Bitbucket | Google, DeepL, GPT | Yes | REST API | Per seat |

### TMS Integration Pattern

```yaml
translation_workflow:
  extract:
    tool: "i18next-scanner"
    schedule: "On each commit to main"
    output: "locales/source/en-US.json"
  upload:
    platform: "Crowdin"
    trigger: "After extract completes"
    branch: "feat/my-feature"
    auto_approve: true  # Same-source translations auto-approved
  translate:
    providers:
      - type: "machine"
        engine: "DeepL"
        languages: [de, fr, es, it, pt, nl, pl, ru, ja, ko, zh-CN]
      - type: "human"
        languages: [ar, he, th, vi, hi, ms]
        reviewers: 2 per language
  download:
    trigger: "Translation completes or daily"
    output: "locales/{locale}/{namespace}.json"
    skip_untranslated: false  # Include source fallback for untranslated
  validate:
    - keys_match_source
    - placeholders_present
    - icu_syntax_valid
    - pseudo_localization_test
  deploy:
    when: "CI validation passes"
    target: "CDN with locale-based URL paths"
```

## Automatic Translation

### Machine Translation Providers

```yaml
deepl:
  quality: "Best for European languages"
  support: [bg, cs, da, de, el, en, es, et, fi, fr, hu, id, it, ja, ko, lt, lv, nb, nl, pl, pt, ro, ru, sk, sl, sv, tr, uk, zh]
  features: [formality_toggle, glossary, terminology]

google_translate:
  quality: "Good for all languages, weaker than DeepL for European"
  support: [100+ languages]
  features: [glossary, auto_detect, batch_translate]

gpt_translate:
  quality: "Best for context-aware, brand voice"
  support: [All languages (prompt-based)]
  features: [custom_prompt, tone_control, terminology]
```

### Auto-Translation Pitfalls
- **False friends**: "Eventually" in English ≠ "eventualmente" (Spanish) — use glossaries
- **Context-dependent**: "Run" can be a verb or noun — provide context strings
- **Formality**: Some languages (Japanese, Korean, German) have formal/informal registers
- **Idioms**: "It's raining cats and dogs" → nonsensical if translated literally
- **Brand names**: Ensure brand names are never translated

### Hybrid Workflow
```yaml
workflow:
  phase_1_machine:
    - Translate all new keys with DeepL/Google
    - Apply glossary for brand terms
    - Mark as "pre-translated" (not approved)

  phase_2_review:
    - Human reviewers verify translations
    - Correct context and nuance
    - Mark as "approved" after review

  phase_3_quality:
    - Random sampling of translations (10% per batch)
    - Score against quality rubric
    - Feedback loop to translators
```

## Translation Review

### Review Levels

| Level | Description | Best For |
|-------|-------------|----------|
| Light | Machine only + automated checks | Low-risk content (tooltips, labels) |
| Standard | Machine + one reviewer | Product UI, transactional content |
| Strict | Machine + two reviewers + in-context review | Marketing, legal, regulatory |
| Expert | Human translation + two reviewers | Brand-critical, compliance |

### Quality Rubric
```yaml
quality_score:
  accuracy:
    weight: 40
    criteria:
      - preserves source meaning
      - no omissions or additions
      - technical terms correct
  fluency:
    weight: 30
    criteria:
      - natural in target language
      - appropriate register/formality
      - reads like native content
  terminology:
    weight: 20
    criteria:
      - glossary terms followed
      - consistent across product
      - brand voice maintained
  formatting:
    weight: 10
    criteria:
      - placeholders preserved
      - markup intact
      - line breaks correct
  threshold:
    pass: 80
    auto_approve: 95
```

## Context for Translators

Providing context dramatically improves translation quality.

### What to Provide
```yaml
translation_context:
  key: "checkout.payment.processing"
  source: "Processing your payment..."
  description: "Message shown while payment is being processed"
  max_length: 40  # Character limit
  screenshot: "https://assets.example.com/screenshots/checkout-payment.png"
  usage: "Button loading state"
  glossary_terms: ["payment", "processing"]
  variables:
    - name: "orderId"
      type: "string"
      example: "ORD-12345"
  see_also:
    - checkout.payment.success
    - checkout.payment.failed
```

### In-Context Review Tools
- **Crowdin In-Context**: Browser extension shows translations in live site
- **Lokalise Live Preview**: Visual editor overlays translations on screenshots
- **Phrase String**: In-app overlay for real-time translation review

## CI Validation

```yaml
ci_translation_validation:
  steps:
    - name: "Check all keys present"
      command: "Compare each locale JSON against source; fail if key missing"
    
    - name: "Validate ICU syntax"
      command: "Parse each translation with ICU parser; fail on syntax error"
    
    - name: "Check placeholder consistency"
      command: "Match {variable} count between source and translation"
    
    - name: "Pseudo-localization test"
      command: "Generate [pseudo] strings; verify UI doesn't break with longer text"
    
    - name: "Character limit check"
      command: "Flag translations exceeding 120% of source length"
    
    - name: "Forbidden terms scan"
      command: "Flag use of deprecated or incorrect terms per glossary"
```

## Translation File Management

```yaml
file_organization:
  structure: "locales/{locale}/{namespace}.json"
  namespaces:
    - common          # Shared across features
    - checkout       # Feature-specific
    - email          # Email templates
    - error          # Error messages
    - marketing      # Marketing copy
  branching:
    - On feature branches: translations stored in branch-specific files
    - On merge to main: uploaded to TMS
    - Stable translations merged to main daily
```
