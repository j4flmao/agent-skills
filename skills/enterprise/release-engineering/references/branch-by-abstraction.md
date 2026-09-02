# Branch by Abstraction

## 1. The Massive Rewrite Problem
Imagine the Global architecture team mandates switching the core ORM from Hibernate to JOOQ, or the Payment Gateway from Stripe to Adyen. 
The traditional approach is to create a branch: `feature/new-payment-gateway`. 
Because replacing a core component takes months, this branch diverges drastically from `main`. When the time comes to merge, the conflicts are so severe that the team gives up, or the merge introduces catastrophic regressions.

## 2. Branch by Abstraction (BBA)
**Branch by Abstraction** allows you to execute massive architectural rewrites directly on the `main` branch, incrementally, without ever breaking the build. You branch the *architecture*, not the *VCS (Version Control System)*.

## 3. The 5 Steps of BBA

### Step 1: Create an Abstraction
Identify the component to be replaced (e.g., `StripeClient`). Create a clean Interface/Facade that abstracts its behavior (`PaymentGateway`).
- *Commit to Main.* (Zero risk, no behavior change).

### Step 2: Refactor Clients
Find all classes that directly call `StripeClient`. Refactor them to depend on the new `PaymentGateway` interface instead. The implementation injected is still `StripeClient`.
- *Commit to Main.* (Zero risk, easily reviewable).

### Step 3: Build the New Implementation
The Department team starts building the PoC: `AdyenClient`, which implements `PaymentGateway`. Because it's hidden behind the interface and not actively injected, you can merge this incomplete code to `main` every day.
- *Commit to Main incrementally.* (Zero risk, continuous integration without conflicts).

### Step 4: Toggle and Migrate
Introduce a **Feature Toggle** in the Dependency Injection container.
```java
@Bean
public PaymentGateway paymentGateway(FeatureFlagService flags) {
    if (flags.isEnabled("use_adyen_poc")) {
        return new AdyenClient(); // Route 5% of traffic here
    }
    return new StripeClient();
}
```
Gradually roll out the new implementation. If it fails, flip the toggle back. No rollback deployment required.

### Step 5: Cleanup
Once the new PoC operates flawlessly at 100% traffic, delete the toggle, delete `StripeClient`, and (optionally) remove the `PaymentGateway` abstraction if it's no longer necessary.
- *Commit to Main.*

## 4. Why BBA beats Long-Lived Branches
- **No Merge Conflicts**: The team continuously merges tiny, harmless commits.
- **Immediate Feedback**: The new code runs in production alongside the old code.
- **Mental Sanity**: The Department team doesn't have to constantly pull and rebase against a rapidly moving Global `main`.
