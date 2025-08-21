# Performance Optimization Implementation Plan / 성능 최적화 구현 계획

> Date: 2025-08-21  
> Project: Connecto NestJS Backend  
> Purpose: Complete partially implemented and unimplemented performance optimization features

## 📊 Current Status Summary / 현황 요약

### ✅ Completed / 구현 완료
- Lazy Loading strategy / Lazy Loading 전략
- Redis caching system / Redis 캐싱 시스템  
- WebSocket real-time communication / WebSocket 실시간 통신
- Batch read receipt processing / 읽음 확인 일괄 처리
- Direct file upload (Presigned URL) / 파일 직접 업로드

### ⏳ Partially Implemented / 부분 구현
- Search functionality (only searchableText field exists) / 검색 기능 (searchableText 필드만 존재)

### ❌ Not Implemented / 미구현
- Eager Loading optimization / Eager Loading 최적화
- Count field optimization / Count 필드 최적화
- Cloudflare Media advanced features / Cloudflare Media 고급 기능
- Advanced caching strategies / 고급 캐싱 전략
- Database optimization / 데이터베이스 최적화

## 🎯 Implementation Priority / 구현 우선순위

### Phase 1: Quick Impact Features (1-2 weeks) / 즉시 효과가 큰 기능

#### 1.1 Complete Search Functionality / 검색 기능 완성 ⏳

**Implementation Tasks / 작업 내용:**
```sql
-- Create GIN index / GIN 인덱스 생성
CREATE INDEX idx_messages_searchable_text_gin 
ON messages USING gin(to_tsvector('simple', searchable_text));
```

**Files to Modify / 구현 파일:**
- `src/modules/message/message.service.ts`: Add search method / 검색 메서드 추가
- `src/modules/message/dto/search-message.dto.ts`: Create search DTO / 검색 DTO 생성
- `migration/xxx-add-gin-index.ts`: Migration file / 마이그레이션 파일

**Expected Benefits / 예상 효과:**
- ✨ 100x faster message search (vs LIKE) / 메시지 검색 속도 100배 향상
- 📈 Significant UX improvement / 사용자 경험 대폭 개선
- 💬 Quick chat history navigation / 채팅 내역 빠른 탐색 가능

#### 1.2 Database Connection Pooling Optimization / 데이터베이스 Connection Pooling 최적화 ❌

**Implementation Tasks / 작업 내용:**
```typescript
// app.module.ts
TypeOrmModule.forRoot({
  type: 'postgres',
  extra: {
    max: 20,           // Maximum connections / 최대 연결 수 (default: 10)
    min: 5,            // Minimum connections / 최소 연결 수 (default: 0)
    idleTimeoutMillis: 30000,  // Idle timeout / 유휴 연결 타임아웃
    connectionTimeoutMillis: 2000,  // Connection timeout / 연결 타임아웃
  },
  poolSize: 20,        // TypeORM pool size / TypeORM 풀 사이즈
})
```

**Expected Benefits / 예상 효과:**
- ⚡ 50% reduction in DB connection overhead / DB 연결 오버헤드 50% 감소
- 🚀 2x increase in concurrent throughput / 동시 처리량 2배 증가
- 🔧 Shorter response time via connection reuse / 커넥션 재사용으로 응답시간 단축

### Phase 2: User Experience Performance (2-3 weeks) / 사용자 체감 성능 개선

#### 2.1 Count Field Optimization / Count 필드 최적화 ❌

**Implementation Tasks / 작업 내용:**
```typescript
// message.entity.ts
@Entity()
export class Message {
  // Add virtual columns / Virtual columns 추가
  @VirtualColumn({
    query: (alias) => 
      `SELECT COUNT(*) FROM read_receipts WHERE message_id = ${alias}.id AND is_read = true`
  })
  readCount: number;

  @VirtualColumn({
    query: (alias) => 
      `SELECT COUNT(*) FROM messages WHERE reply_to_message_id = ${alias}.id`
  })
  replyCount: number;
}
```

**Expected Benefits / 예상 효과:**
- 📊 Real-time statistics / 실시간 통계 제공
- 🔄 Solve N+1 query problem / N+1 쿼리 문제 해결
- 💾 No additional storage needed / 추가 저장 공간 불필요

#### 2.2 Advanced Caching Strategy / 고급 캐싱 전략 구현 ❌

**Implementation Tasks / 작업 내용:**
```typescript
// cache.decorator.ts
export function CacheResult(ttl: number = 3600) {
  return function(target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    descriptor.value = async function(...args: any[]) {
      const cacheKey = `${target.constructor.name}:${propertyName}:${JSON.stringify(args)}`;
      
      // Check cache in Redis / Redis에서 캐시 확인
      const cached = await redis.get(cacheKey);
      if (cached) return JSON.parse(cached);
      
      // Execute and cache / 실행 및 캐싱
      const result = await originalMethod.apply(this, args);
      await redis.setex(cacheKey, ttl, JSON.stringify(result));
      return result;
    };
  };
}

// travel.service.ts
@CacheResult(7200) // 2 hour caching / 2시간 캐싱
async findPopularTravels() {
  return this.travelRepository.find({
    where: { visibility: 'PUBLIC' },
    order: { participantCount: 'DESC' },
    take: 10
  });
}
```

**Expected Benefits / 예상 효과:**
- 🚀 90% faster repeated queries / 반복 조회 90% 속도 향상
- 💰 70% reduction in DB load / DB 부하 70% 감소
- ⏱️ Average response time 200ms → 20ms / 평균 응답시간 200ms → 20ms

### Phase 3: Media Optimization (3-4 weeks) / 미디어 최적화

#### 3.1 Cloudflare Stream Integration / Cloudflare Stream 통합 ❌

**Implementation Tasks / 작업 내용:**
```typescript
// video-upload.service.ts
class VideoUploadService {
  async uploadToStream(videoPath: string) {
    // Upload video via Stream API / Stream API로 비디오 업로드
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
      playbackUrl: response.playback.hls,  // HLS streaming URL / HLS 스트리밍 URL
      thumbnailUrl: response.thumbnail,     // Auto-generated thumbnail / 자동 생성된 썸네일
    };
  }
}
```

**Expected Benefits / 예상 효과:**
- 📹 Automatic video encoding (all devices) / 자동 비디오 인코딩 (모든 디바이스 호환)
- 🎬 Adaptive bitrate streaming / 적응형 비트레이트 스트리밍
- 🖼️ Automatic thumbnail generation / 자동 썸네일 생성
- 💾 50% storage savings / 스토리지 50% 절감

#### 3.2 Cloudflare Images Integration / Cloudflare Images 통합 ❌

**Implementation Tasks / 작업 내용:**
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
        full: `${baseUrl}/full`            // Original / 원본
      }
    };
  }
}
```

**Expected Benefits / 예상 효과:**
- 🖼️ Automatic image resizing / 자동 이미지 리사이징
- 📱 Device-optimized images / 디바이스별 최적화된 이미지 제공
- 🚀 3x faster image loading / 이미지 로딩 3배 빠름
- 💾 60% bandwidth savings / 대역폭 60% 절감

### Phase 4: Intelligent Optimization (4-5 weeks) / 지능형 최적화

#### 4.1 Selective Eager Loading / Eager Loading 선택적 적용 ❌

**Implementation Tasks / 작업 내용:**
```typescript
// user.entity.ts
@Entity()
export class User {
  @OneToOne(() => Profile, {
    eager: true,  // Always loaded together / 항상 함께 로드되는 Profile은 eager
    cascade: true
  })
  profile: Profile;
  
  @OneToMany(() => TravelUser, {
    eager: false  // Load only when needed / 필요시에만 로드
  })
  travelUsers: TravelUser[];
}
```

**Analysis Required / 분석 필요 데이터:**
- User-Profile: 95% loaded together → Recommend Eager / 95% 함께 조회 → Eager 추천
- Travel-Planet: 30% loaded together → Keep Lazy / 30% 함께 조회 → Lazy 유지
- Message-ReadReceipt: 10% loaded together → Keep Lazy / 10% 함께 조회 → Lazy 유지

**Expected Benefits / 예상 효과:**
- 🎯 50% faster essential relation queries / 필수 관계 조회 50% 빠름
- 📉 Remove unnecessary joins / 불필요한 조인 제거
- ⚖️ Optimized memory usage / 메모리 사용량 최적화

## 📈 Expected Performance Gains / 예상 성과

### Immediate Impact (After Phase 1) / 즉시 효과
- **Response Time / 응답 시간**: Average 300ms → 150ms (50% improvement / 개선)
- **Concurrent Users / 동시 접속**: 1,000 → 2,000 (100% increase / 증가)
- **DB Load / DB 부하**: 30% reduction / 감소

### Mid-term Impact (After Phase 2-3) / 중기 효과
- **Response Time / 응답 시간**: Average 150ms → 80ms (additional 47% improvement / 추가 개선)
- **Cache Hit Rate / 캐시 적중률**: 0% → 70%
- **Media Loading / 미디어 로딩**: 3s → 1s (67% improvement / 개선)
- **Storage Cost / 스토리지 비용**: 40% savings / 절감

### Long-term Impact (After Phase 4) / 장기 효과
- **Overall Performance / 전체 성능**: 300% comprehensive improvement / 종합 개선
- **User Satisfaction / 사용자 만족도**: Significant increase / 대폭 상승
- **Infrastructure Cost / 인프라 비용**: 30% savings / 절감
- **Scalability / 확장성**: Support 10,000 concurrent users / 동시 접속 지원

## 🛠️ Implementation Checklist / 구현 체크리스트

### Phase 1 (Start Immediately / 즉시 시작)
- [ ] Write GIN index migration / GIN 인덱스 마이그레이션 작성
- [ ] Implement message search API / 메시지 검색 API 구현
- [ ] Optimize connection pool settings / Connection Pool 설정 최적화
- [ ] Build performance monitoring dashboard / 성능 모니터링 대시보드 구축

### Phase 2 (After 2 weeks / 2주 후)
- [ ] Implement virtual columns / Virtual Column 구현
- [ ] Develop caching decorator / 캐싱 데코레이터 개발
- [ ] Establish cache invalidation strategy / 캐시 무효화 전략 수립
- [ ] Apply popular content caching / 인기 콘텐츠 캐싱 적용

### Phase 3 (After 4 weeks / 4주 후)
- [ ] Integrate Cloudflare Stream API / Cloudflare Stream API 연동
- [ ] Integrate Cloudflare Images API / Cloudflare Images API 연동
- [ ] Refactor media upload service / 미디어 업로드 서비스 리팩토링
- [ ] Implement automatic thumbnail generation / 썸네일 자동 생성 구현

### Phase 4 (After 6 weeks / 6주 후)
- [ ] Analyze query patterns / 쿼리 패턴 분석
- [ ] Optimize Eager/Lazy Loading / Eager/Lazy Loading 최적화
- [ ] Performance testing and tuning / 성능 테스트 및 튜닝
- [ ] Documentation and guide creation / 문서화 및 가이드 작성

## 💡 Additional Recommendations / 추가 권장사항

### Monitoring Tools / 모니터링 도구 도입
```typescript
// APM (Application Performance Monitoring)
- Introduce DataDog or New Relic / DataDog 또는 New Relic 도입
- Track real-time performance metrics / 실시간 성능 메트릭 추적
- Automatic bottleneck detection / 병목 지점 자동 감지
```

### Load Testing / 로드 테스팅
```bash
# Use K6 or Artillery / K6 또는 Artillery 사용
artillery quick --count 100 --num 1000 https://api.connecto.com
```

### Database Index Analysis / 데이터베이스 인덱스 분석
```sql
-- Analyze slow query logs / 느린 쿼리 로그 분석
SELECT * FROM pg_stat_statements 
WHERE mean_exec_time > 100 
ORDER BY mean_exec_time DESC;
```

## 📋 Risks and Mitigation / 리스크 및 대응 방안

### Risk 1: Cache Consistency Issues / 캐시 일관성 문제
- **Mitigation / 대응**: Cache-Aside pattern + TTL strategy / Cache-Aside 패턴 + TTL 전략
- **Monitoring / 모니터링**: Track cache hit rate and invalidation frequency / 캐시 적중률 및 무효화 빈도 추적

### Risk 2: Cloudflare API Limits / Cloudflare API 제한
- **Mitigation / 대응**: Rate limiting and retry logic / Rate Limiting 및 재시도 로직
- **Backup / 백업**: Fallback to existing R2 storage on failure / 실패 시 기존 R2 스토리지 사용

### Risk 3: Migration Downtime / 마이그레이션 중 다운타임
- **Mitigation / 대응**: Blue-Green deployment strategy / Blue-Green 배포 전략
- **Rollback / 롤백**: Independent rollback per phase / 각 Phase별 독립적 롤백 가능

## 🎯 Success Metrics (KPI) / 성공 지표

1. **P95 Response Time / P95 응답시간**: < 100ms
2. **Error Rate / 에러율**: < 0.1%
3. **Cache Hit Rate / 캐시 적중률**: > 70%
4. **Concurrent Users / 동시 접속자**: > 5,000
5. **Infrastructure Cost / 인프라 비용**: 30% reduction / 절감

---

*This plan is designed to minimize risk while achieving immediate results through phased implementation.*
*이 계획은 단계적 구현을 통해 리스크를 최소화하면서 즉각적인 성과를 달성할 수 있도록 설계되었습니다.*