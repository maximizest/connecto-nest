import { IsEmail, IsEnum, IsNotEmpty, IsOptional } from 'class-validator';
import { UserRole } from 'src/modules/users/user.entity';

export class AuthSignupDto {
  @IsNotEmpty({ message: '이름을 입력해주세요.' })
  name: string;

  @IsEmail({}, { message: '올바른 이메일 형식이 아닙니다.' })
  @IsNotEmpty({ message: '이메일을 입력해주세요.' })
  email: string;

  @IsNotEmpty({ message: '비밀번호를 입력해주세요.' })
  password: string;

  @IsOptional()
  phone?: string;

  @IsOptional()
  @IsEnum(UserRole, { message: '올바른 역할을 선택해주세요. (회원, 관리자)' })
  role?: UserRole;
}
