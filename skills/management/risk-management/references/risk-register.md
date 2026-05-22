# Risk Register Template

## Risk Register
| ID | Category | Description | P | I | Score | Priority | Response | Owner | Status |
|---|---|---|---|---|---|---|---|---|---|
| R-001 | technical-debt | Monolith needs splitting — slows feature velocity | 4 | 4 | 16 | High | Mitigate | Alice | Active |
| R-002 | third-party | Payment API deprecation in Q3 | 3 | 5 | 15 | High | Transfer | Bob | Monitoring |
| R-003 | team-capacity | Senior dev on leave during critical milestone | 2 | 4 | 8 | Medium | Accept | Carol | Active |
| R-004 | security | Unpatched dependency CVE-2024-xxx | 1 | 5 | 5 | Low | Accept | Dave | Archived |

## Probability-Impact Matrix
| | I=1 | I=2 | I=3 | I=4 | I=5 |
|---|---|---|---|---|---|
| **P=5** | 5 | 10 | 15 | 20 | 25 |
| **P=4** | 4 | 8 | 12 | 16 | 20 |
| **P=3** | 3 | 6 | 9 | 12 | 15 |
| **P=2** | 2 | 4 | 6 | 8 | 10 |
| **P=1** | 1 | 2 | 3 | 4 | 5 |

- **High (15-25)**: Immediate action required. Escalate.
- **Medium (6-14)**: Assign owner, monitor weekly.
- **Low (1-5)**: Accept, log, review quarterly.

## Response Strategies
- **Avoid**: Eliminate the risk. Change plan or scope.
- **Mitigate**: Reduce probability or impact. Most common.
- **Transfer**: Shift to third party (insurance, outsourced, vendor).
- **Accept**: Document, monitor, no active mitigation.
- **Contingency**: Pre-defined Plan B triggered if risk materializes.

## Review Cadence
- Full risk review: every sprint retro
- New risk entry: on discovery, immediate
- Closed risk: archive with closure note and date
- Risk owner check-in: bi-weekly
