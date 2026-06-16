## 배경

제가 재직중인 회사는 소규모 IT 컨설팅 회사입니다. 구성원중 개발을 할 수 있는
컨설턴트가 8명 정도 되는 작은 회사입니다. 소규모 인원으로 높은 마진을 추구하고
있기 때문에 개발자 한 명 한 명의 생산성이 중요합니다.

구성원들은 저를 포함해 모두 Java와 Spring 기반의 기술에 능숙하고 AI와 함께
프론트엔드 개발은 물론 클라우드 인프라까지 구성할 수 있는 풀스택 개발이
가능합니다.

회사의 규모가 크지 않기 때문에 많은 개발자들이 필요한 대형 프로젝트는 진행하지
않고, 개발자 2~4명을 투입할 수 있는 중소규모의 프로젝트를 수주하는 편입니다.

신규 솔루션을 구축해야 하는 경우 보통 백엔드는 Kotlin과 Spring Boot,
프론트엔드는 TypeScript와 Next.js를 사용하곤 했었습니다. 하지만 React와
Next.js가 Server Component, Server Actions, Route Handlers 등의 기능을 통해
백엔드의 영역도 충분히 커버할 수 있을 만큼 발전했고 Vercel등을 사용해서 배포도
쉽게 할 수 있기 때문에, 규모가 크지 않거나 성능이 덜 중요한 프로젝트인 경우
백엔드를 Spring Boot 대신 Next.js를 사용해 PHP같은 풀스택 애플리케이션으로
구성하는 것도 충분히 고려해볼 만한 선택지가 되었습니다.

백엔드 애플리케이션을 배포하기 위한 인프라 설정 시간, 프론트엔드와 백엔드가
소통하기 위한 API 정의, 프론트엔드와 백엔드를 각각 배포해야 한다는 번거로움,
프론트엔드와 백엔드간의 호환성을 깨뜨리지 않기 위한 고려 등은 Next.js로 풀스택
애플리케이션을 구성하면 완전히 제거할 수 있는 overhead입니다.

이 글에서는 중소규모 프로젝트를 진행하는 저희 회사의 상황에 맞추어 백엔드와
프론트엔드를 분리하지 말고 Next.js로 풀스택 애플리케이션만 만들어 생산성을
높이자는 제안을 하려고 합니다. 더불어서 모종의 이유로 백엔드 부분만 떼어내어
백엔드 애플리케이션을 구성해야 하는 상황에서도 적은 비용으로 백엔드 부분만
분리해낼 수 있는 아키텍처를 제안합니다.

> 제안하려는 아키텍처를 바탕으로 구현한 PoC용 프로젝트 링크입니다.
>
> - 실행 가능한 Next.js 풀스택 예시 프로젝트:
>   https://github.com/myeongjae-kim/nextjs-fullstack-opinionated/tree/main
> - 실행 가능한 서버리스 백엔드 예시 프로젝트:
>   https://github.com/myeongjae-kim/nextjs-fullstack-opinionated/tree/deno

## 아키텍처 요구사항 정리

제안하려는 아키텍처가 만족해야 하는 요구사항은 다음과 같습니다.

1. 백엔드를 위한 클라우드 인프라를 따로 구성하지 않고 Vercel에 간단하게 배포하고
   싶다 (=서버리스 백엔드에 대한 고민 필요).
2. 구성원들이 Spring에 익숙한 만큼 백엔드 성격의 코드는 객체지향적으로 작성하고
   싶다.
3. 풀스택 애플리케이션이 구성된 상태에서 백엔드 부분만 쉽게 떼어내어 백엔드
   애플리케이션을 빠르게 구성할 수 있으면 좋겠다.
4. 백엔드 애플리케이션을 분리해서 구성하는 경우 웹 부분은 Spring Boot와 유사한
   개발자 경험을 제공했으면 좋겠다.

Vercel은 백엔드 성격의 코드를 서버리스로 실행하기 때문에 서버리스 환경에 맞는
기술을 선택해야 합니다. 예를 들어 데이터베이스 커넥션 같은 경우가 기존의 서버
기반 환경과 많이 차이가 나는 부분입니다. 전통적인 방식은 서버에 계속 살아있는
애플리케이션에 커넥션 풀을 구성하지만, 언제든지 애플리케이션이 죽었다가 다시
살아나는 서버리스 환경에서는 애플리케이션측의 커넥션 풀 대신 다른 방법을
사용해야 합니다.

구성원들이 Java와 Spring에 능숙하기 때문에 백엔드 영역의 코드는 객체지향적으로
작성하고 IoC 컨테이너도 사용할 수 있으면 좋습니다. 마찬가지로 IoC 컨테이너도
서버리스 환경에 어울리도록 빠르게 실행될 수 있어야 합니다.

서버리스 위에서 실행되는 풀스택 애플리케이션이지만, 모종의 이유(비용, 성능 등)
때문에 백엔드 영역을 떼어내어 서버 기반의 백엔드 애플리케이션을 구성해야 할 때도
빠르게 대응할 수 있는 아키텍처가 되어야 합니다.

Next.js는 서버 기반의 백엔드 웹 프레임워크로 사용할 수도 있긴 하지만, 성능을
고려해야 하는 상황에서 Next.js를 백엔드 웹 프레임워크로 사용하는 건 적절한
선택이 아니기 때문에 성능도 좋고 Spring Boot에서 제공하는 기능들을 채워줄 수
있는 TypeScript 백엔드 프레임워크도 필요합니다.

## Next.js 풀스택 애플리케이션을 위한 백엔드 기술스택 탐색

백엔드 기술스택에서 고려해야 할 지점은 다음과 같습니다.

1. 서버리스 환경에서 데이터베이스 커넥션을 어떻게 관리할 것인지
2. 애플리케이션에서 데이터베이스 쿼리는 어떻게 생성할지
3. 객체지향을 위한 IoC 컨테이너
4. 백엔드만 분리할 때 Next.js 대신 사용할 웹 프레임워크

### 서버리스 환경의 데이터베이스 커넥션 관리

서버 기반의 애플리케이션에서는 애플리케이션 프로세스가 오랫동안 살아있고,
프로세스의 개수도 어느 정도 예측할 수 있습니다. 그래서 애플리케이션 내부에서
데이터베이스 커넥션 풀을 생성하고, 요청이 들어올 때마다 풀에서 커넥션을 빌려
사용한 뒤 다시 반환하는 방식이 자연스러웠습니다. Spring Boot 애플리케이션에서
HikariCP를 사용하는 방식이 대표적인 예입니다.

하지만 서버리스 환경에서는 이 전제가 많이 달라집니다. 서버리스 함수는 필요할 때
생성되고, 일정 시간이 지나면 중단되거나 제거될 수 있습니다. 트래픽이 순간적으로
늘어나면 함수 인스턴스도 빠르게 늘어나기 때문에, 각 인스턴스가 서버 기반
애플리케이션처럼 자체 커넥션 풀을 크게 잡아버리면 데이터베이스 입장에서는 짧은
시간 안에 매우 많은 커넥션 요청을 받게 됩니다. 반대로 매 요청마다 커넥션을 새로
만들고 닫는 방식도 커넥션 생성 비용이 커지고, 트래픽이 몰릴 때 데이터베이스의
최대 커넥션 수를 쉽게 소진할 수 있습니다.

그래서 서버리스 환경에서는 애플리케이션 내부의 커넥션 풀에 모든 책임을 맡기는
대신, 애플리케이션과 데이터베이스 사이에서 커넥션을 관리해주는 계층을 사용하는
방식이 더 잘 맞습니다. Vercel도
[Vercel Functions에서의 커넥션 풀링
가이드](https://vercel.com/kb/guide/connection-pooling-with-functions)에서
관계형 데이터베이스에 연결할 때 커넥션 풀링을 고려하라고 안내하고 있고, 서버리스
환경의 진짜 문제는 단순히 함수가 많아지는 것보다 중단된 함수가 커넥션을 제대로
반납하지 못하는 상황이라고
설명합니다([The real serverless compute to database connection problem,
solved](https://vercel.com/blog/the-real-serverless-compute-to-database-connection-problem-solved)).
Vercel의 Fluid compute처럼 warm instance를 재사용할 수 있는 환경에서는 전역
스코프에 풀을 만들고 런타임이 정리할 수 있게 연결하는 방식도 선택지가 됩니다.

데이터베이스 제공자들도 이 문제를 해결하기 위한 기능을 제공합니다. PostgreSQL
진영에서는 PgBouncer 기반의 커넥션 풀러를 제공하는 경우가 많고, MySQL 진영에서는
[Vitess](https://planetscale.com/vitess)처럼 서버리스 환경에서 사용하기 좋은
데이터베이스 서비스가 있습니다. [PlanetScale](https://planetscale.com/)은
Vitess를 JavaScript 환경에서 사용하기 위한
[serverless driver](https://planetscale.com/docs/vitess/tutorials/planetscale-serverless-driver)를
제공하고, 이 드라이버는 일반적인 MySQL TCP 커넥션 대신 HTTP를 통해
데이터베이스에 접근할 수 있게 해줍니다. 서버리스 또는 Edge 환경처럼 TCP 커넥션을
오래 유지하기 어려운 환경에서는 이런 방식이 애플리케이션 내부 커넥션 풀보다 더
단순하고 안전합니다.

AWS의 RDS를 사용한다면 [Amazon RDS Proxy](https://aws.amazon.com/rds/proxy/)가
대표적인 선택지입니다. AWS도
[Lambda에서 RDS를 사용할 때](https://docs.aws.amazon.com/lambda/latest/dg/services-rds.html)
짧은 데이터베이스 연결을 자주 만들거나 많은 연결을 열고 닫는 함수에는 RDS
Proxy를 권장합니다. RDS Proxy는 애플리케이션과 RDS 사이에서 공유 데이터베이스
커넥션 풀을 관리해서, Lambda 함수가 높은 동시성을 가지더라도 실제 데이터베이스
커넥션 수가 과도하게 늘어나지 않도록 도와줍니다.

### 서버리스 애플리케이션에서 사용하기 좋은 쿼리 생성기

Node.js와 TypeScript 환경에서 데이터베이스를 다루기 위한 선택지는 다양합니다.
대표적으로 Prisma, TypeORM, Sequelize 같은 ORM이 있고, SQL에 더 가까운 타입
안전한 쿼리 빌더로는 Kysely와 Drizzle을 고려할 수 있습니다. 각각 장점이 있지만,
이 글에서 제안하는 아키텍처는 Next.js의 서버리스 함수 위에서 동작하는 것을
기본값으로 두기 때문에 일반적인 서버 기반 애플리케이션과는 다른 기준으로
선택해야 합니다.

서버리스 환경에서 쿼리 생성기를 선택할 때는 다음 기준이 중요합니다.

1. cold start에 부담이 적어야 합니다.
2. 런타임에 무거운 엔진이나 별도 데몬을 요구하지 않아야 합니다.
3. HTTP 기반 serverless driver나 서버리스 데이터베이스와 잘 어울려야 합니다.
4. SQL에 가까운 제어권을 유지하면서도 TypeScript의 타입 안정성을 얻을 수 있어야
   합니다.

Prisma는 스키마 정의와 마이그레이션, 타입 생성, 개발자 경험이 매우 좋습니다.
그래서 일반적인 Node.js 백엔드 애플리케이션에서는 생산성이 높은 선택지입니다.
다만 Prisma는 런타임에 별도의 query engine을 사용하고, 이로 인해 서버리스
환경에서는 번들 크기와 cold start 측면에서 부담이 생길 수 있습니다. 트래픽이
적고 함수가 자주 식는 환경에서는 이런 비용이 체감될 가능성이 있습니다.

TypeORM과 Sequelize는 오래 사용되어 온 ORM이고, 서버 기반 애플리케이션에서는
익숙한 패턴을 제공합니다. 하지만 데코레이터, 런타임 메타데이터, 엔티티 중심의
무거운 추상화는 서버리스 풀스택 애플리케이션의 기본 선택지로 삼기에는 다소
부담스럽습니다. 특히 Next.js Route Handler나 Server Action처럼 짧게 실행되는
코드 경로에서는 ORM이 제공하는 풍부한 기능보다 초기화 비용과 단순성이 더 중요한
기준이 됩니다.

[Kysely](https://kysely.dev/)는 SQL에 가까운 타입 안전한 쿼리 빌더라는 점에서
서버리스 환경과 잘 어울리는 선택지입니다. 쿼리 제어권이 높고 추상화도 가벼운
편입니다. 데이터베이스 스키마 정의, 마이그레이션, 타입 안전한 쿼리 작성, ORM에
가까운 개발자 경험까지 한 번에 가져갈 수 있습니다.

[Drizzle](https://orm.drizzle.team/)도 Kyseley와 유사합니다. 런타임이 가볍고
SQL에 가까운 방식으로 쿼리를 작성할 수 있으며, TypeScript 타입 추론을 통해 쿼리
결과와 스키마를 안전하게 다룰 수 있습니다. 또한 PlanetScale serverless driver,
Neon, Vercel Postgres 같은 서버리스 친화적인 데이터베이스 드라이버와 함께
사용하기 좋고, Next.js 서버리스 함수 안에서 초기화 부담이 크지 않습니다.

Spring의 JPA처럼 객체 그래프를 중심으로 모든 것을 추상화하는 방식은 아니지만, 이
아키텍처에서는 오히려 SQL이 보이는 편이 더 적합합니다. 중소규모 프로젝트에서
복잡한 ORM 기능보다 중요한 것은 쿼리가 예측 가능하고, 타입이 안전하며, 서버리스
환경에서 실행 비용이 작고, 필요할 때 백엔드만 분리하더라도 같은 데이터 접근
코드를 유지하는 것입니다.

### 객체지향을 위한 IoC 컨테이너

Node.js 진영에서 객체지향적으로 백엔드 코드를 구성하기 위해 사용할 수 있는 IoC
컨테이너로는 대표적으로 [NestJS](https://nestjs.com/)와
[Inversify](https://inversify.io/)를 고려할 수 있습니다.

NestJS는 Spring Boot와 유사한 개발자 경험을 제공하는 객체지향 기반의 웹
프레임워크입니다. Controller, Service, Module, Pipe, Guard, Interceptor 같은
개념을 제공하고, 데코레이터 기반으로 애플리케이션을 구성할 수 있습니다. 또한
NestJS는 웹 서버를 띄우지 않고 standalone application 형태로 실행해서 IoC
컨테이너만 따로 사용할 수도 있습니다. 따라서 Spring Boot에 익숙한 개발자에게는
매우 자연스러운 선택지입니다.

하지만 우리의 아키텍처에서 웹 계층은 기본적으로 Next.js가 담당합니다. API
라우팅은 Route Handler가 처리하고, 화면 렌더링과 프론트엔드 통합도 Next.js가
맡습니다. 이런 상황에서 NestJS를 도입하면 실제로 필요한 것은 IoC 컨테이너뿐인데,
웹 프레임워크가 제공하는 많은 기능까지 함께 가져오게 됩니다. 기능이 풍부하다는
점은 서버 기반의 백엔드 애플리케이션에서는 장점이지만, 서버리스 풀스택
애플리케이션에서는 번들 크기와 초기화 비용을 늘리는 요인이 될 수 있습니다.

Inversify는 NestJS와 달리 웹 프레임워크가 아니라 순수한 IoC 컨테이너입니다. 하는
일이 의존성 등록과 주입에 집중되어 있기 때문에 Next.js가 이미 제공하는 웹
프레임워크 기능과 겹치지 않습니다. 서버리스 함수에서는 요청을 처리하기 위해
필요한 코드가 빠르게 로드되고 실행되는 것이 중요하므로, 이처럼 역할이 좁고
가벼운 라이브러리가 더 잘 맞습니다. NestJS의 코어 부분과 Inversify를 번들 크기
기준으로 보더라도 Inversify 쪽이 더
가볍습니다([inversify: 57.9kB](https://bundlephobia.com/package/inversify@7.10.8),
[@nestjs/core: 189.2kB](https://bundlephobia.com/package/@nestjs/core@11.1.10)).

백엔드 부분만 분리해야 하는 상황에서도 Inversify가 적절한 선택지입니다. 처음에는
Next.js 안에서 실행하다가, 이후 성능이나 비용 문제로 [Hono](https://hono.dev/)
같은 별도의 TypeScript 백엔드 프레임워크로 옮기더라도 IoC 설정은 그대로 가져갈
수 있습니다. 웹 프레임워크를 바꾸는 작업과 의존성 주입 방식을 바꾸는 작업이
분리되기 때문에 마이그레이션 비용이 더 작습니다.

NestJS의 IoC 컨테이너만 떼어내어 사용할 수도 있지만, 필요한 것이 순수한 IoC
컨테이너라면 가벼운 Inversify가 목적에 잘 맞습니다.

### 백엔드만 떼어내기 위한 웹 프레임워크 Hono

Node.js 진영에는 Express, Fastify, NestJS처럼 검증된 웹 프레임워크들이 많습니다.
Express는 가장 널리 알려진 선택지이고, Fastify는 높은 성능과 플러그인 생태계를
갖추고 있으며, NestJS는 Spring Boot와 유사한 객체지향 웹 프레임워크 경험을
제공합니다. 모두 좋은 선택지이지만, 이 아키텍처에서 중요한 기준은 서버리스
환경과 여러 런타임으로의 이동 가능성입니다.

[Hono](https://hono.dev/)는 처음부터 Cloudflare Workers에서 동작하는 웹
애플리케이션을 만들기 위해 시작된 프레임워크입니다. 서버 프로세스를 오래
띄워두는 전통적인 Node.js 애플리케이션만을 전제로 하지 않고, Web Standard API를
중심으로 동작하도록 설계되었습니다. 그래서 Cloudflare Workers 같은 Edge 환경은
물론, Node.js, Deno, Bun, Vercel, AWS Lambda 같은 다양한 런타임과 배포 환경에서
사용할 수 있습니다.

<figure>
    <img src="https://cdn.myeongjae.kim/blog/2026/06/hono.webp#shadow#round"/ />
</figure>

이 점은 Next.js 풀스택 애플리케이션으로 시작했다가 백엔드 API만 분리해야 하는
상황에서 중요합니다. 초기에는 Next.js와 함께 사용해 프론트엔드와 백엔드를 하나의
애플리케이션으로 빠르게 개발하고, 이후 API 트래픽이 늘거나 성능 요구사항이
커지면 Hono로 작성한 API 계층을 별도의 런타임으로 옮기는 전략을 취할 수
있습니다. Node.js 서버로 옮길 수도 있고, Deno나 Bun을 선택할 수도 있으며, AWS
Lambda나 Cloudflare Workers 같은 서버리스 환경으로도 이동할 수 있습니다.

또한 Hono는 단순한 라우터나 작은 웹 라이브러리에 머물지 않습니다. 라우팅,
미들웨어, 인증, 요청 검증, 에러 처리, helper, adapter처럼 API 서버를 만들 때
기본적으로 필요한 기능들을 제공합니다. Spring Boot처럼 거대한 프레임워크는
아니지만, 서버리스 환경에서 백엔드 API를 구성하기에는 충분한 프레임워크 기능을
갖추고 있습니다.

타입 지원도 Hono를 선택할 중요한 이유입니다. Hono는 TypeScript로 작성되어 있고,
타입 안전한 개발 경험을 중요한 목표로 삼습니다. validator를 사용하면 요청
파라미터, query string, body의 타입을 핸들러 안에서 안전하게 다룰 수 있고,
`c.json()`으로 반환하는 응답도 타입 추론의 대상이 됩니다.

TypeScript의 literal type과 template literal type을 적극적으로 활용하는
라이브러리들이 늘어나면서, 웹 프레임워크도 단순히 런타임에서 요청을 처리하는
도구를 넘어 컴파일 타임에 실수를 줄여주는 도구가 되고 있습니다. Hono는 이런
흐름에 잘 맞는 프레임워크입니다. API path, request validation, response type,
client 호출부 사이의 불일치를 더 일찍 발견할 수 있기 때문에, TypeScript와
eslint를 적극적으로 사용하는 개발 방식과도 잘 어울립니다.

Hono는 서버리스 환경에서 출발했고, 여러 JavaScript 런타임에서 실행될 수 있으며,
API 서버에 필요한 기능과 타입 안전성을 함께 제공합니다. 따라서 Next.js로 풀스택
애플리케이션을 빠르게 시작하되, 필요할 때 백엔드 API 계층만 분리할 수 있어야
하는 이 아키텍처에서는 Hono가 적절한 웹 프레임워크 선택지입니다.

## 제안 1: Next.js 풀스택 아키텍처

첫 번째 제안은 Next.js 애플리케이션 하나 안에 프론트엔드와 백엔드 API를 함께
두는 풀스택 아키텍처입니다. 중소규모 프로젝트에서는 이 구성이 기본값이 되는 것이
좋다고 생각합니다. 프론트엔드와 백엔드를 따로 배포하지 않아도 되고, API를 별도
저장소나 별도 배포 단위 사이에서 맞추기 위한 비용도 줄어듭니다.

이 구조에서는 Next.js App Router가 화면과 서버 측 실행 환경을 담당합니다. React
UI, Server Component, Server Action, Route Handler가 같은 애플리케이션 안에
존재하고, 백엔드 API는 Hono 기반의 Web Layer를 통해
구성합니다([Hono Handler for Next.js](https://hono.dev/docs/getting-started/nextjs)).
Hono Controller는 요청과 응답, 인증, 검증, 에러 응답처럼 HTTP에 가까운 일을
담당합니다

비즈니스 로직은 Inversify를 사용해서 객체지향적으로 구성합니다. 모든 비즈니스
로직은 IoC 컨테이너를 통해서만 접근할 수 있으며,
[Port and Adapter 아키텍처](https://engineering.linecorp.com/ko/blog/port-and-adapter-architecture)를
사용합니다. Web Layer는 Inversify를 통해 Use Case를 조회합니다. Use Case는
Port를 통해 Adapter를 호출하고, Adapter는 Drizzle을 사용해 데이터베이스에
접근합니다.

요청 흐름은 다음과 같이 볼 수 있습니다.

<figure>
    <img src="https://cdn.myeongjae.kim/blog/2026/06/arch1.webp#shadow#round"/ width="400" />
</figure>

중요한 경계는 Domain과 Application 계층이 Next.js를 몰라야 한다는 점입니다. UI와
Web Controller는 Next.js나 Hono에 의존해도 괜찮습니다. 그 계층은 사용자의 요청을
받고 HTTP 응답을 만드는 바깥쪽 계층이기 때문입니다. 반면 Domain과 Application은
비즈니스 규칙과 Use Case를 표현하는 안쪽 계층이므로, Next.js, Hono, Drizzle 같은
구체 기술을 직접 알아서는 안 됩니다. 그래야 나중에 Web Layer나 배포 방식을
바꾸더라도 핵심 로직을 그대로 유지할 수 있습니다.

이 아키텍처의 가장 큰 장점은 단순함입니다. 하나의 애플리케이션을 배포하면
프론트엔드와 백엔드가 함께 배포되고, 같은 TypeScript 코드베이스 안에서 타입을
공유할 수 있습니다. OpenAPI 문서 생성, 인증 처리, 에러 처리도 한 곳에서 관리할
수 있습니다. 작은 팀이 빠르게 제품을 만들 때는 이런 단순함이 성능 최적화보다 더
큰 가치를 만들 때가 많습니다.

물론 이 구조가 모든 상황에 맞는 것은 아닙니다. API 트래픽이 화면 트래픽보다 훨씬
많거나, API 서버만 독립적으로 스케일링해야 하거나, 긴 작업과 백그라운드 처리가
많거나, 특정 리전에서 API를 따로 운영해야 하는 상황이라면 백엔드 분리를 고려해야
합니다. 하지만 그런 요구가 실제로 드러나기 전까지는 Next.js 풀스택 아키텍처로
시작하는 것이 더 실용적인 기본값입니다.

('제안 1'의 실행 가능한 예시 프로젝트:
https://github.com/myeongjae-kim/nextjs-fullstack-opinionated/tree/main)

## 제안 2: Hono 기반 서버리스 백엔드 아키텍처

두 번째 제안은 Next.js에서 백엔드 API 계층만 떼어내 Hono 기반의 서버리스 백엔드
애플리케이션으로 운영하는 아키텍처입니다. 이 구조는 처음부터 모든 프로젝트에
적용할 기본값이라기보다, Next.js 풀스택 애플리케이션으로 시작한 뒤 API 계층을
독립시켜야 할 때 선택할 수 있는 확장 경로에 가깝습니다.

이 구조에서는 Next.js는 프론트엔드와 BFF(Backend for Frontend) 성격의 얇은
계층만 담당하고, 백엔드 API는 별도의 Hono 애플리케이션이 담당합니다. Hono App은
Controller, Middleware, Error Handler를 통해 HTTP 요청을 처리하고, 내부에서는
동일하게 Inversify ApplicationContext를 통해 Use Case를 가져와 실행합니다. Use
Case, Port, Adapter, Drizzle, Domain 모델은 Next.js 풀스택 아키텍처에서 사용하던
구조를 그대로 유지할 수 있습니다.

요청 흐름은 다음과 같이 분리됩니다.

<figure>
    <img src="https://cdn.myeongjae.kim/blog/2026/06/arch2.webp#shadow#round"/ width="400" />
</figure>

이식 전략은 단순해야 합니다. Next.js Route Handler에 붙어 있던 Hono App을 별도의
엔트리포인트로 옮기고, 실행 환경에 맞는 Hono runtime adapter만 교체합니다.
Node.js 서버로 배포한다면 Node.js adapter를 사용하고, AWS Lambda나 Cloudflare
Workers를 사용한다면 해당 환경에 맞는 adapter를 사용합니다. Web Layer의
엔트리포인트는 바뀌지만, Controller가 호출하는 Use Case와 그 아래 계층은 그대로
유지하는 것이 목표입니다.

이 아키텍처의 장점은 API 서버를 독립적으로 운영할 수 있다는 점입니다. 프론트엔드
렌더링과 API 처리의 병목이 다를 때 각각 따로 스케일링할 수 있고, Next.js를 API
Layer로 사용할 때의 성능 부담도 줄일 수 있습니다. 또한 Hono가 여러 런타임에서
동작하기 때문에 Node.js, Deno, Bun, AWS Lambda, Cloudflare Workers 같은 선택지를
프로젝트 상황에 맞게 고를 수 있습니다.

대신 비용도 생깁니다. 배포 단위가 나뉘면 인프라 설정과 운영 포인트가 늘어나고,
프론트엔드와 백엔드 사이의 API 호환성을 다시 관리해야 합니다. 인증, CORS, 로깅,
모니터링, 장애 대응도 두 애플리케이션 사이에서 다시 설계해야 합니다. 따라서 이
구조는 처음부터 선택하기보다, 실제로 독립 스케일링이나 성능 요구가 생겼을 때
전환하는 편이 낫습니다.

('제안 2'의 실행 가능한 예시 프로젝트:
https://github.com/myeongjae-kim/nextjs-fullstack-opinionated/tree/deno)

## 두 아키텍처가 공유하는 코드 구조

두 아키텍처는 배포 단위와 Web Layer가 다를 뿐, 안쪽 계층은 같은 구조를 공유해야
합니다. 핵심은 처음부터 분리를 전제로 코드를 나누되, 실제 배포는 하나로 시작하는
것입니다.

공유되는 코드는 Domain, Application, Port, Adapter, Drizzle schema, IoC 설정,
Use Case 입니다. 이 계층들은 Next.js 풀스택 애플리케이션에서도 사용하고, Hono
기반 서버리스 백엔드로 분리한 뒤에도 그대로 사용합니다. 반대로 교체될 수 있는
코드는 Next.js page, Server Action, API route entrypoint, Hono runtime adapter,
배포 설정입니다.

<figure>
    <img src="https://cdn.myeongjae.kim/blog/2026/06/common-arch.webp#shadow#round"/ width="600" class="p-2" />
</figure>

이렇게 나누면 초기에는 하나의 Next.js 애플리케이션으로 빠르게 개발하면서도,
나중에 API 서버를 분리해야 할 때 핵심 코드를 다시 작성하지 않아도 됩니다.
프론트엔드와 백엔드를 물리적으로 분리하는 시점을 늦추되, 논리적인 경계는
처음부터 분명히 유지하는 방식입니다.

## 결론: 언제 어떤 아키텍처를 선택할까

중소규모 CRUD 애플리케이션, 어드민, PoC, 사내 도구, 초기 MVP라면 Next.js 풀스택
아키텍처를 기본값으로 선택하는 것이 좋습니다. 이런 프로젝트에서는 인프라와 배포
단위를 줄이는 것이 성능을 조금 더 끌어올리는 것보다 더 큰 생산성 이점을 줍니다.
프론트엔드와 백엔드를 같은 저장소와 같은 배포 단위로 관리하면 작은 팀이 더
빠르게 움직일 수 있습니다.

반대로 API 트래픽이 중심인 서비스, 모바일 앱이나 외부 파트너에게 API를 제공하는
서비스, API 서버만 독립적으로 스케일링해야 하는 서비스, Next.js 렌더링 병목과
API 처리 병목이 서로 다른 서비스라면 Hono 기반 서버리스 백엔드 아키텍처를 고려할
수 있습니다. 이 경우에는 프론트엔드와 백엔드를 나누는 운영 비용보다 독립적인
스케일링과 성능 제어에서 얻는 이점이 더 커질 수 있습니다.

중요한 것은 처음부터 과하게 분리하지 않는 것입니다. 분리 가능한 구조로 시작하되,
실제 분리는 성능 문제나 운영 경계가 필요해졌을 때 수행합니다. 이 글에서 제안하는
방향은 백엔드 분리를 포기하자는 것이 아니라, 분리 비용을 낮춘 상태로 Next.js
풀스택 아키텍처부터 시작하자는 것입니다.
