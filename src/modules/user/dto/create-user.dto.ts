import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
} from 'class-validator';
import { SocialProvider, UserStatus } from '../user.entity';

/**
 * User 생성 DTO
 */
export class CreateUserDto {
  @IsString()
  @MaxLength(255)
  socialId: string;

  @IsEnum(SocialProvider)
  provider: SocialProvider;

  @IsString()
  @MaxLength(100)
  name: string;

  @IsEmail()
  @MaxLength(200)
  email: string;

  @IsOptional()
  @IsUrl()
  avatar?: string;

  @IsOptional()
  @IsEnum(UserStatus)
  status?: UserStatus;

  @IsOptional()
  @IsBoolean()
  notificationsEnabled?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  language?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  timezone?: string;

  @IsOptional()
  socialMetadata?: any;
}
