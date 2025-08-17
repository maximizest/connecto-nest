/**
 * Rate Limit 액션 타입
 */
export enum RateLimitAction {
  MESSAGE_SEND = 'message_send', // 메시지 전송
  MESSAGE_EDIT = 'message_edit', // 메시지 편집
  MESSAGE_DELETE = 'message_delete', // 메시지 삭제
  FILE_UPLOAD = 'file_upload', // 파일 업로드
  TYPING_INDICATOR = 'typing_indicator', // 타이핑 표시
  ROOM_JOIN = 'room_join', // 룸 입장
  ROOM_LEAVE = 'room_leave', // 룸 퇴장
}
