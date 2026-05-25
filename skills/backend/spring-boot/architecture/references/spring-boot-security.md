# Spring Boot Security

## Dependencies

```gradle
implementation 'org.springframework.boot:spring-boot-starter-security'
implementation 'org.springframework.boot:spring-boot-starter-oauth2-resource-server'
```

## Security Chain

```java
@Configuration
@EnableWebSecurity
@EnableMethodSecurity
public class SecurityConfig {
    private final JwtDecoder jwtDecoder;

    public SecurityConfig(JwtDecoder jwtDecoder) {
        this.jwtDecoder = jwtDecoder;
    }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            .csrf(AbstractHttpConfigurer::disable)
            .sessionManagement(sm -> sm.sessionCreationPolicy(STATELESS))
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/api/v1/auth/**", "/actuator/health", "/swagger-ui/**")
                    .permitAll()
                .requestMatchers("/api/v1/admin/**").hasRole("ADMIN")
                .requestMatchers(HttpMethod.GET, "/api/v1/orders/**")
                    .hasAnyRole("USER", "ADMIN")
                .anyRequest().authenticated()
            )
            .oauth2ResourceServer(oauth2 -> oauth2
                .jwt(jwt -> jwt.decoder(jwtDecoder))
            );

        return http.build();
    }
}
```

## Method Security

```java
@RestController
@RequestMapping("/api/v1/orders")
public class OrderController {

    @PreAuthorize("hasRole('ADMIN')")
    @GetMapping("/all")
    public List<Order> findAll() { ... }

    @PostMapping
    public Order create(@AuthenticationPrincipal Jwt jwt, @RequestBody CreateOrderRequest req) {
        String userId = jwt.getSubject();
        return orderService.create(userId, req);
    }
}
```

## JWT Token Provider

```java
@Component
public class JwtTokenProvider {
    private final RSAPrivateKey privateKey;
    private final RSAPublicKey publicKey;

    public JwtTokenProvider(
        @Value("${jwt.private-key}") RSAPrivateKey privateKey,
        @Value("${jwt.public-key}") RSAPublicKey publicKey
    ) {
        this.privateKey = privateKey;
        this.publicKey = publicKey;
    }

    public String generateToken(UserDetails user) {
        return Jwts.builder()
            .subject(user.getUsername())
            .claim("roles", user.getAuthorities())
            .issuedAt(new Date())
            .expiration(new Date(System.currentTimeMillis() + 3600000))
            .signWith(privateKey)
            .compact();
    }

    @Bean
    public JwtDecoder jwtDecoder() {
        return NimbusJwtDecoder.withPublicKey(publicKey).build();
    }
}
```

## CORS

```java
@Bean
public CorsFilter corsFilter() {
    CorsConfiguration config = new CorsConfiguration();
    config.setAllowedOrigins(List.of("https://app.example.com"));
    config.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE"));
    config.setAllowedHeaders(List.of("*"));
    config.setAllowCredentials(true);

    UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
    source.registerCorsConfiguration("/api/**", config);
    return new CorsFilter(source);
}
```

## Testing Security

```java
@WebMvcTest(OrderController.class)
@Import(SecurityConfig.class)
class OrderControllerSecurityTest {

    @Test
    @WithMockUser(roles = "USER")
    void shouldReturnOrdersForAuthenticatedUser() throws Exception {
        mockMvc.perform(get("/api/v1/orders"))
            .andExpect(status().isOk());
    }

    @Test
    void shouldReturn401ForUnauthenticatedUser() throws Exception {
        mockMvc.perform(get("/api/v1/orders"))
            .andExpect(status().isUnauthorized());
    }

    @Test
    void shouldReturn403ForWrongRole() throws Exception {
        mockMvc.perform(get("/api/v1/admin/users"))
            .andExpect(status().isForbidden());
    }
}
```
