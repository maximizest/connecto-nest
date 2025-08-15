# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Common Development Commands

### Building and Testing
- `yarn build` - Build the NestJS application
- `yarn dev` - Start development server with watch mode
- `yarn lint` - Run ESLint with auto-fix
- `yarn test` - Run Jest unit tests
- `yarn test:watch` - Run tests in watch mode
- `yarn test:e2e` - Run end-to-end tests
- `yarn test:cov` - Run tests with coverage report

### Database Operations
- `yarn migration:generate -- MigrationName` - Generate new database migration
- `yarn migration:run` - Run pending migrations
- `yarn migration:revert` - Revert last migration
- `yarn migration:create -- MigrationName` - Create empty migration file

### Documentation
- `yarn docs:generate` - Generate API documentation from E2E tests
- `yarn test:docs` - Run E2E tests and generate docs

### Production Deployment
- `yarn start:prod:migrate` - Run migrations then start production server
- `yarn deploy:prod` - Safe production deployment with migrations

## Project Architecture

### Core Framework
- **NestJS 11.x** with TypeScript 5.7.x
- **Entity-First CRUD Pattern** using `@foryourdev/nestjs-crud`
- **PostgreSQL + TypeORM** for data persistence
- **Redis** for caching and real-time features
- **WebSocket (Socket.io)** for real-time communication

### Module Structure (`src/modules/`)

#### Authentication & User Management
- **admin** - System administrators with bcrypt password hashing
- **auth** - JWT-based authentication with Google/Apple social login
- **user** - User profiles with online status tracking
- **profile** - Detailed user profile information (1:1 with User)

#### Travel & Group Management
- **travel** - Travel groups (containers for planets)
- **travel-user** - Travel group membership with roles (HOST/PARTICIPANT)
- **planet** - Chat rooms (GROUP/DIRECT types)
- **planet-user** - Chat room membership with moderation features

#### Messaging & Communication
- **message** - Chat messages with various types (TEXT/IMAGE/VIDEO/FILE/SYSTEM)
- **read-receipt** - Message read status tracking
- **websocket** - Real-time communication gateway
- **notification** - Multi-channel notifications (FCM push, email, SMS)

#### File & Media Management
- **file-upload** - Chunked file uploads to Cloudflare R2 (max 500MB)
- **streaming** - HLS video/audio streaming
- **video-processing** - Video encoding and thumbnail generation
- **storage** - Unified file storage management

#### Performance & System
- **cache** - Redis-based caching with TTL strategies
- **scheduler** - Background jobs and system optimization
- **schema** - Database schema API (development only)

### Key Architecture Patterns

#### CRUD Pattern Template
```typescript
@Controller({ path: 'entities', version: '1' })
@Crud({
  entity: Entity,
  allowedFilters: ['field1', 'field2'],
  allowedParams: ['field1', 'field2'], 
  allowedIncludes: ['relation1'],
  only: ['index', 'show', 'create', 'update', 'destroy'],
})
export class EntityController {
  constructor(public readonly crudService: EntityService) {}
}
```

#### Travel-Planet Hierarchy
```
Travel (여행 그룹)
├── TravelUser (멤버십)
└── Planet (채팅방)
    ├── PlanetUser (멤버십)
    └── Message (메시지)
        └── MessageReadReceipt (읽음 상태)
```

#### Ban System Structure
- **User Ban**: Account-wide login prevention
- **TravelUser Ban**: Travel-specific participation restriction
- **PlanetUser**: Uses mute system instead of bans

### Security Guidelines
- All APIs must use `@UseGuards(AuthGuard)` 
- Always configure `allowedFilters`, `allowedParams`, `allowedIncludes` in CRUD decorators
- Use `@Exclude()` for sensitive data fields
- Import paths must use relative paths (`../../guards/auth.guard`)
- Store secrets in environment variables

### File Structure Conventions
- Entity files: `{module}.entity.ts`
- Service files: `{module}.service.ts` 
- Controller files: `api/v1/{module}.controller.ts`
- DTO files: `dto/{name}.dto.ts`
- All imports use relative paths, never absolute

### Environment Configuration
Critical environment variables required:
- `DATABASE_URL` - PostgreSQL connection
- `JWT_SECRET` - JWT signing key (32+ chars)
- `REDIS_URL` - Redis connection
- `CLOUDFLARE_R2_*` - R2 storage credentials
- `GOOGLE_CLIENT_ID`, `APPLE_CLIENT_ID` - Social login verification

### Testing Strategy
- Use Jest for unit tests and E2E tests
- E2E tests use `describeE2E` helper function
- Tests automatically generate OpenAPI docs via `@foryourdev/jest-swag`
- Test configuration in `test/jest-e2e.json`

### Development Environment Features
- Schema API available at `/api/v1/schema` (development only)
- API documentation at `/api-docs` (generated from tests)
- Hot reload with `yarn dev`
- Development-only scheduler endpoints

### Real-time Features
- WebSocket authentication via JWT
- Redis pub/sub for scalability
- Typing indicators and online presence
- Multi-device connection support
- Rate limiting on WebSocket connections

### File Upload System
- Chunked uploads in 5MB segments
- Support for images, videos, documents up to 500MB
- Cloudflare R2 storage backend
- Automatic thumbnail generation for videos
- File security scanning and validation

### Package Management
- **MUST use yarn only** - npm is prohibited
- Lock file: `yarn.lock`
- Node.js version requirement: `>=20.0.0`
- 한글 꺠졌다. 앞으로 한글 작성에 유의하라.