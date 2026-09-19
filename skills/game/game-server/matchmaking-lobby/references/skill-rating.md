---
title: Skill Rating Systems
description: Elo, Glicko-2, TrueSkill mechanics, uncertainty (phi), team updates, smurf detection and rating drift.
---

# Skill Rating — Deep Reference

## 1. Choose Your Model

| System | Math | Use for |
|--------|------|---------|
| Elo | points ±K(1-(expected)) | simple 1v1, retrograde |
| Glicko-2 | (mu,phi,sigma) Gaussian | modern standard (uncertainty-aware) |
| TrueSkill | Gaussian per player + draw | team games |

Glicko-2 is the pragmatic pick for most shooters/lobbies; TrueSkill if you need 1v1-with-party semantics. Elo for a small internal ladder.

## 2. Glicko-2 Basics

- `mu` — rating (1.0-scale; commonly displayed ×1500).
- `phi` — rating deviation (uncertainty). New player: phi huge (~350). Improved prediction (afaik: RD shrinks on consistent results, grows on inactivity).
- `sigma` — volatility (how variable recent results are).

Update per match (batch of results since last update):

```
g ≈ 1/sqrt(1 + 3*q²*phi²/π²)
expected(mu_j) = 1/(1 + exp(-g*(mu_i - mu_j)))
delta = g * (outcome - expected)
phi′ = 1/sqrt(1/phi² + 1/d²)
mu′ = mu + q/(1/phi² + 1/d²) * delta
sigma′ = volatility equation (Ito process approx.)
```

Practical: implement Glicko-2 from the paper (not from memory) — the constants are fiddly; keep a unit-test of the paper's worked example.

## 3. Uncertainty (phi) & the Search Driver

- Search window = f(phi): high phi → wider radius, faster queue for newbies.
- **Convergence**: phi shrinks per match — a smurf's first 10 matches pop their rating fast (visible spike) — that's the detector, not a rule of thumb.
- Inactivity grows phi: a player gone 6 months should re-search wider.

## 4. Team Match Rating Updates

Two honest options:
- **Aggregate team**: update both teams' reps by `teamAvg`; carries "skill is the team".
- **Per-player with team correction**: each player moves toward the team outcome, scaled by their individual result deviation.

Common mistakes: treating a 5v5 as 5×(1v1) — that triple-counts the same result. Use a single team-level update (option A) or a per-player share of the same team delta (option B with a fixed Σk).

## 5. Draw Handling

- TrueSkill/Glicko handles outcomes {win, loss, draw}.
- Strategy games → draws valuable (`drawProbability` param in TrueSkill).

## 6. The Smurf Problem (Behavioral, Not Just Math)

- A smurf = high skill under fresh low-phi account.
- Detectors: (a) rating spike velocity (many wins, sigma climbing), (b) correlation (same device/IP/region as an established account), (c) latency/behaviour patterns.
- Response: flag → wider search (help the system converge), never a shadowban on honest signals. Banning cheap disincentives = wrong; the whole point of uncertainty is to absorb them.

## 7. Rating Servers & Storage

- Rating updates are *async, batched* after matches (event-driven — see event-queue).
- Store `{playerId, mu, phi, sigma, lastUpdate, matchesPlayed}` (a small KV); update per match-batch.
- Determinism: updates must not depend on ordering flukes — apply in stable match order; use `lastUpdate` monotonic so out-of-order events don't rewind.

## 8. Calibration & Placement

- New accounts start `phi_high`; placement matches (usually 5) resolve placement bursts — do NOT feed them into the main queue pool (search widens naturally, but protect the pool from placement noise).

## 9. Pitfalls

| Pitfall | Fix |
|---------|-----|
| Out-of-order match results | monotonic fix |
| Treat 5v5 as 5 results | single team delta |
| phi→0 forever | grow on inactivity |
| Elo K fixed for smurfs | k-dependent on confidence |
| Update before match-tool dedup | idempotent update |

## 10. Checklist

- [ ] Model chosen (Glicko-2 recommended); paper-test unit test.
- [ ] Uncertainty drives search width.
- [ ] phi grows on inactivity.
- [ ] Team update = one result.
- [ ] Smurf detection by velocity + correlation (flag, not ban).
- [ ] Async, idempotent, monotonic rating updates.