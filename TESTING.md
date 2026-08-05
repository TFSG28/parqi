# Testing Guide

This template uses **Vitest** for testing - a fast, modern testing framework that's easy to learn!

## Why Vitest?

- ✅ **Fast** - Runs tests in milliseconds
- ✅ **Simple** - Similar to Jest, easy to learn
- ✅ **Modern** - Built for TypeScript and ESM
- ✅ **Great DX** - Watch mode, coverage, and more

## Quick Start

### Running Tests

**Backend:**
```bash
cd backend

# Run all tests once
npm test

# Run tests in watch mode (re-runs on file changes)
npm run test:watch

# Run tests with coverage report
npm run test:coverage
```

**Frontend:**
```bash
cd frontend

# Run all tests once
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage report
npm run test:coverage
```

## Test Structure

### Backend Tests

```
backend/src/
├── modules/
│   └── user/
│       ├── application/
│       │   └── usecases/
│       │       ├── CreateUser.usecase.ts
│       │       └── CreateUser.usecase.spec.ts  ← Unit test
│       └── presentation/
│           └── controllers/
│               ├── user.controller.ts
│               └── user.controller.spec.ts     ← Integration test
└── tests/
    └── setup.ts  ← Global test setup
```

### Frontend Tests

```
frontend/src/
├── components/
│   └── ui/
│       ├── Button.tsx
│       └── Button.spec.tsx  ← Component test
├── hooks/
│   ├── useApi.ts
│   └── useApi.spec.ts       ← Hook test
└── tests/
    └── setup.ts  ← Global test setup
```

## Writing Your First Test

### 1. Backend Unit Test (Use Case)

Create `CreateUser.usecase.spec.ts`:

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CreateUserUseCase } from './CreateUser.usecase';
import { UserAlreadyExistsError } from '../../domain/errors/UserAlreadyExists.error';

describe('CreateUserUseCase', () => {
  let createUserUseCase: CreateUserUseCase;
  let mockUserRepository: any;

  beforeEach(() => {
    // Create a mock repository
    mockUserRepository = {
      findByEmail: vi.fn(),
      create: vi.fn(),
    };

    // Create the use case with the mock
    createUserUseCase = new CreateUserUseCase(mockUserRepository);
  });

  it('should create a user successfully', async () => {
    // Arrange (Setup)
    const userData = {
      name: 'John Doe',
      email: 'john@example.com',
      password: 'password123',
    };

    mockUserRepository.findByEmail.mockResolvedValue(null); // User doesn't exist
    mockUserRepository.create.mockResolvedValue({
      id: '1',
      ...userData,
      createdAt: new Date(),
    });

    // Act (Execute)
    const result = await createUserUseCase.execute(userData);

    // Assert (Verify)
    expect(result).toBeDefined();
    expect(result.email).toBe(userData.email);
    expect(mockUserRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        email: userData.email,
      })
    );
  });

  it('should throw error if user already exists', async () => {
    // Arrange
    const userData = {
      name: 'John Doe',
      email: 'existing@example.com',
      password: 'password123',
    };

    mockUserRepository.findByEmail.mockResolvedValue({ id: '1' }); // User exists

    // Act & Assert
    await expect(createUserUseCase.execute(userData)).rejects.toThrow(
      UserAlreadyExistsError
    );
  });
});
```

### 2. Backend Integration Test (API Endpoint)

Create `user.controller.spec.ts`:

```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../../../app';

describe('User Controller', () => {
  it('POST /user - should create a new user', async () => {
    const response = await request(app)
      .post('/user')
      .send({
        name: 'Test User',
        email: 'test@example.com',
        password: 'password123',
      });

    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty('id');
    expect(response.body.email).toBe('test@example.com');
  });

  it('POST /user - should return 400 if user already exists', async () => {
    // First create a user
    await request(app).post('/user').send({
      name: 'Test User',
      email: 'duplicate@example.com',
      password: 'password123',
    });

    // Try to create the same user again
    const response = await request(app)
      .post('/user')
      .send({
        name: 'Test User',
        email: 'duplicate@example.com',
        password: 'password123',
      });

    expect(response.status).toBe(400);
    expect(response.body.message).toContain('já existe');
  });
});
```

### 3. Frontend Component Test

Create `Button.spec.tsx`:

```typescript
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from './Button';

describe('Button Component', () => {
  it('should render button with text', () => {
    render(<Button>Click me</Button>);
    
    const button = screen.getByText('Click me');
    expect(button).toBeInTheDocument();
  });

  it('should call onClick when clicked', () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Click me</Button>);
    
    const button = screen.getByText('Click me');
    fireEvent.click(button);
    
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('should be disabled when disabled prop is true', () => {
    render(<Button disabled>Click me</Button>);
    
    const button = screen.getByText('Click me');
    expect(button).toBeDisabled();
  });

  it('should show loading text when isLoading is true', () => {
    render(<Button isLoading>Click me</Button>);
    
    expect(screen.getByText('Carregando...')).toBeInTheDocument();
  });
});
```

### 4. Frontend Hook Test

Create `useApi.spec.ts`:

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useApi } from './useApi';

// Mock fetchClient
vi.mock('@/libs/fetchClient', () => ({
  fetchClient: {
    post: vi.fn(),
  },
}));

describe('useApi Hook', () => {
  it('should handle successful API call', async () => {
    const mockData = { id: 1, name: 'Test' };
    const { fetchClient } = await import('@/libs/fetchClient');
    
    vi.mocked(fetchClient.post).mockResolvedValue({
      ok: true,
      json: async () => mockData,
    } as Response);

    const { result } = renderHook(() => useApi());

    await result.current.execute('post', '/api/test', {});

    await waitFor(() => {
      expect(result.current.data).toEqual(mockData);
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBeNull();
    });
  });
});
```

## Test Patterns

### AAA Pattern (Arrange, Act, Assert)

```typescript
it('should do something', () => {
  // Arrange - Setup test data and mocks
  const input = { name: 'Test' };
  const mockFn = vi.fn();

  // Act - Execute the code being tested
  const result = myFunction(input);

  // Assert - Verify the results
  expect(result).toBe(expected);
  expect(mockFn).toHaveBeenCalled();
});
```

### Mocking

```typescript
// Mock a function
const mockFn = vi.fn();
mockFn.mockReturnValue('mocked value');
mockFn.mockResolvedValue('async mocked value');

// Mock a module
vi.mock('@/libs/fetchClient', () => ({
  fetchClient: {
    post: vi.fn(),
  },
}));

// Spy on a method
const spy = vi.spyOn(object, 'method');
```

### Common Assertions

```typescript
// Equality
expect(value).toBe(expected);           // Strict equality (===)
expect(value).toEqual(expected);        // Deep equality

// Truthiness
expect(value).toBeTruthy();
expect(value).toBeFalsy();
expect(value).toBeDefined();
expect(value).toBeNull();

// Numbers
expect(value).toBeGreaterThan(3);
expect(value).toBeLessThan(10);

// Strings
expect(string).toContain('substring');
expect(string).toMatch(/regex/);

// Arrays
expect(array).toHaveLength(3);
expect(array).toContain(item);

// Objects
expect(object).toHaveProperty('key');
expect(object).toMatchObject({ key: 'value' });

// Functions
expect(fn).toHaveBeenCalled();
expect(fn).toHaveBeenCalledTimes(2);
expect(fn).toHaveBeenCalledWith(arg1, arg2);

// Errors
expect(() => fn()).toThrow();
expect(() => fn()).toThrow(ErrorClass);
await expect(asyncFn()).rejects.toThrow();

// DOM (Frontend only)
expect(element).toBeInTheDocument();
expect(element).toBeVisible();
expect(element).toBeDisabled();
expect(element).toHaveTextContent('text');
```

## Best Practices

### 1. Test File Naming
- Use `.spec.ts` or `.test.ts` extension
- Place test files next to the code they test
- Example: `CreateUser.usecase.ts` → `CreateUser.usecase.spec.ts`

### 2. Test Organization
```typescript
describe('Feature Name', () => {
  describe('Method Name', () => {
    it('should do something in this scenario', () => {
      // Test code
    });
  });
});
```

### 3. What to Test

**DO Test:**
- ✅ Business logic (use cases)
- ✅ API endpoints (controllers)
- ✅ Component behavior
- ✅ Error handling
- ✅ Edge cases

**DON'T Test:**
- ❌ Third-party libraries
- ❌ Framework internals
- ❌ Simple getters/setters
- ❌ Configuration files

### 4. Keep Tests Simple
- One assertion per test (when possible)
- Clear test names that describe what's being tested
- Use descriptive variable names
- Avoid complex logic in tests

### 5. Use beforeEach for Setup
```typescript
describe('MyTest', () => {
  let myObject: MyClass;

  beforeEach(() => {
    // This runs before each test
    myObject = new MyClass();
  });

  it('test 1', () => {
    // myObject is fresh here
  });

  it('test 2', () => {
    // myObject is fresh here too
  });
});
```

## Production Build

Tests run automatically before building for production:

```bash
# Backend
npm run build  # Runs: test → lint → prisma generate → tsc

# Frontend
npm run build  # Runs: test → next build
```

If any test fails, the build will stop. This ensures you never deploy broken code!

## Coverage Reports

Generate coverage reports to see which code is tested:

```bash
npm run test:coverage
```

This creates an HTML report in `coverage/` folder. Open `coverage/index.html` in your browser to see:
- Which files are tested
- Which lines are covered
- Which branches are covered

Aim for **70-80% coverage** for important business logic.

## Troubleshooting

### Tests are slow
- Use `it.only()` to run a single test
- Use `describe.only()` to run a single test suite
- Check for unnecessary async operations

### Tests are flaky
- Avoid testing implementation details
- Use `waitFor()` for async operations
- Don't rely on timing (setTimeout)

### Mocks not working
- Make sure to call `vi.mock()` before imports
- Use `vi.clearAllMocks()` in `beforeEach()`
- Check mock return values

## Learning Resources

- [Vitest Documentation](https://vitest.dev/)
- [Testing Library](https://testing-library.com/)
- [Supertest Documentation](https://github.com/ladjs/supertest)

## Example Test Files

Check these files for complete examples:
- `backend/src/modules/user/application/usecases/CreateUser.usecase.spec.ts`
- `backend/src/modules/user/presentation/controllers/user.controller.spec.ts`
- `frontend/src/components/ui/Button.spec.tsx`
- `frontend/src/hooks/useApi.spec.ts`

Happy testing! 🧪
