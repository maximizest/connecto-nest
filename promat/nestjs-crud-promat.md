# NestJS CRUD 프로젝트 프롬프팅 가이드

## 프로젝트 개요

당신은 `@foryourdev/nestjs-crud` 패키지를 다루고 있습니다. 이는 NestJS와 TypeORM 기반으로 RESTful CRUD API를 자동 생성하는 강력한 라이브러리입니다.

### 핵심 정보
- **패키지명**: @foryourdev/nestjs-crud
- **버전**: 0.2.1
- **라이선스**: MIT
- **GitHub**: https://github.com/dev-jwshin/nestjs-crud
- **NPM**: https://www.npmjs.com/package/@foryourdev/nestjs-crud

## 주요 기능

### 1. 자동 CRUD 생성
```typescript
@Crud({
    entity: User,
    logging: false,
    allowedParams: ['name', 'email'],
    exclude: ['password']
})
```
이 데코레이터 하나로 11개의 REST 엔드포인트가 자동 생성됩니다.

### 2. 고급 쿼리 기능
- **필터링**: 30개 이상의 연산자 (`$eq`, `$ne`, `$gt`, `$lt`, `$like`, `$in` 등)
- **페이지네이션**: Offset, Cursor, Page 기반
- **정렬**: 다중 필드 정렬 지원
- **관계 로딩**: 중첩된 관계 포함 지원

### 3. 생명주기 훅

#### 데코레이터 방식 (권장)
```typescript
@BeforeCreate()
async hashPassword(entity: User) {
    entity.password = await bcrypt.hash(entity.password, 10);
}

@AfterUpdate()
async logUpdate(entity: User) {
    await this.auditService.log('UPDATE', entity);
}
```

#### 설정 방식 (레거시)
```typescript
routes: {
    create: {
        hooks: {
            saveBefore: async (entity) => { ... }
        }
    }
}
```

### 4. 소프트 삭제 & 복구
```typescript
routes: {
    delete: { softDelete: true },
    recover: { enabled: true }
}
```

### 5. 헬퍼 클래스

#### CrudQueryHelper
라우트를 오버라이드해도 CRUD의 쿼리 기능 사용 가능:
```typescript
const result = await CrudQueryHelper.applyAllToQueryBuilder(qb, req);
```

#### CrudOperationHelper
라우트를 오버라이드해도 CRUD의 validation과 hooks 사용 가능:
```typescript
const entity = await this.crudHelper.create(data, {
    validate: true,
    allowedParams: ['name', 'email'],
    hooks: { ... }
});
```

## 프로젝트 구조

```
src/lib/
├── crud.decorator.ts       # @Crud 데코레이터
├── crud.service.ts        # 핵심 CRUD 서비스
├── crud.route.factory.ts  # 라우트 생성 팩토리
├── dto/                   # 생명주기 훅 데코레이터
├── interceptor/           # 요청 인터셉터
├── provider/              # 쿼리 파서, 컨버터
└── utils/                 # 헬퍼 클래스
    ├── crud-query-helper.ts
    ├── crud-operation-helper.ts
    ├── response-factory.ts
    └── batch-processor.ts
```

## 최근 개선사항

### 성능 최적화
- **N+1 쿼리 문제 해결**: `In` 연산자를 사용한 배치 쿼리
- **응답 캐싱**: WeakMap 기반 변환 캐싱
- **배치 처리**: 대량 데이터 최적 배치 크기 계산

### 성능 지표
- 벌크 업데이트 (100개): ~500ms → ~50ms (90% 개선)
- 벌크 삭제 (100개): ~450ms → ~40ms (91% 개선)
- 쿼리 감소: 100개 → 1개 (99% 감소)

## 코드 작성 시 주의사항

### 1. TypeORM 관계 설정
```typescript
@Entity()
class User {
    @OneToMany(() => Post, post => post.user)
    posts: Post[];
}
```

### 2. Validation 데코레이터
```typescript
@IsString()
@MinLength(2)
@MaxLength(100)
name: string;
```

### 3. 보안 설정
```typescript
@Crud({
    allowedParams: ['name', 'email'],  // CREATE/UPDATE 허용 필드
    exclude: ['password'],              // 응답에서 제외
    allowedFilters: ['status', 'age'], // 필터링 허용 필드
    allowedIncludes: ['posts']         // 포함 가능한 관계
})
```

### 4. 벌크 연산 처리
```typescript
// 효율적인 벌크 처리
const entities = await this.repository.find({
    where: { id: In(ids) }
});
const entityMap = new Map(entities.map(e => [e.id, e]));
```

## 일반적인 사용 패턴

### 1. 기본 CRUD 컨트롤러
```typescript
@Controller('users')
@Crud({ entity: User })
export class UserController {
    constructor(public readonly crudService: UserService) {}
}
```

### 2. 라우트 오버라이드
```typescript
@Get()
async index(@Req() req: Request) {
    // CrudQueryHelper 사용
    const qb = this.repository.createQueryBuilder('user');
    return CrudQueryHelper.applyAllToQueryBuilder(qb, req);
}
```

### 3. 커스텀 비즈니스 로직
```typescript
@BeforeCreate()
async beforeCreate(entity: User) {
    entity.createdAt = new Date();
    entity.status = 'pending';
}
```

## 디버깅 팁

### 1. 쿼리 로깅
```typescript
@Crud({ logging: true })
```

### 2. 에러 처리
```typescript
try {
    await this.crudService.create(data);
} catch (error) {
    if (error instanceof ValidationException) {
        // validation 에러 처리
    }
}
```

### 3. 테스트 작성
```typescript
it('should create user', async () => {
    const response = await request(app.getHttpServer())
        .post('/users')
        .send({ name: 'Test', email: 'test@example.com' })
        .expect(201);
});
```

## 프롬프트 예시

### 좋은 프롬프트
✅ "User 엔티티에 @BeforeCreate 훅을 추가해서 생성 시간을 자동으로 설정하도록 구현해줘"
✅ "CrudQueryHelper를 사용해서 커스텀 index 메서드에서 페이지네이션과 필터링을 구현해줘"
✅ "벌크 업데이트 연산에서 N+1 쿼리 문제를 해결하는 방법을 보여줘"

### 피해야 할 프롬프트
❌ "CRUD 만들어줘" (너무 모호함)
❌ "모든 기능 추가해줘" (범위가 너무 넓음)
❌ "최적화해줘" (구체적인 대상이 없음)

## 프로젝트 컨텍스트

이 프로젝트는:
- **목적**: 반복적인 CRUD 코드 작성을 자동화
- **대상**: NestJS 개발자
- **특징**: TypeORM 엔티티 기반 자동 API 생성
- **장점**: 개발 속도 향상, 일관된 API 구조, 강력한 쿼리 기능

## 기술 스택

- **Framework**: NestJS 11.x
- **ORM**: TypeORM 0.3.x
- **Validation**: class-validator
- **Documentation**: Swagger/OpenAPI
- **Testing**: Jest + Supertest
- **Build**: TypeScript (CommonJS + ES Modules)

## 추가 리소스

- `README.md`: 사용자 문서
- `CRUD_QUERY_HELPER.md`: 쿼리 헬퍼 가이드
- `CRUD_OPERATION_HELPER.md`: 오퍼레이션 헬퍼 가이드
- `PROJECT_CONTEXT.md`: 프로젝트 전체 컨텍스트

## 클로드에게 요청할 때

1. **구체적으로 요청하세요**: 어떤 엔티티, 어떤 기능, 어떤 문제인지 명확히
2. **컨텍스트를 제공하세요**: 현재 코드, 에러 메시지, 원하는 결과
3. **우선순위를 명시하세요**: 성능, 보안, 유지보수성 중 무엇이 중요한지

이 프로젝트는 계속 발전하고 있으며, 커뮤니티 기여를 환영합니다.