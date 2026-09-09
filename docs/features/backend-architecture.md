# 백엔드 의존성 경계와 트랜잭션

## 기능 개요

API, 비즈니스 로직, 데이터베이스 구현의 의존성을 분리합니다. API 경로와 기존
성공 응답 상태 코드는 유지합니다.

- `UseCaseBeanConfig.ts`는 UseCase 구현만 등록합니다.
- `DependencyTokens.ts`는 UseCase, Out Port, 설정의 타입을 분리합니다.
- `beanConfig.ts`는 UseCase 설정과 Adapter를 하나의 컨테이너로 조립합니다.
- `ApiControllerConfig.ts`와 `ApiRuntimeConfig.ts`가 UseCase를 조회하고
  컨트롤러와 인증 미들웨어에 전달합니다.
- 서비스 테스트는 컨테이너 없이 가짜 Port를 생성자에 전달할 수 있습니다.

Domain은 일반 Zod schema와 비즈니스 타입을 소유합니다. 설명은 `.describe()`로
유지하며, OpenAPI 전용 설정과 JSON 표현은 API 계층에서 관리합니다. Domain과
Application은 Hono, Drizzle, DB 연결, JWT·비밀번호 해싱 구현을 참조하지
않습니다. 다른 도메인과는 UseCase를 통해 협력합니다.

## 트랜잭션 동작

회원가입 등 여러 DB 작업이 묶인 UseCase는 `TransactionPort.run()`으로 범위를
정합니다. Adapter의 쿼리는 `TransactionTemplate.execute()`를 사용합니다. 동일한
비동기 작업 흐름에서 중첩 호출은 기존 트랜잭션에 참여합니다.

- 가장 바깥의 `useReplica`가 DB와 읽기 전용 여부를 결정합니다.
- 쓰기 범위 내부 조회는 `useReplica: true`를 전달해도 같은 Primary 트랜잭션에
  참여하므로 직전에 기록한 값을 읽을 수 있습니다.
- Replica 읽기 범위에서 쓰기로 전환할 수 없습니다.
- 중첩 작업의 실패는 전체 rollback 대상이 됩니다. 호출자가 그 예외를 잡아도 바깥
  범위를 커밋하지 않습니다.
- 서로 다른 요청은 트랜잭션을 공유하지 않습니다.
- 트랜잭션 안의 DB 작업은 순차적으로 await해야 하며, 완료 후 남은 비동기 작업이
  해당 트랜잭션을 다시 사용하면 오류가 발생합니다.
- 중첩 호출에서 격리 수준 등 설정을 바꿀 수 없습니다. 독립 트랜잭션을 시작하는
  `REQUIRES_NEW`는 제공하지 않습니다.

회원가입은 비밀번호 해싱을 먼저 수행하고 DB 작업 범위를 시작합니다. 사용자 생성
이후 토큰 발급 등 후속 작업이 실패하면 사용자 생성도 취소됩니다. 동시 회원가입의
중복 방지는 DB unique constraint가 최종적으로 담당합니다.

## API 응답과 오류

- `POST /api/articles`: 기존처럼 `200`과 `{ "id": 1 }`을 반환하며 이 응답을
  OpenAPI에도 선언합니다.
- `GET /api/articles`, `GET /api/articles/{id}`: `createdAt`, `updatedAt`은 UTC
  ISO 8601 문자열입니다. OpenAPI도 `string` / `date-time`으로 표현합니다.
- 기존 400, 401, 404 도메인 오류 응답은 유지합니다.
- DB 오류와 예상하지 못한 오류는 서버 로그에 기록합니다. 클라이언트의 500 응답은
  고정 메시지 `An unexpected server error occurred`를 사용하며 쿼리, DB 오류
  원인, 내부 예외 메시지를 포함하지 않습니다.

## 검증

`deno task test`는 아키텍처 검사와 단위 테스트를 실행합니다. `deno task check`는
아키텍처, 서버 타입, lint, format을 검사합니다. 아키텍처 검사는 소스 import를
검사하는 정적 규칙이며 임의의 동적 모듈 로딩까지 증명하는 도구는 아닙니다.

`deno task intTest`는 서버를 실행하고 종료까지 관리하는 Deno 스크립트를
사용합니다. 별도의 전역 npm 도구는 필요하지 않습니다. 기본 포트는 3031이고
`TEST_PORT`로 변경할 수 있습니다. API 테스트와 실제 MySQL 트랜잭션 통합 테스트를
실행합니다. 테스트는 데이터를 삭제하므로 별도 테스트 DB에 세 DB URL을 모두
지정해야 합니다.

```bash
# .env 또는 실행 환경에서 테스트 DB URL 지정
# DB_PRIMARY_URL, DB_REPLICA_URL, DB_PRIMARY_URL_LOCAL
# USE_MOCK_ADAPTER=false
deno task test
deno task check
deno task intTest
```

트랜잭션 통합 테스트는 전체 rollback, 같은 트랜잭션 참여, 요청 격리, 읽기 전용
쓰기 거부, 회원가입 후속 실패 rollback 및 DI의 공유 인스턴스를 확인합니다.
