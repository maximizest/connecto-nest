import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class AdminSignupDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsNotEmpty()
  password: string;
}
