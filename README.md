# Hono Serverless Opinionated

Spring Boot에 익숙한 개발자가 TypeScript로 백엔드 서버를 구현할 때 사용할 수
있는 Hono + Deno 기반 예시 프로젝트입니다.

Hono, Deno, Drizzle, Zod, `inversify-typesafe-spring-like`를 조합해 Controller,
Use Case, Port, Adapter로 나뉜 백엔드 구조를 구성합니다. Docker image로 패키징해
AWS Lambda 컨테이너 런타임에서 실행할 수 있고, 필요하면 ECS 같은 컨테이너 기반
실행 환경으로 옮길 수 있게 설계했습니다.

자세한 설계 배경과 기술 선택 이유는 [article.md](./article.md)를 참고하세요.

## Overview

이 저장소는 Spring Boot식 개발 경험을 TypeScript 생태계에서 가볍게 재구성하기
위한 백엔드 예시입니다. 웹 계층은 Hono가 담당하고, 비즈니스 로직은 `core/`
아래에서 Hexagonal Architecture 스타일로 구성됩니다.

기본 실행 환경은 Deno입니다. 데이터베이스 접근에는 Drizzle과 MySQL을 사용하고,
API schema와 OpenAPI 문서 생성에는 Zod와 `@hono/zod-openapi`를 사용합니다.

## Features

- Hono 기반 HTTP API server
- Deno runtime과 Deno task 기반 개발 workflow
- Zod schema 기반 request validation과 OpenAPI 문서 생성
- Inversify 계열 IoC container를 사용한 dependency injection
- Hexagonal Architecture 기반 domain/application/port/adapter 구조
- Drizzle 기반 MySQL schema, migration, query
- JWT bearer token 인증
- pactum 기반 API integration test
- Docker image 기반 AWS Lambda 실행 예시
- Terraform 기반 AWS infrastructure 예시

## Tech Stack

| Area                 | Stack                                    |
| -------------------- | ---------------------------------------- |
| Runtime              | Deno                                     |
| Web framework        | Hono                                     |
| OpenAPI / Validation | Zod, `@hono/zod-openapi`                 |
| IoC container        | `inversify-typesafe-spring-like`         |
| Database             | MySQL                                    |
| Query / Migration    | Drizzle ORM, Drizzle Kit                 |
| Auth                 | JWT bearer token                         |
| Test                 | Deno test, pactum, start-server-and-test |
| Packaging            | Docker image                             |
| Infrastructure       | AWS Lambda, Terraform                    |

## Project Structure

```text
app/
  index.ts              # Deno server entrypoint
  serverApp.ts          # Hono app, middleware, docs, controller registration
  api/                  # API controllers

core/
  {domain}/
    domain/             # Domain models and schemas
    application/        # Use Case implementations
      port/in/          # Inbound Use Case interfaces
      port/out/         # Outbound Port interfaces
    adapter/out/        # Outbound adapters
  config/               # IoC container and bean configuration
  common/               # Shared domain errors/utilities

lib/db/
  schema.ts             # Drizzle schema
  migrations/           # Drizzle migrations
  drizzle.ts            # DB client selection

test/
  api/                  # Integration tests
  core/                 # Unit tests

infra/
  terraform/            # AWS infrastructure
  lambda-entrypoint.sh  # Lambda container runtime entrypoint
```

## Prerequisites

- [Deno](https://deno.com/)
- Docker / Docker Compose
- `start-server-and-test` for integration tests

```bash
npm i -g start-server-and-test
```

## Environment Variables

Create `.env` from `.env.sample`.

```bash
cp .env.sample .env
```

| Variable               | Description                                                    |
| ---------------------- | -------------------------------------------------------------- |
| `PROFILE`              | Runtime profile. One of `local`, `staging`, `prod`.            |
| `DB_PRIMARY_URL`       | Primary database connection URL.                               |
| `DB_REPLICA_URL`       | Replica database connection URL.                               |
| `DB_PRIMARY_URL_LOCAL` | Local database URL used by local scripts.                      |
| `AUTH_SECRET`          | Secret key for JWT signing and verification.                   |
| `USE_MOCK_ADAPTER`     | Use mock adapters instead of persistence adapters when `true`. |

## Getting Started

```bash
git clone https://github.com/myeongjae-kim/hono-serverless-opinionated.git
cd hono-serverless-opinionated

cp .env.sample .env

deno install
deno task setup

docker-compose up -d
deno task db:migrate:local

deno task dev
```

The API server starts on port `8080` by default.

```bash
curl http://localhost:8080/api/health
```

## Development Commands

| Command                              | Description                                |
| ------------------------------------ | ------------------------------------------ |
| `deno task setup`                    | Run project setup script.                  |
| `deno task dev`                      | Start development server with watch mode.  |
| `deno task start`                    | Start server without watch mode.           |
| `deno task test`                     | Run unit tests.                            |
| `deno task intTest`                  | Start server and run integration tests.    |
| `deno task db:generate`              | Generate Drizzle migration.                |
| `deno task db:migrate`               | Run Drizzle migration.                     |
| `deno task db:migrate:local`         | Run Drizzle migration with local config.   |
| `deno task db:studio`                | Start Drizzle Studio.                      |
| `deno task build`                    | Build Docker image.                        |
| `deno task run-image`                | Run Docker image locally.                  |
| `deno task detect-runtime-downloads` | Detect runtime downloads after Deno cache. |

## API Docs

OpenAPI documentation is enabled when `PROFILE !== "prod"`.

| Endpoint       | Description             |
| -------------- | ----------------------- |
| `/api/swagger` | OpenAPI JSON            |
| `/api/docs`    | Scalar API reference UI |

## Testing

Unit tests:

```bash
deno task test
```

Integration tests:

```bash
deno task intTest
```

`deno task intTest` uses `start-server-and-test` to start the server on port
`3031`, wait until it responds, and then run integration tests under `test/`.

API integration tests use `pactum`.

```typescript
await pactum.spec()
  .post("/api/articles")
  .withJson({ title: "Article 1", content: "Content" })
  .expectStatus(200);
```

## Docker and AWS Lambda

Build and run the Docker image locally:

```bash
deno task build
deno task run-image
```

Lambda container runtime considerations:

- Lambda container filesystems are generally read-only. Use `/tmp` for writable
  runtime files such as Deno cache.
- The Docker build prewarms dependencies with `deno cache app/index.ts` to
  reduce cold start overhead.
- At runtime, `infra/lambda-entrypoint.sh` copies the seeded Deno cache into
  `/tmp/deno_dir`.
- Some libraries may download native binaries at runtime. If a new dependency
  does this, add an explicit prewarm step to the Dockerfile.
- Use `deno task detect-runtime-downloads` to check whether runtime downloads
  still occur after `deno cache`.

AWS infrastructure examples are under `infra/terraform`.

## Related Article

- [Spring Boot가 부럽지 않은 Hono 기반 TypeScript 서버리스 백엔드와 예시 프로젝트](./article.md)
