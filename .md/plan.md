# 성능 최적화 구현 계획

> 작성일: 2025-08-21  
> 프로젝트: Connecto NestJS Backend  
> 목적: 부분 구현 및 미구현 성능 최적화 기능 완성

## 📋 아키텍처 패턴

**Active Record 패턴 사용**
- 모든 엔티티는 `BaseActiveRecord`를 상속
- 비즈니스 로직은 Entity의 static 메서드로 구현
- Service는 Entity 메서드를 호출하는 얇은 레이어
- Repository 패턴 사용 안함

## 📊 현황 요약

### ✅ 구현 완료
- Lazy Loading 전략 (모든 관계가 eager: false)
- Redis 캐싱 시스템 (RedisModule, DistributedCacheService)
- WebSocket 실시간 통신 (Socket.io + Redis Adapter)
- 읽음 확인 일괄 처리
- 파일 직접 업로드 (Presigned URL)
- Connection Pool 최적화 (max: 20, min: 5)

### ⏳ 부분 구현
- 검색 기능 (searchableText 필드만 존재)

### ❌ 미구현
- Eager Loading 최적화
- Count 필드 최적화
- Cloudflare Media 고급 기능
- 고급 캐싱 전략
- 데이터베이스 최적화

## 🎯 구현 우선순위

### Phase 1: 즉시 효과가 큰 기능 (1-2주)

#### 1.1 검색 기능 완성 ⏳

**현재 상태:**
- ✅ Message 엔티티에 `searchableText` 필드 존재
- ✅ `generateSearchableText()` 메서드 구현
- ⚠️ 전문 검색 쿼리는 있지만 ILIKE 사용 (느림)
- ❌ GIN 인덱스 미생성
- ❌ 검색 API 엔드포인트 없음
- ❌ 검색 DTO 없음

**필요한 구현 작업:**

1. **GIN 인덱스 마이그레이션 생성**
```bash
# 마이그레이션 파일 생성
yarn typeorm migration:create -n AddMessageSearchableTextGinIndex
```

```sql
-- 업 마이그레이션
CREATE INDEX idx_messages_searchable_text_gin 
ON messages USING gin(to_tsvector('korean', searchable_text));

-- 다운 마이그레이션  
DROP INDEX IF EXISTS idx_messages_searchable_text_gin;
```

2. **검색 DTO 생성**
```typescript
// src/modules/message/dto/search.dto.ts
export class SearchDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  query: string;

  @IsOptional()
  @IsNumber()
  planetId?: number;

  @IsOptional()
  @IsNumber()
  travelId?: number;
  
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  limit?: number = 20;
  
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  offset?: number = 0;
}
```

3. **검색 API 엔드포인트 추가**
```typescript
// src/modules/message/api/v1/message.controller.ts
import { AuthGuard } from '../../../../guards/auth.guard';
import { CurrentUser, CurrentUserData } from '../../../../common/decorators/current-user.decorator';

@Get('search')
@UseGuards(AuthGuard)
async search(
  @Query() searchDto: SearchDto,
  @CurrentUser() user: CurrentUserData,
) {
  return this.messageService.search(searchDto, user.id);
}
```

4. **검색 메서드 구현 (Active Record 패턴)**
```typescript
// src/modules/message/message.entity.ts에 추가
static async search(searchDto: SearchDto, userId: number) {
  const query = this.createQueryBuilder('message')
    .leftJoinAndSelect('message.sender', 'sender')
    .leftJoinAndSelect('message.planet', 'planet')
    .leftJoinAndSelect('planet.planetUsers', 'planetUser')
    .where('planetUser.userId = :userId', { userId })
    .andWhere('planetUser.status = :status', { status: 'ACTIVE' })
    .andWhere('message.deletedAt IS NULL');

  // GIN 인덱스 활용한 전문 검색
  query.andWhere(
    "to_tsvector('korean', message.searchableText) @@ plainto_tsquery('korean', :query)",
    { query: searchDto.query }
  );

  if (searchDto.planetId) {
    query.andWhere('message.planetId = :planetId', { 
      planetId: searchDto.planetId 
    });
  }

  if (searchDto.travelId) {
    query.andWhere('planet.travelId = :travelId', { 
      travelId: searchDto.travelId 
    });
  }

  // 관련성 순 정렬
  query.orderBy(
    "ts_rank(to_tsvector('korean', message.searchableText), plainto_tsquery('korean', :query))",
    'DESC'
  );

  query.addOrderBy('message.createdAt', 'DESC');
  
  const [messages, total] = await query
    .take(searchDto.limit)
    .skip(searchDto.offset)
    .getManyAndCount();

  return {
    data: messages,
    total,
    hasMore: total > searchDto.offset + searchDto.limit
  };
}

// src/modules/message/message.service.ts
async search(searchDto: SearchDto, userId: number) {
  // Active Record 패턴 - Entity의 static 메서드 호출
  return Message.search(searchDto, userId);
}
```

5. **마이그레이션 실행**
```bash
yarn typeorm migration:run
```

**구현 파일:**
- `migration/[timestamp]-AddMessageSearchableTextGinIndex.ts`: 새 마이그레이션 생성
- `src/modules/message/dto/search.dto.ts`: 검색 DTO 생성
- `src/modules/message/api/v1/message.controller.ts`: 검색 엔드포인트 추가
- `src/modules/message/message.entity.ts`: Active Record 검색 메서드 추가
- `src/modules/message/message.service.ts`: Entity 메서드 호출

**예상 효과:**
- ✨ 메시지 검색 속도 100배 향상 (현재 ILIKE 대비)
- 📈 사용자 경험 대폭 개선
- 💬 채팅 내역 빠른 탐색 가능
- 🎯 관련성 기반 순위 정렬

#### 1.2 데이터베이스 Connection Pooling 최적화 ✅

**현재 상태:**
- ✅ 이미 `database.config.ts`에서 Connection Pool 설정 구현됨
- ✅ 기본값: max: 20, min: 5, connectionTimeoutMillis: 30000
- ✅ 환경변수로 설정 가능: `DATABASE_MAX_CONNECTIONS`, `DATABASE_MIN_CONNECTIONS`, `DATABASE_CONNECTION_TIMEOUT`

**현재 설정 (database.config.ts):**
```typescript
extra: {
  max: parseInt(
    process.env.DATABASE_MAX_CONNECTIONS || '20'  // 이미 20으로 설정
  ),
  min: parseInt(
    process.env.DATABASE_MIN_CONNECTIONS || '5'   // 이미 5로 설정
  ),
  connectionTimeoutMillis: parseInt(
    process.env.DATABASE_CONNECTION_TIMEOUT || '30000'  // 이미 30초로 설정
  ),
  idleTimeoutMillis: 30000,
  application_name: 'nestjs-app',
}
```

**추가 최적화 필요 사항:**
- 현재 설정은 이미 최적화되어 있음
- 필요시 환경변수로 조정 가능
- 모니터링 후 트래픽에 따라 max 값 조정 권장

### Phase 2: 사용자 체감 성능 개선 (2-3주)

#### 2.1 Count 필드 최적화 ❌

**작업 내용:**
```typescript
// message.entity.ts (Active Record 패턴)
@Entity()
export class Message extends BaseActiveRecord {
  // TypeORM은 VirtualColumn을 지원하지 않음
  // 대신 Active Record 메서드로 구현
  
  // Active Record 메서드 - 읽음 수 조회
  static async getReadCount(messageId: number): Promise<number> {
    const result = await MessageReadReceipt.count({
      where: { 
        messageId: messageId,
        isRead: true 
      }
    });
    return result;
  }
  
  // Active Record 메서드 - 답장 수 조회
  static async getReplyCount(messageId: number): Promise<number> {
    return this.count({
      where: { replyToMessageId: messageId }
    });
  }
  
  // 메시지 목록 조회시 Count 포함
  static async findWithCounts(planetId: number, options?: any) {
    const messages = await this.find({
      where: { planetId },
      ...options
    });
    
    // Count 정보를 한번에 조회 (N+1 문제 해결)
    const messageIds = messages.map(m => m.id);
    
    const readCounts = await MessageReadReceipt
      .createQueryBuilder('receipt')
      .select('receipt.messageId', 'messageId')
      .addSelect('COUNT(*)', 'count')
      .where('receipt.messageId IN (:...ids)', { ids: messageIds })
      .andWhere('receipt.isRead = true')
      .groupBy('receipt.messageId')
      .getRawMany();
      
    const replyCounts = await this
      .createQueryBuilder('message')
      .select('message.replyToMessageId', 'messageId')
      .addSelect('COUNT(*)', 'count')
      .where('message.replyToMessageId IN (:...ids)', { ids: messageIds })
      .groupBy('message.replyToMessageId')
      .getRawMany();
    
    // Count 정보 매핑
    const readCountMap = new Map(readCounts.map(r => [r.messageId, r.count]));
    const replyCountMap = new Map(replyCounts.map(r => [r.messageId, r.count]));
    
    return messages.map(message => ({
      ...message,
      readCount: readCountMap.get(message.id) || 0,
      replyCount: replyCountMap.get(message.id) || 0
    }));
  }
}
```

**예상 효과:**
- 📊 실시간 통계 제공
- 🔄 N+1 쿼리 문제 해결
- 💾 추가 저장 공간 불필요

#### 2.2 고급 캐싱 전략 구현 ❌

**작업 내용:**
```typescript
// cache.decorator.ts
export function CacheResult(ttl: number = 3600) {
  return function(target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    descriptor.value = async function(...args: any[]) {
      const cacheKey = `${target.constructor.name}:${propertyName}:${JSON.stringify(args)}`;
      
      // Redis에서 캐시 확인
      const cached = await redis.get(cacheKey);
      if (cached) return JSON.parse(cached);
      
      // 실행 및 캐싱
      const result = await originalMethod.apply(this, args);
      await redis.setex(cacheKey, ttl, JSON.stringify(result));
      return result;
    };
  };
}

// travel.entity.ts (Active Record 패턴)
@CacheResult(7200) // 2시간 캐싱
static async findPopularTravels() {
  return this.find({
    where: { visibility: 'PUBLIC' },
    order: { participantCount: 'DESC' },
    take: 10
  });
}

// travel.service.ts
async findPopularTravels() {
  // Active Record 패턴 - Entity의 static 메서드 호출
  return Travel.findPopularTravels();
}
```

**예상 효과:**
- 🚀 반복 조회 90% 속도 향상
- 💰 DB 부하 70% 감소
- ⏱️ 평균 응답시간 200ms → 20ms

### Phase 3: 미디어 최적화 (3-4주)

#### 3.1 Cloudflare Stream 통합 ❌

**작업 내용:**
```typescript
// video-upload.service.ts
class VideoUploadService {
  async uploadToStream(videoPath: string) {
    // Stream API로 비디오 업로드
    const response = await fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}/stream`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${streamToken}`,
        'Tus-Resumable': '1.0.0',
      },
      body: videoStream
    });
    
    return {
      streamId: response.id,
      playbackUrl: response.playback.hls,  // HLS 스트리밍 URL
      thumbnailUrl: response.thumbnail,     // 자동 생성된 썸네일
    };
  }
}
```

**예상 효과:**
- 📹 자동 비디오 인코딩 (모든 디바이스 호환)
- 🎬 적응형 비트레이트 스트리밍
- 🖼️ 자동 썸네일 생성
- 💾 스토리지 50% 절감

#### 3.2 Cloudflare Images 통합 ❌

**작업 내용:**
```typescript
// image-upload.service.ts
class ImageUploadService {
  async uploadToImages(imagePath: string) {
    const formData = new FormData();
    formData.append('file', imageStream);
    formData.append('requireSignedURLs', 'false');
    
    const response = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${accountId}/images/v1`,
      {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${imagesToken}` },
        body: formData
      }
    );
    
    return {
      imageId: response.id,
      variants: {
        thumbnail: `${baseUrl}/thumbnail`,  // 150x150
        preview: `${baseUrl}/preview`,      // 800x800
        full: `${baseUrl}/full`            // 원본
      }
    };
  }
}
```

**예상 효과:**
- 🖼️ 자동 이미지 리사이징
- 📱 디바이스별 최적화된 이미지 제공
- 🚀 이미지 로딩 3배 빠름
- 💾 대역폭 60% 절감

### Phase 4: 지능형 최적화 (4-5주)

#### 4.1 Eager Loading 선택적 적용 ⏳

**현재 상태:**
- User-Profile 관계는 현재 `eager: false`로 설정되어 있음
- 대부분의 관계가 이미 Lazy Loading으로 최적화됨

**작업 내용:**
```typescript
// user.entity.ts (Active Record 패턴) 
// 현재 상태 - 모두 Lazy Loading
@Entity()
export class User extends BaseActiveRecord {
  @OneToOne('Profile', 'user', {
    eager: false,  // 현재 Lazy Loading
    cascade: true
  })
  profile: Profile;
  
  @OneToMany(() => TravelUser, {
    eager: false  // 이미 Lazy Loading
  })
  travelUsers: TravelUser[];
  
  // Active Record 메서드 - Profile과 함께 조회
  static async findWithProfile(userId: number): Promise<User | null> {
    return this.findOne({
      where: { id: userId },
      relations: ['profile']
    });
  }
  
  // Active Record 메서드 - 필요시에만 TravelUser 로드
  static async findWithTravels(userId: number): Promise<User | null> {
    return this.findOne({
      where: { id: userId },
      relations: ['travelUsers', 'travelUsers.travel']
    });
  }
}
```

**분석 필요 데이터:**
- User-Profile: 95% 함께 조회 → Eager 추천
- Travel-Planet: 30% 함께 조회 → Lazy 유지
- Message-ReadReceipt: 10% 함께 조회 → Lazy 유지

**예상 효과:**
- 🎯 필수 관계 조회 50% 빠름
- 📉 불필요한 조인 제거
- ⚖️ 메모리 사용량 최적화

## 📈 예상 성과

### 즉시 효과 (Phase 1 완료 시)
- **응답 시간**: 평균 300ms → 150ms (50% 개선)
- **동시 접속**: 1,000명 → 2,000명 (100% 증가)
- **DB 부하**: 30% 감소

### 중기 효과 (Phase 2-3 완료 시)
- **응답 시간**: 평균 150ms → 80ms (추가 47% 개선)
- **캐시 적중률**: 0% → 70%
- **미디어 로딩**: 3초 → 1초 (67% 개선)
- **스토리지 비용**: 40% 절감

### 장기 효과 (Phase 4 완료 시)
- **전체 성능**: 종합 300% 개선
- **사용자 만족도**: 대폭 상승
- **인프라 비용**: 30% 절감
- **확장성**: 10,000명 동시 접속 지원

## 🛠️ 구현 체크리스트

### Phase 1 (즉시 시작)
- [ ] GIN 인덱스 마이그레이션 작성
- [ ] 메시지 검색 API 구현
- [x] Connection Pool 설정 최적화 (이미 구현됨)
- [ ] 성능 모니터링 대시보드 구축

### Phase 2 (2주 후)
- [ ] Count 필드 최적화 메서드 구현
- [ ] 캐싱 데코레이터 개발
- [ ] 캐시 무효화 전략 수립
- [ ] 인기 콘텐츠 캐싱 적용

### Phase 3 (4주 후)
- [ ] Cloudflare Stream API 연동
- [ ] Cloudflare Images API 연동
- [ ] 미디어 업로드 서비스 리팩토링
- [ ] 썸네일 자동 생성 구현

### Phase 4 (6주 후)
- [ ] 쿼리 패턴 분석
- [ ] Eager/Lazy Loading 최적화
- [ ] 성능 테스트 및 튜닝
- [ ] 문서화 및 가이드 작성

## 💡 추가 권장사항

### 모니터링 도구 도입
```typescript
// APM (Application Performance Monitoring)
- DataDog 또는 New Relic 도입
- 실시간 성능 메트릭 추적
- 병목 지점 자동 감지
```

### 로드 테스팅
```bash
# K6 또는 Artillery 사용
artillery quick --count 100 --num 1000 https://api.connecto.com
```

### 데이터베이스 인덱스 분석
```sql
-- 느린 쿼리 로그 분석
SELECT * FROM pg_stat_statements 
WHERE mean_exec_time > 100 
ORDER BY mean_exec_time DESC;
```

## 📋 리스크 및 대응 방안

### 리스크 1: 캐시 일관성 문제
- **대응**: Cache-Aside 패턴 + TTL 전략
- **모니터링**: 캐시 적중률 및 무효화 빈도 추적

### 리스크 2: Cloudflare API 제한
- **대응**: Rate Limiting 및 재시도 로직
- **백업**: 실패 시 기존 R2 스토리지 사용

### 리스크 3: 마이그레이션 중 다운타임
- **대응**: Blue-Green 배포 전략
- **롤백**: 각 Phase별 독립적 롤백 가능

## 🎯 성공 지표 (KPI)

1. **P95 응답시간**: < 100ms
2. **에러율**: < 0.1%
3. **캐시 적중률**: > 70%
4. **동시 접속자**: > 5,000명
5. **인프라 비용**: 30% 절감

---

*이 계획은 단계적 구현을 통해 리스크를 최소화하면서 즉각적인 성과를 달성할 수 있도록 설계되었습니다.*