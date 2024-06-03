---
layout: post
title: Controller/ Service 추상화 하기
date: 2021-10-05
Author: Geon Son
categories: Spring
tags: [Spring]
comments: true
toc: true
---

패스트 캠퍼스 강의를 듣다 흥미롭게(?) 프로젝트 구조를 구현하는 것을 보고 따라해 보고 싶었다.
강의에서는 별도의 도메인을 생성하고 해당 도메인을 통하여 데이터를 전달하는 방법으로 구현하였는데 별도의 상태코드를 전달하는 좋은 방법이지만 나는 간단하게 제네릭을 활용하여 JPA와 연동되는 도메인을 직접 사용하는 방향으로 코드를 작성하였다.

# 1. 기본 전략
기본적인 전략은 CRUD와 같이 대부분 사용하는 코드는 공통으로 만들어 사용한다는 것이다. 그렇게 하기 위해서는 사용하는 모든 Controller가 특정 함수를 포함하고 있다는 것을 보장해야하고

Controller는 공통적으로 하나 이상의 Service를 사용하게 됨으로 Controller가 사용하는 Service 역시 특정한 함수를 포함하고 있다는 것을 보장 해야 한다.

![](/images/it/e632e6cfimage1.png){: .align-center}


이러한 기능을 사용하기 위해서는 추상 클래스나 인터페이스를 사용하면 된다.
처음에는 이렇게 코드를 작성하더라도 결국에 개별 Service에서 실제 사용될 기능을 구현하는 과정이 필요하기 떄문에 굳이 이럴 필요가 있을까? 하는 생각과
JPA를 사용하게 되면 이미 JpaRepository를 사용하기 때문에 비슷하다고 생각했는데 새로운 서비스를 계속 확장하는 입장에서는
기본 서비스에 대한 정의만 내려져 있어도 확장하는 부담이 조금 줄어든다는 점과 절차가 정의 되어 있으니 마구잡이로 확장이 되지 않아 비교적 깔끔한 코딩이 된다는 점에서 추상화를 적용하는 것이 좋다고 생각했다.

# 2. 구현
내가 실제 구현을 할때는 controller 부터 반대로 진행하면서 추상화를 했지만 설명할때는 진행 순서 데로 작성하려고 한다.

## 2.1 Base Service 생성
```
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Component;

@Component
public abstract class BaseService<Entity> {

    @Autowired(required = false)
    protected JpaRepository<Entity,Long> baseRepository;


    public abstract Entity addItem(Entity object );

    public abstract Entity getItem(Long id );

    public abstract Entity updateItem(Entity object );

    public abstract Entity deleteItem(Long id );

}
```

기본적으로 Base Service가 필요로 하는 기능은 아주 단순하다. 필요한 필드와 필요한 메소드가 반드시 있다는 것을 인증하는 것, 여기서 필요한 필드는 데이터에 접근하고 받아오는 직접적인 역할을 수행하는 JpaRepository이고 필요한 메소드는 기본적으로 데이터에 접근하는 crud를 정의한 메소드 이다. 필드의 이름이나 메소드의 이름은 당연히 어떻게 정의해도 상관없지만 어떤 클래스에 들어있어도 이상하지 않은(?) 이해하기 쉬운 이름으로 정의하고 싶었다.

JpaRepository를 @Autowired 하기 위해서는 스프링 빈이라는 것을 알려야 함으로 @Component를 선언한 것 정도가 특별한(?) 점 이다.

BaseService &lt;Entity> 로 클래스를 정의한 이유는 여러 도메인 클래스를 사용하기 위한 제네릭 타입을 선언한 것이고 실제 추상클래스를 구현할때 &lt;Entity>로 정의한 부분에 해당 클래스를 넣으면 된다. 실제로 UserService를 구현한다면 이런 형태가 된다.

```
import com.apt.proptech.domain.User;
import org.springframework.stereotype.Service;

@Service
public class UserService extends BaseService<User>{

    @Override
    public User addItem(User object) {

        User user = User.builder()
                .id(object.getId())
                .password(object.getPassword())
                .name(object.getName())
                .email(object.getEmail())
                .build();

        baseRepository.save(user);

        return user;
    }

    @Override
    public User getItem(Long id ) {
        return baseRepository.findById(id).orElse(null);
    }

    @Override
    public User updateItem(User object) {


        return null;
    }

    @Override
    public User deleteItem(Long id) {

        User user = baseRepository.findById(id).orElse(null);

        if(user!= null){
            baseRepository.delete(user);
        }

        return user;
    }
}
```

간단하게 만들었기 때문에 특별한 기능은 없다. 여기서 중요한건 crud 기능을 하는 메소드가 반드시 있다는 것, JpaRepository가 반드시 있다는 것 정도 밖에는 없다.

## 2.3 Base Controller 생성

```
import com.apt.proptech.service.BaseService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;
import org.springframework.web.bind.annotation.*;

@Component
public abstract class BaseController<Entity>  {

    @Autowired(required = false)
    protected BaseService<Entity> baseService;


    @PostMapping("")
    public Entity create( @RequestBody Entity entity ){
        return baseService.addItem(entity);
    }

    @GetMapping("{id}")
    public Entity read( @PathVariable Long id ){
        return baseService.getItem(id);
    }

    @PutMapping("")
    public Entity update(@RequestBody Entity entity ){
        return baseService.updateItem(entity);
    }

    @DeleteMapping("{id}")
    public Entity delete(@PathVariable Long id ){
        return baseService.deleteItem(id);
    }

}

```

Base Controller 역시 crud 기능을 정의 하기 위하여 존재한다. 그리고 앞에서 정의한 baseService를 필드로 갖고 있다는 것을 증명하는 역할을 한다. 결국 Base Service와 똑같은 기능을 하는 것 뿐이다. 다만 실제 구현되는 부분에서는 아래 추상 클래스에서 많은 기능을 수행해 주었기 때문에 Controller는 단순하게 구현된다.

```

import com.apt.proptech.Controller.BaseController;
import org.springframework.stereotype.Controller;

@Controller
public class UserController extends BaseController {

}
```

이렇게 UserController는 단순하게 BaseController를 상속하는 것 만으로도 crud 기능을 수행할수 있게 된다.
