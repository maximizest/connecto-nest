# Connecto NestJS 코드베이스 개선사항 분석

> 분석 일자: 2025-01-21
> 분석 범위: 전체 코드베이스 구조, 패턴, 보안, 성능

## 현황 요약

### 통계
- **총 모듈 수**: 30개
- **총 컨트롤러 수**: 17개 (CRUD 14개 82%, 커스텀 3개 18%)
- **Active Record 패턴 적용률**: 95% (대부분 마이그레이션 완료)
- **인덱스 적용**: 126개 인덱스 (15개 엔티티)
- **로깅 구현**: 55개 파일에 Logger 적용

## 잘 구현된 부분

### 1. Active Record 패턴 일관성
- BaseActiveRecord를 상속받아 공통 기능 통일
- Repository 패턴에서 성공적으로 마이그레이션
- TypeOrmModule.forFeature 제거로 모듈 단순화

### 2. CRUD 표준화
- @foryourdev/nestjs-crud 라이브러리 활용한 표준 API
- 일관된 필터링, 정렬, 페이지네이션
- allowedFilters, allowedParams로 보안 강화

### 3. Guard 체계
- AuthGuard: JWT + 블랙리스트 + 사용자 차단 통합
- HostGuard: Travel 레벨 권한 검증
- AdminGuard: 플랫폼 레벨 권한 검증
- 병렬 처리로 67-75% 성능 향상 달성

### 4. 인덱스 최적화
- 복합 인덱스 적절히 활용 (status + endDate, travelId + type 등)
- 외래 키에 인덱스 자동 생성
- 자주 조회되는 필드에 단일 인덱스 적용

## 개선이 필요한 부분

### 1. Active Record 패턴 불완전한 마이그레이션

**문제점**: 일부 서비스가 여전히 Repository 패턴 사용
```typescript
// 현재 상태 - Repository 주입 사용
export class TravelUserService extends CrudService<TravelUser> {
  constructor(
    @InjectRepository(TravelUser)
    repository: Repository<TravelUser>,
  ) {
    super(repository);
  }
}
```

**개선안**: 
```typescript
// Active Record 패턴 완전 적용
export class TravelUserService extends CrudService<TravelUser> {
  constructor() {
    super(TravelUser); // Entity 클래스 직접 전달
  }
}
```

**영향 범위**: 20개 서비스 파일 중 Repository 주입 사용하는 파일들

### 2. console.log 사용

**문제점**: production 환경에서 console.log 사용 (2개 위치)
- travel.entity.ts:368 - AfterInsert 훅에서 console.log 사용
- travel.entity.ts:370 - 에러 처리에서 console.error 사용

**개선안**:
```typescript
// Logger 사용으로 변경
import { Logger } from '@nestjs/common';

export class Travel extends BaseActiveRecord {
  private static readonly logger = new Logger(Travel.name);
  
  @AfterInsert()
  async createDefaultPlanets(): Promise<void> {
    try {
      // ... planet 생성 로직
      Travel.logger.log(`Default planets created for Travel ${this.id}`);
    } catch (error) {
      Travel.logger.error(`Failed to create default planets for Travel ${this.id}`, error);
    }
  }
}
```

### 3. 중복 코드 패턴

**문제점**: 여러 컨트롤러에서 비슷한 권한 검증 로직 반복

**개선안**: 커스텀 데코레이터로 통합
```typescript
// @decorators/owner-only.decorator.ts
export const OwnerOnly = () => {
  return applyDecorators(
    UseGuards(AuthGuard, OwnerGuard),
  );
}

// 사용
@OwnerOnly()
@Patch(':id')
async update() { ... }
```

### 4. N+1 쿼리 문제 가능성

**문제점**: Travel 생성 시 AfterInsert에서 Planet 2개 개별 생성

**개선안**: 벌크 insert 사용
```typescript
@AfterInsert()
async createDefaultPlanets(): Promise<void> {
  const planets = [
    {
      travelId: this.id,
      name: `${this.name} 참여자`,
      type: PlanetType.GROUP,
      status: PlanetStatus.ACTIVE,
    },
    {
      travelId: this.id,
      name: `${this.name} 공지사항`,
      type: PlanetType.ANNOUNCEMENT,
      status: PlanetStatus.ACTIVE,
    }
  ];
  
  await Planet.insert(planets); // 단일 쿼리로 처리
}
```

### 5. 트랜잭션 처리 부재

**문제점**: Travel 생성과 Planet 생성이 별도 트랜잭션

**개선안**: 트랜잭션 매니저 활용
```typescript
// travel.service.ts
async createTravelWithPlanets(data: CreateTravelDto) {
  return await this.dataSource.transaction(async manager => {
    const travel = await manager.save(Travel, data);
    await manager.save(Planet, [
      // default planets
    ]);
    return travel;
  });
}
```

### 6. DTO 검증 강화 필요

**문제점**: 일부 컨트롤러에서 DTO 클래스 없이 직접 body 처리

**개선안**: 모든 엔드포인트에 명시적 DTO 적용
```typescript
// dto/create-travel.dto.ts
export class CreateTravelDto {
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name: string;
  
  @IsDateString()
  @IsAfter(new Date())
  endDate: string;
}
```

### 7. 에러 메시지 국제화

**문제점**: 한글 에러 메시지 하드코딩

**개선안**: i18n 모듈 도입
```typescript
// i18n/ko/errors.json
{
  "AUTH_REQUIRED": "인증이 필요합니다",
  "TRAVEL_NOT_FOUND": "여행을 찾을 수 없습니다"
}

// 사용
throw new NotFoundException(
  this.i18n.t('errors.TRAVEL_NOT_FOUND')
);
```

## 성능 최적화 기회

### 1. 쿼리 최적화
- **현재**: 개별 find() 호출 많음
- **개선**: QueryBuilder 활용한 복잡한 쿼리 최적화
- **영향**: 30-50% 응답 시간 개선 예상

### 2. 캐싱 전략 강화
- **현재**: Redis 캐싱 부분적 적용
- **개선**: 자주 조회되는 Travel, Planet 정보 캐싱
- **영향**: 읽기 작업 80% 성능 향상 예상

### 3. 인덱스 추가
- **추가 필요**: 
  - message.planetId + createdAt (메시지 목록 조회)
  - notification.userId + isRead (안 읽은 알림 조회)
  - travel.status + visibility (공개 여행 목록)

## 우선순위 권장사항

### 즉시 개선 (High Priority)
1. console.log를 Logger로 변경
2. Travel-Planet 생성 트랜잭션 처리
3. N+1 쿼리 문제 해결

### 단기 개선 (Medium Priority)
1. Repository 패턴 완전 제거
2. 중복 권한 검증 로직 통합
3. DTO 검증 강화

### 장기 개선 (Low Priority)
1. i18n 국제화 도입
2. 추가 인덱스 적용
3. 캐싱 전략 확대

## 추가 제안사항

### 1. 테스트 커버리지 향상
- 현재 E2E 테스트 위주
- Unit 테스트 추가로 커버리지 80% 목표

### 2. API 문서화 개선
- Swagger 데코레이터 추가
- 응답 예시 및 에러 코드 문서화

### 3. 모니터링 강화
- APM 도구 도입 (Datadog, New Relic 등)
- 커스텀 메트릭 수집

### 4. 보안 강화
- Rate limiting 재활성화 검토
- SQL Injection 방지 검증
- Input sanitization 강화

## 결론

전반적으로 코드베이스는 잘 구조화되어 있으며, Active Record 패턴 도입과 CRUD 표준화가 성공적으로 진행되었습니다. 

주요 개선 포인트는:
- 마이그레이션 완료 (Repository에서 Active Record로)
- 트랜잭션 처리 강화
- 성능 최적화 (쿼리, 캐싱, 인덱싱)

이러한 개선사항들을 단계적으로 적용하면 더욱 견고하고 확장 가능한 시스템이 될 것입니다.