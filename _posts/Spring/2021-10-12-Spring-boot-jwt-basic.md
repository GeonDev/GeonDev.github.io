---
layout: post
title: Spring Security JWT 구현해 보기
date: 2021-10-12
Author: Geon Son
categories: Spring
tags: [Spring]
comments: true
toc: true
---

> [소스코드](https://github.com/GeonDev/Springboot-JWT)
> [참고한 강의](https://www.youtube.com/playlist?list=PL93mKxaRDidERCyMaobSLkvSPzYtIk0Ah)


스프링 시큐리티는 항상 어렵고 수많은 필터들이 엮어 있어서 공부하기 시작하면 끝이 없습니다.
이전에는 세션 기반의 시큐리티를 적용하였는데 회사의 프로젝트는 JWT를 이용한 SSO를 구현하고 있어 공부를 해보았습니다.

# 1. CorsConfig 생성
  CORS(Cross-Origin Resource Sharing)는 교차 출처 리소스 공유 라고 번역하고 간단하게 생각하면
  허용된 주소에서 받은 리소스만 사용할수 있다는 것입니다. 이부분을 스프링 시큐리티에서 해결해야 하는 이유는 시큐리티를
  사용하면서 JWT, 즉 JSON을 사용하여야 하고 JSON 정보를 받는 것을 허용 하여야 하기 때문입니다.

```
package com.example.jwt.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import org.springframework.web.filter.CorsFilter;

@Configuration
public class CorsConfig {

    @Bean
    public CorsFilter corsFilter() {
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        CorsConfiguration config = new CorsConfiguration();
        //서버 응답시 JSON을 허용할지
        config.setAllowCredentials(true);
        //모든 IP 응답 허용
        config.addAllowedOrigin("*");
        //모든 header 응답허용
        config.addAllowedHeader("*");
        //모든 메소드(get, post.. ) 응답 허용
        config.addAllowedMethod("*");

        source.registerCorsConfiguration("/api/**", config);
        return new CorsFilter(source);
    }
}

```

CORS 설정은 보안과 관련있는 사항이기 때문에 원래는 여러 제한을 두고 설정해야 하지만 예제 이기 때문에 모든 입력을 허용하는 쪽으로
설정하였습니다. 이렇게 CorsConfig를 생성한 이후에 SecurityConfig를 설정하게 됩니다.

하지만 우선 어떻게 필터를 생성하고 적용하는지 먼저 정리하겠습니다.

# 2. 커스텀 필터 생성 및 적용

```
package com.example.jwt.filter;

import javax.servlet.*;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.io.PrintWriter;

public class MyFilter1 implements Filter {
    @Override
    public void doFilter(ServletRequest servletRequest, ServletResponse servletResponse, FilterChain filterChain) throws IOException, ServletException {
        System.out.println("필터 1");

        HttpServletRequest req = (HttpServletRequest) servletRequest;
        HttpServletResponse res = (HttpServletResponse) servletResponse;


        if(req.getMethod().equals("POST")){
            String headerAuth =  req.getHeader("Authrization");
            System.out.println("headerAuth(POST) : "+ headerAuth);

            //토큰의 이름이 COS 일때만 필터가 이어짐
            if(headerAuth.equals("COS")){
                filterChain.doFilter(req, res);
            }else{
                PrintWriter out = res.getWriter();
                System.out.println("인증 안됨");
            }
        }
    }
}
```

커스텀 필터를 만들때는 Filter interface를 이용하여 생성하게 됩니다.  위 필터는 POST 방식으로 들어온 request에서
헤더의 Authrization 항목 값을 출력합니다. 이 Authrization 값이 COS 라면 필터를 이어가고 아니라면 필터를 중단시켜서
스프링 시큐리티 과정을 더이상 진행하지 않게 합니다.

이렇게 만들어진 필터를 적용하려고 하기 위해서는 스프링 시큐리티 필터 중간에 적용하는 방법을 사용합니다.
```
//시큐리티 필터 실행 전에 MyFilter1() 실행
http.addFilterBefore(new MyFilter1(), SecurityContextPersistenceFilter.class);

//시큐리티 필터 실행 후에 MyFilter1() 실행
http.addFilterAfter(new MyFilter1(), SecurityContextPersistenceFilter.class);
```

커스텀 필터는 addFilter를 사용하여 특정 스프링 시큐리티 필터 앞, 뒤에 적용할 수 있습니다.

# 3. SecurityConfig 설정

SecurityConfig에서 JWT를 적용하기 위해서 설정하는 것은 앞에서 설정한 CORS에 대한 설정과
스프링시큐리티의 기본 로그인 폼을 사용하지 않겠다는 선언, 세션을 사용하지 않는다는 선언 입니다.

이외에 설정은 특정 URL에 대한 권한을 설정하는 것과 이외 URL은 전부 풀어주는 것
그리고 csrf 설정을 사용하지 않는 것 입니다.


```
package com.example.jwt.config;

import com.example.jwt.filter.JwtAuthenticationFilter;
import com.example.jwt.filter.JwtAuthorizationFilter;
import com.example.jwt.filter.MyFilter1;
import com.example.jwt.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configuration.WebSecurityConfigurerAdapter;
import org.springframework.security.config.http.SessionCreationPolicy;

import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.web.filter.CorsFilter;

@Configuration
@EnableWebSecurity
@RequiredArgsConstructor
public class SecurityConfig extends WebSecurityConfigurerAdapter {

    private final CorsFilter corsFilter;

    private UserRepository userRepository;

    //스프링 IOC에 패스워드 인코더를 등록시킨다.
    @Bean
    public BCryptPasswordEncoder passwordEncoder(){
        return new BCryptPasswordEncoder();
    }


    @Override
    protected void configure(HttpSecurity http) throws Exception {

        http.csrf().disable();
        //세션을 사용하지 않겠다.
        http.sessionManagement().sessionCreationPolicy(SessionCreationPolicy.STATELESS)
        .and()        
        .addFilter(corsFilter) //모든 요청이 corsFilter를 거쳐 진행된다.
        .formLogin().disable()
        .httpBasic().disable()
                .addFilter(new JwtAuthenticationFilter(authenticationManager()))
                .addFilter(new JwtAuthorizationFilter(authenticationManager(),userRepository))
        .authorizeRequests()
        .antMatchers("/api/v1/user/**").access("hasRole('ROLE_USER') or hasRole('ROLE_MANAGER') or hasRole('ROLE_ADMIN')")
                .antMatchers("/api/v1/manager/**").access("hasRole('ROLE_MANAGER') or hasRole('ROLE_ADMIN')")
                .antMatchers("/api/v1/admin/**").access("hasRole('ROLE_ADMIN')")
        .anyRequest().permitAll();
    }
}

```

## 3.1. 스프링 시큐리티 적용을 위한 기본 모델 생성
스프링 시큐리티를 적용하기 위해서는 기본적으로 UserDetails 클래스가 있어야 합니다.
UserDetails는 시큐리티의 요구사항에 따라 값을 반환 값을 주는 역할을 수행합니다.
기능별 자세한 설명은 하지 않고 넘어가겠습니다. UserDetails을 그냥 상속하는 것 보다는 다른 정보를 넣고 반환하는 것을
좀 더 쉽게하기 위하여 UserDetails을 상속하는 클래스를 생성합니다.

```
package com.example.jwt.auth;

import com.example.jwt.model.User;
import lombok.Data;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.util.ArrayList;
import java.util.Collection;

@Data
public class PrincipalDetail implements UserDetails {
    private User user;

    public PrincipalDetail(User user) {
        this.user = user;
    }

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        Collection<GrantedAuthority> authorities = new ArrayList<>();
        user.getRoleList().forEach(i->{
            authorities.add(()-> i);
        });
        return authorities;
    }

    public String getPassword() {
        return user.getPassword();
    }

    @Override
    public String getUsername() {
        return user.getUsername();
    }

    //아래 시큐리티 설정은 모두 true로 설정한다.-> 차후 확인을 위해

    @Override
    public boolean isAccountNonExpired() {
        return true;
    }

    @Override
    public boolean isAccountNonLocked() {
        return true;
    }

    @Override
    public boolean isCredentialsNonExpired() {
        return true;
    }

    @Override
    public boolean isEnabled() {
        return true;
    }
}

```

이렇게 생성한 PrincipalDetail을 반환하기 위하여 별도의 서비스를 생성합니다.
Service에는 특별한 기능이 없기 때문에 어떻게 구현하였다 정도만 언급하겠습니다.

loadUserByUsername() 메서드는 유저 이름을 받아 로그인 처리를 하고 결과를 반환하는 역할을 수행합니다.
만약에 유저 정보가 있다면 PrincipalDetail을 반환합니다.

```
package com.example.jwt.auth;

import com.example.jwt.model.User;
import com.example.jwt.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class PrincipalService implements UserDetailsService {

    private final UserRepository userRepository;

    @Override
    public UserDetails loadUserByUsername(String userName) throws UsernameNotFoundException {
        User user = userRepository.findByUsername(userName);
        return new PrincipalDetail(user);
    }
}

```

# 4. JwtAuthenticationFilter 필터 생성

일반적인 스프링 시큐리티라면 로그인폼을 이용하여 로그인을 수행하지만 우리는 시큐리티의 로그인폼을 막아버렸기 때문에
적용할 수 없습니다. 그래서 강제로 UsernamePasswordAuthenticationFilter를 불러와서 로그인을 수행하게 됩니다.

만약 로그인을 수행하게 된다면 이후에 JWT토큰을 생성할수 있습니다.
이 과정에서 JWT에 값을 넣어주어서 반환할 때 사용할수 있는데 토큰의 이름, id, username 그리고
비밀키 값을 넣을 수 있습니다.

```
package com.example.jwt.filter;

import java.util.Date;
import com.example.jwt.auth.PrincipalDetail;
import com.example.jwt.model.User;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

import javax.servlet.FilterChain;
import javax.servlet.ServletException;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import java.io.IOException;

import com.auth0.jwt.JWT;
import com.auth0.jwt.algorithms.Algorithm;

//로그인을 하고 JWT토큰을 생성해주는 필터(인증 요청이 있을때 작동)
//스프링 시큐리티 필터가 username. password 전송시 작동함
//내가 강제로 필터를 등록할때 AuthenticationManager를 요구함
@RequiredArgsConstructor
public class JwtAuthenticationFilter extends UsernamePasswordAuthenticationFilter {
    private final AuthenticationManager authenticationManager;

    @Override
    public Authentication attemptAuthentication(HttpServletRequest request, HttpServletResponse response) throws AuthenticationException {
        System.out.println("JWT 로그인 필터 접근");

        try {
            //JSON을 파싱 하여 유저 클래스에 넣어줌
            ObjectMapper om = new ObjectMapper();
            User user = om.readValue(request.getInputStream(), User.class);

            //토큰 생성
            UsernamePasswordAuthenticationToken authenticationToken = new UsernamePasswordAuthenticationToken(user.getUsername(), user.getPassword());

            //PrincipalDetailService의 loadUserByUsername 실행 -> 로그인 성공시 authentication 리턴
            Authentication authentication = authenticationManager.authenticate(authenticationToken);

            //정상적으로 로그인이 되었는지 데이터를 꺼내어 확인 할수 있다.
            //PrincipalDetail principalDetail = (PrincipalDetail)authentication.getPrincipal();
            //System.out.println(principalDetail.getUser().getUsername());

            //authentication 객체를 return하면 세션에 저장된다.(권한 관리를 편하게 하기 위해 사용)
            return authentication;

        } catch (IOException e) {
            e.printStackTrace();
        }
        return null;
    }

    // attemptAuthentication 인증이 정상적으로 실행된 이후에 실행됨
    // JWT 토큰을 만들어서 request한 사용자에게 JWT를 전달
    @Override
    protected void successfulAuthentication(HttpServletRequest request, HttpServletResponse response, FilterChain chain, Authentication authResult) throws IOException, ServletException {
        PrincipalDetail principalDetail = (PrincipalDetail)authResult.getPrincipal();

        String jwtToken = JWT.create()
                //토큰의 이름 -> 큰 의미는 없다.
                .withSubject(principalDetail.getUsername())
                //만료 시간 -> 보통 10초로 잡음
                .withExpiresAt(new Date(System.currentTimeMillis()+(60000)*30))
                //토큰에 넣을 값
                .withClaim("id", principalDetail.getUser().getId())
                .withClaim("username", principalDetail.getUser().getUsername())
                //서버 비밀키 hash 암호화 사용
                .sign(Algorithm.HMAC512("cos"));

        response.addHeader("Authorization", "Bearer "+jwtToken);
    }
}

```

# 5. JwtAuthenticationFilter 필터 생성

JwtAuthorizationFilter는 생성된 JWT 토큰을 판단하는 기능을 수행합니다.
전달 받은 JWT토큰에서 데이터를 확인하고 비밀키를 통해 정보를 해석한 후에 principalDetails을 생성하고
생성된 principalDetails을 Authentication객체에 넣어 데이터를 저장하게 합니다.

Authentication객체는 세션을 사용하게 되고  반드시 Authentication객체에 데이터를 넣을 필요는 없습니다.
다만 인증 정보를 조금 쉽게 관리하고 권한을 받아오기 위하여 사용합니다.

```
package com.example.jwt.filter;

import com.auth0.jwt.algorithms.Algorithm;
import com.example.jwt.auth.PrincipalDetail;
import com.example.jwt.model.User;
import com.example.jwt.repository.UserRepository;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.www.BasicAuthenticationFilter;

import javax.servlet.FilterChain;
import javax.servlet.ServletException;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import java.io.IOException;

import com.auth0.jwt.JWT;

//시큐리티 필터중 BasicAuthenticationFilter를 사용
//권한, 인증이 필요한 주소를 요청하였을 경우 해당 필터를 타게된다.
public class JwtAuthorizationFilter extends BasicAuthenticationFilter {

    private UserRepository userRepository;

    public JwtAuthorizationFilter(AuthenticationManager authenticationManager, UserRepository userRepository) {
        super(authenticationManager);
        this.userRepository = userRepository;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain) throws IOException, ServletException {

        String jwtHeader = request.getHeader("Authorization");

        if(jwtHeader == null || !jwtHeader.startsWith("Bearer ")){
            chain.doFilter(request, response);
            return;
        }

        String token = jwtHeader.replace(jwtHeader,"Bearer ");

        String username = JWT.require(Algorithm.HMAC512("cos")).build().verify(token).getClaim("username").asString();

        if(username !=null || !username.equals("")){
            User user = userRepository.findByUsername(username);

            //전달 받은 유저정보로 PrincipalDetail을 생성
            PrincipalDetail principalDetails = new PrincipalDetail(user);

            //JWT토큰 서명을 통하여 서명이 정상이면 객체를 생성한다.
            Authentication authentication = new UsernamePasswordAuthenticationToken(principalDetails,null, principalDetails.getAuthorities());

            // 강제로 시큐리티의 세션에 접근하여 값 저장
            SecurityContextHolder.getContext().setAuthentication(authentication);
        }


        super.doFilterInternal(request, response, chain);
    }
}

```

# 6. 결론
스프링 시큐티리를 통하여 특히 JWT를 이용하는 기본적인 방법을 정리해 보았습니다. 아직도 어렵고... 필터는 많기 때문에
아직도 많이 공부를 해야할 것 같습니다...ㅜㅜ
