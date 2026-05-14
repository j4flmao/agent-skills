# Test Design Techniques

## Equivalence Partitioning
Divide input data into partitions where one test represents the whole partition.

```
Example: Age field (1-120)
Partition   | Valid? | Test value
1-120       | Valid  | age=50
< 1         | Invalid| age=0
> 120       | Invalid| age=200
Non-numeric | Invalid| age="abc"
Null/empty  | Invalid| age=""
```

## Boundary Value Analysis
Test at the boundaries of each partition.

```
Example: Password length (8-100)
Boundary | Test value | Expected
7        | "a"*7      | Invalid (too short)
8        | "a"*8      | Valid (minimum)
9        | "a"*9      | Valid
99       | "a"*99     | Valid
100      | "a"*100    | Valid (maximum)
101      | "a"*101    | Invalid (too long)
```

## State Transition Testing
Test valid and invalid state transitions.

```
Order states: PENDING → CONFIRMED → SHIPPED → DELIVERED
               ↓           ↓
            CANCELLED   REFUNDED

Valid: PENDING → CONFIRMED, PENDING → CANCELLED
Invalid: CONFIRMED → PENDING (no rollback)
```

## Pairwise Testing
Test all combinations of variables with minimal test cases.

```
Variables: Browser (Chrome, Firefox, Safari), OS (Win, Mac, Linux), Role (Admin, User)
Full factorial: 3 × 3 × 2 = 18 tests
Pairwise: 6 tests (covers all variable pairs)

| Browser | OS   | Role  |
|---------|------|-------|
| Chrome  | Win  | Admin |
| Chrome  | Mac  | User  |
| Firefox | Win  | User  |
| Firefox | Linux| Admin |
| Safari  | Mac  | Admin |
| Safari  | Linux| User  |
```
