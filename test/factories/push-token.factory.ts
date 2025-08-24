import { Factory } from 'fishery';
import { PushToken } from '../../src/modules/push-token/push-token.entity';

/**
 * PushToken Factory - Fishery를 사용한 푸시 토큰 테스트 데이터 생성
 */
export const PushTokenFactory = Factory.define<PushToken>(({ sequence, params }) => {
  const pushToken = new PushToken();

  // 기본 정보
  pushToken.id = sequence;
  pushToken.userId = params.userId || sequence;

  // 토큰 정보
  pushToken.token = `ExponentPushToken[${sequence}abcdef1234567890]`;
  pushToken.platform = 'ios';
  pushToken.deviceId = `device-${sequence}-${Date.now()}`;

  // 디바이스 정보
  pushToken.deviceName = `iPhone ${12 + (sequence % 4)}`;
  pushToken.deviceModel = 'iPhone';
  pushToken.appVersion = '1.0.0';
  pushToken.osVersion = '15.0';

  // 상태
  pushToken.isActive = true;
  pushToken.lastUsedAt = new Date();

  // 타임스탬프
  pushToken.createdAt = new Date();
  pushToken.updatedAt = new Date();

  return pushToken;
});

/**
 * Android 푸시 토큰 Factory
 */
export const AndroidPushTokenFactory = PushTokenFactory.params({
  platform: 'android',
  token: 'fcm_token_android_',
  deviceName: 'Galaxy S21',
  deviceModel: 'Samsung',
  osVersion: '12.0',
});

/**
 * 비활성 푸시 토큰 Factory
 */
export const InactivePushTokenFactory = PushTokenFactory.params({
  isActive: false,
  lastUsedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30일 전
});

/**
 * Web 푸시 토큰 Factory
 */
export const WebPushTokenFactory = PushTokenFactory.params({
  platform: 'web',
  token: 'web_push_token_',
  deviceName: 'Chrome Browser',
  deviceModel: 'Web',
  osVersion: '108.0',
});