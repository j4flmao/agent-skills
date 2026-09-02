# Feature Toggles (Dark Launching)

## 1. Decoupling Deployment from Release
The root cause of "Integration Hell" is the false assumption that *Deploying* code means *Releasing* code. 
- **Deployment**: Pushing code to a production server. (Technical risk).
- **Release**: Exposing that code to end-users. (Business risk).

By using **Feature Toggles** (or Feature Flags), your Department can continuously merge unfinished PoC code directly into the Global `main` branch multiple times a day. The code is deployed to production, but hidden behind a toggle (Dark Launching).

## 2. Categories of Toggles
Not all flags are the same. Understanding their lifespan is critical to avoiding massive technical debt.
1. **Release Toggles (Short-lived)**: Used by R&D to hide incomplete features. Lifespan: Days to Weeks. Must be removed immediately after full rollout.
2. **Experiment Toggles (Medium-lived)**: Used for A/B testing (e.g., routing 10% of traffic to the new Department PoC). Lifespan: Weeks to Months.
3. **Ops Toggles (Long-lived)**: "Kill Switches" for heavy features. If the Global database spikes in CPU, an Ops Toggle gracefully disables a heavy analytics feature without requiring a rollback or redeploy.
4. **Permission Toggles (Long-lived)**: Premium/Enterprise user access gating.

## 3. Implementation Patterns
### Anti-Pattern: `if/else` Spagehtti
Sprinkling `if (feature_flag.isActive("new_poc"))` throughout your core business logic makes testing impossible and code unreadable.

### Best Practice: The Strategy Router
Use Dependency Injection and the Strategy Pattern to route traffic at the boundaries (e.g., API Controllers), keeping the core domain pure.

```typescript
// 1. The common abstraction
interface PricingEngine {
    calculateTotal(cart: Cart): Money;
}

// 2. The Global Legacy implementation
class LegacyPricingEngine implements PricingEngine { ... }

// 3. The Department's PoC implementation
class ExperimentalPricingEngine implements PricingEngine { ... }

// 4. The Router (Injected at the entry point)
class PricingRouter implements PricingEngine {
    constructor(
        private legacy: LegacyPricingEngine,
        private experimental: ExperimentalPricingEngine,
        private flagService: FeatureFlagService
    ) {}

    calculateTotal(cart: Cart): Money {
        // Feature flag lookup at the very edge of the architecture
        if (this.flagService.isEnabled("use_new_pricing_poc", cart.userId)) {
            return this.experimental.calculateTotal(cart);
        }
        return this.legacy.calculateTotal(cart);
    }
}
```

## 4. Managing Toggle Debt
Every Feature Toggle doubles the testing matrix (On state vs Off state).
- **Enforce Expiration Dates**: CI/CD pipelines should fail if a "Release Toggle" exists in the codebase for more than 30 days.
- **Routing over Flags**: Always prefer configuration-driven routing over hardcoded conditional blocks.
