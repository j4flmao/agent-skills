# Interview Questions

## Coding Interview Questions

### Easy
| Question | Concepts | Time | Rubric Anchor |
|----------|----------|------|---------------|
| Two Sum | Arrays, hash maps | 20 min | Can the candidate find an O(n) solution? |
| Valid Parentheses | Stack, string parsing | 20 min | Edge cases: empty string, single bracket |
| Reverse Linked List | Pointers, iteration | 20 min | Both iterative and recursive approaches |
| FizzBuzz | Conditionals, modulo | 10 min | Can they write clean conditional logic? |

### Medium
| Question | Concepts | Time | Rubric Anchor |
|----------|----------|------|---------------|
| LRU Cache | Doubly linked list, hash map | 35 min | O(1) get/put with eviction policy |
| Word Break | DP, memoization | 35 min | Can they identify optimal substructure? |
| Binary Tree Level Order | BFS, queues | 30 min | Handling nulls, empty tree |
| Course Schedule | Topological sort, graph | 35 min | Cycle detection in directed graph |

### Hard
| Question | Concepts | Time | Rubric Anchor |
|----------|----------|------|---------------|
| Median of Two Sorted Arrays | Binary search, divide & conquer | 45 min | O(log(min(m,n))) optimization |
| Serialize/Deserialize Binary Tree | Tree traversal, encoding | 40 min | Unique representation, edge cases |
| Alien Dictionary | Topological sort, graph | 40 min | Character ordering, invalid input handling |

## System Design Questions

### Small Scope
| Question | Scope | Key Components | Time |
|----------|-------|----------------|------|
| URL Shortener | Single service | Hash function, DB schema, redirect | 40 min |
| Rate Limiter | Middleware | Token bucket, sliding window, Redis | 40 min |
| Web Crawler | Worker pattern | URL frontier, dedup, politeness | 45 min |

### Medium Scope
| Question | Scope | Key Components | Time |
|----------|-------|----------------|------|
| Chat System | Real-time | WebSocket, message storage, presence | 50 min |
| News Feed | Social graph | Fanout, ranking, caching, CDN | 50 min |
| Payment System | Financial | Idempotency, ledger, reconciliation | 55 min |

### Large Scope
| Question | Scope | Key Components | Time |
|----------|-------|----------------|------|
| Distributed Database | Storage | Consistent hashing, replication, quorum | 60 min |
| Video Streaming | Media | CDN, transcoding, adaptive bitrate | 60 min |
| Ride Sharing | Geospatial | QuadTree, matching, pricing, ETA | 60 min |

## Behavioral Questions

### Collaboration
- Tell me about a time you disagreed with a teammate. How did you resolve it?
- Describe a project where you had to work across multiple teams.
- Give an example of when you helped a teammate succeed.

### Ownership
- Tell me about a time you took initiative beyond your role.
- Describe a project that failed and what you learned.
- Give an example of when you had to make a decision with incomplete information.

### Growth Mindset
- Tell me about a time you received difficult feedback. How did you respond?
- Describe a skill you learned recently and how you approached learning it.
- Give an example of a mistake you made and what you changed afterward.

## STAR Interview Framework

| Element | Description | Example |
|---------|-------------|---------|
| **S**ituation | Context and background | "Our team was responsible for order processing..." |
| **T**ask | What needed to be done | "...and we had a 30% failure rate in the payment flow." |
| **A**ction | What YOU specifically did | "I implemented idempotency keys and a retry queue..." |
| **R**esult | Measurable outcome | "...which reduced failure rate to 2% and recovered $50K/month in failed transactions." |

## Question Bank Management

- Maintain a question bank of 10-20 questions per category
- Tag each question by: role level, role type (backend/frontend/mobile), difficulty
- Review questions quarterly for freshness and relevance
- Remove questions that become common knowledge (leetcode grind)
- Add questions based on actual role requirements
- Questions should never require niche domain knowledge
- Rotate questions to prevent leak across candidates
- Interviewers select questions before session — no mid-interview changes
