# Elysia Lifecycle Reference

## Hook Order
```
onRequest → transform → beforeHandle → handler → afterHandle → onResponse
                                                         ↓
                                                    onError (if error)
```

## Guards

```typescript
const authGuard = new Elysia()
  .derive(({ headers }) => {
    const user = verifyToken(headers.authorization);
    return { user };
  })
  .guard({
    beforeHandle: ({ user, error }) => {
      if (!user) return error(401, 'Unauthorized');
    }
  });
```
