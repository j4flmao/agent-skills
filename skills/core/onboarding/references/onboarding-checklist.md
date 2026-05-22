# Onboarding Checklist

## Day 1 — Environment
- [ ] Clone repository
- [ ] Install runtime via version manager (asdf / nvm / pyenv)
- [ ] Run `bin/setup` or equivalent
- [ ] Copy `.env.example` → `.env` and fill secrets from vault
- [ ] Start dev server (`npm run dev`, `make run`, etc.)
- [ ] Verify health endpoint returns 200
- [ ] Run test suite — all green

## Day 2 — Architecture
- [ ] Read project README and ARCHITECTURE.md
- [ ] Tour key directories with tech lead
- [ ] Review request flow diagram (client → gateway → service → DB)
- [ ] Understand deployment pipeline (commit → CI → staging → prod)
- [ ] Review CI/CD config files (.github/workflows, Jenkinsfile, etc.)

## Day 3-4 — Workflow
- [ ] Create feature branch from main
- [ ] Make a small change (fix a typo, add a comment)
- [ ] Push and open draft PR
- [ ] Pair with buddy on PR review cycle
- [ ] Merge first PR to main

## Week 1 End
- [ ] First PR merged
- [ ] Can run full test suite independently
- [ ] Knows standup schedule and format
- [ ] Has met the team (intro calls scheduled)
- [ ] On-call rotation understood

## Team Contacts
- **Onboarding buddy**: [name]
- **Engineering manager**: [name]
- **Tech lead**: [name]
- **DevOps/Plaform contact**: [name]
- **Product manager**: [name]
