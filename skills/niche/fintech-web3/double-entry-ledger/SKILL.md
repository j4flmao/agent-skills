---
name: double-entry-ledger
description: >
  Use this skill when the user says 'double-entry ledger', 'debit credit', 'accounting equation', 'core banking ledger', 'immutable ledger', 'event-sourced ledger'. Explains balanced double-entry accounting and immutable/event-sourced ledger design for FinTech systems. Do NOT use for: generic event sourcing (use backend/universal/event-sourcing) or payment gateway integration (use ecommerce/payment-processing).
version: "1.0.0"
author: "j4flmao"
license: "MIT"
tags: [niche, fintech, ledger, accounting, event-sourcing]
---

# Double-Entry Ledger Architecture

## Purpose
Explain double-entry ledger design where every transaction posts balanced debits and credits (Assets = Liabilities + Equity), and why FinTech ledgers are append-only/event-sourced for auditability and reconstructable balances.

## Agent Protocol

### Trigger
User phrases: "double-entry ledger", "debit/credit balancing", "accounting equation", "immutable ledger", "event-sourced balances".

### Input Context
- Account types and currencies.
- Consistency/audit requirements.

### Output Artifact
Ledger schema and posting rules with invariants.

### Response Format
```
Entry: {debit acct / credit acct}
Invariant: {sum(debits)=sum(credits)}
Storage: {append-only / event-sourced}
```


## Core Mechanics

At the heart of any core banking or FinTech system lies the Double-Entry Ledger. It ensures absolute mathematical consistency: every transaction requires at least two ledger entries (a Debit and a Credit) that must perfectly balance.

### 1. The Accounting Equation
`Assets = Liabilities + Equity`
- **Debit (DR):** Increases an Asset or Expense account. Decreases Liability or Equity.
- **Credit (CR):** Increases a Liability or Equity account. Decreases an Asset.
- **Rule of Zero:** Sum of all Debits - Sum of all Credits MUST equal 0 for every transaction.

### 2. Immutability & Event Sourcing
Ledger entries are Append-Only. You can NEVER update or delete a ledger row. If a mistake is made, a compensating transaction (reversal) must be appended. This guarantees an unforgeable audit trail.

### Double-Entry Flow Map

```mermaid
%%{init: {"theme": "default", "flowchart": {"useMaxWidth": true}}}%%
flowchart TD
    subgraph Transaction ["Transfer $100 from Alice to Bob"]
        A["Validate Sufficient Balance"]
    end
    
    subgraph Ledger ["Immutable Ledger DB"]
        B["Entry 1: DR Alice_Liability $100"]
        C["Entry 2: CR Bob_Liability $100"]
    end
    
    subgraph Validation ["Consistency Check"]
        D{"Sum(DR) == Sum(CR)?"}
    end
    
    A -->|"Begin Tx"| B
    B --> C
    C --> D
    D -->|"Yes (0)"| E["Commit Transaction"]
    D -->|"No (!=0)"| F["Rollback Transaction"]
```
