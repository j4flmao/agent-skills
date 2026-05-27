# Spring Boot Security Reference

## Security Configuration

```java
@Configuration
@EnableWebSecurity
@EnableMethodSecurity
public class SecurityConfig {
    
    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        return http
            .csrf(csrf -> csrf.disable())
            .sessionManagement(sm -> sm.sessionCreationPolicy(STATELESS))
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/api/public/**").permitAll()
                .requestMatchers("/api/auth/login").permitAll()
                .requestMatchers("/api/admin/**").hasRole("ADMIN")
                .requestMatchers("/api/**").authenticated()
                .anyRequest().authenticated()
            )
            .addFilterBefore(jwtFilter, UsernamePasswordAuthenticationFilter.class)
            .exceptionHandling(ex -> ex
                .authenticationEntryPoint((req, resp, auth) ->
                    resp.sendError(401, "Unauthorized"))
                .accessDeniedHandler((req, resp, ex) ->
                    resp.sendError(403, "Forbidden"))
            )
            .build();
    }
}
```

## JWT Authentication Filter

```java
@Component
public class JwtFilter extends OncePerRequestFilter {
    private final JwtService jwtService;
    private final UserDetailsService userDetailsService;

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain chain) throws ServletException, IOException {
        
        String token = extractToken(request);
        if (token != null && jwtService.validateToken(token)) {
            String username = jwtService.extractUsername(token);
            UserDetails user = userDetailsService.loadUserByUsername(username);
            UsernamePasswordAuthenticationToken auth =
                new UsernamePasswordAuthenticationToken(user, null, user.getAuthorities());
            auth.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
            SecurityContextHolder.getContext().setAuthentication(auth);
        }
        chain.doFilter(request, response);
    }

    private String extractToken(HttpServletRequest request) {
        String header = request.getHeader("Authorization");
        if (header != null && header.startsWith("Bearer ")) {
            return header.substring(7);
        }
        return null;
    }
}
```

## Method-Level Security

```java
@RestController
@RequestMapping("/api/orders")
public class OrderController {

    @GetMapping
    @PreAuthorize("hasRole('USER')")
    public List<Order> list() {
        return orderService.findAll();
    }

    @GetMapping("/{id}")
    @PreAuthorize("@orderSecurity.canRead(#id, authentication)")
    public Order get(@PathVariable UUID id) {
        return orderService.findById(id);
    }

    @PostMapping
    @PreAuthorize("isAuthenticated()")
    @PostFilter("filterObject.owner == authentication.name")
    public Order create(@Valid @RequestBody CreateOrderRequest request) {
        return orderService.create(request);
    }
}
```

## Permission Evaluator

```java
@Component("orderSecurity")
public class OrderSecurityEvaluator {
    
    public boolean canRead(UUID orderId, Authentication auth) {
        if (auth.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"))) {
            return true;
        }
        Order order = orderService.findById(orderId);
        return order.getOwner().equals(auth.getName());
    }
}
```

## OAuth 2.0 Integration

```yaml
spring:
  security:
    oauth2:
      resourceserver:
        jwt:
          issuer-uri: https://accounts.google.com
          jwk-set-uri: https://www.googleapis.com/oauth2/v3/certs
      client:
        registration:
          github:
            client-id: ${GITHUB_CLIENT_ID}
            client-secret: ${GITHUB_CLIENT_SECRET}
```

## CORS Configuration

```java
@Bean
public WebMvcConfigurer corsConfigurer() {
    return new WebMvcConfigurer() {
        @Override
        public void addCorsMappings(CorsRegistry registry) {
            registry.addMapping("/api/**")
                .allowedOrigins("https://app.example.com")
                .allowedMethods("GET", "POST", "PUT", "DELETE")
                .allowedHeaders("Authorization", "Content-Type")
                .exposedHeaders("X-Total-Count")
                .allowCredentials(true)
                .maxAge(3600);
        }
    };
}
```

## Rate Limiting

```java
@Component
public class RateLimitingFilter implements Filter {
    private final Cache<String, Integer> cache;

    @Override
    public void doFilter(ServletRequest req, ServletResponse resp, FilterChain chain) {
        HttpServletRequest request = (HttpServletRequest) req;
        String key = request.getRemoteAddr() + ":" + request.getRequestURI();
        
        Integer count = cache.get(key, () -> 0);
        if (count >= 100) {
            ((HttpServletResponse) resp).sendError(429, "Too many requests");
            return;
        }
        cache.put(key, count + 1);
        chain.doFilter(req, resp);
    }
}
```

## Key Points

- SecurityFilterChain defines HTTP security rules
- JWT filter extracts and validates tokens on every request
- @PreAuthorize and @PostFilter provide method-level security
- Permission evaluators encapsulate complex authorization logic
- OAuth 2.0 resource server configuration validates JWTs from providers
- CORS configuration whitelists allowed origins
- Stateless session management for REST APIs
- AuthenticationEntryPoint handles 401, AccessDeniedHandler handles 403
- Rate limiting filter prevents API abuse
- Security context holder stores authenticated principal per request
