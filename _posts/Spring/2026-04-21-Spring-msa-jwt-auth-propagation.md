---
layout: post
title: MSA에서 JWT 인증·권한 전파하기 (게이트웨이 검증 + @PreAuthorize)
date: 2026-04-21
Author: Geon Son
categories: Spring
tags: [MSA, JWT, API Gateway, Authentication, Spring Security]
comments: true
toc: true
---

> 앞 글 [Spring Security 6 + JWT](/Spring-security-jwt-modern) 은 **단일 서비스(모놀리식)** 기준이었다.
> 하지만 서비스가 여러 개로 쪼개진 **MSA**에서는 "토큰을 어디서 검증하고, 권한을 어떻게 각 서비스까지 전달할 것인가"가 새로운 문제가 된다.
> 이 글은 실제 사이드 프로젝트(주식 MSA)에서 쓴 패턴 — **게이트웨이에서 JWT를 한 번만 검증하고, 신뢰 헤더로 변환해 각 서비스에 전파한 뒤, 서비스에서는 `@PreAuthorize`로 권한을 확인**하는 구조를 정리한다.

# 문제 — MSA에서 인증을 어디서 하나?

서비스가 여러 개일 때, 모든 서비스가 각자 JWT를 파싱·검증하게 만들면

- 비밀키가 모든 서비스에 흩어지고,
- 토큰 구조가 바뀌면 전 서비스를 고쳐야 하고,
- 같은 검증 로직이 N번 중복된다.

그래서 흔히 쓰는 방식이 **"게이트웨이에서 토큰을 한 번만 검증하고, 검증 결과(사용자·권한)를 내부 신뢰 헤더로 바꿔 뒤쪽 서비스에 넘기는"** 것이다.

```
[외부]  Authorization: Bearer <JWT>
   │
   ▼
[Gateway]  JWT 검증 (여기서만!) 
   │        → X-User-Id, X-User-Role 헤더로 변환
   │        → X-Gateway-Request: <내부 비밀키> 동봉 (이 헤더가 "게이트웨이가 보증함"의 표시)
   ▼
[각 서비스]  헤더를 신뢰해 SecurityContext 복원
   │          → @PreAuthorize("hasRole('ADMIN')") 등으로 권한 확인
   ▼
[비즈니스 로직]
```

각 서비스는 **JWT를 직접 파싱하지 않는다.** 게이트웨이가 보증한 헤더만 믿는다.
대신 그 "믿어도 되는가"를 보장하는 장치가 필요한데, 그게 아래의 **신뢰 헤더 + 내부 비밀키** 조합이다.

# 1. 게이트웨이 — JWT를 한 번만 검증하고 헤더로 변환

Spring Cloud Gateway(WebFlux)의 `GlobalFilter`로 구현한다. 핵심은 세 가지다.

1. **외부에서 들어온 신뢰 헤더를 무조건 먼저 제거** — 공격자가 `X-User-Role: ROLE_ADMIN` 을 직접 붙여 보내는 스푸핑을 막는다.
2. JWT를 검증(여기서는 HS512)하고,
3. 성공하면 `X-User-Id`, `X-User-Role`, 그리고 "게이트웨이가 보증함"을 뜻하는 `X-Gateway-Request: <내부 비밀키>` 를 붙여 전달한다.

```java
@Component
public class JwtGlobalFilter implements GlobalFilter, Ordered {

    private final ReactiveJwtDecoder reactiveDecoder;

    @Value("${INTERNAL_SECRET}")
    private String internalSecret;

    public JwtGlobalFilter(@Value("${jwt.secret}") String base64Secret) {
        byte[] keyBytes = Base64.getDecoder().decode(base64Secret);
        SecretKey key = new SecretKeySpec(keyBytes, "HmacSHA512");
        this.reactiveDecoder = NimbusReactiveJwtDecoder
                .withSecretKey(key)
                .macAlgorithm(MacAlgorithm.HS512)
                .build();
    }

    @Override
    public Mono<Void> filter(ServerWebExchange exchange, GatewayFilterChain chain) {
        String path = exchange.getRequest().getURI().getPath();

        // ① 외부가 보낸 신뢰 헤더는 무조건 제거 (스푸핑 차단)
        ServerWebExchange stripped = exchange.mutate()
                .request(exchange.getRequest().mutate()
                        .headers(h -> {
                            h.remove("X-Gateway-Request");
                            h.remove("X-User-Id");
                            h.remove("X-User-Role");
                        })
                        .build())
                .build();

        if (isOpenPath(path)) {           // 로그인/회원가입 등 인증 불필요 경로
            return chain.filter(stripped);
        }

        String authHeader = stripped.getRequest().getHeaders().getFirst(HttpHeaders.AUTHORIZATION);
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            exchange.getResponse().setStatusCode(HttpStatus.UNAUTHORIZED);
            return exchange.getResponse().setComplete();
        }
        String token = authHeader.substring(7);

        // ② JWT 검증 (MSA에서 토큰 검증은 여기 한 곳에서만)
        return reactiveDecoder.decode(token)
                .flatMap(jwt -> {
                    String userId = jwt.getSubject();
                    String role = jwt.getClaimAsString("role");

                    // ③ 검증 결과를 신뢰 헤더로 변환 + 게이트웨이 보증 표시
                    ServerHttpRequest mutated = stripped.getRequest().mutate()
                            .header("X-Gateway-Request", internalSecret)
                            .header("X-User-Id", userId)
                            .header("X-User-Role", role)
                            .build();
                    return chain.filter(stripped.mutate().request(mutated).build());
                })
                .onErrorResume(ex -> {     // 만료/위조 → 401
                    exchange.getResponse().setStatusCode(HttpStatus.UNAUTHORIZED);
                    return exchange.getResponse().setComplete();
                });
    }

    @Override
    public int getOrder() { return -1; }   // 가장 먼저 실행
}
```

> 📌 포인트: 스웨거(`/v3/api-docs`, `/swagger-ui`)는 open 경로라도 외부에 그냥 노출하면 위험하므로, 게이트웨이에서 별도로 "항상 JWT 필요"로 막아두는 것이 좋다.

# 2. 각 서비스 — 헤더로 SecurityContext 복원

게이트웨이가 넘긴 헤더를 받아 `SecurityContext`에 인증 정보를 채우는 `OncePerRequestFilter`다.
**여기서 `SecurityContext`를 채워줘야 뒤에서 `@PreAuthorize`가 동작**한다.

핵심 보안 규칙: **`X-Gateway-Request` 값이 내부 비밀키와 정확히 일치할 때만** `X-User-*` 헤더를 신뢰한다.

```java
public class InternalUserFilter extends OncePerRequestFilter {

    private final String internalSecret;

    public InternalUserFilter(String internalSecret) {
        if (internalSecret == null || internalSecret.isBlank()) {
            throw new IllegalArgumentException("internalSecret required");
        }
        this.internalSecret = internalSecret;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response,
                                    FilterChain chain) throws ServletException, IOException {

        String userId = request.getHeader("X-User-Id");
        String userRole = request.getHeader("X-User-Role");
        String gatewayRequest = request.getHeader("X-Gateway-Request");

        // 게이트웨이가 보증한 요청인지 확인 (단순 "true" 같은 값은 거부, 키 정확 매칭만 신뢰)
        boolean isGatewayVerified = internalSecret.equals(gatewayRequest);

        if (isGatewayVerified && userId != null) {
            var authorities = List.of(
                    new SimpleGrantedAuthority(userRole != null ? userRole : "ROLE_USER"));

            // principal 에 userId 를 담아두면 컨트롤러에서 auth.getPrincipal() 로 바로 꺼내 쓸 수 있다
            var authentication = new UsernamePasswordAuthenticationToken(
                    Long.valueOf(userId), null, authorities);

            SecurityContextHolder.getContext().setAuthentication(authentication);
        }

        chain.doFilter(request, response);
    }
}
```

# 3. 공통 보안 설정 + @PreAuthorize

서비스마다 똑같은 설정을 반복하지 않도록, 공통 모듈에 `SecurityFilterChain`을 두고 위 필터를 등록한다.
`@EnableMethodSecurity` 가 있어야 `@PreAuthorize` 가 활성화된다.

```java
@Configuration
@EnableWebSecurity
@EnableMethodSecurity     // ← 이게 있어야 @PreAuthorize 동작
public class InternalSecurityConfig {

    @Value("${INTERNAL_SECRET}")
    private String internalSecret;

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            .csrf(AbstractHttpConfigurer::disable)
            .formLogin(AbstractHttpConfigurer::disable)
            .httpBasic(AbstractHttpConfigurer::disable)
            .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/actuator/**", "/internal/**").permitAll()  // URL은 풀고, 권한은 @PreAuthorize로
                .anyRequest().authenticated())
            .addFilterBefore(new InternalUserFilter(internalSecret),
                             UsernamePasswordAuthenticationFilter.class);
        return http.build();
    }
}
```

이제 컨트롤러에서는 **메서드/클래스 단위로 어노테이션 한 줄**이면 권한이 걸린다.
URL 규칙이 아니라 어노테이션으로 권한을 표현하므로, 비즈니스 코드 옆에서 권한 정책이 한눈에 보인다.

```java
@RestController
@RequestMapping("/analysis")
public class AiController {

    @GetMapping("/chat")
    @PreAuthorize("isAuthenticated()")                 // 로그인만 되어 있으면 OK
    public Mono<String> chat(...) { ... }

    @PostMapping("/telegram")
    @PreAuthorize("hasAnyRole('PREMIUM', 'ADMIN')")    // 프리미엄/관리자만
    public Mono<String> send(Authentication auth, ...) {
        Long userId = (Long) auth.getPrincipal();      // 필터에서 넣어준 userId
        ...
    }
}

// 클래스 전체에 걸 수도 있다
@RestController
@RequestMapping("/admin")
@PreAuthorize("hasRole('ADMIN')")                      // 이 컨트롤러 전부 ADMIN 전용
public class AdminController { ... }
```

> 📌 `hasRole('ADMIN')` 은 내부적으로 `ROLE_ADMIN` 권한을 확인한다. 그래서 게이트웨이가 넘기는 role claim, 필터가 만드는 권한 문자열을 `ROLE_ADMIN` 처럼 **`ROLE_` 접두어 포함**으로 맞춰야 한다.

# 4. 서비스 간 직접 호출 — 내부 비밀키

게이트웨이를 거치지 않고 **서비스가 서비스를 직접 호출**(예: AI 서비스 → Auth 서비스)하는 경우도 있다.
이때는 사용자 토큰이 없으므로, 호출하는 쪽이 `X-Internal-Request: <내부 비밀키>` 를 실어 보내고,
받는 쪽은 그 값이 일치하면 **`ROLE_ADMIN` 시스템 호출**로 처리한다.

```java
// 받는 서비스의 필터 (InternalUserFilter 안에 함께 둘 수도 있음)
String internalRequest = request.getHeader("X-Internal-Request");
if (internalSecret.equals(internalRequest)) {
    var auth = new UsernamePasswordAuthenticationToken(
            0L, null, List.of(new SimpleGrantedAuthority("ROLE_ADMIN")));
    SecurityContextHolder.getContext().setAuthentication(auth);
}
```

여기서 중요한 건 **`"true"` 같은 단순 리터럴이 아니라 실제 비밀키 값과 정확히 일치할 때만 신뢰**한다는 점이다.
Docker 내부 네트워크에 침투한 공격자가 헤더만 흉내 내 측면 이동(lateral movement)하는 것을 막는다.

# 5. /internal 전용 엔드포인트 가드

배치 트리거, 캐시 초기화 같은 **내부 전용 엔드포인트**는 `/internal/**` 로 모아두고,
`X-Internal-Request` 비밀키가 맞지 않으면 **403**으로 막는 전용 필터를 둔다.

```java
public class InternalEndpointGuardFilter extends OncePerRequestFilter {
    @Override
    protected void doFilterInternal(HttpServletRequest req, HttpServletResponse res, FilterChain chain)
            throws ServletException, IOException {
        if (!req.getRequestURI().startsWith("/internal/")) {
            chain.doFilter(req, res);
            return;
        }
        if (!internalSecret.equals(req.getHeader("X-Internal-Request"))) {
            res.setStatus(HttpServletResponse.SC_FORBIDDEN);   // 비밀키 불일치 → 차단
            return;
        }
        // 통과 시 ROLE_ADMIN 으로 처리
        ...
    }
}
```

# 6. 이 패턴의 보안 포인트 정리

| 항목 | 왜 중요한가 |
|------|-------------|
| **외부 신뢰 헤더 선제거** | 게이트웨이가 `X-User-*`/`X-Gateway-Request`를 무조건 지운 뒤 자기가 다시 세팅 → 외부 스푸핑 원천 차단 |
| **비밀키 정확 매칭만 신뢰** | `"true"` 같은 값 거부, `INTERNAL_SECRET` 정확 일치만 통과 → 내부망 침투자의 측면 이동 차단 |
| **토큰 검증은 게이트웨이 한 곳** | 비밀키·검증 로직 중앙화. 서비스는 헤더만 신뢰 |
| **@EnableMethodSecurity + @PreAuthorize** | URL 매칭이 아니라 메서드 옆에 권한 선언 → 정책 가시성↑ |
| **STATELESS** | 세션 없이 요청마다 헤더로 인증 → 수평 확장에 유리 |
| **문서 경로 보호** | 스웨거/api-docs는 게이트웨이에서 별도 JWT 필요 처리 |

# 7. 주의할 점

* **비밀키가 모든 신뢰의 근거다.** `INTERNAL_SECRET` 이 새면 누구나 게이트웨이를 사칭할 수 있으므로, 환경변수/시크릿 매니저로 관리하고 환경별로 다르게 둔다.
* **헤더만 신뢰하므로, 서비스 포트가 외부에 직접 노출되면 안 된다.** 외부 트래픽은 반드시 게이트웨이만 거치도록 네트워크를 닫아야 이 모델이 성립한다.
* **권한 변경 즉시 반영이 안 된다.** 권한이 토큰/헤더에 실려 오므로, 사용자의 role을 바꿔도 기존 토큰이 만료될 때까지는 옛 권한이 유지된다. 즉시 무효화가 필요하면 짧은 만료 + 리프레시 토큰이나 블랙리스트를 병행한다.
* **로컬 개발 편의.** 로컬에서는 게이트웨이/헤더 없이 직접 호출하고 싶을 때가 많은데, `@Profile("local")` 로 `permitAll` 인 별도 `SecurityFilterChain`을 두면 개발이 편하다. (운영 프로파일에만 헤더 검증 적용)

# 8. 결론

모놀리식에서는 한 앱이 토큰 발급·검증·권한 확인을 다 했지만, MSA에서는 그 책임을 나눈다.
**게이트웨이는 "검증과 신뢰 헤더 발급"**, **각 서비스는 "헤더로 SecurityContext 복원 + `@PreAuthorize` 권한 확인"** 으로 역할을 쪼개면,
비밀키와 검증 로직은 한 곳에 모이고 서비스 코드는 어노테이션 한 줄로 권한을 표현할 수 있다.
관건은 결국 **"그 헤더를 믿어도 되는가"** 를 보장하는 것 — 외부 헤더 선제거 + 내부 비밀키 정확 매칭이 그 답이다.
