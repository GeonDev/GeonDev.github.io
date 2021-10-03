---
title:  "스프링 시큐리티 간단 적용 - 세션 기반"
toc: true
toc_sticky: true
categories:
  - IT
tags:  
  - Web
  - Java
  - Spring
  - Security
  - Session  
---

# 0. 시큐리티를 적용해야 하는 이유

스프링 시큐리티를 깊숙하게 들어가지 않고 간단하게 적용할 수 있을 정도로만 정리하려고 합니다. 
기존에 시큐리티를 사용하지 않을때는 암호화를 위해서는 별도의 SHA-256 함수를 작성하고 로그인 관리를 위해서는 세션에 직접 정보를 저장하는 과정이 필요했는데 시큐리티를 적용하게 되면 이러한 과정을 처리해주고 옵션에 따라 다양하게 접속 권한을 조절할 수 있는 역할을 수행 해 준다.

# 1. 스프링 시큐리티 세팅
## 1.1 dependency 추가
	<!-- 스프링부트 시큐리티 기본 lib -->
    <dependency>
		<groupId>org.springframework.boot</groupId>
		<artifactId>spring-boot-starter-security</artifactId>
	</dependency>

	<!-- 구글 로그인등 oauth2를 사용하기 위한 lib -->
	<dependency>
		<groupId>org.springframework.boot</groupId>
		<artifactId>spring-boot-starter-oauth2-client</artifactId>
	</dependency>
        
    <!-- 테스트 Lib -->    
    <dependency>
		<groupId>org.springframework.security</groupId>
		<artifactId>spring-security-test</artifactId>
		<scope>test</scope>
	</dependency>
    
## 1.2 dependency 추가
```
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.method.configuration.EnableGlobalMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;

import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configuration.WebSecurityConfigurerAdapter;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;


@Configuration 
@EnableWebSecurity 
@EnableGlobalMethodSecurity(prePostEnabled = true, securedEnabled = true) 
public class SecurityConfig extends WebSecurityConfigurerAdapter{
	
	@Bean
	public BCryptPasswordEncoder encodePwd() {
		return new BCryptPasswordEncoder();
	}
	
	@Override
	protected void configure(HttpSecurity http) throws Exception {
		//로그아웃은 디폴트 값으로 /logout 을 사용한다

		http.csrf().disable();
		http.authorizeRequests()
			.antMatchers("/dash/**").access("hasRole('ROLE_ADMIN')")
			.anyRequest().permitAll()
		.and()
			.formLogin()
			.loginPage("/login")
			.loginProcessingUrl("/loginProc")
			.defaultSuccessUrl("/")
		.and()
			.oauth2Login()
			.loginPage("/login")
		.and()
			.logout()
			.logoutSuccessUrl("/login")
			.invalidateHttpSession(true);
	}
}
```
### 1.2.1 인코더
BCryptPasswordEncoder는 스프링 시큐리티에서 제공하는 보안 인코더입니다.
해당 함수를 사용하면 평문을 암호화 할수 있기 때문에 유저가 입력한 비밀번호를 암호화 하는데 사용합니다.

### 1.2.2 스프링 시큐리티 보안 옵션
configure 내부의 옵션을 살펴보면 http.csrf().disable();
csrf 옵션을 끄는 것으로 기본설정에서 post로 form을 전달할때 문제가 발생함으로 비활성화 시킴 
별도의 자바스크립트나 vue 등을 이용하여 작성할때도 문제가 생길 수 있어 비활성화 합니다.

.antMatchers("/dash/&#42;&#42;").access("hasRole('ROLE_ADMIN')")
특정 URL로 접근하였을때 어떠한 권한이 있어야 접속을 허용할지 결정한다. 스프링 시큐리티에서 권한은 ROLE&#95;&#42;&#42;의 형태로 작성해야 인식하게 된다. 

antMatchers()는 여러개를 정의할 수 있고 권한이 늘어날때 마다 여러개를 적용하거나 
.antMatchers("/dash/&#42;&#42;*").access("hasRole('ROLE_ADMIN') or hasRole('ROLE_USER')")
.antMatchers("/dash/&#42;&#42;").access("hasRole('ROLE_ADMIN') and hasRole('ROLE_USER')")

와 같이 하나의 URL을 적용하고 권한을 겹쳐 사용할 수 있다. 

.loginPage("/login") 는 커스텀 로그인 form의 URL을 지정해주는 것으로 정의할지 않았을 경우 스프링 시큐리티에서 기본 정의하는 로그인 폼이 출력됩니다.

.loginProcessingUrl("/loginProc") 은 로그인 처리를 어디서 수행할지 지정하는 URL입니다. 
loginProc는 기본 설정으로 정의된 부분으로 별다른 처리가 필요하지 않다면 기본으로 정의합니다.

.defaultSuccessUrl("/")는 로그인 이후 어느 URL로 전송할지 정의합니다.

이후 oauth2를 사용한 로그인시에도 oauth2Login().loginPage("/login")와 같이 설정을하여 어떤 페이지를 통하여 oauth2 로그인을 수행할지 결정해줍니다.

.logout().logoutSuccessUrl("/login").invalidateHttpSession(true);
시큐리티는 기본적으로 세션 로그인을 기반으로 하기 때문에 로그인 후에 세션 정보에 로그인 관련 정보를 저장합니다. 로그아웃을 수행하였을때 어느 URL로 전송을 할지 절차는 어떻게 진행할지 정의합니다. 

참고로 스프링 시큐리티의 기본 로그아웃 URL은 /logout 입니다.

# 2. 스프링 시큐리티 로그인 진행
스프링 시큐리티에서 로그인을 하기 위해서는 UserDetails, OAuth2User 이라는 별도의 객체를 사용합니다. UserDetails, OAuth2User 모두 interface로 별도의 객체가 상속이 가능하도록 만들어져 있기 때문에 프로젝트에서 사용하는 user 객체에 상속 받게 하거나 UserDetails, OAuth2User을 모두 상속받는 별도의 클래스를 만듭니다.


## 2.1 스프링 시큐리티 객체 생성
```
import java.util.ArrayList;
import java.util.Collection;
import java.util.Map;

import com.apt.proptech.domain.User;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;


import lombok.Data;
import org.springframework.security.oauth2.core.user.OAuth2User;


@Data
public class PrincipalDetails implements UserDetails, OAuth2User {

	// 프로젝트에서 별도로 구현한 User
	private User user;
	private Map<String, Object> attributes;

	//일반 로그인시 사용
	public PrincipalDetails(User user) {
		super();
		this.user = user;
	}

	// OAuth2.0 로그인시 사용
	public PrincipalDetails(User user, Map<String, Object> attributes) {
		this.user = user;
		this.attributes = attributes;
	}

	@Override
	public String getPassword() {
		return user.getPassword();
	}

	@Override
	public String getUsername() {
		return user.getUsername();
	}

	@Override
	public boolean isAccountNonExpired() {
		return true;
	}

	@Override
	public boolean isAccountNonLocked() {
		return true;
	}

	//계정 비밀번호가 만료되지 않았는지 반환
	@Override
	public boolean isCredentialsNonExpired() {
		return true;
	}

	// 계정이 활성화(사용가능) 상태 인지 반환
	@Override
	public boolean isEnabled() {
		return true;
	}

	@Override
	public Map<String, Object> getAttributes() {
		return attributes;
	}

	@Override
	public Collection<? extends GrantedAuthority> getAuthorities() {
		Collection<GrantedAuthority> collection = new ArrayList<GrantedAuthority>();
		collection.add(()->{ return user.getUserRole().name();});
		return collection;
	}


	@Override
	public String getName() {
		return null;
	}
}
```
PrincipalDetails는 UserDetails, OAuth2User 의 모든 기능을 구현한 객체로 UserDetails는 password, username, isEnabled 등 일반적인 계정에 대한 정보를 담고 있다.
로그인을 위해서 필요로 하는 기본항목은 username, password로 form에서 전달받을때 부터 해당이름을 사용하여야 한다. (설정에서 바꿀수도 있다.)

OAuth2User는 소셜로그인을 제공하는 업체에서 제공하는 attributes을 담을수 있는 겍체를 가지고 있다. 소셜로그인을 제공하는 업체에 따라 attributes의 값은 다를 수 있다. 

## 2.2 스프링 시큐리티 서비스 생성

스프링 시큐리티를 활용하여 로그인을 할때 별도의 서비스 클래스를 거쳐서 진행된다. UserDetails, OAuth2User로 도메인 겍체가 분리되어 있던 것 처럼 서비스도 각각 UserDetailsService, DefaultOAuth2UserService로 분리되어 있으며 서로 독립적으로 역할을 수행하기 때문에 둘다 구현해 주어야 하고 두 객체는 모두 클래스로 정의 되어 있기 때문에 재정의를 하기 위해서는 각각 클래스를 만들어서 별도로 상속 받아야 한다.


### 2.2.1 UserDetailsService 생성
```
import com.apt.proptech.domain.oauth.PrincipalDetails;
import com.apt.proptech.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;


@Service
public class PrincipalDetailsService implements UserDetailsService{

	@Autowired
	private UserRepository userRepository;
	
	@Override
	public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException {

		return new PrincipalDetails(userRepository.findByUsername(username).orElseThrow(()->new UsernameNotFoundException(username)));
	}

}
```
UserDetailsService를 상속받은 PrincipalDetailsService은 시큐리티 필터를 통과한 객체를 반환하여 시큐리티 세션에 보관하는 기능을 갖고 있다. 
앞에서 PrincipalDetails에 UserDetail를 실체화(implements) 하였고 User를 전달 받는 생성자도 구현하였기 때문에 관련 정보를 넣어서 PrincipalDetail을 생성하게 합니다. 
이렇게 생성된 PrincipalDetail 객체는 스프링 시큐리티 세션에 보관되고 컨트롤러에서 @AuthenticationPrincipal PrincipalDetails principal를 호출하여 현재 세션에 있는 정보를 받아와서 사용하면 됩니다. 


### 2.2.2 OAuth2 application.yml 설정
```
spring:
  security:
    oauth2:
      client:
        registration:
          google: # /oauth2/authorization/google 이 주소를 동작하게 한다.
            client-id: ENC(3P13X0MEc7WH3Hchx8s4PEGFNbGL7s0QOeISXx+sxYlX1TByJ/HnXJHERDPmywLCbhlFoxp1yczmkj3g7IWUReIB2vHRkaLF/9AuaA5jnWwEexSVlyTRNw==)
            client-secret: ENC(SccKsp2Z/9tA3396ftHJRpjlPwTE7Hz7ushjsfTySrQ31L65u0X8dg==)
            scope:
            - email
            - profile
```
OAuth2 데이터를 받아오기 위한 설정값을 정의합니다. client-id나 client-secret이 노출되면 안됨으로 암호화 하여 세팅합니다.


### 2.2.3 DefaultOAuth2UserService 생성

DefaultOAuth2UserService는 로그인 제공자마다 기능이 모두 다르기 때문에 별도로 기능을 세팅해주는 작업이 필요합니다. 작업을 조금 간단하게 수행하기 위하여 별도의 객체를 선언하고 
attribute를 파싱하여 값을 제공합니다. 

```
// OAuth2.0 제공자들 마다 응답해주는 속성값이 달라서 공통으로 만들어준다.
public interface OAuth2UserInfo {
	String getProviderId();
	String getProvider();
	String getEmail();
	String getName();
}
```
이 클래스는 프로젝트마다 필요한 정보가 다르기 때문에 특별히 어떤 것을 적용해야 한다는 것은 없습니다. 다만 보편적으로 사용하는 내용들로 제공자의 이름과 이메일 등 정보를 갖고 있습니다.


```
@Service
public class PrincipalOauth2UserService extends DefaultOAuth2UserService {

	@Autowired
	private UserRepository userRepository;

	static final Logger LOGGER = LoggerFactory.getLogger(PrincipalOauth2UserService.class);


	// userRequest 는 code를 받아서 accessToken을 응답 받은 객체
	@Override
	public OAuth2User loadUser(OAuth2UserRequest userRequest) throws OAuth2AuthenticationException {
		// google의 회원 프로필 조회
		OAuth2User oAuth2User = super.loadUser(userRequest);

		return processOAuth2User(userRequest, oAuth2User);
	}

	private OAuth2User processOAuth2User(OAuth2UserRequest userRequest, OAuth2User oAuth2User) {
		
        // oAuth2값 지정 -> 제공자에 따라 값이 달라짐
		OAuth2UserInfo oAuth2UserInfo = new oAuth2UserInfo();
        
		oAuth2UserInfo.setProviderId(oAuth2User.getAttributes().get("sub") );
        oAuth2UserInfo.setProvider("google" );
        oAuth2UserInfo.setName(oAuth2User.getAttributes().get("name")  );
        oAuth2UserInfo.setEmail( oAuth2User.getAttributes().get("email"));
       
       Optional<User> userOptional = userRepository.findByProviderAndProviderId(oAuth2UserInfo.getProvider(), oAuth2UserInfo.getProviderId());
		User user;
		if (userOptional.isPresent()) {
			user = userOptional.get();
			// user가 존재하면 update 해주기
			user.setEmail(oAuth2UserInfo.getEmail());
			userRepository.save(user);
		} else {
			// user의 패스워드가 null이기 때문에 OAuth 유저는 일반적인 로그인을 할 수 없음.
			user = User.builder()
					.username(oAuth2UserInfo.getProvider() + "_" + oAuth2UserInfo.getProviderId())
					.email(oAuth2UserInfo.getEmail())
					.userRole(UserRole.ROLE_USER)
					.provider(oAuth2UserInfo.getProvider())
					.providerId(oAuth2UserInfo.getProviderId())
					.build();
			userRepository.save(user);
		}

		return new PrincipalDetails(user, oAuth2User.getAttributes());
	}
}
```
PrincipalOauth2UserService는 oAuth2를 통하여 전달된 객체를 저장하는 기능을 수행합니다.
데이터가 없으면 새로운 객체로 만들어 저장하고 데이터가 있다면 기존 데이터를 업데이트 하는 방식으로 구현되어 있습니다. 



## 3. 컨트롤러 및 화면 설정

## 3.1 화면 설정
```
<body onload="document.f.username.focus();">
    <h3>Login with Username and Password</h3>
    <form name="f" action="/login" method="POST">
        <table>
            <tbody>
                <tr>
                    <td>User:</td>
                    <td><input type="text" name="username" value=""></td>
                </tr>
                <tr>
                    <td>Password:</td>
                    <td><input type="password" name="password"></td>
                </tr>
                <tr>
                    <td colspan="2"><input name="submit" type="submit" value="Login"></td>
                </tr>
            </tbody>
        </table>
   <a href="/oauth2/authorization/google" class="btn btn-google btn-user btn-block">
	<i class="fab fa-google fa-fw"></i> Login with Google
   </a>
    </form>
</body>
```
화면에서 특별하게 정의해 해야 할 부분은 없습니다. 다만 기본 로그인에서 전달하는 이름이 username, password 이여야 한다는 것과 별도의 설정을 하지 않고 oauth 를 진행하였다면 
/oauth2/authorization/google 와 같이 특정한 URL로 전송되게 하여야 이상없이 동작합니다.


## 3.2 컨트롤러 설정




```   
@GetMapping("/login")
public String loginView( ){
	return "login/login";
}
    
@GetMapping("/userinfo")
@ResponseBody
public String user(@AuthenticationPrincipal PrincipalDetails principal) {
        LOGGER.debug("principal : "+principal.getName());

        // iterator 순차 출력 해보기
        Iterator<? extends GrantedAuthority> iter = principal.getAuthorities().iterator();
        while (iter.hasNext()) {
            GrantedAuthority auth = iter.next();
            System.out.println(auth.getAuthority());
        }

        return "유저 페이지입니다.";
    }


@GetMapping(value = "/logout")
public String logoutPage(HttpServletRequest request, HttpServletResponse response) {
        new SecurityContextLogoutHandler().logout(request, response, SecurityContextHolder.getContext().getAuthentication());
        return "redirect:/login";
    }
```
컨트롤러의 경우 기본적인 기능은 모두 시큐리티의 설정과 디폴트 서비스에 정의되어 있기 때문에 추가로 정의할 필요는 없습니다.
컨트롤러에서 확인할 부분은 @AuthenticationPrincipal PrincipalDetails principal을 통하여 시큐리티 세션에서 정보를 가지고 오는 부분 정도 확인하면 될 것 같습니다.