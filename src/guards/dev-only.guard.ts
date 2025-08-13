import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { SecurityValidationService } from '../modules/schema/services/security-validation.service';

@Injectable()
export class DevOnlyGuard implements CanActivate {
  constructor(
    private readonly securityValidationService: SecurityValidationService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const clientIP = this.extractClientIP(request);

    const validationResult =
      this.securityValidationService.validateSchemaAccess(clientIP);

    if (!validationResult.isAllowed) {
      throw new ForbiddenException({
        message: validationResult.errorMessage,
        error: validationResult.errorCode,
        statusCode: 403,
        ...(validationResult.clientIP && {
          clientIP: validationResult.clientIP,
        }),
        hint: validationResult.hint,
      });
    }

    return true;
  }

  /**
   * 요청에서 클라이언트 IP를 추출합니다.
   */
  private extractClientIP(request: any): string {
    return (
      request.ip ||
      request.connection?.remoteAddress ||
      request.headers['x-forwarded-for'] ||
      'unknown'
    );
  }
}
