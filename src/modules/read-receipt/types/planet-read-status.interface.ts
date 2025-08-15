/**
 * Planet 읽음 상태 정보
 */
export interface PlanetReadStatus {
  planetId: number;
  planetName: string;
  lastReadMessageId: number | null;
  lastReadAt: Date | null;
  unreadCount: number;
  totalMessages: number;
}