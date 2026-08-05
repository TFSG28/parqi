# Contributing Guide

## Development Workflow

### 1. Setup Development Environment

```bash
# Backend
cd backend
npm install
cp .env.example .env
npm run db-update
npm run dev

# Frontend
cd frontend
npm install
cp .env.example .env.development
npm run dev
```

### 2. Creating a New Feature

Follow this checklist:

- [ ] Create feature branch: `git checkout -b feature/feature-name`
- [ ] Design database schema (if needed)
- [ ] Create domain layer (entities, interfaces, errors)
- [ ] Create application layer (DTOs, use cases)
- [ ] Create infrastructure layer (implementations)
- [ ] Create presentation layer (controllers, routes)
- [ ] Register in DI container
- [ ] Add routes
- [ ] Test endpoints
- [ ] Create frontend components
- [ ] Update documentation
- [ ] Commit and push

### 3. Code Style

#### Backend
- Use TypeScript strict mode
- Follow Clean Architecture layers
- Use dependency injection
- Add error handling
- Validate all inputs
- Use descriptive names
- Add comments only for complex logic

#### Frontend
- Use functional components
- Use TypeScript
- Follow React best practices
- Use custom hooks for logic
- Keep components small and focused
- Use Tailwind for styling

### 4. Naming Conventions

#### Backend
- **Files**: PascalCase for classes, camelCase for utilities
  - `User.entity.ts`
  - `CreateUser.usecase.ts`
  - `user.controller.ts`
  - `user.routes.ts`

- **Classes**: PascalCase
  - `UserEntity`
  - `CreateUserUseCase`
  - `UserController`

- **Interfaces**: PascalCase with `I` prefix
  - `IUserRepository`
  - `IJwtService`

- **Variables/Functions**: camelCase
  - `findUserById`
  - `userData`

#### Frontend
- **Components**: PascalCase
  - `Button.tsx`
  - `UserForm.tsx`

- **Hooks**: camelCase with `use` prefix
  - `useAuth.ts`
  - `useApi.ts`

- **Utils**: camelCase
  - `formatDate`
  - `validateEmail`

### 5. Git Commit Messages

Follow conventional commits:

```
feat: add user authentication
fix: resolve login validation bug
docs: update setup instructions
refactor: improve error handling
test: add user creation tests
chore: update dependencies
```

### 6. Pull Request Process

1. Update documentation
2. Ensure all tests pass
3. Update CHANGELOG.md
4. Create PR with description
5. Request review
6. Address feedback
7. Merge after approval

### 7. Testing

#### Backend
```bash
npm test
```

#### Frontend
```bash
npm test
```

### 8. Database Changes

When modifying schema:

1. Update `prisma/schema.prisma`
2. Run `npm run db-update`
3. Test migrations
4. Document changes

### 9. Security Checklist

- [ ] Validate all user inputs
- [ ] Sanitize data before storage
- [ ] Use parameterized queries
- [ ] Hash passwords with bcrypt
- [ ] Verify JWT tokens
- [ ] Check user permissions
- [ ] Use HTTPS in production
- [ ] Set secure headers
- [ ] Rate limit endpoints
- [ ] Log security events

### 10. Performance Checklist

- [ ] Optimize database queries
- [ ] Use pagination for lists
- [ ] Cache frequently accessed data
- [ ] Minimize API calls
- [ ] Optimize images
- [ ] Use code splitting
- [ ] Lazy load components
- [ ] Monitor bundle size

## Questions?

Open an issue or contact the team.
