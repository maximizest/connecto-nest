/**
 * 푸시 전송 결과
 */
export interface PushResult {
  success: boolean;
  messageId?: string;
  error?: string;
  retryAfter?: number;
  invalidTokens?: string[];
}
