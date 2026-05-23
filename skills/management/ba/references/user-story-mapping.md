# User Story Mapping

## Structure

A user story map organizes stories along two dimensions:

```
Horizontal: User journey steps (left to right)
Vertical: Story priority (top = MVP, bottom = future)
```

```
         ┌──────────┬──────────┬──────────┬──────────┐
         │  Search  │  Select  │   Pay    │ Receive  │
├── MVP ──┼──────────┼──────────┼──────────┼──────────┤
│        │Search bar│Add to    │Credit    │Confirma- │
│        │          │cart      │card pay  │tion email│
├── V2 ──┼──────────┼──────────┼──────────┼──────────┤
│        │Filters   │Save for  │PayPal    │Tracking  │
│        │          │later     │          │number    │
├── V3 ──┼──────────┼──────────┼──────────┼──────────┤
│        │Autocompl-│Wishlist  │Buy now   │Delivery  │
│        │ete search│share     │pay later  │date pick │
         └──────────┴──────────┴──────────┴──────────┘
```

## Mapping Process

### Step 1: Define the User
Name the persona. Example: "Busy parent shopping for school supplies."

### Step 2: Define the User Goal
What are they trying to accomplish? "Buy school supplies online with delivery."

### Step 3: Identify User Activities (Backbone)
High-level steps across the top. 5-10 activities. Use verbs.
- Search for products
- Select items
- Complete purchase
- Track delivery

### Step 4: Break Down Activities into Tasks
Under each activity, detail specific user tasks.
Search → type query, apply filters, view results, sort results

### Step 5: Order Tasks Sequentially
Arrange left to right in chronological order.

### Step 6: Prioritize Vertically
Top row = MVP (must have). Lower rows = future releases.
Slice across all activities for each release.

## Splitting Along the Map

| Technique | Example |
|-----------|---------|
| By activity | Build "Search" fully before "Pay" |
| By priority | Top row first, middle row second |
| By user role | Student path vs admin path |
| By device | Desktop first, mobile later |
| By authentication | Anonymous vs logged-in flows |

## Story Map Template

```
# User Story Map: {Feature}

## Persona: {name} — {description}

| Activity 1 | Activity 2 | Activity 3 | Activity 4 |
|------------|------------|------------|------------|
| Release 1 (MVP) | | | |
| Task 1.1 | Task 2.1 | Task 3.1 | Task 4.1 |
| Task 1.2 | Task 2.2 | Task 3.2 | Task 4.2 |
| Release 2 | | | |
| Task 1.3 | Task 2.3 | — | Task 4.3 |
| Release 3 | | | |
| Task 1.4 | — | Task 3.3 | Task 4.4 |
```

## Benefits

- Shows full user journey, not isolated features
- Reveals gaps in the flow (missing steps)
- Enables MVP slicing across the entire journey
- Prevents building features that don't connect to user needs
- Creates shared understanding between product, design, and engineering

## Common Mistakes

- Too many activities (>10) — simplify to the core journey
- Too few tasks per activity — go deeper on each step
- Mixed personas on one map — one map per persona
- Including system tasks instead of user tasks — "database backup" is not a user activity
- Slicing vertically by component instead of horizontally by value — each slice should deliver user value across activities
