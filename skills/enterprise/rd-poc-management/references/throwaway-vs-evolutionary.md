# Prototyping Strategies: Throwaway vs. Evolutionary

## 1. The Prototyping Dilemma
When a Department begins an R&D PoC, they must make an explicit, documented choice on Day 1: Is this a **Throwaway** prototype or an **Evolutionary** prototype? 

Failing to make this distinction leads to the most common enterprise disaster: Business stakeholders see a working PoC, demand it goes live immediately, and the R&D team is forced to maintain completely unscalable, untested "spaghetti code" in production for years.

## 2. Throwaway Prototyping (Disposable Architecture)
- **Goal**: Maximize learning speed, validate a business hypothesis, and minimize engineering time.
- **The Execution**:
  - Write everything in a single massive file if it's faster.
  - Skip unit tests entirely.
  - Hardcode configuration variables.
  - Ignore CI/CD pipelines.
- **The Golden Rule**: The R&D team must legally (or organizationally) commit to **deleting 100% of the code** when the PoC ends. The value of a Throwaway PoC is the *knowledge gained*, not the code written. Once the hypothesis is validated, the production application is built properly from scratch.

## 3. Evolutionary Prototyping (Tracer Bullets)
- **Goal**: Validate a high-risk technical architecture and slowly evolve it into the final product.
- **The Execution**:
  - "Tracer Bullets": Build a tiny, complete slice of the application from the UI down to the Database. It doesn't do much, but the core architecture is rock solid.
  - Enforce code quality, unit testing, and CI/CD from Day 1.
  - Use Interfaces (Dependency Inversion) so fake data can be easily swapped for real databases later.
- **The Golden Rule**: Because this code *will* become production code, do not compromise on the foundation. It takes longer to build initially than a throwaway prototype, but there is no rewrite phase.

## 4. How to Choose
| Scenario | Recommended Strategy |
|----------|----------------------|
| Exploring a brand new market idea to see if users click a button. | **Throwaway**. (Speed is everything). |
| Evaluating if a new Graph Database performs better than PostgreSQL. | **Throwaway**. (You just need benchmark data). |
| Building a new core microservice that the Global team will eventually maintain. | **Evolutionary**. (The foundation must align with Global standards). |
