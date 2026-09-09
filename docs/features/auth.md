# 인증과 토큰 검증

## API 사용법

| API                       | 입력                                   | 성공 응답                       |
| ------------------------- | -------------------------------------- | ------------------------------- |
| `POST /api/users/signup`  | `loginId`, `password`, 선택적 `name`   | `access_token`, `refresh_token` |
| `POST /api/users/login`   | `loginId`, `password`                  | `access_token`, `refresh_token` |
| `POST /api/users/refresh` | `refresh_token`                        | `access_token`, `refresh_token` |
| `GET /api/users/me`       | `Authorization: Bearer <access_token>` | `ulid`, `role`                  |

성공 상태 코드는 기존과 동일하게 200입니다. access token은 15분, refresh token은
180일 유효합니다. Bearer 인증 방식을 유지하며 쿠키 인증으로 변경하지 않습니다.

## 주요 동작과 보안

토큰 발급과 검증은 `TokenCodecPort`를 통해 처리하고 JWT 구현은 Adapter에
격리합니다. 비밀번호 해싱과 검증도 `PasswordHasherPort`로 분리하되 기존 bcrypt
형식을 유지합니다.

JWT는 HS256 서명과 만료 여부뿐 아니라 payload 구조도 검증합니다. access token과
refresh token에는 각각 `type: "access"`, `type: "refresh"`가 들어가며 서로
대체해 사용할 수 없습니다. 식별자, 발급 시각, 만료 시각, access token의 역할을
검사합니다. 인증 미들웨어는 검증 UseCase를 주입받습니다.

잘못된 인증 헤더, 변조·만료된 토큰, 용도가 다른 토큰은 401로 처리합니다. 공개
API라도 잘못된 Authorization 헤더가 있으면 401을 반환합니다. 필수 입력이 없는
요청은 400이며, 예상하지 못한 내부 오류는 상세 원인을 숨긴 500 응답입니다.

## 배포 시 기존 토큰

이 변경 이전에 발급된 JWT에는 `type`이 없어 새 검증을 통과하지 않습니다. **배포
후 기존 사용자는 다시 로그인해야 합니다.** 토큰을 발급하는 서버와 검증하는
서버의 버전이 섞이지 않도록 함께 전환해야 합니다. DB schema 변경은 없습니다.

`USE_MOCK_ADAPTER=true`인 개발용 인증에서는 기존 문서용 토큰
`default-token-value-for-docs`를 유지합니다. 운영 인증은 실제 JWT 검증을
사용하도록 `USE_MOCK_ADAPTER=false`로 설정합니다.
