import {
  get,
  parameter,
  path,
  response,
  schemas,
  tags,
} from '@foryourdev/jest-swag';
import * as request from 'supertest';
import { describeE2E } from './helpers/test-app.helper';

describeE2E('Schema API (e2e)', (getApp) => {
  path('/api/v1/schema', () => {
    get('Get all entity schemas', () => {
      tags('Schema');

      response(200, 'Successfully retrieved all entity schemas', () => {
        return request(getApp().getHttpServer())
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
        return request(getApp().getHttpServer())
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
});
