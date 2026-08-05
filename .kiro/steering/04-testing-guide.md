---
inclusion: manual
---

# Guia de Testes

Guia rápido para escrever testes com Vitest.

## Comandos

```bash
# Backend
cd backend
npm test              # Executar testes uma vez
npm run test:watch    # Modo watch
npm run test:coverage # Com cobertura

# Frontend
cd frontend
npm test              # Executar testes uma vez
npm run test:watch    # Modo watch
npm run test:coverage # Com cobertura
```

## Padrão AAA

```typescript
it('deve fazer algo', () => {
  // Arrange (Preparar) - Setup
  const input = { name: 'Teste' };
  
  // Act (Executar) - Ação
  const result = myFunction(input);
  
  // Assert (Verificar) - Validação
  expect(result).toBe(expected);
});
```

## Teste de Caso de Uso

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CreateUserUseCase } from './CreateUser.usecase';

describe('CreateUserUseCase', () => {
  let useCase: CreateUserUseCase;
  let mockRepository: any;

  beforeEach(() => {
    mockRepository = {
      findByEmail: vi.fn(),
      create: vi.fn(),
    };
    useCase = new CreateUserUseCase(mockRepository);
  });

  it('deve criar usuário', async () => {
    mockRepository.findByEmail.mockResolvedValue(null);
    mockRepository.create.mockResolvedValue({ id: '1' });

    const result = await useCase.execute({ email: 'test@test.com' });

    expect(result).toBeDefined();
    expect(mockRepository.create).toHaveBeenCalled();
  });
});
```

## Teste de Componente

```typescript
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from './Button';

describe('Button', () => {
  it('deve renderizar', () => {
    render(<Button>Clique</Button>);
    expect(screen.getByText('Clique')).toBeInTheDocument();
  });

  it('deve chamar onClick', () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Clique</Button>);
    
    fireEvent.click(screen.getByText('Clique'));
    expect(onClick).toHaveBeenCalled();
  });
});
```

## Mocking

```typescript
// Mock de função
const mockFn = vi.fn();
mockFn.mockReturnValue('valor');
mockFn.mockResolvedValue('async valor');

// Mock de módulo
vi.mock('@/libs/fetchClient', () => ({
  fetchClient: {
    post: vi.fn(),
  },
}));
```

## Assertions Comuns

```typescript
expect(value).toBe(expected);           // ===
expect(value).toEqual(expected);        // Deep equality
expect(value).toBeTruthy();
expect(value).toBeDefined();
expect(value).toBeNull();
expect(array).toHaveLength(3);
expect(array).toContain(item);
expect(fn).toHaveBeenCalled();
expect(fn).toHaveBeenCalledWith(arg);
expect(() => fn()).toThrow();
```

## Recursos

- Consulte `TESTING.md` para guia completo
- Consulte testes existentes como exemplo
