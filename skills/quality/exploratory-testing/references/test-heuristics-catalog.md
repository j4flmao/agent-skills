# Test Heuristics Catalog

## Input Heuristics
| Heuristic | Description | Example |
|-----------|-----------|---------|
| Empty | What happens with no input? | Submit empty form |
| Null | What happens with null/missing values? | API call with null body |
| Boundary | What happens at value boundaries? | Password of 7, 8, 9 chars (limit is 8) |
| Extreme | What happens with very large/small values? | Upload 2GB file |
| Special chars | What happens with special characters? | Name field with "O'Brien" |
| Unicode | What happens with non-ASCII? | Address with Chinese characters |
| SQL injection | What happens with SQL-like input? | Search for "'; DROP TABLE--" |
| XSS | What happens with script tags? | Comment with "<script>alert(1)</script>" |

## State Heuristics
| Heuristic | Description | Example |
|-----------|-----------|---------|
| Create | Can we create a new entity? | Create a new order |
| Read | Can we view the entity? | View order details |
| Update | Can we modify it? | Change order shipping address |
| Delete | Can we remove it? | Cancel order |
| Double-create | What happens if we create twice? | Submit registration form twice |
| Delete-while-use | What if deleted during use? | Delete product while in another user's cart |
| Concurrent-update | What if two users update simultaneously? | Two admins editing same user roles |

## Process Heuristics
| Heuristic | Description | Example |
|-----------|-----------|---------|
| Cancel | What if we cancel mid-operation? | Close browser during checkout |
| Back | What if we use browser back button? | Navigate back after payment |
| Refresh | What if we refresh the page? | Refresh during form submission |
| Multi-tab | What if we open multiple tabs? | Same cart in two tabs |
| Timeout | What if session expires? | Leave page open for 30 min then submit |
| Network loss | What if network disconnects? | Kill WiFi during file upload |
| Concurrent | What if multiple users act simultaneously? | Two users buying last item in stock |

## Key Points
- Use heuristics to systematically explore, not to constrain
- Combine multiple heuristics for deeper coverage
- Document which heuristics were used in each session
- Rotate heuristics across sessions for variety
- Heuristics complement charters — don't replace them
