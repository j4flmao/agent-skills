# Routing & Navigation Architecture

## Route Guards
Guards prevent unauthorized access to routes or handle unsaved changes.

- `CanActivate`: Checks if a route can be entered.
- `CanActivateChild`: Checks if child routes can be entered.
- `CanDeactivate`: Checks if a route can be exited (e.g., prompt for unsaved changes).
- `CanMatch` / `CanLoad`: Prevents the router from even matching or downloading the lazy-loaded module if the user isn't authorized.

```typescript
@Injectable({ providedIn: 'root' })
export class AuthGuard implements CanActivate {
  constructor(private authService: AuthService, private router: Router) {}
  
  canActivate(): boolean | UrlTree {
    return this.authService.isAuthenticated() || this.router.parseUrl('/login');
  }
}
```

## Route Resolvers
Resolvers pre-fetch data before a route is activated, ensuring the component doesn't render until data is available. Useful to avoid empty states or loading spinners inside the component itself.

```typescript
@Injectable({ providedIn: 'root' })
export class UserResolver implements Resolve<User> {
  constructor(private api: ApiService) {}
  
  resolve(route: ActivatedRouteSnapshot): Observable<User> {
    return this.api.getUser(route.paramMap.get('id'));
  }
}
```

## Routing Strategies
- **PathLocationStrategy (Default)**: Uses the HTML5 history API (`/users/123`). Requires server configuration to route all requests to `index.html`.
- **HashLocationStrategy**: Uses URL hashes (`/#/users/123`). Useful for legacy servers or static file hosting.
