/**
 * 룸 정보
 */
export interface RoomInfo {
  id: string;
  type: 'travel' | 'planet';
  entityId: number;
  name: string;
  memberCount: number;
  onlineCount: number;
}