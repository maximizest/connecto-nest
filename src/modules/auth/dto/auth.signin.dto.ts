import { IsEmail, IsNotEmpty } from 'class-validator';

export class AuthSigninDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsNotEmpty()
  password: string;
}
