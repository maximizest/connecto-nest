/**
 * 푸시 알림 페이로드
 */
export interface PushPayload {
  title: string;
  body: string;
  badge?: number;
  sound?: string;
  icon?: string;
  image?: string;
  data?: Record<string, any>;
  category?: string;
  collapseId?: string; // 중복 알림 방지
  priority?: 'high' | 'normal';
  ttl?: number; // Time to Live (seconds)
}
