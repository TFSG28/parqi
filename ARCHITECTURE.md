# Architecture Documentation

## Clean Architecture Overview

This template follows Clean Architecture principles, organizing code into distinct layers with clear dependencies.

### Dependency Rule

Dependencies flow inward:
```
Presentation → Application → Domain ← Infrastructure
```

- **Domain** has no dependencies (pure business logic)
- **Application** depends only on Domain
- **Infrastructure** depends on Domain (implements interfaces)
- **Presentation** depends on Application and Domain

## Backend Structure

### Domain Layer
Contains business logic and rules. No external dependencies.

**Components:**
- **Entities**: Business objects with identity
- **Repositories (Interfaces)**: Data access contracts
- **Services (Interfaces)**: Business service contracts
- **Errors**: Domain-specific exceptions

**Example:**
```typescript
// domain/entities/User.entity.ts
export class UserEntity {
    constructor(
        public readonly id: string,
        public readonly email: string,
        public readonly name: string
    ) {}
}

// domain/repositories/IUser.repository.ts
export interface IUserRepository {
    findById(id: string): Promise<UserEntity | null>;
}
```

### Application Layer
Contains use cases (application business rules).

**Components:**
- **DTOs**: Data transfer objects
- **Use Cases**: Application-specific business rules

**Example:**
```typescript
// application/usecases/CreateUser.usecase.ts
@injectable()
export class CreateUserUseCase {
    constructor(
        @inject(TOKENS.IUserRepository)
        private userRepository: IUserRepository
    ) {}

    async execute(data: CreateUserDTO) {
        // Business logic here
    }
}
```

### Infrastructure Layer
Implements domain interfaces with external dependencies.

**Components:**
- **Repositories**: Database implementations
- **Services**: External service implementations

**Example:**
```typescript
// infrastructure/repositories/User.repository.ts
@injectable()
export class UserRepository implements IUserRepository {
    async findById(id: string): Promise<UserEntity | null> {
        const user = await prisma.user.findUnique({ where: { id } });
        // Map to entity
    }
}
```

### Presentation Layer
Handles HTTP requests and responses.

**Components:**
- **Controllers**: Handle HTTP requests
- **Routes**: Define API endpoints

**Example:**
```typescript
// presentation/controllers/user.controller.ts
export class UserController {
    async create(req: Request, res: Response) {
        const useCase = container.resolve<CreateUserUseCase>(TOKENS.CreateUserUseCase);
        const result = await useCase.execute(req.body);
        return res.status(201).json(result);
    }
}
```

## Dependency Injection

Using TSyringe for dependency injection.

### Registration Types

1. **Singleton** - Single instance (repositories, services)
```typescript
container.registerSingleton(TOKENS.IUserRepository, UserRepository);
```

2. **Transient** - New instance per request (use cases)
```typescript
container.register(TOKENS.CreateUserUseCase, CreateUserUseCase);
```

3. **Scoped** - Instance per scope (rarely used)
```typescript
container.registerScoped(TOKENS.SomeService, SomeService);
```

## Frontend Structure

### App Directory (Next.js 13+)
- **app/**: Pages and layouts
- **components/**: Reusable UI components
  - **ui/**: Generic UI components (Button, Input)
  - **feature/**: Feature-specific components
- **context/**: React context providers
- **hooks/**: Custom React hooks
- **libs/**: Utilities and libraries
- **utils/**: Helper functions

### Data Flow

```
Component → Hook → fetchClient → Backend API
    ↓
  Context (State Management)
```

## Security Patterns

### Backend
1. **Password Hashing**: bcryptjs with 10 salt rounds
2. **JWT Authentication**: 7-day expiration, delivered as an httpOnly cookie
3. **CSRF Protection**: stateless double-submit (X-CSRF-Token header vs csrf_token cookie)
4. **Rate Limiting**: 200 requests per 10 minutes
5. **CORS**: Whitelist frontend URL, `credentials: true`
6. **Input Validation**: Validate all user input

### Frontend
1. **Session**: httpOnly cookie (no token in localStorage); restored via `/auth/me`
2. **Protected Routes**: Check authentication
3. **CSRF Protection**: CSRF token echoed in `X-CSRF-Token` header
4. **Input Sanitization**: Trim and validate

## Database Patterns

### Prisma Best Practices

1. **Select Only Required Fields**
```typescript
await prisma.user.findMany({
    select: { id: true, name: true, email: true }
});
```

2. **Use Include for Relations**
```typescript
await prisma.user.findUnique({
    where: { id },
    include: { posts: true }
});
```

3. **Transactions for Multiple Operations**
```typescript
await prisma.$transaction([
    prisma.user.create({ data: userData }),
    prisma.profile.create({ data: profileData })
]);
```

## Error Handling

### Backend
```typescript
try {
    // Operation
} catch (error) {
    if (error instanceof DomainError) {
        return res.status(400).json({ message: error.message });
    }
    console.error('Error:', error);
    return res.status(500).json({ message: 'Erro interno' });
}
```

### Frontend
```typescript
try {
    const response = await fetchClient.post('/api/endpoint', data);
    if (!response.ok) throw new Error('Request failed');
} catch (error) {
    console.error('Error:', error);
    // Show user-friendly message
}
```

## Testing Strategy

### Unit Tests
- Test use cases in isolation
- Mock repositories and services
- Focus on business logic

### Integration Tests
- Test API endpoints
- Use test database
- Verify complete flows

### E2E Tests
- Test user workflows
- Use real browser
- Verify UI interactions

## Performance Optimization

### Backend
1. Database query optimization
2. Caching strategies
3. Connection pooling
4. Pagination for large datasets

### Frontend
1. Code splitting
2. Image optimization
3. Lazy loading
4. React Server Components

## Deployment

### Backend
1. Build: `npm run build`
2. Set environment variables
3. Run migrations: `npm run db-update`
4. Start: `npm start`

### Frontend
1. Build: `npm run build`
2. Set environment variables
3. Start: `npm start`

## Monitoring

### Recommended Tools
- **Logging**: Winston, Pino
- **APM**: New Relic, DataDog
- **Error Tracking**: Sentry
- **Metrics**: Prometheus + Grafana
