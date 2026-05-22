# L10n Workflow

## Key Extraction
```bash
# Scan source for i18n function calls
# Outputs: keys.json with all keys, context, descriptions
i18n-extract --format json \
  --output locales/keys.json \
  --functions t,__,_n \
  src/
```

## Export Format
```json
{
  "checkout.error.card_declined": {
    "description": "Error shown when credit card payment is declined",
    "message": "Your card was declined. {reason, select, ...}",
    "context": "checkout",
    "updated": "2025-01-15"
  }
}
```

## CI Validation
- All keys present in all locale files
- No missing placeholders (ICU args match between source and translations)
- Valid ICU MessageFormat syntax
- No empty translations
- HtmlContent matches (tags, links preserved)

## Translation Platform Integration
- Crowdin/Lokalise: push source keys, pull translations via API
- POEditor: export/import PO files
- Smartling: real-time translation delivery via CDN
- Phrase: CI/CD integration with GitHub Actions

## QA Checklist
- [ ] Translations render without ICU errors
- [ ] Plural forms exist for all languages
- [ ] Date formats match locale conventions
- [ ] Currency formatting uses correct locale symbol
- [ ] RTL pages render correctly
- [ ] No text truncation in UI
- [ ] Special characters display correctly
