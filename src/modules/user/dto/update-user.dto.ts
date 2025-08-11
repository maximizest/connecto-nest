import { PartialType } from '@nestjs/mapped-types';
import { CreateUserDto } from './create-user.dto';

/**
 * User 업데이트 DTO
 */
export class UpdateUserDto extends PartialType(CreateUserDto) {}
