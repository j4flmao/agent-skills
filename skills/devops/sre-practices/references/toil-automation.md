# Toil Reduction Guide

## What Counts as Toil
- Manual restart of failed services
- Repetitive incident response without automation
- Manual user access provisioning
- Environment setup for new developers
- Manual deployment steps
- Pager noise from non-actionable alerts
- Manual report generation

## Toil Assessment Template
| Activity | Frequency | Time per Occasion | Total Hours/Week | Automatable? |
|----------|-----------|-------------------|------------------|--------------|
| Restart service | 5x/week | 15 min | 1.25 | ✅ Yes |
| User onboarding | 2x/week | 60 min | 2.0 | ✅ Yes |
| Certificate renewal | 1x/month | 30 min | 0.12 | ✅ Yes |
| Manual DB backup | 1x/week | 20 min | 0.33 | ✅ Yes |

## Automation Priority Matrix
| High frequency + High time | High frequency + Low time |
|---------------------------|--------------------------|
| Automate first | Automate if easy |
| **Low frequency + High time** | **Low frequency + Low time** |
| Automate if recurring | Document, automate if trivial |

## Toil Reduction Targets
- Year 1: Reduce toil by 30%
- Year 2: Reduce toil by 50%
- Year 3: Toil < 25% of engineering time
