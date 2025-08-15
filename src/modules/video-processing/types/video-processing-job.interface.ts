import {
  VideoProcessingType,
  VideoQualityProfile,
} from '../video-processing.entity';

/**
 * 비디오 처리 작업
 */
export interface VideoProcessingJob {
  id: number;
  inputPath: string;
  outputDir: string;
  type: VideoProcessingType;
  quality?: VideoQualityProfile;
  userId: number;
}