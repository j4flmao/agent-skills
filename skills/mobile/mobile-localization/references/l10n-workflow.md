# Localization Workflow

## Overview
The localization workflow manages the process of translating app content from a source language into multiple target languages. An efficient workflow integrates with translation management systems (TMS), automates repetitive tasks, ensures translation quality, and streamlines the release process.

## Localization Pipeline

### End-to-End Workflow

```python
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from pathlib import Path

class LocalizationStage(Enum):
    EXTRACTION = "extraction"
    TRANSLATION = "translation"
    REVIEW = "review"
    IMPORT = "import"
    VALIDATION = "validation"
    BUILD = "build"
    COMPLETE = "complete"

@dataclass
class LocalizationBatch:
    id: str
    source_language: str = "en"
    target_languages: list[str] = field(default_factory=list)
    files: list[Path] = field(default_factory=list)
    stage: LocalizationStage = LocalizationStage.EXTRACTION
    string_count: int = 0
    translated_count: int = 0
    errors: list[str] = field(default_factory=list)
    created_at: datetime = field(default_factory=datetime.utcnow)
    completed_at: datetime | None = None
```

### Extraction Script

```python
import re
import json
from pathlib import Path

class StringExtractor:
    def __init__(self, source_dir: str, output_dir: str):
        self.source_dir = Path(source_dir)
        self.output_dir = Path(output_dir)
        self.strings: dict[str, dict] = {}

    def extract_ios_strings(self):
        for file in self.source_dir.rglob("*.swift"):
            content = file.read_text(encoding="utf-8")
            pattern = r'String\(localized:\s*"([^"]+)"\)'
            for match in re.finditer(pattern, content):
                key = match.group(1)
                if key not in self.strings:
                    self.strings[key] = {
                        "source": key,
                        "context": self._extract_context(content, match.start()),
                        "file": str(file.relative_to(self.source_dir))
                    }

    def extract_android_strings(self):
        values_dir = self.source_dir / "res" / "values"
        strings_file = values_dir / "strings.xml"
        if strings_file.exists():
            content = strings_file.read_text(encoding="utf-8")
            pattern = r'name="([^"]+)"[^>]*>([^<]+)'
            for match in re.finditer(pattern, content):
                key = match.group(1)
                value = match.group(2)
                if key not in self.strings:
                    self.strings[key] = {
                        "source": value,
                        "context": "Android string resource",
                        "file": str(strings_file.relative_to(self.source_dir))
                    }

    def export_for_translation(self, format: str = "xliff"):
        if format == "xliff":
            return self._export_xliff()
        elif format == "json":
            return self._export_json()
        elif format == "csv":
            return self._export_csv()

    def _export_json(self) -> str:
        output = {
            "source_language": "en",
            "strings": {
                key: info["source"]
                for key, info in self.strings.items()
            }
        }
        return json.dumps(output, indent=2, ensure_ascii=False)

    def _export_csv(self) -> str:
        import csv
        import io
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(["key", "source", "context", "file"])
        for key, info in self.strings.items():
            writer.writerow([
                key, info["source"],
                info["context"], info["file"]
            ])
        return output.getvalue()

    def _extract_context(self, content: str, pos: int) -> str:
        start = max(0, content.rfind("\n", 0, pos))
        end = content.find("\n", pos)
        if end == -1:
            end = len(content)
        line = content[start:end].strip()
        return line[:100] if len(line) > 100 else line
```

### Translation Import

```python
class TranslationImporter:
    def __init__(self, target_dir: str):
        self.target_dir = Path(target_dir)

    def import_ios_translations(self, language: str,
                                 translations: dict[str, str]):
        lproj_dir = self.target_dir / f"{language}.lproj"
        lproj_dir.mkdir(parents=True, exist_ok=True)

        strings_file = lproj_dir / "Localizable.strings"
        with open(strings_file, "w", encoding="utf-8") as f:
            for key, value in translations.items():
                key_escaped = key.replace('"', '\\"')
                value_escaped = value.replace('"', '\\"')
                f.write(f'"{key_escaped}" = "{value_escaped}";\n')

        xcstrings_file = lproj_dir / "Localizable.xcstrings"
        if not xcstrings_file.exists():
            xcstrings_data = {
                "sourceLanguage": "en",
                "strings": {}
            }
            for key, value in translations.items():
                xcstrings_data["strings"][key] = {
                    "localizations": {
                        language: {
                            "stringUnit": {
                                "state": "translated",
                                "value": value
                            }
                        }
                    }
                }
            xcstrings_file.write_text(
                json.dumps(xcstrings_data, indent=2, ensure_ascii=False),
                encoding="utf-8"
            )

    def import_android_translations(self, language: str,
                                     translations: dict[str, str]):
        values_dir = self.target_dir / f"values-{language}"
        values_dir.mkdir(parents=True, exist_ok=True)

        strings_file = values_dir / "strings.xml"
        with open(strings_file, "w", encoding="utf-8") as f:
            f.write('<?xml version="1.0" encoding="utf-8"?>\n')
            f.write('<resources>\n')
            for key, value in translations.items():
                value_escaped = (
                    value.replace("&", "&amp;")
                    .replace("<", "&lt;")
                    .replace(">", "&gt;")
                    .replace("'", "\\'")
                    .replace('"', '\\"')
                )
                f.write(f'    <string name="{key}">{value_escaped}</string>\n')
            f.write('</resources>\n')
```

## Translation Management System

### TMS Integration

```python
class TranslationManagementSystem:
    def __init__(self, api_key: str, project_id: str):
        self.api_key = api_key
        self.project_id = project_id
        self.base_url = "https://api.translation-service.com/v2"

    async def upload_source(self, batch: LocalizationBatch) -> str:
        payload = {
            "project_id": self.project_id,
            "source_language": batch.source_language,
            "target_languages": batch.target_languages,
            "files": []
        }
        for file_path in batch.files:
            content = file_path.read_text(encoding="utf-8")
            payload["files"].append({
                "filename": file_path.name,
                "content": content,
                "content_type": "text/xliff"
            })
        async with aiohttp.ClientSession() as session:
            async with session.post(
                f"{self.base_url}/uploads",
                headers={"Authorization": f"Bearer {self.api_key}"},
                json=payload
            ) as resp:
                data = await resp.json()
                return data.get("upload_id")

    async def check_status(self, upload_id: str) -> dict:
        async with aiohttp.ClientSession() as session:
            async with session.get(
                f"{self.base_url}/uploads/{upload_id}/status",
                headers={"Authorization": f"Bearer {self.api_key}"}
            ) as resp:
                data = await resp.json()
                return {
                    "progress": data.get("progress", 0),
                    "completed_languages": data.get("completed_languages", []),
                    "status": data.get("status", "unknown")
                }

    async def download_translations(self, upload_id: str,
                                     language: str) -> dict[str, str]:
        async with aiohttp.ClientSession() as session:
            async with session.get(
                f"{self.base_url}/uploads/{upload_id}/download/{language}",
                headers={"Authorization": f"Bearer {self.api_key}"}
            ) as resp:
                data = await resp.json()
                return {
                    item["key"]: item["translation"]
                    for item in data.get("translations", [])
                }
```

## Quality Assurance

### Translation Validation

```python
class TranslationValidator:
    def __init__(self):
        self.checks: list[QualityCheck] = []

    def add_check(self, check: QualityCheck):
        self.checks.append(check)

    def validate(self, source: dict[str, str],
                  translation: dict[str, str],
                  language: str) -> list[ValidationError]:
        errors = []
        for check in self.checks:
            try:
                result = check.execute(source, translation, language)
                errors.extend(result)
            except Exception as e:
                errors.append(ValidationError(
                    key="system",
                    message=f"Check {check.name} failed: {e}",
                    severity="error"
                ))
        return errors

class QualityCheck(ABC):
    def __init__(self, name: str):
        self.name = name

    @abstractmethod
    def execute(self, source: dict, translation: dict,
                language: str) -> list[ValidationError]:
        pass

class PlaceholderCheck(QualityCheck):
    def __init__(self):
        super().__init__("placeholder_match")

    def execute(self, source: dict, translation: dict,
                language: str) -> list[ValidationError]:
        errors = []
        placeholder_pattern = r'%[sd@]|%(\d+\$)?[sd@]|%@|{[\w.]+}'
        for key in source:
            source_placeholders = set(
                re.findall(placeholder_pattern, source[key])
            )
            trans_placeholders = set(
                re.findall(placeholder_pattern, translation.get(key, ""))
            )
            if source_placeholders != trans_placeholders:
                errors.append(ValidationError(
                    key=key,
                    message=f"Placeholder mismatch: "
                            f"source={source_placeholders}, "
                            f"trans={trans_placeholders}",
                    severity="error"
                ))
        return errors

class LengthCheck(QualityCheck):
    def __init__(self, max_ratio: float = 3.0):
        super().__init__("length_ratio")
        self.max_ratio = max_ratio

    def execute(self, source: dict, translation: dict,
                language: str) -> list[ValidationError]:
        errors = []
        for key in source:
            source_len = len(source[key])
            trans_len = len(translation.get(key, ""))
            if source_len > 0:
                ratio = trans_len / source_len
                if ratio > self.max_ratio:
                    errors.append(ValidationError(
                        key=key,
                        message=f"Translation is {ratio:.1f}x longer "
                                f"than source ({source_len} vs {trans_len} chars)",
                        severity="warning"
                    ))
        return errors

class HTMLEscapeCheck(QualityCheck):
    HTML_PATTERN = re.compile(r'<[^>]+>')

    def __init__(self):
        super().__init__("html_consistency")

    def execute(self, source: dict, translation: dict,
                language: str) -> list[ValidationError]:
        errors = []
        for key in source:
            source_tags = set(self.HTML_PATTERN.findall(source[key]))
            trans_tags = set(
                self.HTML_PATTERN.findall(translation.get(key, ""))
            )
            if source_tags != trans_tags:
                errors.append(ValidationError(
                    key=key,
                    message=f"HTML tag mismatch: "
                            f"source={source_tags}, trans={trans_tags}",
                    severity="error"
                ))
        return errors
```

## CI/CD Integration

```python
class LocalizationCIPipeline:
    def __init__(self, config: dict):
        self.config = config
        self.extractor = StringExtractor(
            config["source_dir"], config["output_dir"]
        )
        self.tms = TranslationManagementSystem(
            config["tms_api_key"], config["tms_project_id"]
        )

    async def run_pipeline(self) -> LocalizationBatch:
        batch = LocalizationBatch(
            id=str(uuid4()),
            target_languages=self.config["target_languages"]
        )
        try:
            await self._extract_strings(batch)
            await self._upload_for_translation(batch)
            await self._wait_for_translation(batch)
            await self._import_translations(batch)
            await self._validate(batch)
            batch.stage = LocalizationStage.COMPLETE
            return batch
        except Exception as e:
            batch.errors.append(str(e))
            return batch

    async def run_validation_only(self) -> list[ValidationError]:
        self.extractor.extract_ios_strings()
        self.extractor.extract_android_strings()
        source = {
            key: info["source"]
            for key, info in self.extractor.strings.items()
        }
        all_errors = []
        for lang in self.config["target_languages"]:
            translations = await self._load_existing(lang)
            validator = TranslationValidator()
            validator.add_check(PlaceholderCheck())
            validator.add_check(LengthCheck())
            validator.add_check(HTMLEscapeCheck())
            errors = validator.validate(source, translations, lang)
            all_errors.extend(errors)
        return all_errors
```

## Automation Script

```python
import argparse
import asyncio

async def main():
    parser = argparse.ArgumentParser(
        description="Localization workflow automation"
    )
    parser.add_argument(
        "--action", required=True,
        choices=["extract", "upload", "download",
                 "validate", "import", "full"]
    )
    parser.add_argument(
        "--platform", choices=["ios", "android", "both"],
        default="both"
    )
    parser.add_argument(
        "--languages", nargs="+",
        default=["fr", "de", "ja", "ar", "zh"]
    )
    args = parser.parse_args()

    config = {
        "source_dir": "./src",
        "output_dir": "./localization",
        "target_languages": args.languages,
        "tms_api_key": os.environ["TMS_API_KEY"],
        "tms_project_id": "project_123"
    }

    pipeline = LocalizationCIPipeline(config)

    if args.action == "extract":
        extractor = StringExtractor("./src", "./localization")
        extractor.extract_ios_strings()
        extractor.extract_android_strings()
        export_path = Path("./localization/source_strings.json")
        export_path.write_text(
            extractor.export_for_translation("json"),
            encoding="utf-8"
        )
        print(f"Extracted {len(extractor.strings)} strings to {export_path}")

    elif args.action == "validate":
        errors = await pipeline.run_validation_only()
        for e in errors:
            print(f"[{e.severity}] {e.key}: {e.message}")

    elif args.action == "full":
        batch = await pipeline.run_pipeline()
        if batch.errors:
            print(f"Pipeline completed with errors: {batch.errors}")
        else:
            print(f"Pipeline completed: {batch.string_count} strings "
                  f"translated across {len(batch.target_languages)} languages")

if __name__ == "__main__":
    asyncio.run(main())
```

## Key Points

- The localization pipeline extracts source strings, uploads for translation, imports results, validates, and builds.
- String extraction parses source code for localized strings, supporting both iOS (.swift) and Android (.xml) formats.
- Export formats include XLIFF (standard), JSON (simple), and CSV (spreadsheet-friendly).
- Translation Management System integration automates upload, status tracking, and download of translations.
- Quality checks validate placeholder consistency, length ratios, and HTML tag preservation across translations.
- CI/CD integration runs localization pipelines automatically before releases.
- Validation-only mode checks existing translations without re-uploading to the TMS.
- Automation scripts support targeted actions (extract, upload, download, validate, import, full) for flexible workflows.
