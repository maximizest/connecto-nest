import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { SocialProvider } from '../../user/enums/social-provider.enum';

export class SocialSigninDto {
  @IsEnum(SocialProvider, {
    message: '지원하는 소셜 로그인 제공자를 선택해주세요. (google, apple)',
  })
  @IsNotEmpty({ message: '소셜 로그인 제공자를 선택해주세요.' })
  provider: SocialProvider;

  @IsString({ message: '토큰은 문자열이어야 합니다.' })
  @IsNotEmpty({ message: '소셜 로그인 토큰을 입력해주세요.' })
  token: string;

  // 푸시 알림 설정 (선택적)
  @IsOptional()
  @IsString()
  pushToken?: string;

  @IsOptional()
  @IsEnum(['ios', 'android', 'web'])
  platform?: 'ios' | 'android' | 'web';

  @IsOptional()
  @IsString()
  deviceId?: string;

  @IsOptional()
  @IsString()
  appVersion?: string;
}
