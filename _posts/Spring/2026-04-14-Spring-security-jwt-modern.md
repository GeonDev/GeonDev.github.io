---
layout: post
title: Spring Security 6 + JWT 로그인부터 토큰 검증·권한 확인까지 (최신 버전)
date: 2026-04-14
Author: Geon Son
categories: Spring
tags: [Spring]
comments: true
toc: true
---

> 예전에 [Spring Security JWT 구현해 보기](/Spring-boot-jwt-basic) 글을 썼는데,
> 그 글은 Spring Boot 2.x / Spring Security 5.x 시절이라 `WebSecurityConfigurerAdapter` 등 지금은 사라진 API를 쓰고 있다.
> 이 글은 **Spring Boot 3.x / Spring Security 6.x** 기준으로 다시 정리한다.
> 흐름은 **로그인 → JWT 발급 → 요청마다 토큰 해석 → 권한(Role) 확인**까지다.

# 0. 전체 흐름

```
[로그인]
  POST /api/auth/login (username, password)
      → AuthenticationManager 로 인증
      → 성공하면 액세스 토큰(짧게) + 리프레시 토큰(길게) 발급해서 응답

[이후 모든 요청]
  Authorization: Bearer <accessToken>
      → JwtAuthenticationFilter 가 토큰을 꺼내 검증
      → 토큰에서 사용자/권한을 복원해 SecurityContext 에 저장
      → SecurityFilterChain 의 requestMatchers/hasRole 로 권한 확인

[액세스 토큰 만료 시]
  POST /api/auth/refresh (refreshToken)
      → 리프레시 토큰 검증 + 저장소 일치 확인
      → 새 액세스 토큰 발급 (+ 리프레시 토큰 회전)
```

핵심은 **세션을 쓰지 않고(STATELESS)**, 요청마다 들어온 JWT만으로 인증/인가를 끝낸다는 점이다.

# 1. 의존성 (jjwt 0.12.x)

JWT 라이브러리는 요즘 많이 쓰는 **jjwt(io.jsonwebtoken) 0.12.x**를 사용한다.
(0.11 이하와 API가 꽤 달라졌으니 버전을 꼭 확인하자.)

```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-security</artifactId>
</dependency>
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-web</artifactId>
</dependency>

<!-- jjwt 0.12.x -->
<dependency>
    <groupId>io.jsonwebtoken</groupId>
    <artifactId>jjwt-api</artifactId>
    <version>0.12.6</version>
</dependency>
<dependency>
    <groupId>io.jsonwebtoken</groupId>
    <artifactId>jjwt-impl</artifactId>
    <version>0.12.6</version>
    <scope>runtime</scope>
</dependency>
<dependency>
    <groupId>io.jsonwebtoken</groupId>
    <artifactId>jjwt-jackson</artifactId>
    <version>0.12.6</version>
    <scope>runtime</scope>
</dependency>
```

# 2. 설정값 외부화 (application.yml)

비밀키를 소스에 하드코딩하지 않고 설정/환경변수로 주입한다.
HS256은 **최소 32바이트(256비트) 이상**의 키가 필요하므로, 충분히 긴 키를 Base64로 인코딩해 둔다.

```yaml
jwt:
  secret: ${JWT_SECRET}              # Base64 인코딩된 32바이트 이상 키 (환경변수로 주입)
  access-expiration-ms: 1800000      # 액세스 토큰 만료: 30분
  refresh-expiration-ms: 1209600000  # 리프레시 토큰 만료: 14일
```

> 💡 키 생성 예시: `openssl rand -base64 48` 로 만든 문자열을 `JWT_SECRET` 환경변수에 넣으면 된다.

# 3. JwtTokenProvider — 토큰 생성과 해석

토큰을 **만들고(create)**, **검증·해석(parse)** 하는 책임을 한 곳에 모은다.
jjwt 0.12.x의 새 API를 사용한다.

```java
@Component
public class JwtTokenProvider {

    private final SecretKey key;
    private final long accessExpirationMs;
    private final long refreshExpirationMs;

    public JwtTokenProvider(
            @Value("${jwt.secret}") String secret,
            @Value("${jwt.access-expiration-ms}") long accessExpirationMs,
            @Value("${jwt.refresh-expiration-ms}") long refreshExpirationMs) {
        // Base64 로 인코딩된 키 문자열을 디코딩해 SecretKey 생성
        this.key = Keys.hmacShaKeyFor(Decoders.BASE64.decode(secret));
        this.accessExpirationMs = accessExpirationMs;
        this.refreshExpirationMs = refreshExpirationMs;
    }

    // 로그인 성공 시 액세스 토큰 발급 (권한 포함, 짧은 만료)
    public String createAccessToken(String username, Collection<? extends GrantedAuthority> authorities) {
        // 권한 목록을 콤마로 합쳐 claim 에 담는다. (예: "ROLE_USER,ROLE_ADMIN")
        String roles = authorities.stream()
                .map(GrantedAuthority::getAuthority)
                .collect(Collectors.joining(","));

        Date now = new Date();
        return Jwts.builder()
                .subject(username)          // sub : 사용자 식별자
                .claim("roles", roles)      // 커스텀 claim : 권한
                .claim("type", "access")    // 토큰 종류 구분 (access/refresh 혼용 방지)
                .issuedAt(now)
                .expiration(new Date(now.getTime() + accessExpirationMs))
                .signWith(key)              // 0.12.x : 알고리즘은 키 타입에서 추론
                .compact();
    }

    // 리프레시 토큰 발급 (권한 없음, 긴 만료) — 재발급 용도로만 쓴다
    public String createRefreshToken(String username) {
        Date now = new Date();
        return Jwts.builder()
                .subject(username)
                .claim("type", "refresh")
                .issuedAt(now)
                .expiration(new Date(now.getTime() + refreshExpirationMs))
                .signWith(key)
                .compact();
    }

    // 토큰에서 사용자명(sub) 추출
    public String getUsername(String token) {
        return parseClaims(token).getSubject();
    }

    // 토큰을 해석해 Authentication 객체로 복원
    public Authentication getAuthentication(String token) {
        Claims claims = parseClaims(token);

        String username = claims.getSubject();
        String roles = claims.get("roles", String.class);

        List<SimpleGrantedAuthority> authorities = Arrays.stream(
                        roles == null ? new String[0] : roles.split(","))
                .filter(StringUtils::hasText)
                .map(SimpleGrantedAuthority::new)
                .toList();

        // 비밀번호는 토큰 인증 단계에서 필요 없으므로 null
        return new UsernamePasswordAuthenticationToken(username, null, authorities);
    }

    // 서명/만료 검증
    public boolean validate(String token) {
        try {
            parseClaims(token);
            return true;
        } catch (JwtException | IllegalArgumentException e) {
            // 서명 불일치, 만료, 형식 오류 등
            return false;
        }
    }

    private Claims parseClaims(String token) {
        return Jwts.parser()
                .verifyWith(key)            // 0.12.x : setSigningKey → verifyWith
                .build()
                .parseSignedClaims(token)   // 0.12.x : parseClaimsJws → parseSignedClaims
                .getPayload();              // getBody → getPayload
    }
}
```

> 📌 0.11 → 0.12 주요 변경점: `parserBuilder()` 제거 → `parser()`, `setSigningKey()` → `verifyWith()`,
> `parseClaimsJws()` → `parseSignedClaims()`, `getBody()` → `getPayload()`, 빌더의 `setSubject/setExpiration` → `subject/expiration`.

# 4. 사용자 조회 — UserDetailsService

로그인 시 `AuthenticationManager`가 사용할 사용자 조회 로직이다.
DB에서 사용자를 찾아 `UserDetails`로 반환한다. (권한은 `ROLE_` 접두어를 포함해 저장한다.)

```java
@Service
@RequiredArgsConstructor
public class CustomUserDetailsService implements UserDetailsService {

    private final UserRepository userRepository;

    @Override
    public UserDetails loadUserByUsername(String username) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new UsernameNotFoundException("사용자를 찾을 수 없습니다: " + username));

        // user.getRoles() 예: ["ROLE_USER", "ROLE_ADMIN"]
        List<SimpleGrantedAuthority> authorities = user.getRoles().stream()
                .map(SimpleGrantedAuthority::new)
                .toList();

        return org.springframework.security.core.userdetails.User.builder()
                .username(user.getUsername())
                .password(user.getPassword())   // 반드시 인코딩된 비밀번호
                .authorities(authorities)
                .build();
    }
}
```

# 5. JwtAuthenticationFilter — 요청마다 토큰 해석

요청 헤더의 `Authorization: Bearer <token>` 에서 토큰을 꺼내 검증하고,
유효하면 `SecurityContext`에 인증 정보를 채운다. **요청당 한 번만 실행**되도록 `OncePerRequestFilter`를 상속한다.

```java
@Component
@RequiredArgsConstructor
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtTokenProvider tokenProvider;

    private static final String HEADER = "Authorization";
    private static final String PREFIX = "Bearer ";

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain chain) throws ServletException, IOException {

        String token = resolveToken(request);

        if (token != null && tokenProvider.validate(token)) {
            Authentication authentication = tokenProvider.getAuthentication(token);
            SecurityContextHolder.getContext().setAuthentication(authentication);
        }
        // 토큰이 없거나 유효하지 않으면 인증을 채우지 않고 그대로 통과
        // → 뒤의 권한 검사(authorizeHttpRequests)에서 401/403 으로 걸러진다.
        chain.doFilter(request, response);
    }

    private String resolveToken(HttpServletRequest request) {
        String header = request.getHeader(HEADER);
        if (header != null && header.startsWith(PREFIX)) {
            return header.substring(PREFIX.length());
        }
        return null;
    }
}
```

# 6. SecurityConfig — SecurityFilterChain

Spring Security 6에서는 `WebSecurityConfigurerAdapter` 대신 **`SecurityFilterChain` 빈**을 등록한다.
세션을 끄고, 위에서 만든 JWT 필터를 `UsernamePasswordAuthenticationFilter` 앞에 끼운다.

```java
@Configuration
@EnableWebSecurity
@EnableMethodSecurity   // @PreAuthorize 등 메서드 보안 사용 시
@RequiredArgsConstructor
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtAuthenticationFilter;

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            .csrf(csrf -> csrf.disable())                       // 토큰 기반이라 CSRF 비활성
            .cors(Customizer.withDefaults())
            .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .formLogin(form -> form.disable())
            .httpBasic(basic -> basic.disable())
            .authorizeHttpRequests(auth -> auth                 // antMatchers → requestMatchers
                .requestMatchers("/api/auth/**").permitAll()    // 로그인은 누구나
                .requestMatchers("/api/v1/admin/**").hasRole("ADMIN")
                .requestMatchers("/api/v1/manager/**").hasAnyRole("MANAGER", "ADMIN")
                .requestMatchers("/api/v1/user/**").hasAnyRole("USER", "MANAGER", "ADMIN")
                .anyRequest().authenticated())
            .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    // 로그인 처리를 위해 AuthenticationManager 를 빈으로 노출
    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration config) throws Exception {
        return config.getAuthenticationManager();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }
}
```

> 📌 `hasRole("ADMIN")` 은 내부적으로 `ROLE_ADMIN` 권한을 확인한다. 그래서 토큰 claim·UserDetails 의 권한은
> `ROLE_ADMIN` 처럼 **`ROLE_` 접두어를 포함**해서 다뤄야 한다. (앞의 코드들이 그렇게 맞춰져 있다.)

# 7. 로그인 엔드포인트 — 토큰 발급

`AuthenticationManager.authenticate()`로 아이디/비밀번호를 검증하고, 성공하면 **액세스 토큰 + 리프레시 토큰**을 함께 발급해 응답한다.
리프레시 토큰은 나중에 서버에서 무효화할 수 있도록 **저장해 둔다.**

```java
public record LoginRequest(String username, String password) {}
public record TokenResponse(String accessToken, String refreshToken) {}

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthenticationManager authenticationManager;
    private final JwtTokenProvider tokenProvider;
    private final RefreshTokenStore refreshTokenStore;

    @PostMapping("/login")
    public ResponseEntity<TokenResponse> login(@RequestBody LoginRequest request) {
        // 내부적으로 CustomUserDetailsService + PasswordEncoder 로 검증된다.
        Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.username(), request.password()));

        String accessToken = tokenProvider.createAccessToken(
                authentication.getName(), authentication.getAuthorities());
        String refreshToken = tokenProvider.createRefreshToken(authentication.getName());

        // 리프레시 토큰을 저장 (무효화/회전을 위해)
        refreshTokenStore.save(authentication.getName(), refreshToken);

        return ResponseEntity.ok(new TokenResponse(accessToken, refreshToken));
    }
}
```

# 8. 리프레시 토큰 — 재발급과 무효화

액세스 토큰을 30분처럼 짧게 두면 보안은 좋아지지만, 30분마다 다시 로그인하게 만들 수는 없다.
그래서 **만료가 긴 리프레시 토큰**을 따로 두고, 액세스 토큰이 만료되면 그것으로 **새 액세스 토큰을 재발급**한다.

핵심은 리프레시 토큰을 **서버에 저장**한다는 점이다. JWT는 그 자체로는 서버에서 취소할 수 없는데,
저장해 두면 "이 리프레시 토큰이 아직 유효한가"를 서버가 통제할 수 있어 **로그아웃·강제 만료**가 가능해진다.

## 8.1 리프레시 토큰 저장소

여기서는 만료 시간(TTL)을 자연스럽게 줄 수 있는 **Redis**를 예로 든다. (DB 테이블로 둬도 된다.)
`username → refreshToken` 으로 저장하고, 재발급 때마다 값을 교체(회전)한다.

```java
@Component
@RequiredArgsConstructor
public class RefreshTokenStore {

    private final StringRedisTemplate redis;

    @Value("${jwt.refresh-expiration-ms}")
    private long refreshExpirationMs;

    private String key(String username) {
        return "refresh:" + username;
    }

    public void save(String username, String refreshToken) {
        redis.opsForValue().set(key(username), refreshToken,
                Duration.ofMillis(refreshExpirationMs));
    }

    // 저장된 값과 정확히 일치하는지 (탈취된 옛 토큰 재사용 차단)
    public boolean isValid(String username, String refreshToken) {
        String saved = redis.opsForValue().get(key(username));
        return saved != null && saved.equals(refreshToken);
    }

    public void delete(String username) {     // 로그아웃 시 호출
        redis.delete(key(username));
    }
}
```

## 8.2 재발급 엔드포인트 (회전 포함)

리프레시 토큰을 받아 **서명·만료 검증 → 저장소 일치 확인 → 새 토큰 발급 → 리프레시 토큰 회전**까지 한다.
회전(rotation)을 하면, 한 번 쓴 리프레시 토큰은 즉시 무효가 되어 탈취 시 피해를 줄일 수 있다.

```java
public record RefreshRequest(String refreshToken) {}

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class TokenRefreshController {

    private final JwtTokenProvider tokenProvider;
    private final RefreshTokenStore refreshTokenStore;
    private final CustomUserDetailsService userDetailsService;

    @PostMapping("/refresh")
    public ResponseEntity<TokenResponse> refresh(@RequestBody RefreshRequest request) {
        String refreshToken = request.refreshToken();

        // 1) 서명·만료 검증 (jjwt)
        if (!tokenProvider.validate(refreshToken)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        String username = tokenProvider.getUsername(refreshToken);

        // 2) 저장소에 있는 값과 일치하는지 (회전된 옛 토큰/로그아웃된 토큰 거부)
        if (!refreshTokenStore.isValid(username, refreshToken)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        // 3) 최신 권한으로 새 액세스 토큰 발급
        UserDetails user = userDetailsService.loadUserByUsername(username);
        String newAccessToken = tokenProvider.createAccessToken(username, user.getAuthorities());

        // 4) 리프레시 토큰 회전 — 새로 발급하고 저장소 값 교체
        String newRefreshToken = tokenProvider.createRefreshToken(username);
        refreshTokenStore.save(username, newRefreshToken);

        return ResponseEntity.ok(new TokenResponse(newAccessToken, newRefreshToken));
    }
}
```

> 📌 재발급 때 권한을 토큰에서 그대로 베끼지 않고 `loadUserByUsername` 으로 **다시 조회**하는 이유: 그래야 그 사이 바뀐 권한(예: 등급 강등)이 새 액세스 토큰에 반영된다.

## 8.3 로그아웃

로그아웃은 저장된 리프레시 토큰을 지우는 것으로 처리한다. 그러면 그 토큰으로는 더 이상 재발급이 안 된다.
(이미 발급된 액세스 토큰은 짧은 만료로 곧 사라지므로 보통은 이 정도로 충분하다. 즉시 차단이 필요하면 액세스 토큰 블랙리스트를 병행한다.)

```java
@PostMapping("/logout")
public ResponseEntity<Void> logout(Authentication authentication) {
    refreshTokenStore.delete(authentication.getName());
    return ResponseEntity.noContent().build();
}
```

> 💡 `type` claim 으로 액세스/리프레시를 구분해 둔 이유: 리프레시 토큰을 일반 API 인증(`Authorization: Bearer`)에 그대로 쓰는 오용을 막기 위해서다. 인증 필터에서 `type=access` 만 받도록 한 번 더 거르면 더 안전하다.

# 9. 권한 확인 — 컨트롤러에서 받아 쓰기

`SecurityFilterChain`의 URL 단위 규칙으로 1차로 막히고, 컨트롤러에서는 인증 정보를 바로 꺼내 쓸 수 있다.

```java
@RestController
@RequestMapping("/api/v1")
public class SampleController {

    // 로그인한 사용자 본인 정보 (USER 이상)
    @GetMapping("/user/me")
    public Map<String, Object> me(Authentication authentication) {
        return Map.of(
            "username", authentication.getName(),
            "authorities", authentication.getAuthorities()
        );
    }

    // URL 규칙(hasRole("ADMIN"))으로 이미 ADMIN 만 도달 가능
    @GetMapping("/admin/dashboard")
    public String adminDashboard() {
        return "관리자 전용 화면";
    }

    // 메서드 단위로도 막을 수 있다 (@EnableMethodSecurity 필요)
    @PreAuthorize("hasRole('MANAGER')")
    @GetMapping("/manager/report")
    public String managerReport() {
        return "매니저 리포트";
    }
}
```

# 10. 동작 확인 (curl)

```bash
# 1) 로그인 → 액세스/리프레시 토큰 발급
RES=$(curl -s -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"1234"}')
ACCESS=$(echo "$RES" | jq -r .accessToken)
REFRESH=$(echo "$RES" | jq -r .refreshToken)

# 2) 발급받은 액세스 토큰으로 권한이 필요한 API 호출
curl -s http://localhost:8080/api/v1/admin/dashboard \
  -H "Authorization: Bearer $ACCESS"

# 3) 액세스 토큰이 만료되면 리프레시 토큰으로 재발급
curl -s -X POST http://localhost:8080/api/auth/refresh \
  -H "Content-Type: application/json" \
  -d "{\"refreshToken\":\"$REFRESH\"}"

# 4) 토큰 없이 호출하면 401/403
curl -i -s http://localhost:8080/api/v1/admin/dashboard
```

# 11. 운영에서 더 챙길 점

기본 흐름은 위로 끝이지만, 실제 서비스라면 아래도 고려해야 한다.

* **리프레시 토큰 회전·무효화** — 위 8번처럼 리프레시 토큰을 저장소에 두고 회전시키면, 로그아웃·강제 만료와 탈취 대응이 가능하다. 즉시 차단까지 필요하면 액세스 토큰 블랙리스트를 병행한다.
* **예외 응답 정리** — 인증 실패/권한 부족을 일관된 JSON으로 내려주려면 `AuthenticationEntryPoint`(401), `AccessDeniedHandler`(403)를 구현해 등록한다.
* **비밀키 관리** — 키는 환경변수/시크릿 매니저로 관리하고, 환경별로 다른 키를 쓴다. 절대 소스에 하드코딩하지 않는다.
* **리프레시 토큰 전달 방식** — 위 예시는 본문(JSON)으로 주고받지만, 보안을 더 챙기려면 `HttpOnly` 쿠키로 내려 XSS로부터 토큰을 보호하는 방법도 많이 쓴다.

# 12. 결론

예전 글과 비교하면, Spring Security 6에서는 `SecurityFilterChain` 빈 + 람다 DSL로 설정이 훨씬 깔끔해졌고,
JWT 처리도 jjwt 0.12.x의 `verifyWith`/`parseSignedClaims` 로 명확해졌다.
정리하면 **로그인은 `AuthenticationManager`에 맡기고, 발급/검증은 `JwtTokenProvider`에 모으고, 요청마다 `OncePerRequestFilter`로 `SecurityContext`를 채우는** 구조만 잡으면 나머지는 권한 규칙 선언으로 끝난다.
