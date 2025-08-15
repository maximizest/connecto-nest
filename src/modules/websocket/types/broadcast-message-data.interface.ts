/**
 * 브로드캐스트 메시지 데이터
 */
export interface BroadcastMessageData {
  messageId: number;
  type: string;
  content?: string;
  senderId: number;
  senderName: string;
  planetId: number;
  travelId?: number;
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
  createdAt: Date;
}