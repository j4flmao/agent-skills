# Refactoring Patterns Catalog

## Extract Function
**Before:**
```typescript
function statement(invoice) {
  let total = 0
  for (const perf of invoice.performances) {
    total += perf.audience * 10
    if (perf.audience > 30) total += 500
  }
  return total
}
```
**After:**
```typescript
function amountFor(perf: Performance): number {
  let amount = perf.audience * 10
  if (perf.audience > 30) amount += 500
  return amount
}
function statement(invoice: Invoice): number {
  return invoice.performances.reduce((sum, p) => sum + amountFor(p), 0)
}
```

## Extract Variable
**Before:**
```typescript
if (order.items.length > 0 && order.total > 100 && order.customer.status === 'vip')
```
**After:**
```typescript
const isEligibleForDiscount = order.items.length > 0 && order.total > 100 && order.customer.status === 'vip'
if (isEligibleForDiscount)
```

## Replace Conditional with Polymorphism
**Before:**
```typescript
function birdSpeed(bird: Bird): number {
  switch (bird.type) {
    case 'european': return 20
    case 'african': return 20 - 2 * bird.numberOfCoconuts
    case 'norwegian': return bird.isNailed ? 0 : 30
    default: throw new Error(`Unknown bird: ${bird.type}`)
  }
}
```
**After:**
```typescript
interface Bird { speed(): number }
class European implements Bird { speed() { return 20 } }
class African implements Bird {
  constructor(private numberOfCoconuts: number) {}
  speed() { return 20 - 2 * this.numberOfCoconuts }
}
class Norwegian implements Bird {
  constructor(private isNailed: boolean) {}
  speed() { return this.isNailed ? 0 : 30 }
}
```

## Split Loop
**Before:**
```typescript
let total = 0, youngest = Infinity
for (const p of people) {
  total += p.age
  if (p.age < youngest) youngest = p.age
}
```
**After:**
```typescript
const total = people.reduce((s, p) => s + p.age, 0)
const youngest = people.reduce((m, p) => Math.min(m, p.age), Infinity)
```

## Introduce Parameter Object
**Before:**
```typescript
function bookingsInRange(bookings: Booking[], start: Date, end: Date): Booking[]
```
**After:**
```typescript
class DateRange {
  constructor(readonly start: Date, readonly end: Date) {}
  contains(date: Date): boolean { return date >= this.start && date <= this.end }
}
function bookingsInRange(bookings: Booking[], range: DateRange): Booking[]
```

## Replace Magic Number with Symbolic Constant
**Before:**
```typescript
if (temperature > 37.5) ringAlarm()
```
**After:**
```typescript
const BODY_TEMP_THRESHOLD_C = 37.5
if (temperature > BODY_TEMP_THRESHOLD_C) ringAlarm()
```

## Move Function to Appropriate Module
- Symptom: A function references more data from another module than its own
- Fix: Move the function to the module it depends on, then update callers

## Inline Function
- When: Function body is as clear as the name, and it has a single caller
- Replace the call site with the function body and delete the function

## Replace Nested Conditional with Guard Clauses
**Before:**
```typescript
function getPayAmount() {
  if (isDead) return deadAmount()
  else if (isSeparated) return separatedAmount()
  else if (isRetired) return retiredAmount()
  else return normalPayAmount()
}
```
**After:**
```typescript
function getPayAmount() {
  if (isDead) return deadAmount()
  if (isSeparated) return separatedAmount()
  if (isRetired) return retiredAmount()
  return normalPayAmount()
}
```
