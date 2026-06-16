# Spring Boot가 부럽지 않은 Hono 기반 TypeScript 서버리스 백엔드와 예시 프로젝트

백엔드 애플리케이션을 만들 때 Java/Kotlin과 Spring Boot는 여전히 강력한
기본값입니다. Controller, Service, Repository로 이어지는 익숙한 계층 구조, IoC
컨테이너, 검증, 인증, 예외 처리, 트랜잭션, OpenAPI 문서화, 테스트 도구까지
대부분의 백엔드 프로젝트에 필요한 요소가 잘 갖춰져 있습니다.

하지만 모든 프로젝트가 Spring Boot로 시작해야 하는 것은 아닙니다. 특히 작은 팀이
빠르게 제품을 만들고, 프론트엔드와 백엔드를 모두 TypeScript로 다루고, AI와 함께
코드를 작성하는 비중이 커진 상황이라면 TypeScript 기반 백엔드도 충분히 진지한
선택지가 될 수 있습니다.

이 글에서는 Hono 기반 TypeScript 백엔드를 Spring Boot 개발자 관점에서 어떻게
설계할 수 있는지, 그리고 그 구조를 실행 가능한 예시 프로젝트로 어떻게 확인할 수
있는지 설명합니다.

예시 프로젝트: `<GitHub URL>`

예시 프로젝트는 Hono, Deno, Drizzle, Inversify 계열 IoC 컨테이너를 조합해서
Spring Boot에 익숙한 개발자도 납득할 수 있는 백엔드 구조를 TypeScript로
구성합니다. 동시에 Docker 이미지로 패키징해 AWS Lambda 컨테이너 런타임에서
실행할 수 있고, 필요하면 ECS 같은 컨테이너 기반 상시 실행 환경으로 옮길 수 있게
설계합니다.

처음부터 무겁게 시작하지 않되, 나중에 커졌을 때 갈아엎지 않아도 되는 구조가
되도록 신경써서 구현했습니다.

## 1. 왜 Hono 기반 TypeScript 백엔드인가

작은 팀에서는 한 명의 개발자가 다룰 수 있는 범위가 넓어야 합니다. 백엔드,
프론트엔드, 인프라, 테스트, 배포를 모두 별개의 전문 영역으로 나누기 어려운
경우가 많고, 프로젝트 초반에는 기술적으로 완벽한 분리보다 빠르게 동작하는 제품을
만드는 것이 더 중요할 때가 많습니다.

이런 상황에서 TypeScript는 좋은 공통 언어가 됩니다. 프론트엔드는 이미
TypeScript를 사용하는 경우가 많고, 백엔드까지 TypeScript로 작성하면 도메인 타입,
API 스키마, 검증 로직, 테스트 코드를 같은 언어로 다룰 수 있습니다. 팀의 컨텍스트
스위칭 비용도 줄어듭니다.

AI와 함께 개발하는 환경에서도 TypeScript는 장점이 있습니다. 타입 시스템이
촘촘하고, 컴파일러와 linter가 빠른 피드백을 주며, 프론트엔드와 백엔드 예제가
모두 풍부합니다. AI가 코드를 작성하더라도 타입 오류와 테스트 실패가 즉시
피드백으로 돌아오기 때문에 수정 루프를 짧게 가져갈 수 있습니다.

그렇다고 백엔드 코드를 단순한 route handler 모음으로 만들고 싶지는 않았습니다.
Spring Boot에 익숙한 개발자라면 비즈니스 로직을 객체지향적으로 나누고, 의존성을
주입하고, Controller와 Use Case와 Adapter의 책임을 분리하는 방식에 익숙합니다.
이 프로젝트는 그런 개발 경험을 TypeScript 생태계 안에서 가볍게 재구성하는 것을
목표로 합니다.

또 하나의 중요한 목표는 확장성입니다. 이 구조는 중소규모 애플리케이션만을 위한
실험용 구조가 아닙니다. 처음에는 AWS Lambda 컨테이너 런타임으로 간단히 배포하고,
순간적인 트래픽 spike는 Lambda의 동시성 확장으로 받아낼 수 있습니다. 이후
트래픽이 상시적으로 커지거나 p95/p99 latency, 비용, 워커 운영, 커넥션 관리가 더
중요해지면 같은 Docker 이미지를 기반으로 ECS 같은 컨테이너 기반 실행 환경으로
옮길 수 있습니다.

이 프로젝트가 지향하는 것은 "작게 시작하되 크게 갈 수 있는 TypeScript 백엔드"
입니다.

## 2. 이 예시 프로젝트가 보여주는 것

예시 프로젝트는 Hono를 사용한 Deno 기반 백엔드 서버입니다. 단순히 "Hono에서
hello world를 띄우는 방법"을 보여주는 프로젝트가 아니라, 실제 백엔드
프로젝트에서 자주 필요한 요소를 하나의 opinionated stack으로 묶어둔 예시입니다.
큰 그림은 다음 요청 흐름으로 이해할 수 있습니다.

```text
Client
  -> Hono Controller
    -> Application Use Case
      -> Port
        -> Adapter
          -> Database
```

Hono Controller는 HTTP 요청과 응답을 담당합니다. Application Use Case는 실제
비즈니스 행위를 표현합니다. Port는 Use Case가 필요로 하는 외부 기능의
인터페이스이고, Adapter는 그 Port를 실제 기술로 구현합니다. Database 접근은 이
예시에서는 Drizzle과 MySQL 조합으로 구현합니다.

구성 요소를 요약하면 다음과 같습니다.

| 영역                 | 사용 기술                                 |
| -------------------- | ----------------------------------------- |
| Web framework        | Hono                                      |
| Runtime              | Deno                                      |
| API schema / OpenAPI | Zod, `@hono/zod-openapi`                  |
| IoC container        | `inversify-typesafe-spring-like`          |
| Database access      | Drizzle ORM                               |
| Database             | MySQL                                     |
| Auth                 | JWT 기반 bearer token                     |
| Test                 | Deno test, pactum                         |
| Packaging            | Docker image                              |
| Deployment target    | AWS Lambda container image, ECS 전환 가능 |

예제 도메인은 `Article`과 `User`입니다. Article은 일반적인 CRUD API를 보여주고,
User는 회원가입, 로그인, 토큰 재발급, 현재 사용자 조회 흐름을 보여줍니다. 여기에
인증 middleware, 전역 에러 핸들러, OpenAPI 문서, 통합 테스트, Drizzle migration,
Docker 이미지 빌드, Terraform 기반 인프라 구성이 함께 들어 있습니다.

Hono는 HTTP layer, Deno는 런타임과 개발 도구, Zod는 요청/응답 schema, Drizzle은
DB 접근, IoC 컨테이너는 의존성 연결, Docker image는 Lambda와 ECS를 잇는 배포
단위를 담당합니다.

Spring Boot로 치면 단순 샘플 Controller 하나가 아니라, 작은 백엔드
애플리케이션의 뼈대를 갖춘 예시 프로젝트에 가깝습니다.

## 3. 아키텍처의 목표

이 아키텍처의 첫 번째 목표는 Spring Boot와 유사한 개발 경험을 TypeScript에서
제공하는 것입니다. 여기서 "유사하다"는 말은 Spring Boot의 모든 기능을 그대로
복제한다는 뜻이 아닙니다. 백엔드 개발자가 중요하게 여기는 구조적 장점을
가져오겠다는 뜻입니다.

구체적으로는 다음과 같은 경험을 목표로 합니다.

- Controller는 HTTP 요청과 응답에 집중합니다.
- Application Service는 Use Case를 구현합니다.
- Domain 모델은 비즈니스 개념을 표현합니다.
- Port는 안쪽 계층이 바깥쪽 구현에 의존하지 않게 해줍니다.
- Adapter는 데이터베이스 같은 외부 시스템과 통신합니다.
- IoC 컨테이너는 구현체 선택과 의존성 주입을 담당합니다.
- 전역 에러 핸들러는 도메인 예외를 API 응답으로 변환합니다.

이 목표에서 중요한 것은 프레임워크와 비즈니스 로직의 거리입니다. Controller와
Adapter는 Hono, Drizzle, Lambda 같은 구체 기술을 알아도 됩니다. 이들은
애플리케이션의 바깥쪽에서 들어오고 나가는 요청을 처리하는 계층이기 때문입니다.
반대로 Domain과 Application은 그런 기술을 몰라야 합니다. 그래야 HTTP framework,
DB 접근 방식, 실행 환경이 바뀌어도 핵심 규칙과 Use Case를 유지할 수 있습니다.

두 번째 목표는 서버리스로 빠르게 시작하는 것입니다. AWS Lambda는 요청이 없을 때
비용을 줄일 수 있고, 트래픽이 순간적으로 튈 때 실행 환경을 늘려 대응할 수
있습니다. 이 프로젝트는 Lambda zip 배포가 아니라 Docker 이미지 배포를 기준으로
잡습니다. Deno 의존성을 이미지 빌드 단계에서 미리 캐싱하고, Lambda 컨테이너
런타임에서 실행하는 방식입니다.

세 번째 목표는 상시 실행 환경으로의 전환 가능성입니다. Lambda가 모든 워크로드에
항상 최선은 아닙니다. 트래픽이 하루 종일 높거나, 콜드스타트가 민감하거나, 요청
latency를 더 세밀하게 통제해야 하거나, 워커 프로세스를 오래 띄워야 한다면 ECS
같은 컨테이너 기반 실행 환경이 더 적합할 수 있습니다.

이때 중요한 것은 애플리케이션 코드를 갈아엎지 않는 것입니다. 실행 환경이
Lambda에서 ECS로 바뀌더라도 Hono 앱, `core/`의 Use Case, Port, Adapter, Domain
모델은 그대로 유지되어야 합니다. 바뀌어야 하는 것은 entrypoint, 런타임 어댑터,
배포 설정 정도입니다.

## 4. 기술 스택 선택 기준

기술 스택은 서버리스 환경, Spring Boot 개발자 경험, 확장 가능성, AI와의 협업,
운영 편의성을 함께 고려했습니다.

### Hono

Hono는 가볍고 빠른 TypeScript 웹 프레임워크입니다. Web Standard API를 중심으로
설계되어 Node.js, Deno, Bun, Cloudflare Workers, AWS Lambda 같은 다양한 환경에서
실행할 수 있습니다.

이 프로젝트에서 Hono가 맡는 역할은 Spring MVC의 아주 가벼운 대안입니다. HTTP
method와 path를 매핑하고, middleware를 통과시키고, 검증된 요청을 handler에
전달하고, 응답을 생성합니다. 비즈니스 로직을 Hono handler 안에 몰아넣지 않고 Use
Case로 넘기는 것이 핵심입니다.

처음에는 Lambda에서 실행하다가 나중에 ECS에서 상시 실행 서버로 옮기더라도 Hono
앱 구조를 크게 바꾸지 않아도 됩니다. Hono는 Spring MVC처럼 거대한 프레임워크는
아니지만, routing, middleware, request validation, error handling, runtime
adapter처럼 API 서버에 필요한 핵심 요소를 제공합니다.

### Deno

Deno는 TypeScript를 별도 빌드 단계 없이 직접 실행할 수 있는 런타임입니다.
formatter, linter, test runner, task runner가 기본 제공되고, import map을 통해
경로 alias도 간단히 구성할 수 있습니다.

Deno는 런타임 자체의 성능이 우수하지만, 성능 뿐만 아니라 개발 환경을 단순하게
유지할 수 있다는 장점도 큽니다. formatter, linter, test runner, task runner를
별도로 조합하지 않아도 되기 때문에 작은 팀이 프로젝트 관례를 맞추기 쉽습니다.

이 프로젝트에서는 `deno.json`의 task를 중심으로 개발, 테스트, migration, Docker
빌드를 실행합니다. Node.js 생태계의 npm 패키지도 함께 사용할 수 있기 때문에
Hono, Drizzle, pactum 같은 라이브러리와 조합하는 데 큰 문제가 없습니다.

### Drizzle

Drizzle은 타입 안전한 query builder입니다. Spring Data JPA처럼 객체 그래프를
중심으로 모든 것을 추상화하는 도구는 아닙니다. 대신 쿼리가 어떻게 실행되는지 더
잘 보이고, schema와 query result 타입을 TypeScript에서 안전하게 다룰 수
있습니다.

서버리스 환경에서는 cold start와 runtime overhead가 중요하고, 대규모
트래픽에서는 ORM의 편의성보다 쿼리의 예측 가능성이 더 중요할 때가 많습니다.
Drizzle은 SQL이 어느 정도 보이는 방식으로 작성하면서도 TypeScript 타입 안정성을
얻을 수 있으며, 무거운 query engine이나 별도 daemon을 요구하지 않기 때문에
Lambda 같은 환경에서도 부담이 작습니다.

### IoC 컨테이너: Inversify

Spring Boot 개발자에게 IoC 컨테이너는 단순한 편의 기능이 아닙니다.
애플리케이션의 의존성 방향을 지키고, 테스트 대역을 바꾸고, 환경별 구현체를
선택하는 중요한 도구입니다.

이 프로젝트는 `inversify-typesafe-spring-like`를 사용해 Spring의 `@Autowired`와
비슷한 방식으로 의존성을 주입합니다. `beanConfig.ts`에서 어떤 Port에 어떤
Adapter를 연결할지 정의하고, `USE_MOCK_ADAPTER` 같은 환경 변수에 따라 mock
adapter와 persistence adapter를 바꿀 수 있습니다.

즉 Controller는 구체 Adapter를 직접 만들지 않습니다. Use Case도 DB 구현체를 직접
참조하지 않습니다. IoC 컨테이너가 "이 Port에는 지금 이 Adapter를 연결한다"는
결정을 담당합니다.

### Docker image

Docker 이미지를 기본 배포 단위로 삼은 것도 중요한 선택입니다. Lambda에서 Docker
이미지를 사용할 수 있고, ECS도 Docker 이미지를 실행합니다. 따라서 한 번 만든
이미지 빌드 파이프라인을 Lambda와 ECS 양쪽에서 활용할 수 있습니다.

이 방식은 "서버리스로 시작했지만, 나중에 컨테이너 서버로 옮겨야 하는 상황"에
특히 유리합니다. 배포 대상은 바뀌지만 패키징 방식은 유지할 수 있기 때문입니다.

## 5. Spring Boot와 비교해보기

이 프로젝트는 Spring Boot를 대체하는 모든 기능을 제공하겠다는 프로젝트가
아닙니다. 하지만 Spring Boot 개발자가 백엔드 코드를 작성할 때 기대하는 주요
역할은 TypeScript 스택 안에서도 상당 부분 대응시킬 수 있습니다.

아래 표는 Spring Boot에서 익숙한 역할을 이 스택에서는 어떤 구성요소가 맡는지
보여주는 역할 대응표 입니다. 예를 들어 Hono Controller는 `@RestController`와
같은 위치에서 HTTP 요청을 받지만, Spring MVC와 같은 방대한 기능을 제공한다는
뜻은 아닙니다.

| Spring Boot                          | 이 프로젝트                           |
| ------------------------------------ | ------------------------------------- |
| `@RestController`                    | Hono Controller                       |
| `@Service`                           | Application Service / Use Case 구현체 |
| Repository interface                 | Out Port                              |
| Repository implementation            | Adapter                               |
| `@Autowired` / constructor injection | `@Autowired`, `beanConfig.ts`         |
| `@ControllerAdvice`                  | `globalErrorHandler`                  |
| Spring Security                      | Hono auth middleware                  |
| Bean configuration                   | `beanConfig.ts`                       |
| Bean lookup                          | `applicationContext().get(...)`       |
| Bean Validation                      | Zod schema                            |
| springdoc-openapi                    | `@hono/zod-openapi`                   |
| Flyway                               | Drizzle migration                     |
| MockMvc / RestClient test            | pactum integration test               |

Controller는 Hono route를 정의하고, 요청 schema와 응답을 OpenAPI에 등록합니다.
실제 비즈니스 로직은 Controller 안에 직접 작성하지 않고 IoC 컨테이너에서 Use
Case를 꺼내 호출합니다.

```typescript
export default Controller().openapi(route, async (c) => {
  const article = await applicationContext()
    .get("CreateArticleUseCase")
    .create(c.req.valid("json"));

  return Response.json(creationResponseSchema.parse(article));
});
```

Spring Boot의 Controller가 Service를 호출하는 것과 같은 역할입니다. 다만
여기서는 Hono와 Deno 위에서 TypeScript 코드로 동작합니다.

## 6. 전체 아키텍처

전체 구조는 Hexagonal Architecture, 즉 Ports & Adapters Architecture를 따릅니다.
핵심은 의존성 방향입니다. 안쪽 계층은 바깥쪽 기술을 몰라야 합니다.

```text
HTTP request
  -> Hono Controller
    -> In Port / Use Case
      -> Domain / Application
        -> Out Port
          -> Adapter
            -> Drizzle / MySQL
```

이 구조에서 `app/`은 웹 계층입니다. Hono route, middleware, error handler,
OpenAPI 문서 설정이 여기에 있습니다. 이 계층은 Hono를 알아도 됩니다. HTTP 요청과
응답을 다루는 바깥쪽 계층이기 때문입니다.

`core/`는 애플리케이션의 중심입니다. `core/article/domain`,
`core/user/domain`에는 도메인 schema와 타입이 있고, `application`에는 Use Case
구현체가 있습니다. `port/in`에는 Controller가 호출할 Use Case 인터페이스가 있고,
`port/out`에는 Application이 필요로 하는 외부 기능의 인터페이스가 있습니다.

`adapter/out`은 실제 외부 시스템과 통신하는 구현체입니다. 예를 들어
`ArticlePersistenceAdapter`는 `ArticleCommandPort`, `ArticleQueryPort`를
구현하고, Drizzle을 통해 MySQL에 접근합니다.

안쪽 계층과 바깥쪽 계층을 나누면 교체 비용이 줄어듭니다. Hono Controller는
Next.js Route Handler, Lambda adapter, ECS에서 실행되는 HTTP server entrypoint와
가까운 바깥쪽 코드입니다. Persistence Adapter도 Drizzle/MySQL이라는 구체 기술에
의존하는 바깥쪽 코드입니다. 반면 Use Case와 Domain은 "게시글을 만든다",
"사용자를 인증한다" 같은 애플리케이션의 언어를 표현합니다.

중요한 점은 Domain과 Application이 Hono, Deno, Drizzle, Lambda, ECS를 직접 알지
않는다는 것입니다. 이 원칙을 지키면 실행 환경을 바꾸더라도 핵심 비즈니스 로직을
유지할 수 있습니다.

Lambda에서 ECS로 옮길 때 유지하고 싶은 코드는 Domain, Use Case, Port,
Controller정도가 있습니다. 바뀌어야 하는 코드는 Lambda runtime entrypoint,
container 실행 명령, load balancer, health check, autoscaling 정책 같은 실행
환경 주변부입니다. 이 경계를 지키면 "서버리스로 시작했다가 컨테이너로 옮기는
전환"이 재작성 작업이 아니라 배포/운영 모델 전환에 가까워집니다.

## 7. 트래픽 확장 전략

이 프로젝트의 기본 배포 모델은 AWS Lambda + Docker Image입니다. Lambda는 요청이
들어올 때 실행 환경을 늘릴 수 있으므로, 순간적인 트래픽 spike가 있는 API
서비스에 잘 맞습니다. 평소에는 요청이 많지 않지만 특정 이벤트, 캠페인, 알림
발송, 외부 연동으로 트래픽이 갑자기 올라가는 서비스라면 Lambda의 확장 모델이
유리할 수 있습니다.

다만 Lambda가 모든 것을 해결해주지는 않습니다. 대규모 트래픽에서 진짜 병목은
Hono 자체가 아니라 보통 다음 지점에서 생깁니다.

- 데이터베이스 커넥션 수
- 느린 쿼리와 락 경합
- 외부 API 호출 latency
- 인증/암호화 비용
- 캐시 미스
- Lambda cold start
- 동시성 제한과 downstream 보호
- 로그, metric, trace를 통한 관측성 부족

따라서 대규모 트래픽을 고려한다면 애플리케이션 코드만 볼 것이 아니라 전체
시스템을 함께 설계해야 합니다. DB 앞에는 RDS Proxy나 Aurora, read replica, cache
layer를 고려해야 하고, write가 많은 작업은 queue를 통해 비동기화할 수 있어야
합니다. 읽기 트래픽은 캐시와 replica로 분산하고, 외부 시스템이 느릴 때는
timeout과 retry 정책을 명확히 해야 합니다.

Cold Start가 중요한 API에는 Provisioned Concurrency를 사용할 수 있습니다. 새
버전을 배포할 때도 먼저 Provisioned Concurrency를 준비한 뒤 alias를 전환하면
배포 직후의 초기 지연을 줄일 수 있습니다.

그리고 트래픽이 상시적으로 높아지면 Lambda가 더 이상 최선이 아닐 수 있습니다.
이때 같은 Docker 이미지를 ECS로 옮기는 전략을 사용할 수 있습니다. 트래픽이
bursty한 경우에는 Lambda가 유리하고, steady traffic에는 ECS가 유리한 경우가
많습니다.

## 8. Lambda에서 ECS로 옮기기 쉬운 이유

Lambda에서 ECS로 옮기기 쉬운 가장 큰 이유는 이 프로젝트가 Docker 이미지를
기준으로 패키징되기 때문입니다.

Lambda zip 패키지에 강하게 맞춘 구조라면 상시 실행 서버로 옮길 때 빌드와 실행
방식을 다시 정리해야 할 수 있습니다. 반면 Docker 이미지를 기준으로 잡으면
Lambda와 ECS가 같은 산출물을 공유할 수 있습니다. 실행 entrypoint는 다르지만
애플리케이션 코드와 이미지 빌드 과정은 상당 부분 유지됩니다.

개념적으로는 다음과 같이 볼 수 있습니다.

```text
Docker Image
  ├─ Lambda container runtime
  │   └─ Lambda entrypoint -> Hono fetch handler
  │
  └─ ECS service
      └─ Server entrypoint -> Deno.serve -> Hono fetch handler
```

Lambda에서는 Lambda 컨테이너 런타임에 맞는 entrypoint가 필요합니다. ECS에서는
컨테이너 안에서 HTTP 서버를 상시 실행하면 됩니다. 하지만 둘 다 최종적으로는 같은
Hono 앱을 호출합니다.

ECS를 사용할 때도 선택지는 나뉩니다. Fargate를 사용하면 서버 인스턴스 관리
부담을 줄일 수 있습니다. 반대로 ECS on EC2를 사용하면 인스턴스 타입, 네트워크,
비용 최적화, capacity provider 전략에 대해 더 많은 제어권을 가질 수 있습니다.
어느 쪽이든 중요한 점은 Fargate 자체가 아니라 컨테이너 기반 상시 실행 환경으로
이동할 수 있다는 점입니다.

ECS로 옮기면 다음과 같은 운영이 쉬워집니다.

- 애플리케이션 프로세스를 계속 띄워두기
- DB 커넥션 풀을 프로세스 단위로 안정적으로 관리하기
- 긴 요청이나 streaming 성격의 작업 처리하기
- queue consumer나 background worker를 별도 service로 운영하기
- CPU/memory 사용량 기반으로 task 수 조절하기
- steady traffic에서 비용과 latency를 더 예측 가능하게 만들기

즉 Lambda와 ECS는 서로 배타적인 선택지가 아닙니다. 이 아키텍처에서는 Lambda로
빠르게 시작하고, 트래픽과 운영 요구가 바뀌면 ECS로 옮기는 단계적 경로를
열어둡니다.

## 9. 프로젝트 코드 구조

저장소의 주요 디렉터리는 다음과 같습니다.

```text
app/
  api/
  index.ts
  serverApp.ts

core/
  article/
  auth/
  common/
  config/
  user/

lib/
  db/

test/
  api/
  core/

infra/
  terraform/
```

`app/`은 웹 애플리케이션 진입점입니다. `app/index.ts`는 Deno 서버를 실행하고,
`app/serverApp.ts`는 Hono 앱을 구성합니다. 여기서 `/api` base path, 인증
middleware, 전역 에러 핸들러, Swagger JSON, Scalar 문서 UI, Controller 등록이
이뤄집니다.

`core/`는 핵심 애플리케이션 코드입니다. Article, User, Auth, Common, Config가
도메인별로 나뉘어 있습니다. 각 도메인은 다시 domain, application, port,
adapter로 구분됩니다.

`lib/db/`에는 Drizzle 관련 코드가 있습니다. MySQL schema, migration, seed,
primary 및 replica DB client 선택 로직이 여기에 있습니다.

`test/`에는 단위 테스트와 통합 테스트가 있습니다. API 통합 테스트는 pactum을
사용해 실제 HTTP 요청을 보내고 응답 status와 body를 검증합니다.

`infra/`에는 Docker 이미지 빌드와 실행, Lambda 런타임 entrypoint, Terraform 기반
AWS 인프라 코드가 있습니다. 이 디렉터리는 이 프로젝트가 단순 로컬 예제가 아니라
배포까지 고려한 템플릿이라는 점을 보여줍니다.

전체 호출 흐름을 파일 책임 기준으로 다시 쓰면 다음과 같습니다.

```text
app/api/...Controller.ts
  -> core/{domain}/application/...Service.ts
    -> core/{domain}/application/port/out/...Port.ts
      -> core/{domain}/adapter/out/...Adapter.ts
        -> lib/db/schema.ts
```

이 흐름을 이해하면 디렉터리 이름만 보고도 새 기능을 어디에 추가해야 하는지
예상할 수 있습니다. API endpoint는 `app/api`에 추가하고, 비즈니스 행위는
`core/{domain}/application`에 추가하며, 외부 시스템 접근은 adapter에 둡니다.

## 10. 예제 도메인: Article과 User

Article 도메인은 가장 기본적인 CRUD API를 보여줍니다.

- `POST /api/articles`
- `GET /api/articles`
- `GET /api/articles/{id}`
- `PATCH /api/articles/{id}`
- `DELETE /api/articles/{id}`

이 흐름은 백엔드 애플리케이션에서 가장 자주 등장하는 구조입니다. Controller가
요청을 검증하고, Use Case를 호출하고, Application Service가 Port를 통해
Adapter에 작업을 위임합니다. Persistence Adapter는 Drizzle을 통해 MySQL에
접근합니다.

예를 들어 게시글 생성 요청은 다음 순서로 처리됩니다.

```text
POST /api/articles
  -> CreateArticleController
    -> CreateArticleUseCase
      -> ArticleCommandPort
        -> ArticlePersistenceAdapter
          -> insert into article
```

Controller는 HTTP 요청이 올바른지 확인하고, Use Case는 "게시글 생성"이라는
애플리케이션 행위를 표현합니다. Port는 Use Case가 저장소 구현체를 직접 알지 않게
하는 경계이고, Adapter는 실제 DB insert를 수행합니다.

User 도메인은 인증과 관련된 흐름을 보여줍니다.

- `POST /api/users/signup`
- `POST /api/users/login`
- `POST /api/users/refresh`
- `GET /api/users/me`

User는 외부 노출용 식별자로 ULID를 사용하고, password hash를 저장하며, JWT를
통해 access token과 refresh token을 발급합니다. `authMiddleware`는 bearer
token을 검증하고 요청 context에 principal을 넣습니다. Controller에서는
`c.get("principal")`로 인증된 사용자 정보를 가져올 수 있습니다.

Mock Adapter와 Persistence Adapter가 모두 존재하는 점도 중요합니다.
`USE_MOCK_ADAPTER` 환경 변수에 따라 실제 DB를 쓰는 adapter 대신 in-memory mock
adapter를 사용할 수 있습니다. 이는 테스트나 초기 개발 단계에서 유용합니다.

User 흐름도 같은 구조를 따릅니다. 로그인 요청은 Controller에서 body를 검증하고,
Login Use Case가 사용자 조회와 비밀번호 검증을 수행한 뒤, Token Service가 JWT를
발급합니다. 인증이 필요한 API에서는 middleware가 token을 검증하고, 검증된 사용자
정보를 request context에 넣습니다.

## 11. Hono API 계층 설계

Hono API 계층은 `@hono/zod-openapi`를 중심으로 설계되어 있습니다. 각
Controller는 `createRoute`로 HTTP method, path, tag, security, request schema,
response schema를 정의합니다. 이 정의는 런타임 요청 검증과 OpenAPI 문서 생성에
함께 사용됩니다.

이 구조의 장점은 API 문서와 실제 handler 사이의 거리를 줄일 수 있다는 점입니다.
Spring Boot에서 annotation과 DTO, springdoc-openapi를 조합하는 것처럼, 여기서는
Hono route와 Zod schema를 조합해 API surface를 정의합니다.

간단히 보면 Controller는 다음 역할을 합니다.

1. route metadata를 정의합니다.
2. 요청 body, path parameter, query string을 schema로 검증합니다.
3. IoC 컨테이너에서 Use Case를 가져옵니다.
4. Use Case를 호출합니다.
5. 응답 schema에 맞춰 결과를 반환합니다.

코드로 보면 핵심은 다음과 같습니다.

```typescript
export default Controller().openapi(route, async (c) => {
  const input = c.req.valid("json");
  const result = await applicationContext()
    .get("CreateArticleUseCase")
    .create(input);

  return Response.json(result);
});
```

이 예시는 Controller가 직접 DB에 접근하지 않는다는 점을 보여줍니다. Controller는
검증된 입력을 Use Case에 넘기고, 응답을 HTTP 형태로 돌려줄 뿐입니다.

Use Case 쪽은 더 단순합니다. Application Service는 Port에 의존하고, 구체
Adapter를 직접 만들지 않습니다.

```typescript
export class ArticleCommandService implements CreateArticleUseCase {
  constructor(
    @Autowired("ArticleCommandPort") private readonly articleCommandPort:
      ArticleCommandPort,
  ) {}

  create(article: ArticleCreation): Promise<Pick<Article, "id">> {
    return this.articleCommandPort.createArticle(article);
  }
}
```

이 구조 덕분에 Controller, Use Case, Adapter의 책임이 분리됩니다.

`app/serverApp.ts`에서는 모든 Controller를 Hono app에 등록합니다. 각
Controller가 자신의 full path를 관리하고, server app에서는 일괄적으로 route를
붙입니다. 이는 한 개의 메서드만 갖는 계층형 Controller 스타일과도 잘 맞습니다.

개발 환경에서는 `/api/swagger`로 OpenAPI JSON을 확인할 수 있고, `/api/docs`로
Scalar UI를 볼 수 있습니다. 운영 환경에서는 `PROFILE`에 따라 문서 endpoint를
비활성화할 수 있습니다.

## 12. 데이터 접근과 트랜잭션

데이터 접근은 Drizzle을 사용합니다. schema는 `lib/db/schema.ts`에 정의되어 있고,
테이블명은 단수형을 사용합니다. 예를 들어 `article`, `user` 테이블이 있습니다.

이 프로젝트에서 눈여겨볼 부분은 `SqlOptions`와 `TransactionTemplate`입니다.

서버리스나 컨테이너 환경에서는 Spring Boot처럼 thread local 기반으로 transaction
context나 read-only 여부를 암묵적으로 들고 가기 어렵습니다. 그래서 이 프로젝트는
읽기 작업에서 `SqlOptions`를 명시적으로 전달합니다.

```typescript
export type SqlOptions = {
  useReplica: boolean;
};
```

`TransactionTemplate`은 이 옵션을 보고 primary 또는 replica DB client를
선택합니다. 쓰기 작업은 항상 primary를 사용하고, 읽기 작업은 호출자가 replica
사용 여부를 결정할 수 있습니다.

```typescript
return this.transactionTemplate.execute(sqlOptions, async (tx) => {
  const results = await tx.select().from(article);
  return results;
});
```

쓰기 Adapter는 `SqlOptions`를 받지 않고 primary DB를 사용하도록 고정할 수
있습니다.

```typescript
async createArticle(articleData: ArticleCreation): Promise<Pick<Article, "id">> {
  return this.transactionTemplate.execute({ useReplica: false }, async (tx) => {
    const result = await tx.insert(article).values(articleData);
    return { id: Number(result[0].insertId) };
  });
}
```

이 방식은 Spring의 `@Transactional(readOnly = true)`만큼 자동적이지는 않지만,
서버리스 환경에서는 오히려 명시적인 선택이 더 안전할 수 있습니다. 어느 요청이
replica DB를 사용해도 되는지, 어느 작업은 반드시 primary DB를 사용해야 하는지
코드에서 드러나기 때문입니다.

대규모 트래픽에서는 데이터베이스가 가장 먼저 병목이 되는 경우가 많습니다. 따라서
이 구조를 실제 서비스에 적용할 때는 다음을 함께 고려해야 합니다.

- read replica 사용
- RDS Proxy 또는 DB connection proxy
- 느린 쿼리 분석
- index 설계
- cache layer
- queue를 통한 write 비동기화
- 트랜잭션 범위 최소화
- connection pool 크기와 task 수의 균형

Hono가 빠르더라도 DB가 버티지 못하면 전체 시스템은 느려집니다. 대규모 트래픽
대응은 웹 프레임워크의 성능보다 데이터 접근 전략에서 더 많이 결정됩니다.

## 13. 인증과 에러 처리

인증은 JWT bearer token 기반으로 구성되어 있습니다. 로그인이나 토큰 재발급
API에서 토큰을 발급하고, 인증이 필요한 API는 `security: [{ bearerAuth: [] }]`를
route metadata에 선언합니다.

`authMiddleware`는 요청의 Authorization header를 확인하고, 유효한 token이면 인증
context를 Hono context에 저장합니다. Controller에서는 다음처럼 principal을 꺼낼
수 있습니다.

```typescript
const principal = c.get("principal");
```

인증 흐름은 다음처럼 이해할 수 있습니다.

```text
Authorization header
  -> authMiddleware
    -> token 검증
      -> principal 생성
        -> Hono context에 저장
          -> Controller에서 c.get("principal")로 사용
```

Spring Security의 `SecurityContext`를 떠올리면 이해하기 쉽습니다. 완전히 같은
구현은 아니지만, 인증 middleware가 요청 단위의 인증 정보를 만들고 이후 handler가
그 정보를 참조한다는 역할은 비슷합니다.

에러 처리는 domain error와 API error를 구분합니다. 예를 들어 리소스를 찾지
못하면 `DomainNotFoundError`, 인증에 실패하면 `DomainUnauthorizedError`, 잘못된
요청이면 `DomainBadRequestError`를 사용할 수 있습니다. 전역 에러 핸들러는 이런
도메인 예외를 일관된 API 응답으로 변환합니다.

이 구조는 Spring Boot의 `@ControllerAdvice`와 비슷합니다. Controller마다
try/catch를 반복하지 않고, 도메인과 애플리케이션 계층에서는 의미 있는 예외를
던지고, 웹 계층의 전역 핸들러가 HTTP 응답으로 바꿉니다.

데이터베이스 에러 처리도 중요합니다. Persistence Adapter는 외부 시스템과 직접
통신하는 계층이므로 DB 에러를 그대로 밖으로 노출해서는 안 됩니다. 서버 로그에는
원인 분석에 필요한 정보를 남기되, 클라이언트에는 일반화된 내부 서버 에러를
반환하는 방식이 안전합니다.

## 14. 테스트 전략

테스트는 단위 테스트와 통합 테스트를 나눠서 구성합니다. 단위 테스트는 특정
서비스나 설정의 동작을 빠르게 검증하고, 통합 테스트는 실제 HTTP API를 호출해
end-to-end에 가까운 흐름을 검증합니다.

통합 테스트에는 pactum을 사용합니다. Pactum은 Spring MockMvc와 같은 계층의
도구는 아니지만, `spec().post(...).withBody(...).expectStatus(...)`처럼 요청
생성과 응답 검증을 메서드 체이닝으로 작성할 수 있습니다. Spring MockMvc의
`perform(...).andExpect(...)` 스타일에 익숙한 개발자에게 비교적 자연스럽고,
Deno의 npm 호환성을 통해 Deno test 안에서도 사용할 수 있습니다.

```typescript
await pactum.spec()
  .post("/api/articles")
  .withJson({ title: "title", content: "content" })
  .expectStatus(200);
```

`deno task intTest`는 `start-server-and-test`를 사용해 서버를 먼저 띄우고,
health check를 통과하면 통합 테스트를 실행합니다.

Hono의 `app.request()`나 `testClient()`를 사용하면 더 가벼운 in-process 테스트를
작성할 수 있습니다. 이 방식은 Hono route를 빠르게 검증하기에는 좋지만, 이
프로젝트에서는 실제 서버를 띄운 뒤 HTTP 요청을 보내는 통합 테스트 흐름을
구현해서 `@SpringBootTest`로 수행할 수 있는 end-to-end 통합 테스트와 유사한
테스트 경험을 만들어보고 싶었습니다.

Mock Adapter와 Persistence Adapter를 모두 둘 수 있는 구조도 테스트에 도움이
됩니다. 빠른 테스트에서는 mock adapter를 사용하고, DB 연동이 중요한 통합
테스트에서는 실제 MySQL과 Drizzle migration을 사용할 수 있습니다.

## 15. 실행과 로컬 개발 환경

로컬 개발은 Deno task를 중심으로 구성되어 있습니다.

```bash
deno install
deno task setup
docker-compose up -d
deno task db:migrate:local
deno task dev
```

`docker-compose.yml`은 로컬 MySQL 개발 환경을 제공합니다. Drizzle migration을
실행한 뒤 `deno task dev`로 Hono 서버를 실행하면 기본 포트에서 API를 호출할 수
있습니다.

문서 endpoint는 개발 환경에서 확인할 수 있습니다.

- `/api/swagger`: OpenAPI JSON
- `/api/docs`: Scalar UI

Deno의 장점은 개발 도구가 단순하다는 점입니다. 별도 TypeScript compile step 없이
실행할 수 있고, formatter와 linter, test runner가 기본 제공됩니다. Node.js
프로젝트에서 자주 필요한 여러 도구 설정이 줄어듭니다.

## 16. 배포와 인프라 구성

배포는 Docker 이미지를 중심으로 설계되어 있습니다. `deno task build`는 인프라
스크립트를 통해 이미지를 만들고, `deno task run-image`로 로컬에서 컨테이너
실행을 확인할 수 있습니다.

Lambda 컨테이너 런타임을 사용할 때는 몇 가지 주의점이 있습니다. Lambda의 파일
시스템은 일반적으로 read-only이고, `/tmp`만 writable하다고 가정하는 것이
안전합니다. 따라서 Deno cache 경로도 런타임에서 writable한 위치를 사용해야
합니다.

이 프로젝트는 cold start를 줄이기 위해 Docker build 단계에서 의존성을 미리
cache합니다. 그리고 런타임 entrypoint에서 seed cache를 `/tmp` 아래로 복사해
재사용합니다. 특정 라이브러리가 실행 시점에 추가 바이너리를 다운로드한다면 build
단계에서 prewarm step을 추가해야 합니다.

인프라 코드는 `infra/terraform` 아래에서 관리합니다. 이 부분은 AWS Lambda 배포를
위한 기본 구성을 담고 있고, 이후 ECS로 옮길 때도 같은 이미지와 비슷한 환경
변수를 기반으로 서비스를 구성할 수 있습니다.

Lambda 컨테이너 실행과 ECS 컨테이너 실행의 차이는 다음처럼 볼 수 있습니다.

| 항목          | Lambda container image            | ECS container service                |
| ------------- | --------------------------------- | ------------------------------------ |
| 실행 모델     | 요청 기반 실행                    | 상시 실행 task                       |
| 확장 방식     | Lambda concurrency                | ECS service autoscaling              |
| HTTP 진입점   | Lambda runtime adapter            | Deno.serve / HTTP server             |
| 파일 시스템   | 대부분 read-only, `/tmp` writable | 컨테이너 파일 시스템                 |
| DB 커넥션     | 짧은 실행과 동시성 증가를 고려    | 프로세스 단위 pool 관리가 쉬움       |
| 적합한 트래픽 | bursty traffic                    | steady traffic                       |
| 운영 포인트   | cold start, concurrency, timeout  | task 수, load balancer, health check |

ECS로 전환할 때 유지되는 것과 바뀌는 것을 구분하면 다음과 같습니다.

| 유지되는 것              | 바뀌는 것                   |
| ------------------------ | --------------------------- |
| Docker image build       | 실행 entrypoint             |
| Hono app                 | Lambda runtime adapter      |
| `core/` 비즈니스 로직    | ECS service/task definition |
| Drizzle schema와 adapter | autoscaling 정책            |
| API controller 구조      | load balancer, health check |
| 환경 변수 기반 설정      | 로그/metric 수집 방식       |

이 구분이 명확하면 배포 환경이 바뀌어도 애플리케이션의 중심 구조는 흔들리지
않습니다.

## 17. 언제 Lambda를 쓰고 언제 ECS로 옮길까

Lambda와 ECS 중 어느 쪽이 더 좋은지는 절대적인 문제가 아닙니다. 트래픽 패턴과
운영 요구에 따라 달라집니다.

Lambda가 유리한 경우는 다음과 같습니다.

- 트래픽이 일정하지 않고 bursty하다.
- 요청이 짧고 stateless하다.
- 평소 트래픽이 낮아 idle 비용을 줄이고 싶다.
- 빠르게 배포하고 운영 부담을 줄이고 싶다.
- 이벤트성 트래픽 spike를 자주 처리해야 한다.

예를 들어 어드민 API, 캠페인 기간에만 트래픽이 몰리는 서비스, 외부 webhook 처리,
초기 MVP API는 Lambda로 시작하기 좋습니다. 요청이 짧고, 상태를 프로세스 메모리에
오래 들고 있을 필요가 없고, 트래픽이 없을 때 비용을 줄이는 것이 중요하기
때문입니다.

ECS가 유리한 경우는 다음과 같습니다.

- 트래픽이 상시적으로 높다.
- p95/p99 latency를 더 예측 가능하게 관리하고 싶다.
- DB connection pool을 애플리케이션 프로세스에서 안정적으로 관리하고 싶다.
- background worker, queue consumer, scheduler를 함께 운영해야 한다.
- streaming, 긴 요청, CPU-bound 작업처럼 Lambda와 잘 맞지 않는 워크로드가 있다.
- 일정 규모 이상에서 Lambda보다 컨테이너 상시 실행 비용이 더 낫다.

예를 들어 모바일 앱의 핵심 API, 외부 파트너가 지속적으로 호출하는 API, queue
consumer, scheduler, worker, 긴 연결을 다루는 서비스는 ECS가 더 단순할 수
있습니다. 이 경우에는 프로세스를 계속 띄워두는 편이 latency와 운영 예측 가능성
측면에서 유리합니다.

이 프로젝트의 장점은 이 결정을 처음부터 고정하지 않아도 된다는 점입니다.
처음에는 Lambda로 시작해 운영 부담을 줄이고, 서비스가 커지면 병목과 비용 구조를
보고 ECS로 옮길 수 있습니다. 이때 핵심은 Docker 이미지와 Hono 앱, Hexagonal
Architecture 덕분에 이전 비용을 낮출 수 있다는 점입니다.

## 18. 어떤 프로젝트에 적합한가

이 아키텍처는 다음과 같은 프로젝트에 잘 맞습니다.

- 중소규모 백엔드 API
- 어드민과 백오피스
- 사내 도구
- PoC와 MVP
- Next.js 풀스택에서 백엔드만 분리할 가능성이 있는 프로젝트
- 이벤트나 캠페인으로 순간적인 트래픽 spike가 있는 서비스
- 모바일 앱이나 외부 파트너에게 API를 제공하는 서비스
- Spring Boot 개발자 경험을 TypeScript로 가져오고 싶은 팀
- AI와 함께 TypeScript 기반 제품 개발 속도를 높이고 싶은 팀

특히 "처음에는 작지만, 커지면 백엔드만 독립적으로 확장해야 할 수 있다"는
프로젝트에 잘 맞습니다. 처음부터 거대한 백엔드 플랫폼을 만들 필요는 없지만,
나중에 성장했을 때 Controller와 비즈니스 로직이 뒤섞인 코드 때문에 고생하고
싶지도 않은 경우입니다.

반대로 단순한 route handler 몇 개로 충분한 프로젝트라면 이 구조가 다소 무겁게
느껴질 수 있습니다. 아주 작은 API라면 Hono route만으로 시작해도 됩니다. 이
프로젝트는 "작지만 곧 복잡해질 수 있는 백엔드"를 위한 구조에 가깝습니다.

## 19. 한계와 주의할 점

이 스택이 Spring Boot의 모든 것을 대체한다고 말할 수는 없습니다. Spring Boot는
오랜 시간 검증된 생태계, 방대한 starter, 운영 사례, observability 도구, 보안
기능, batch 처리, transaction 관리, enterprise integration을 갖추고 있습니다.
TypeScript 스택으로 같은 수준의 통합 경험을 얻으려면 직접 선택하고 조합해야 하는
부분이 많습니다.

서버리스 DB 커넥션 전략도 별도로 설계해야 합니다. Lambda에서 MySQL이나
PostgreSQL에 직접 많은 커넥션을 만들면 DB가 먼저 한계에 도달할 수 있습니다. RDS
Proxy, Aurora, PlanetScale/Vitess, connection pooler, read replica 같은 선택지를
워크로드에 맞게 검토해야 합니다.

대규모 트래픽을 다룰 때는 다음 요소가 사실상 필수입니다.

- cache
- queue
- read replica
- rate limit
- circuit breaker
- timeout과 retry 정책
- OpenTelemetry 기반 trace
- metric과 alert
- slow query 분석
- 배포와 rollback 전략

Hono는 가볍고 좋은 웹 계층이지만, 대규모 트래픽을 감당하는 힘은 전체 시스템
설계에서 나옵니다.

또한 팀이 TypeScript, Deno, Hono 생태계에 익숙해져야 합니다. Java/Spring에
익숙한 팀이라면 처음에는 decorator, import map, Deno task, Drizzle query style,
Zod schema 방식이 낯설 수 있습니다. 하지만 구조 자체는 Spring Boot에서 익숙한
책임 분리와 크게 다르지 않기 때문에 학습 곡선은 관리 가능한 수준이라고
생각합니다.

반대로 이 스택을 선택하지 않는 편이 나은 경우도 있습니다.

- 이미 Java/Spring 운영 자산과 표준 라이브러리가 큰 조직
- 복잡한 batch, messaging, enterprise integration이 핵심인 서비스
- Deno 생태계와 npm 호환성 이슈를 감당하기 어려운 팀
- JVM 기반 모니터링, 보안, 배포 표준이 강하게 자리 잡은 조직
- 팀이 TypeScript 백엔드 운영 경험을 쌓을 여유가 전혀 없는 상황

이런 경우에는 Spring Boot를 유지하는 것이 더 실용적일 수 있습니다. 이 글의
주장은 Spring Boot를 버리자는 것이 아니라, 작은 팀이나 TypeScript 중심 팀에게는
Hono 기반 백엔드도 충분히 현실적인 선택지가 될 수 있다는 것입니다.

## 20. 결론

이 프로젝트의 목표는 Spring Boot가 오랫동안 증명해온 백엔드 개발의 좋은 구조를
TypeScript 생태계 안에서 가볍게 재구성해보는 것입니다.

Hono는 웹 계층을 단순하고 빠르게 만들어주고, Deno는 TypeScript 실행 환경과 개발
도구를 단순화합니다. Drizzle은 SQL에 가까운 타입 안전한 데이터 접근을 제공하고,
Inversify 계열 IoC 컨테이너는 Spring Boot 개발자에게 익숙한 의존성 주입 경험을
제공합니다. 여기에 Hexagonal Architecture를 적용하면 실행 환경이 Lambda든 ECS든
핵심 비즈니스 로직을 유지할 수 있습니다.

AWS Lambda 컨테이너 이미지로 시작하면 서버리스의 장점을 살려 빠르게 배포하고
순간적인 트래픽 spike에 대응할 수 있습니다. 그리고 트래픽이 상시적으로 커지거나
운영 요구가 달라지면 같은 Docker 이미지를 기반으로 ECS 같은 컨테이너 기반 실행
환경으로 옮길 수 있습니다.

결국 이 아키텍처의 핵심은 "처음부터 무겁게 시작하지 않되, 커졌을 때 버릴 필요
없는 구조"입니다. 작은 팀이 TypeScript와 AI를 활용해 빠르게 개발하면서도, Spring
Boot에서 익숙했던 구조적 안정성을 잃지 않고 싶다면 Hono 기반 TypeScript 서버리스
백엔드는 충분히 검토할 만한 선택지입니다.
