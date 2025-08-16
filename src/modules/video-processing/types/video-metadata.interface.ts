/**
 * 비디오 메타데이터
 */
export interface VideoMetadata {
  duration: number;
  width: number;
  height: number;
  fps: number;
  bitrate: number;
  codec: string;
  audioChannels?: number;
  audioSampleRate?: number;
  audioCodec?: string;
}
