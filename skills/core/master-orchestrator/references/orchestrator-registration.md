# Orchestrator Registration

## Skill Registration Protocol

Orchestrator registration enables dynamic discovery and routing of capabilities across the skill ecosystem.

### Registration Schema

```typescript
interface SkillRegistration {
  name: string;
  version: string;
  description: string;
  triggers: string[];
  phase: number;
  tags: string[];
  capabilities: Capability[];
  dependencies: Dependency[];
  handoffTargets: string[];
}

interface Capability {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  outputSchema: Record<string, unknown>;
}

interface Dependency {
  skill: string;
  required: boolean;
  version: string;
}
```

### Registration Lifecycle

```typescript
class SkillRegistry {
  private skills: Map<string, SkillRegistration> = new Map();
  private routingTable: RoutingEntry[] = [];

  register(skill: SkillRegistration): void {
    this.validateRegistration(skill);
    this.skills.set(skill.name, skill);
    this.rebuildRoutingTable();
    this.notifyDependents(skill.name);
  }

  deregister(skillName: string): void {
    this.skills.delete(skillName);
    this.rebuildRoutingTable();
    this.notifyDependents(skillName);
  }

  private validateRegistration(skill: SkillRegistration): void {
    if (!skill.name || !skill.triggers?.length) {
      throw new Error('Skill must have name and at least one trigger');
    }

    const existing = this.skills.get(skill.name);
    if (existing && existing.version !== skill.version) {
      console.warn(`Updating skill ${skill.name} from v${existing.version} to v${skill.version}`);
    }
  }

  private rebuildRoutingTable(): void {
    this.routingTable = [];
    for (const [name, skill] of this.skills) {
      for (const trigger of skill.triggers) {
        this.routingTable.push({
          trigger: trigger.toLowerCase(),
          skillName: name,
          phase: skill.phase,
          priority: this.calculatePriority(skill, trigger),
        });
      }
    }
    this.routingTable.sort((a, b) => b.priority - a.priority);
  }

  private calculatePriority(skill: SkillRegistration, trigger: string): number {
    let priority = skill.phase * 10;
    if (trigger.includes(' ')) priority += 5; // multi-word triggers are more specific
    if (skill.handoffTargets.length > 0) priority += 3;
    return priority;
  }
}
```

## Dependency Injection

### Resolving Skill Dependencies

```typescript
class DependencyResolver {
  constructor(private registry: SkillRegistry) {}

  resolveChain(skillName: string): SkillRegistration[] {
    const visited = new Set<string>();
    const chain: SkillRegistration[] = [];

    const visit = (name: string): void => {
      if (visited.has(name)) return;
      visited.add(name);

      const skill = this.registry.get(name);
      if (!skill) throw new Error(`Unknown dependency: ${name}`);

      // Resolve required dependencies first
      for (const dep of skill.dependencies) {
        if (dep.required) {
          visit(dep.skill);
        }
      }

      chain.push(skill);
    };

    visit(skillName);
    return chain;
  }

  validateDependencies(skillName: string): DependencyIssue[] {
    const issues: DependencyIssue[] = [];
    const skill = this.registry.get(skillName);
    if (!skill) return [{ skill: skillName, issue: 'not_found' }];

    for (const dep of skill.dependencies) {
      const resolved = this.registry.get(dep.skill);
      if (!resolved) {
        issues.push({ skill: dep.skill, issue: 'missing' });
      } else if (resolved.version !== dep.version) {
        issues.push({
          skill: dep.skill,
          issue: 'version_mismatch',
          expected: dep.version,
          actual: resolved.version,
        });
      }
    }

    return issues;
  }
}
```

## Routing Table Construction

### Dynamic Route Selection

```typescript
interface RouteResult {
  skillName: string;
  confidence: number;
  phase: number;
  requiresHandoff: boolean;
}

class RoutingEngine {
  private routes: Map<string, RouteDefinition> = new Map();

  addRoute(trigger: string, definition: RouteDefinition): void {
    this.routes.set(trigger.toLowerCase(), definition);
  }

  resolve(input: string): RouteResult[] {
    const normalized = input.toLowerCase();
    const candidates: RouteResult[] = [];

    for (const [trigger, def] of this.routes) {
      if (normalized.includes(trigger)) {
        candidates.push({
          skillName: def.skillName,
          confidence: trigger.length / normalized.length,
          phase: def.phase,
          requiresHandoff: def.requiresHandoff,
        });
      }
    }

    candidates.sort((a, b) => b.confidence - a.confidence);
    return candidates;
  }

  buildRouteTable(skills: SkillRegistration[]): void {
    for (const skill of skills) {
      for (const trigger of skill.triggers) {
        this.addRoute(trigger, {
          skillName: skill.name,
          phase: skill.phase,
          requiresHandoff: skill.handoffTargets.length > 0,
        });
      }
    }
  }
}
```

## Hot-Reload Support

### Watch-Based Registration Updates

```typescript
import { watch } from 'fs';
import { readFile } from 'fs/promises';

class HotReloadManager {
  private registry: SkillRegistry;
  private watchers: Set<() => void> = new Set();

  constructor(registry: SkillRegistry) {
    this.registry = registry;
  }

  watchSkillDirectory(skillPaths: string[]): void {
    for (const path of skillPaths) {
      const watcher = watch(path, async (event, filename) => {
        if (filename?.endsWith('SKILL.md')) {
          try {
            const content = await readFile(`${path}/${filename}`, 'utf-8');
            const registration = this.parseSkillFile(content);
            this.registry.register(registration);
            this.notifyChange(registration.name);
          } catch (error) {
            console.error(`Failed to reload skill at ${path}:`, error);
          }
        }
      });

      this.watchers.add(() => watcher.close());
    }
  }

  private parseSkillFile(content: string): SkillRegistration {
    // Parse YAML front matter and extract registration data
    const [, frontMatter] = content.split('---\n', 2);
    const yaml = this.parseYAML(frontMatter);
    return {
      name: yaml.name,
      version: yaml.version || '1.0.0',
      description: yaml.description,
      triggers: yaml.triggers || [],
      phase: yaml.phase || 0,
      tags: yaml.tags || [],
      capabilities: [],
      dependencies: [],
      handoffTargets: [],
    };
  }

  private notifyChange(skillName: string): void {
    console.log(`Skill ${skillName} hot-reloaded`);
  }
}
```

## Grace Period and Staleness

### Registration Expiry

```typescript
interface RegistrationEntry {
  skill: SkillRegistration;
  registeredAt: number;
  lastHeartbeat: number;
  stale: boolean;
}

class RegistrationManager {
  private entries: Map<string, RegistrationEntry> = new Map();
  private readonly HEARTBEAT_TTL = 5 * 60 * 1000; // 5 minutes
  private readonly GRACE_PERIOD = 30_000; // 30 seconds

  register(skill: SkillRegistration): void {
    this.entries.set(skill.name, {
      skill,
      registeredAt: Date.now(),
      lastHeartbeat: Date.now(),
      stale: false,
    });
  }

  heartbeat(skillName: string): void {
    const entry = this.entries.get(skillName);
    if (entry) {
      entry.lastHeartbeat = Date.now();
      entry.stale = false;
    }
  }

  checkStaleness(): string[] {
    const stale: string[] = [];
    const now = Date.now();

    for (const [name, entry] of this.entries) {
      if (entry.stale) continue;
      if (now - entry.lastHeartbeat > this.HEARTBEAT_TTL) {
        if (now - entry.lastHeartbeat > this.HEARTBEAT_TTL + this.GRACE_PERIOD) {
          entry.stale = true;
          stale.push(name);
        }
      }
    }

    return stale;
  }
}
```

## Key Points

- Skills register with triggers, phase, dependencies, and capabilities
- Routing table is rebuilt on every registration change
- Dependency resolution builds a topological order of skill chains
- Hot-reload watches SKILL.md files for live updates
- Heartbeat mechanism detects stale registrations with grace period
- Priority calculation prefers specific triggers over generic ones
- Version mismatches in dependencies generate warnings, not errors
- Dynamic route selection returns confidence-scored candidates
