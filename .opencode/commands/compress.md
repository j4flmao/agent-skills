# /compress — Compress a file to caveman-style

Rewrite a `.md` file with output compression rules applied. Saves original as `<filename>.original.md`.

## Usage
```
/compress CLAUDE.md
/compress docs/architecture.md
```

## Rules
- Strip: articles, filler, pleasantries, hedging, meta, transitions
- Keep: code blocks, URLs, file paths, headings intact
- Write pattern: `[thing] [action] [reason]. [next step].`
- Save original: `<filename>.original.md`

## Output
```
Compressed: path/to/file.md (N tokens → M tokens, -X%)
Backup: path/to/file.original.md
```
