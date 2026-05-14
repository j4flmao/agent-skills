# /skill — Load a skill by name

Activate a skill from the suite. Reads the skill's SKILL.md and applies its rules.

## Usage
```
/skill <name>
/skill nestjs-architecture
/skill api-response
/skill ios
```

## Resolution
1. Match `name:` field in `skills/**/SKILL.md`
2. Read SKILL.md content
3. Load reference files from `references/` directory
4. Follow skill's Agent Protocol

## Output
```
Activated: {name}
Description: {description}
References: {N} files
```
