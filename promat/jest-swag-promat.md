# jest-swag Claude Code 프롬프트

이 프로젝트는 **@foryourdev/jest-swag** 패키지를 사용하여 Jest API 테스트로부터 OpenAPI/Swagger 문서를 자동 생성합니다.

## 핵심 기능

### 1. API 테스트 DSL
```typescript
import { path, get, post, response, parameter, requestBody } from '@foryourdev/jest-swag';

path('/api/users', () => {
  get('Get all users', () => {
    response(200, 'Success', () => {
      return request(app).get('/api/users').expect(200);
    });
  });
});
```

### 2. 편의 함수 및 헬퍼
```typescript
import { commonResponses, authRequired, paginated } from '@foryourdev/jest-swag';

// 공통 응답 패턴
...commonResponses.errors;  // 400, 500 에러 응답 자동 추가
...authRequired();          // 401, 403 인증 응답 추가
...paginated();            // 페이지네이션 파라미터 추가
```

### 3. 자동 스키마 추론
- **Date/DateTime**: ISO 8601 형식 자동 감지
- **UUID**: UUID v4 형식 자동 감지
- **Email**: 이메일 형식 자동 감지
- **URL**: URL/URI 형식 자동 감지
- **IP**: IPv4/IPv6 주소 자동 감지

## CLI 명령어

### 초기 설정
```bash
npx jest-swag init          # 프로젝트 초기화
npx jest-swag init --example # 예제 테스트 파일 포함
```

### 문서 생성
```bash
npm run test:docs           # 테스트 실행 + 문서 생성
npx jest-swag generate      # 문서만 생성
npx jest-swag generate -e production  # 프로덕션 환경 설정
```

### 실시간 모드
```bash
npx jest-swag watch         # 파일 변경 감지 + 자동 재생성
npx jest-swag serve         # Swagger UI 서버 시작
```

## 설정 파일 (jest-swag.config.json)

```json
{
  "title": "My API",
  "version": "1.0.0",
  "outputPath": "./docs/openapi.json",
  "environments": {
    "development": {
      "servers": [{ "url": "http://localhost:3000" }]
    },
    "production": {
      "servers": [{ "url": "https://api.example.com" }]
    }
  },
  "plugins": ["postman", "version", "security"]
}
```

## 플러그인 시스템

### 내장 플러그인
1. **Postman Plugin**: Postman 컬렉션 내보내기
2. **Version Plugin**: API 버전 관리 및 diff 생성
3. **Security Plugin**: 보안 검증 및 헤더 추가

### 커스텀 플러그인
```typescript
import { Plugin } from '@foryourdev/jest-swag';

export class CustomPlugin implements Plugin {
  name = 'custom';
  
  async afterGenerate(document) {
    // 문서 생성 후 처리
    return document;
  }
}
```

## TypeScript 지원

### 타입 안전 응답
```typescript
interface User {
  id: string;
  name: string;
  email: string;
}

response<User>(200, 'Get user', () => {
  // 타입이 자동 추론됨
  return request(app).get('/users/1').expect(200);
});
```

### 스키마 빌더
```typescript
import { SchemaBuilder, ParameterBuilder } from '@foryourdev/jest-swag';

const schema = SchemaBuilder.from(exampleData).build();
const params = new ParameterBuilder()
  .query('page', 'integer', { default: 1 })
  .query('limit', 'integer', { default: 20 })
  .build();
```

## 작업 지침

### 새 API 엔드포인트 추가 시
1. `*.test.ts` 또는 `*.spec.ts` 파일에 테스트 작성
2. jest-swag DSL을 사용하여 API 명세 정의
3. 응답 예제는 실제 테스트에서 자동 캡처됨
4. `npm run test:docs`로 문서 업데이트

### 기존 테스트 마이그레이션
1. 기존 Jest/Supertest 테스트에 jest-swag DSL 추가
2. `path()`, `get()`, `post()` 등으로 구조화
3. `response()` 콜백 안에 기존 테스트 로직 배치

### 문서 커스터마이징
1. `tags()`: API 그룹화
2. `description()`: 상세 설명 추가
3. `parameter()`: 쿼리/경로/헤더 파라미터 정의
4. `requestBody()`: 요청 본문 스키마 정의

## 주의사항

1. **테스트 파일 위치**: 테스트 파일은 `*.test.ts`, `*.spec.ts` 패턴을 따라야 함
2. **응답 캡처**: `response()` 콜백에서 반환된 값이 자동으로 스키마로 변환됨
3. **중복 제거**: 같은 경로/메서드는 자동으로 병합됨
4. **환경 변수**: `NODE_ENV`로 환경별 설정 자동 적용

## VS Code 통합

VS Code 확장이 설치된 경우:
- `Ctrl+Shift+D`: 현재 테스트 파일에서 문서 생성
- 우클릭 메뉴: "Generate API Documentation"
- 상태 바: "📚 Jest Swag" 클릭으로 빠른 생성

## CI/CD 통합

### GitHub Actions
```yaml
- name: Generate API Docs
  run: |
    npm ci
    npm test
    npx jest-swag generate
    
- name: Upload Docs
  uses: actions/upload-artifact@v3
  with:
    name: api-docs
    path: docs/
```

### Docker
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY . .
RUN npm ci && npm run build
CMD ["npx", "jest-swag", "serve"]
```

## 문제 해결

### 문서가 생성되지 않을 때
1. Jest 설정에 reporter가 추가되었는지 확인
2. 테스트가 성공적으로 실행되는지 확인
3. `apiSpecs`가 수집되고 있는지 로그 확인

### 스키마가 잘못 생성될 때
1. 응답 객체가 순환 참조를 포함하는지 확인
2. 날짜/시간 필드가 올바른 형식인지 확인
3. `captureResponse` 옵션 활성화 확인

### Watch 모드가 작동하지 않을 때
1. `chokidar` 패키지 설치 확인
2. 파일 시스템 권한 확인
3. 테스트 파일 패턴이 올바른지 확인

## 유용한 팁

1. **자동 완성**: TypeScript 프로젝트에서 자동 완성 지원
2. **실시간 미리보기**: Watch 모드에서 브라우저 자동 새로고침
3. **플러그인 체인**: 여러 플러그인을 순서대로 실행 가능
4. **환경별 문서**: 개발/스테이징/프로덕션 문서 분리 관리
5. **버전 관리**: API 버전별 문서 생성 및 diff 확인

---

**패키지 버전**: @foryourdev/jest-swag@2.0.0
**문서 생성일**: 2025-08-24