---
name: prompt-library-organization
description: >
  Architectural patterns and best practices for structuring,
  managing, and scaling a repository of few-shot prompts 
  within an enterprise codebase.
version: "2.0.0"
author: "j4flmao"
license: "MIT"
type: skill
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [few-shot, organization, architecture, repository]
---

# Prompt Library Organization

## 1. The Chaos of Hardcoded Prompts

As an LLM application scales, scattering prompt strings throughout the application code (e.g., inside controller functions or React components) becomes an unmaintainable anti-pattern. It leads to:
- **Duplication**: The same system instruction is defined in 5 different files.
- **Testing Impossibility**: Prompts cannot be extracted for offline evaluation.
- **Deployment Friction**: Changing a single typo in a prompt requires redeploying the entire microservice.

Prompts must be centralized, modularized, and managed as independent assets.

## 2. The Prompt Repository Structure

A dedicated `prompts/` directory should be established at the root of the project.

### 2.1 Ideal Directory Layout

```text
src/
prompts/
├── components/                 # Reusable prompt fragments
│   ├── standard_persona.md
│   ├── format_json_rules.md
│   └── no_hallucination_clause.md
├── domains/                    # Domain-specific prompt assemblies
│   ├── customer_support/
│   │   ├── classify_ticket_v1.yaml
│   │   ├── classify_ticket_v2_experimental.yaml
│   │   └── routing_examples.json
│   └── data_extraction/
│       ├── extract_entities.yaml
│       └── entity_examples.json
├── schemas/                    # Pydantic/Zod schemas for validation
│   ├── support_schemas.ts
│   └── extraction_schemas.ts
└── index.ts                    # Entry point for loading prompts
```

## 3. Modular Prompt Architecture

Instead of writing monolithic prompts, compose them from smaller, reusable components.

### 3.1 Components (Fragments)
A component is a static piece of text that serves a specific purpose, such as establishing a persona or defining formatting rules.

**`components/format_json_rules.md`**:
```text
You must output valid JSON. 
Do not wrap the JSON in markdown formatting (e.g., no ```json).
If a field is missing, use null.
```

### 3.2 Assemblies (Templates)
An assembly combines components, few-shot examples, and placeholders for user input. Using a templating engine (like Handlebars or Jinja2) is highly recommended.

**`domains/data_extraction/extract_entities.yaml`**:
```yaml
name: extract_entities
version: 1.0.0
components:
  - components/standard_persona.md
  - components/format_json_rules.md
system_instruction: |
  Extract the named entities from the user's text.
examples_path: domains/data_extraction/entity_examples.json
user_template: |
  Text to process: {{user_text}}
```

## 4. Implementation: Prompt Loader (TypeScript)

This TypeScript implementation demonstrates a robust prompt loader that reads YAML files, resolves components, and injects variables.

```typescript
import * as fs from 'fs';
import * as path from 'path';
import * as Handlebars from 'handlebars';
import * as yaml from 'js-yaml';

export interface PromptTemplate {
  name: string;
  version: string;
  systemPrompt: string;
  userPromptTemplate: HandlebarsTemplateDelegate;
  examples: any[];
}

export class PromptRegistry {
  private templates: Map<string, PromptTemplate> = new Map();
  private baseDir: string;

  constructor(baseDir: string) {
    this.baseDir = baseDir;
  }

  /**
   * Reads a component file from disk.
   */
  private loadComponent(componentPath: string): string {
    const fullPath = path.join(this.baseDir, componentPath);
    return fs.readFileSync(fullPath, 'utf8');
  }

  /**
   * Loads a YAML prompt assembly and resolves all dependencies.
   */
  public loadAssembly(assemblyPath: string): void {
    const fullPath = path.join(this.baseDir, assemblyPath);
    const fileContents = fs.readFileSync(fullPath, 'utf8');
    const doc = yaml.load(fileContents) as any;

    // 1. Resolve Components
    let systemPrompt = '';
    if (doc.components) {
      for (const compPath of doc.components) {
        systemPrompt += this.loadComponent(compPath) + '\n\n';
      }
    }
    systemPrompt += doc.system_instruction || '';

    // 2. Load Examples
    let examples = [];
    if (doc.examples_path) {
       const examplesFile = fs.readFileSync(path.join(this.baseDir, doc.examples_path), 'utf8');
       examples = JSON.parse(examplesFile);
    }

    // 3. Compile User Template
    const compiledTemplate = Handlebars.compile(doc.user_template);

    this.templates.set(doc.name, {
      name: doc.name,
      version: doc.version,
      systemPrompt: systemPrompt.trim(),
      userPromptTemplate: compiledTemplate,
      examples: examples
    });
  }

  /**
   * Retrieves a fully formatted prompt ready for the LLM.
   */
  public buildPrompt(name: string, variables: Record<string, any>) {
    const template = this.templates.get(name);
    if (!template) throw new Error(`Prompt ${name} not found in registry.`);

    return {
      system: template.systemPrompt,
      examples: template.examples, // Pass to ContextManager
      user: template.userPromptTemplate(variables)
    };
  }
}

// Usage:
// const registry = new PromptRegistry('./prompts');
// registry.loadAssembly('domains/data_extraction/extract_entities.yaml');
// const finalPrompt = registry.buildPrompt('extract_entities', { user_text: "Apple released the iPhone today." });
```

## 5. Separating Code from Data

The implementation above enforces a strict boundary. The `PromptRegistry` is pure TypeScript code. The actual prompt definitions and few-shot examples are pure data (YAML/JSON/MD). 

This separation unlocks several enterprise capabilities:
1. **Non-Engineer Contributions**: Domain experts (lawyers, customer service leads) can update few-shot examples in JSON without needing to read or write TypeScript.
2. **Dynamic Updates**: If configured to load from an S3 bucket instead of the local filesystem, prompts can be updated instantly across all running instances without a code deployment.

## 6. Managing Dynamic Few-Shot Pools

If your architecture uses dynamic example selection (as detailed in `example-selection-architectures.md`), the `examples_path` in the YAML file shouldn't point to a static JSON file. Instead, it should point to a configuration block defining the database connection and the selection parameters (e.g., `k=5`, `algorithm=hybrid`).

## 7. Conclusion

A disorganized prompt library will cripple the velocity of an AI development team. By adopting a component-based architecture, utilizing templating engines, and strictly separating application logic from prompt data, teams can maintain thousands of complex few-shot prompts with ease and confidence.
