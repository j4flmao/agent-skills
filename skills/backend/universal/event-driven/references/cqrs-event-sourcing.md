# CQRS and Event Sourcing

## 1. CQRS (Command Query Responsibility Segregation)
In traditional CRUD applications, you use the same database model to Write data and Read data. 
In highly complex domains, the way you validate a business rule (Command) is entirely different from the way you search and filter data for the UI (Query).

**CQRS splits the system into two distinct halves:**
- **Command Side (Write)**: Handles business logic, validations, and state changes. Optimized for transactional integrity (e.g., Normalized PostgreSQL).
- **Query Side (Read)**: Handles data retrieval. Optimized for complex queries and speed (e.g., Denormalized Elasticsearch or Redis).

The Command side updates the Write database, then emits an event. The Query side listens to that event and updates the Read database (Eventual Consistency).

## 2. Event Sourcing
Event Sourcing takes EDA to the extreme. Instead of storing the *current state* of an entity in the database, you store a sequence of *state-changing events*.

### Example: A Bank Account
**Traditional State-based DB**:
`Account { id: 1, balance: $500 }`
*(If there is a bug, you don't know how the balance got to $500).*

**Event Sourced DB**:
1. `AccountCreated { id: 1, owner: "Alice" }`
2. `MoneyDeposited { id: 1, amount: 1000 }`
3. `MoneyWithdrawn { id: 1, amount: 500 }`

To get the current balance, the system loads all events and "replays" them. 
`0 + 1000 - 500 = $500`.

## 3. Advantages of Event Sourcing
- **Perfect Audit Log**: You never lose data. You know exactly *why* a state is what it is.
- **Time Travel**: You can rebuild the state of the system exactly as it was on Tuesday at 4:00 PM.
- **New Projections**: If the Marketing team wants a new dashboard tracking "Withdrawal Velocity", you don't need to start tracking it from scratch. You just replay the entire history of events into a new Read Database.

## 4. The Complexities (Why you shouldn't use it for everything)
- **Snapshotting**: Replaying 10 million events to get a bank balance is too slow. The system must periodically save a "Snapshot" (e.g., `Balance on Jan 1st was $500`) and only replay events after that snapshot.
- **Event Versioning**: What happens if the shape of the `MoneyDeposited` event changes in Year 2? You must maintain code that can deserialize V1, V2, and V3 of historical events forever.
- **GDPR (Right to be Forgotten)**: If a user demands deletion, you cannot just delete their row. Immutable event logs are append-only. You must implement "Crypto-Shredding" (encrypting PII inside the event and throwing away the encryption key).
