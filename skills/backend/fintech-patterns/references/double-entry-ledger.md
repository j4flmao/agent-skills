# Double-Entry Ledger

## Overview
Double-entry ledger is the foundational accounting pattern in fintech systems. Every financial transaction debits one or more accounts and credits one or more accounts by the same total amount, ensuring the accounting equation (Assets = Liabilities + Equity) always balances.

## Core Concepts

### Ledger Entry
Every transaction produces at least two entries: a debit on one account and a credit on another. The sum of debits must always equal the sum of credits.

```python
from dataclasses import dataclass, field
from decimal import Decimal
from datetime import datetime
from uuid import uuid4

@dataclass
class LedgerEntry:
    id: str = field(default_factory=lambda: str(uuid4()))
    transaction_id: str = ""
    account_id: str = ""
    entry_type: str = ""  # "debit" or "credit"
    amount: Decimal = Decimal("0.00")
    currency: str = "USD"
    balance_before: Decimal | None = None
    balance_after: Decimal | None = None
    description: str = ""
    created_at: datetime = field(default_factory=datetime.utcnow)
    metadata: dict = field(default_factory=dict)

@dataclass
class Transaction:
    id: str = field(default_factory=lambda: str(uuid4()))
    reference: str = ""
    transaction_type: str = ""
    entries: list[LedgerEntry] = field(default_factory=list)
    status: str = "pending"
    created_at: datetime = field(default_factory=datetime.utcnow)
    completed_at: datetime | None = None
```

## Ledger Engine

### Transaction Posting

```python
class LedgerEngine:
    def __init__(self, db_session, account_service):
        self.db = db_session
        self.accounts = account_service

    async def post_transaction(self, tx: Transaction) -> Transaction:
        async with self.db.transaction():
            await self._validate_balance(tx)
            for entry in tx.entries:
                account = await self.accounts.get_account(
                    entry.account_id
                )
                entry.balance_before = account.balance
                if entry.entry_type == "debit":
                    account.balance -= entry.amount
                else:
                    account.balance += entry.amount
                entry.balance_after = account.balance
                await self.accounts.update_balance(account)
                await self._save_entry(entry)
            tx.status = "completed"
            tx.completed_at = datetime.utcnow()
            await self._save_transaction(tx)
        return tx

    async def _validate_balance(self, tx: Transaction):
        total_debits = sum(
            e.amount for e in tx.entries
            if e.entry_type == "debit"
        )
        total_credits = sum(
            e.amount for e in tx.entries
            if e.entry_type == "credit"
        )
        if total_debits != total_credits:
            raise UnbalancedTransactionError(
                f"Debits ({total_debits}) != Credits ({total_credits})"
            )

    async def _save_entry(self, entry: LedgerEntry):
        query = """
            INSERT INTO ledger_entries
                (id, transaction_id, account_id, entry_type,
                 amount, currency, balance_before, balance_after,
                 description, created_at, metadata)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        """
        await self.db.execute(query,
            entry.id, entry.transaction_id, entry.account_id,
            entry.entry_type, entry.amount, entry.currency,
            entry.balance_before, entry.balance_after,
            entry.description, entry.created_at,
            json.dumps(entry.metadata)
        )
```

### Account Management

```python
@dataclass
class Account:
    id: str
    account_type: str
    name: str
    currency: str = "USD"
    balance: Decimal = Decimal("0.00")
    available_balance: Decimal = Decimal("0.00")
    held_balance: Decimal = Decimal("0.00")
    status: str = "active"
    version: int = 0

class AccountService:
    def __init__(self, db_session):
        self.db = db_session

    async def create_account(self, account: Account) -> Account:
        query = """
            INSERT INTO accounts
                (id, account_type, name, currency, balance,
                 available_balance, held_balance, status, version)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 1)
        """
        await self.db.execute(query,
            account.id, account.account_type, account.name,
            account.currency, account.balance,
            account.available_balance, account.held_balance,
            account.status
        )
        return account

    async def get_account(self, account_id: str) -> Account | None:
        query = "SELECT * FROM accounts WHERE id = $1"
        row = await self.db.fetchrow(query, account_id)
        return Account(**dict(row)) if row else None

    async def update_balance(self, account: Account):
        query = """
            UPDATE accounts
            SET balance = $1, available_balance = $2,
                held_balance = $3, version = version + 1,
                updated_at = NOW()
            WHERE id = $4 AND version = $5
        """
        result = await self.db.execute(query,
            account.balance, account.available_balance,
            account.held_balance, account.id, account.version
        )
        if result == "UPDATE 0":
            raise OptimisticLockError(
                f"Account {account.id} was modified by another transaction"
            )
        account.version += 1
```

## Multi-Currency Support

```python
class CurrencyConverter:
    def __init__(self, rate_provider):
        self.rate_provider = rate_provider

    async def convert(self, amount: Decimal,
                       from_currency: str,
                       to_currency: str,
                       rate_type: str = "mid") -> ConversionResult:
        if from_currency == to_currency:
            return ConversionResult(amount, to_currency, Decimal("1"))
        rate = await self.rate_provider.get_rate(
            from_currency, to_currency, rate_type
        )
        converted = (amount * rate).quantize(Decimal("0.01"))
        return ConversionResult(converted, to_currency, rate)

class MultiCurrencyLedger(LedgerEngine):
    def __init__(self, db_session, account_service,
                 currency_converter):
        super().__init__(db_session, account_service)
        self.converter = currency_converter

    async def post_cross_currency(self, tx: Transaction,
                                   from_currency: str,
                                   to_currency: str,
                                   exchange_rate: Decimal) -> Transaction:
        async with self.db.transaction():
            base_amount = next(
                e.amount for e in tx.entries
                if e.entry_type == "debit"
            )
            counter_amount = (base_amount * exchange_rate).quantize(
                Decimal("0.01")
            )
            fx_entry = LedgerEntry(
                transaction_id=tx.id,
                account_id="FX_GL_ACCOUNT",
                entry_type="credit" if from_currency == "USD" else "debit",
                amount=abs(counter_amount - base_amount),
                currency="USD",
                description=f"FX adjustment: {from_currency}->{to_currency}"
            )
            tx.entries.append(fx_entry)
            return await self.post_transaction(tx)
```

## Holding and Settlement

```python
class HoldingService:
    def __init__(self, ledger: LedgerEngine, accounts: AccountService):
        self.ledger = ledger
        self.accounts = accounts

    async def hold_funds(self, account_id: str,
                          amount: Decimal,
                          reason: str) -> str:
        account = await self.accounts.get_account(account_id)
        if account.available_balance < amount:
            raise InsufficientFundsError(
                f"Available balance {account.available_balance} "
                f"< requested hold {amount}"
            )
        hold_id = str(uuid4())
        hold_tx = Transaction(
            reference=f"HOLD-{hold_id}",
            transaction_type="hold",
            entries=[
                LedgerEntry(
                    account_id=account_id,
                    entry_type="debit",
                    amount=amount,
                    description=f"Hold: {reason}"
                ),
                LedgerEntry(
                    account_id="HOLDINGS_ACCOUNT",
                    entry_type="credit",
                    amount=amount,
                    description=f"Hold: {reason}"
                )
            ]
        )
        await self.ledger.post_transaction(hold_tx)
        account.held_balance += amount
        account.available_balance -= amount
        await self.accounts.update_balance(account)
        return hold_id

    async def settle_hold(self, hold_id: str):
        hold_tx = await self._get_hold_transaction(hold_id)
        settle_tx = Transaction(
            reference=f"SETTLE-{hold_id}",
            transaction_type="settle",
            entries=[
                LedgerEntry(
                    account_id="HOLDINGS_ACCOUNT",
                    entry_type="debit",
                    amount=hold_tx.entries[1].amount,
                    description=f"Settle hold {hold_id}"
                ),
                LedgerEntry(
                    account_id=hold_tx.entries[0].account_id,
                    entry_type="credit",
                    amount=hold_tx.entries[0].amount,
                    description=f"Settled: {hold_id}"
                )
            ]
        )
        await self.ledger.post_transaction(settle_tx)
```

## Journal Entries

```python
class JournalService:
    def __init__(self, ledger: LedgerEngine):
        self.ledger = ledger

    async def create_journal_entry(self, journal: JournalEntry):
        async with self.db.transaction():
            await self._validate_account_types(journal)
            tx = Transaction(
                reference=f"JE-{journal.je_number}",
                transaction_type="journal_entry",
                entries=self._build_entries(journal)
            )
            return await self.ledger.post_transaction(tx)

    def _build_entries(self, journal: JournalEntry) -> list[LedgerEntry]:
        entries = []
        for line in journal.lines:
            entries.append(LedgerEntry(
                account_id=line.account_id,
                entry_type="debit" if line.amount > 0 else "credit",
                amount=abs(line.amount),
                description=line.description or journal.description
            ))
        return entries

    async def _validate_account_types(self, journal: JournalEntry):
        for line in journal.lines:
            account = await self.accounts.get_account(line.account_id)
            expected_type = line.account_type
            if account.account_type != expected_type:
                raise InvalidAccountTypeError(
                    f"Account {line.account_id} is {account.account_type}, "
                    f"expected {expected_type}"
                )
```

## Reconciliation Support

```python
class LedgerReconciliation:
    def __init__(self, db_session):
        self.db = db_session

    async def trial_balance(self, as_of: datetime) -> dict:
        query = """
            SELECT account_id, account_type,
                   SUM(CASE WHEN entry_type = 'debit'
                       THEN amount ELSE 0 END) as total_debits,
                   SUM(CASE WHEN entry_type = 'credit'
                       THEN amount ELSE 0 END) as total_credits
            FROM ledger_entries
            WHERE created_at <= $1
            GROUP BY account_id, account_type
        """
        rows = await self.db.fetch(query, as_of)
        total_debits = sum(r["total_debits"] for r in rows)
        total_credits = sum(r["total_credits"] for r in rows)
        return {
            "accounts": [dict(r) for r in rows],
            "total_debits": total_debits,
            "total_credits": total_credits,
            "is_balanced": total_debits == total_credits,
            "as_of": as_of.isoformat()
        }

    async def account_statement(self, account_id: str,
                                 from_date: datetime,
                                 to_date: datetime) -> Statement:
        query = """
            SELECT * FROM ledger_entries
            WHERE account_id = $1
            AND created_at BETWEEN $2 AND $3
            ORDER BY created_at ASC
        """
        entries = await self.db.fetch(query, account_id, from_date, to_date)
        opening = await self._opening_balance(account_id, from_date)
        closing = opening + sum(
            e.amount if e.entry_type == "credit" else -e.amount
            for e in entries
        )
        return Statement(
            account_id=account_id,
            opening_balance=opening,
            closing_balance=closing,
            entries=[LedgerEntry(**dict(e)) for e in entries],
            from_date=from_date,
            to_date=to_date
        )
```

## Key Points

- Every transaction must balance: total debits must equal total credits.
- Optimistic locking with version numbers prevents race conditions on account balance updates.
- Multi-currency support requires FX adjustment entries to keep the ledger balanced.
- Holding funds reduces available balance without changing the account's total balance.
- Settlement releases holds and completes the funds transfer.
- Journal entries provide an audit trail for adjustments and corrections.
- Trial balance reports validate that all accounts are in balance at a given point in time.
- Account statements show a complete history of debits and credits with running balances.
