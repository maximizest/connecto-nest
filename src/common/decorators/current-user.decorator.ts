import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';

export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<Request>();
    return (request as Request & { user: CurrentUserData }).user;
  },
);

export interface CurrentUserData {
  id: number;
  email: string;
  iat?: number;
  exp?: number;
}
