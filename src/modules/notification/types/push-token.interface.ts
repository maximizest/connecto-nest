/**
 * 푸시 토큰 정보
 */
export interface PushToken {
  userId: number;
  token: string;
  platform: 'ios' | 'android' | 'web';
  deviceId: string;
  appVersion?: string;
  createdAt: Date;
  lastUsedAt: Date;
  isActive: boolean;
}