---
inclusion: manual
---

# Criando Novos Módulos

Este guia explica como criar novos módulos seguindo a Clean Architecture do template.

## Estrutura de um Módulo

```
src/modules/[nome-do-modulo]/
├── domain/
│   ├── entities/          # Entidades de negócio
│   ├── errors/            # Erros customizados
│   ├── repositories/      # Interfaces de repositórios
│   └── services/          # Interfaces de serviços
├── application/
│   ├── dtos/              # Data Transfer Objects
│   └── usecases/          # Casos de uso
├── infrastructure/
│   ├── repositories/      # Implementações de repositórios
│   └── services/          # Implementações de serviços
└── presentation/
    ├── controllers/       # Controllers HTTP
    └── routes/            # Rotas Express
```

## Passo a Passo

### 1. Criar Entidade (Domain)

```typescript
// src/modules/product/domain/entities/Product.entity.ts
export interface ProductEntity {
  id: string;
  name: string;
  description: string;
  price: number;
  stock: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
```

### 2. Criar Erros Customizados (Domain)

```typescript
// src/modules/product/domain/errors/ProductNotFound.error.ts
export class ProductNotFoundError extends Error {
  constructor() {
    super('Produto não encontrado');
    this.name = 'ProductNotFoundError';
  }
}

// src/modules/product/domain/errors/ProductAlreadyExists.error.ts
export class ProductAlreadyExistsError extends Error {
  constructor() {
    super('Produto já existe');
    this.name = 'ProductAlreadyExistsError';
  }
}

// src/modules/product/domain/errors/InvalidData.error.ts
export class InvalidDataError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidDataError';
  }
}
```

### 3. Criar Interface do Repositório (Domain)

```typescript
// src/modules/product/domain/repositories/IProduct.repository.ts
import type { ProductEntity } from '../entities/Product.entity';

export interface IProductRepository {
  findById(id: string): Promise<ProductEntity | null>;
  findByName(name: string): Promise<ProductEntity | null>;
  findAll(): Promise<ProductEntity[]>;
  create(data: Omit<ProductEntity, 'id' | 'createdAt' | 'updatedAt'>): Promise<ProductEntity>;
  update(id: string, data: Partial<ProductEntity>): Promise<ProductEntity>;
  delete(id: string): Promise<void>;
}
```

### 4. Criar DTOs (Application)

```typescript
// src/modules/product/application/dtos/CreateProduct.dto.ts
import { InvalidDataError } from '../../domain/errors/InvalidData.error';

export class CreateProductDto {
  name: string;
  description: string;
  price: number;
  stock: number;

  constructor(data: CreateProductDto) {
    this.name = data.name;
    this.description = data.description;
    this.price = data.price;
    this.stock = data.stock;
    this.validate();
  }

  validate() {
    if (!this.name || this.name.length < 3) {
      throw new InvalidDataError('Nome deve ter pelo menos 3 caracteres');
    }

    if (!this.description || this.description.length < 10) {
      throw new InvalidDataError('Descrição deve ter pelo menos 10 caracteres');
    }

    if (this.price <= 0) {
      throw new InvalidDataError('Preço deve ser maior que zero');
    }

    if (this.stock < 0) {
      throw new InvalidDataError('Estoque não pode ser negativo');
    }
  }
}
```

### 5. Criar Casos de Uso (Application)

```typescript
// src/modules/product/application/usecases/CreateProduct.usecase.ts
import { injectable, inject } from 'tsyringe';
import type { IProductRepository } from '../../domain/repositories/IProduct.repository';
import type { ProductEntity } from '../../domain/entities/Product.entity';
import { ProductAlreadyExistsError } from '../../domain/errors/ProductAlreadyExists.error';
import { CreateProductDto } from '../dtos/CreateProduct.dto';

@injectable()
export class CreateProductUseCase {
  constructor(
    @inject('ProductRepository')
    private productRepository: IProductRepository
  ) {}

  async execute(data: CreateProductDto): Promise<ProductEntity> {
    // Validar DTO
    const dto = new CreateProductDto(data);

    // Verificar se produto já existe
    const existingProduct = await this.productRepository.findByName(dto.name);
    if (existingProduct) {
      throw new ProductAlreadyExistsError();
    }

    // Criar produto
    const product = await this.productRepository.create({
      name: dto.name,
      description: dto.description,
      price: dto.price,
      stock: dto.stock,
      isActive: true,
    });

    return product;
  }
}
```

### 6. Implementar Repositório (Infrastructure)

```typescript
// src/modules/product/infrastructure/repositories/Product.repository.ts
import { injectable } from 'tsyringe';
import { prisma } from '../../../../lib/prisma';
import type { IProductRepository } from '../../domain/repositories/IProduct.repository';
import type { ProductEntity } from '../../domain/entities/Product.entity';

@injectable()
export class ProductRepository implements IProductRepository {
  async findById(id: string): Promise<ProductEntity | null> {
    return await prisma.product.findUnique({
      where: { id },
    });
  }

  async findByName(name: string): Promise<ProductEntity | null> {
    return await prisma.product.findFirst({
      where: { name },
    });
  }

  async findAll(): Promise<ProductEntity[]> {
    return await prisma.product.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(data: Omit<ProductEntity, 'id' | 'createdAt' | 'updatedAt'>): Promise<ProductEntity> {
    return await prisma.product.create({
      data,
    });
  }

  async update(id: string, data: Partial<ProductEntity>): Promise<ProductEntity> {
    return await prisma.product.update({
      where: { id },
      data,
    });
  }

  async delete(id: string): Promise<void> {
    await prisma.product.delete({
      where: { id },
    });
  }
}
```

### 7. Criar Controller (Presentation)

```typescript
// src/modules/product/presentation/controllers/product.controller.ts
import { injectable, inject } from 'tsyringe';
import type { Request, Response, RequestHandler } from 'express';
import { CreateProductUseCase } from '../../application/usecases/CreateProduct.usecase';
import { ProductNotFoundError } from '../../domain/errors/ProductNotFound.error';
import { ProductAlreadyExistsError } from '../../domain/errors/ProductAlreadyExists.error';
import { InvalidDataError } from '../../domain/errors/InvalidData.error';

@injectable()
export class ProductController {
  constructor(
    @inject('CreateProductUseCase')
    private createProductUseCase: CreateProductUseCase
  ) {}

  create: RequestHandler = async (req: Request, res: Response): Promise<void> => {
    try {
      const product = await this.createProductUseCase.execute(req.body);
      res.status(201).json(product);
    } catch (error) {
      console.error('Erro ao criar produto:', error);

      if (error instanceof InvalidDataError) {
        res.status(400).json({ message: error.message });
        return;
      }

      if (error instanceof ProductAlreadyExistsError) {
        res.status(400).json({ message: error.message });
        return;
      }

      res.status(500).json({ message: 'Erro interno do servidor' });
    }
  };
}
```

### 8. Criar Rotas (Presentation)

```typescript
// src/modules/product/presentation/routes/product.routes.ts
import { Router } from 'express';
import { productController } from '../../../../shared/container/controllers';
import { authMiddleware } from '../../../../shared/middlewares/auth.middleware';

const productRouter = Router();

// Rotas públicas
productRouter.get('/', productController.getAll);
productRouter.get('/:id', productController.getById);

// Rotas protegidas
productRouter.post('/', authMiddleware, productController.create);
productRouter.put('/:id', authMiddleware, productController.update);
productRouter.delete('/:id', authMiddleware, productController.delete);

export { productRouter };
```

### 9. Registrar no Container (Shared)

```typescript
// src/shared/container/container.ts
import { container } from 'tsyringe';

// Product
import { ProductRepository } from '../../modules/product/infrastructure/repositories/Product.repository';
import { CreateProductUseCase } from '../../modules/product/application/usecases/CreateProduct.usecase';

// Registrar repositórios
container.register('ProductRepository', {
  useClass: ProductRepository,
});

// Registrar casos de uso
container.register('CreateProductUseCase', {
  useClass: CreateProductUseCase,
});
```

### 10. Exportar Controller (Shared)

```typescript
// src/shared/container/controllers.ts
import { container } from 'tsyringe';
import { ProductController } from '../../modules/product/presentation/controllers/product.controller';

export const productController = container.resolve(ProductController);
```

### 11. Registrar Rotas (App)

```typescript
// src/app.ts
import { productRouter } from './modules/product/presentation/routes/product.routes';

app.use('/product', productRouter);
```

### 12. Atualizar Schema do Prisma

```prisma
// prisma/schema.prisma
model Product {
  id          String   @id @default(uuid())
  name        String   @unique
  description String
  price       Float
  stock       Int
  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}
```

### 13. Executar Migration

```bash
cd backend
npm run db-update
```

### 14. Criar Testes

```typescript
// src/modules/product/application/usecases/CreateProduct.usecase.spec.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CreateProductUseCase } from './CreateProduct.usecase';
import { ProductAlreadyExistsError } from '../../domain/errors/ProductAlreadyExists.error';

describe('CreateProductUseCase', () => {
  let createProductUseCase: CreateProductUseCase;
  let mockProductRepository: any;

  beforeEach(() => {
    mockProductRepository = {
      findByName: vi.fn(),
      create: vi.fn(),
    };

    createProductUseCase = new CreateProductUseCase(mockProductRepository);
  });

  it('deve criar um produto com sucesso', async () => {
    const productData = {
      name: 'Produto Teste',
      description: 'Descrição do produto teste',
      price: 99.99,
      stock: 10,
    };

    mockProductRepository.findByName.mockResolvedValue(null);
    mockProductRepository.create.mockResolvedValue({
      id: '1',
      ...productData,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const result = await createProductUseCase.execute(productData);

    expect(result).toBeDefined();
    expect(result.name).toBe(productData.name);
    expect(mockProductRepository.create).toHaveBeenCalled();
  });

  it('deve lançar erro se produto já existe', async () => {
    const productData = {
      name: 'Produto Existente',
      description: 'Descrição',
      price: 99.99,
      stock: 10,
    };

    mockProductRepository.findByName.mockResolvedValue({ id: '1' });

    await expect(createProductUseCase.execute(productData)).rejects.toThrow(
      ProductAlreadyExistsError
    );
  });
});
```

## Checklist de Criação de Módulo

- [ ] Entidade criada em `domain/entities/`
- [ ] Erros customizados em `domain/errors/`
- [ ] Interface do repositório em `domain/repositories/`
- [ ] DTOs criados em `application/dtos/`
- [ ] Casos de uso em `application/usecases/`
- [ ] Repositório implementado em `infrastructure/repositories/`
- [ ] Controller criado em `presentation/controllers/`
- [ ] Rotas criadas em `presentation/routes/`
- [ ] Dependências registradas no container
- [ ] Controller exportado em `controllers.ts`
- [ ] Rotas registradas no `app.ts`
- [ ] Schema do Prisma atualizado
- [ ] Migration executada
- [ ] Testes criados
- [ ] Documentação atualizada

## Recursos

- Consulte `MODULE_TEMPLATE.md` para template completo
- Consulte módulos existentes (user, auth) como referência
- Consulte `TESTING.md` para guia de testes
