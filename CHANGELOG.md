# Changelog

## [1.0.0] - 2026-03-26

### Added
- Complete testing setup with Vitest
- Test scripts in package.json (test, test:watch, test:coverage)
- Example test files for backend and frontend
- Comprehensive TESTING.md guide for junior developers
- Test coverage reporting with v8
- Tests run automatically before production builds
- Coverage folders added to .gitignore

### Backend Testing
- Unit test example: `CreateUser.usecase.spec.ts`
- Integration test example: `user.controller.spec.ts`
- Vitest configuration with Node environment
- Supertest for API endpoint testing
- Global test setup file

### Frontend Testing
- Component test example: `Button.spec.tsx`
- Hook test example: `useApi.spec.ts`
- Vitest configuration with jsdom environment
- React Testing Library integration
- Global test setup file

### Dependencies Added

**Backend:**
- `vitest` - Testing framework
- `@vitest/coverage-v8` - Coverage reporting
- `supertest` - HTTP assertion library
- `@types/supertest` - TypeScript types

**Frontend:**
- `vitest` - Testing framework
- `@vitest/coverage-v8` - Coverage reporting
- `@vitejs/plugin-react` - React support for Vitest
- `jsdom` - DOM implementation for testing
- `@testing-library/react` - React testing utilities
- `@testing-library/jest-dom` - Custom matchers
- `@testing-library/user-event` - User interaction simulation

### Build Process
- Backend: `npm run build` now runs tests → lint → prisma generate → tsc
- Frontend: `npm run build` now runs tests → next build
- Build fails if any test fails (production safety)

### Documentation
- TESTING.md with complete guide for beginners
- AAA pattern examples (Arrange, Act, Assert)
- Mocking patterns and best practices
- Common assertions reference
- Troubleshooting section
