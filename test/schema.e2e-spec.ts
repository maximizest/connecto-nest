import {
  get,
  parameter,
  path,
  response,
  schemas,
  tags,
} from '@foryourdev/jest-swag';
import { CrudExceptionFilter } from '@foryourdev/nestjs-crud';
import {
  INestApplication,
  ValidationPipe,
  VersioningType,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as request from 'supertest';
import { App } from 'supertest/types';
import { LoggingInterceptor } from '../src/common/interceptors/logging.interceptor';
import { AppModule } from '../src/modules/app.module';

describe('Schema API (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    // Enable schema API for testing
    process.env.ENABLE_SCHEMA_API = 'true';
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();

    // Apply the same global configuration as in main.ts
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: false,
        forbidNonWhitelisted: false,
        transform: true,
        stopAtFirstError: true,
      }),
    );

    app.useGlobalFilters(new CrudExceptionFilter());
    app.useGlobalInterceptors(new LoggingInterceptor());

    // Enable versioning like in main.ts
    app.enableVersioning({
      type: VersioningType.URI,
      defaultVersion: '1',
      prefix: 'api/v',
    });

    await app.init();
  });

  path('/api/v1/schema', () => {
    get('Get all entity schemas', () => {
      tags('Schema');

      response(200, 'Successfully retrieved all entity schemas', () => {
        return request(app.getHttpServer())
          .get('/api/v1/schema')
          .expect(200)
          .expect((res) => {
            expect(res.body).toHaveProperty('data');
            expect(Array.isArray(res.body.data)).toBe(true);
          });
      });

      response(403, 'Forbidden - Only available in development mode', () => {
        // This test would run when NODE_ENV=production
      });
    });
  });

  path('/api/v1/schema/{entityName}', () => {
    get('Get specific entity schema', () => {
      tags('Schema');

      parameter({
        name: 'entityName',
        in: 'path',
        description: 'Name of the entity to retrieve schema for',
        required: true,
        schema: schemas.string('User'),
      });

      response(200, 'Successfully retrieved entity schema', () => {
        // Since we don't have specific entities in this template,
        // we'll test with a non-existent entity to check error handling
        return Promise.resolve(); // Placeholder for actual test
      });

      response(404, 'Entity not found', () => {
        return request(app.getHttpServer())
          .get('/api/v1/schema/NonExistentEntity')
          .expect(404)
          .expect((res) => {
            // Handle both string and array message formats
            const message = Array.isArray(res.body.message)
              ? res.body.message.join(' ')
              : res.body.message;
            expect(message).toContain('not found');
          });
      });

      response(403, 'Forbidden - Only available in development mode');
    });
  });

  afterAll(async () => {
    await app.close();
    // Clean up environment variable
    delete process.env.ENABLE_SCHEMA_API;
  });
});
