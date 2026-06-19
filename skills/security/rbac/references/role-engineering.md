# Role Engineering

## Role Design Process

### Top-Down Approach
1. Analyze business functions and org structure
2. Define business roles (job functions)
3. Map business roles to system roles
4. Define permissions for each role
5. Validate with stakeholders

### Bottom-Up Approach
1. Collect all existing permissions and access assignments
2. Cluster permissions using role mining algorithms
3. Identify permission clusters that form logical roles
4. Map clusters to business functions
5. Consolidate and refine

## Role Mining Example
```python
def mine_roles(access_matrix: dict[str, set[str]]) -> list[dict]:
    """Simple role mining: cluster users by common permissions."""
    from collections import Counter

    # Count permission co-occurrence
    co_occurrence = Counter()
    for user_perms in access_matrix.values():
        for p1 in user_perms:
            for p2 in user_perms:
                if p1 < p2:
                    co_occurrence[(p1, p2)] += 1

    # Find highly-correlated permission pairs
    MIN_CORRELATION = 0.8
    clusters = []
    used = set()

    for (p1, p2), count in co_occurrence.most_common():
        n_users_p1 = sum(1 for perms in access_matrix.values() if p1 in perms)
        n_users_p2 = sum(1 for perms in access_matrix.values() if p2 in perms)
        # Jaccard similarity
        jaccard = count / (n_users_p1 + n_users_p2 - count)
        if jaccard >= MIN_CORRELATION and p1 not in used and p2 not in used:
            clusters.append({"permissions": [p1, p2], "users": count, "jaccard": jaccard})
            used.add(p1)
            used.add(p2)

    return clusters
```

## Role Governance
- Role owner: person responsible for each role's definition and appropriateness
- Role approval: new roles require approval from security and business owner
- Role review: annual review of all role definitions
- Role lifecycle: propose → approve → implement → monitor → review → retire
- Role documentation: purpose, permissions, scope, inheritance, intended audience

## Key Points
- Role engineering combines top-down (business analysis) and bottom-up (permission analysis)
- Role mining algorithms discover natural permission clusters
- Each role should have a designated owner
- Review roles annually to prevent role explosion
- Document role purpose, permissions, scope, and hierarchy
- Role governance includes approval workflow and lifecycle management
