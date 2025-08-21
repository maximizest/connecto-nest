# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Build and Development
```bash
# Development with auto-reload
yarn dev

# Production build
yarn build

# Production start
yarn start:prod

# Build and migrate for production deployment
yarn deploy:prod  # Runs migrations then starts server
```

### Testing
```bash
# Unit tests
yarn test

# Run specific test
yarn test src/modules/auth/auth.service.spec.ts

# Test with coverage
yarn test:cov

# E2E tests
yarn test:e2e

# Generate API documentation from E2E tests
yarn test:docs
```

### Code Quality
```bash
# Lint and fix TypeScript files
yarn lint

# Format code with Prettier
yarn format
```

### Database Migrations
```bash
# Generate migration from entity changes
yarn migration:generate MigrationName

# Create empty migration
yarn migration:create MigrationName

# Run pending migrations
yarn migration:run

# Revert last migration
yarn migration:revert
```

## Architecture

### Core Framework
- **NestJS 11.x** with modular architecture
- **TypeScript 5.7.x** with strict null checks
- **TypeORM** for database operations with PostgreSQL
- **Redis** for caching and distributed operations
- **Socket.io** with Redis adapter for real-time WebSocket communication
- **BullMQ** for background job processing

### Module Structure
Each module follows a consistent pattern:
```
src/modules/{module-name}/
├── api/v1/{module-name}.controller.ts  # REST endpoints
├── dto/                                 # Data transfer objects
├── enums/                              # Module-specific enums
├── {module-name}.entity.ts            # TypeORM entity
├── {module-name}.module.ts            # Module definition
├── {module-name}.service.ts           # Business logic
└── types/                              # TypeScript interfaces
```

### Key Architectural Patterns

#### 1. Entity-First CRUD with @foryourdev/nestjs-crud
Most controllers extend `CrudController` for automatic CRUD operations:
```typescript
@Controller('api/v1/entities')
export class EntityController extends CrudController<Entity> {
  constructor(private readonly entityService: EntityService) {
    super(entityService);
  }
}
```
This automatically provides GET (list/detail), POST, PUT, PATCH, DELETE endpoints with:
- Advanced filtering and sorting
- Pagination support
- Relationship loading
- Soft delete handling

#### 2. Authentication & Authorization
- JWT-based authentication with access/refresh token pattern
- Guards: `AuthGuard` (JWT validation), `AdminGuard` (admin role), `DevOnlyGuard` (development only)
- Current user accessible via `@CurrentUser()` decorator
- WebSocket authentication through JWT in handshake

#### 3. Real-time Communication
- WebSocket gateway with JWT authentication
- Redis adapter for multi-replica synchronization
- Room-based messaging (planet-based rooms)
- Typing indicators and online presence tracking
- Rate limiting per action type

#### 4. File Storage
- Direct upload to Cloudflare R2 using presigned URLs
- Client-side upload reduces server load by 90%
- Native HTTP Range support for video streaming
- No HLS conversion needed - MP4 streams directly

#### 5. Distributed System Support
- Redis-based distributed locking for schedulers
- WebSocket clustering with Redis adapter
- Centralized session management
- Cache synchronization across replicas

### Database Patterns

#### Soft Deletes
All entities extend `BaseActiveRecordEntity` which includes:
- `deletedAt` timestamp for soft deletes
- `isDeleted` boolean flag
- `anonymizedAt` for GDPR compliance
- Automatic filtering of deleted records

#### Relationships
- User → Profile (1:1)
- User → TravelUser → Travel (many-to-many)
- Travel → Planet (1:many)
- Planet → PlanetUser → User (many-to-many)
- Planet → Message (1:many)
- Message → ReadReceipt (1:many)

### Environment Configuration
Key environment variables to configure:
- `DATABASE_*`: PostgreSQL connection
- `REDIS_*`: Redis connection
- `JWT_SECRET`: 32+ character secret
- `STORAGE_*`: Cloudflare R2 credentials
- `NODE_ENV`: development/test/production

### Testing Strategy
- Unit tests for services with mocked dependencies
- E2E tests for API endpoints generating documentation
- Test database separate from development
- Factory pattern for test data generation

### Performance Optimizations
- Query optimization with proper indexes
- Pagination for all list endpoints
- Redis caching for frequently accessed data
- Lazy loading of relationships
- Connection pooling for database

### Security Measures
- Input validation with class-validator
- SQL injection prevention via TypeORM parameterized queries
- XSS protection through input sanitization
- Rate limiting on sensitive operations
- Secure session management with Redis

## Development Guidelines

### When Adding New Features
1. Create new module in `src/modules/`
2. Extend `BaseActiveRecordEntity` for entities
3. Use `CrudController` for standard CRUD operations
4. Add DTOs with validation decorators
5. Implement service with business logic
6. Add to `AppModule` imports
7. Generate and run migrations for database changes

### Working with WebSockets
1. Events are defined in `websocket.gateway.ts`
2. Use `WebSocketService` for broadcasting
3. Join users to planet-based rooms
4. Implement rate limiting for new event types
5. Handle connection/disconnection properly

### Database Migrations
1. Make entity changes
2. Generate migration: `yarn migration:generate ChangeName`
3. Review generated SQL in migration file
4. Run migration: `yarn migration:run`
5. Test rollback: `yarn migration:revert`

### Common Patterns
- Use relative imports within modules
- Use `Logger` from NestJS for logging
- Return consistent response formats
- Handle errors with proper HTTP status codes
- Validate all user inputs
- Use transactions for multi-table operations