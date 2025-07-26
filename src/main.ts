import { NestFactory } from '@nestjs/core';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { AppModule } from './modules/app.module';
import { CrudExceptionFilter } from '@foryourdev/nestjs-crud';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: false,
      forbidNonWhitelisted: false,
      transform: true,
      stopAtFirstError: true,
    }),
  );

  app.useGlobalFilters(new CrudExceptionFilter());

  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: process.env.API_VERSION || '1',
    prefix: process.env.API_PREFIX || 'api/v',
  });

  await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();
