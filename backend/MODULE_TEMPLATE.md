# Module Template

Use this as a reference when creating new modules.

## File Structure

```
modules/[feature]/
├── application/
│   ├── dtos/
│   │   └── Create[Feature].dto.ts
│   └── usecases/
│       └── Create[Feature].usecase.ts
├── domain/
│   ├── entities/
│   │   └── [Feature].entity.ts
│   ├── errors/
│   │   ├── [Feature]NotFound.error.ts
│   │   └── [Feature]AlreadyExists.error.ts
│   └── repositories/
│       └── I[Feature].repository.ts
├── infrastructure/
│   └── repositories/
│       └── [Feature].repository.ts
└── presentation/
    ├── controllers/
    │   └── [feature].controller.ts
    └── routes/
        └── [feature].routes.ts
```

## 1. Domain Layer

### Entity (domain/entities/[Feature].entity.ts)
```typescript
export class FeatureEntity {
    constructor(
        public readonly id: string,
        public readonly name: string,
        public readonly createdAt: Date,
        public readonly updatedAt: Date
    ) {}
}
```

### Repository Interface (domain/repositories/I[Feature].repository.ts)
```typescript
import { FeatureEntity } from '../entities/Feature.entity';

export interface IFeatureRepository {
    findById(id: string): Promise<FeatureEntity | null>;
    create(data: CreateData): Promise<FeatureEntity>;
    update(id: string, data: UpdateData): Promise<FeatureEntity>;
    delete(id: string): Promise<void>;
}
```

### Errors (domain/errors/)
```typescript
export class FeatureNotFoundError extends Error {
    constructor(message = 'Feature não encontrado') {
        super(message);
        this.name = 'FeatureNotFoundError';
    }
}
```

## 2. Application Layer

### DTO (application/dtos/Create[Feature].dto.ts)
```typescript
export interface CreateFeatureDTO {
    name: string;
}
```

### Use Case (application/usecases/Create[Feature].usecase.ts)
```typescript
import { inject, injectable } from 'tsyringe';
import { FEATURE_TOKENS } from '../../../../shared/container/tokens/feature.tokens';
import { IFeatureRepository } from '../../domain/repositories/IFeature.repository';
import { CreateFeatureDTO } from '../dtos/CreateFeature.dto';

@injectable()
export class CreateFeatureUseCase {
    constructor(
        @inject(FEATURE_TOKENS.IFeatureRepository)
        private featureRepository: IFeatureRepository
    ) {}

    async execute(data: CreateFeatureDTO) {
        const feature = await this.featureRepository.create(data);
        return feature;
    }
}
```

## 3. Infrastructure Layer

### Repository (infrastructure/repositories/[Feature].repository.ts)
```typescript
import { injectable } from 'tsyringe';
import { prisma } from '../../../../lib/prisma';
import { IFeatureRepository } from '../../domain/repositories/IFeature.repository';
import { FeatureEntity } from '../../domain/entities/Feature.entity';

@injectable()
export class FeatureRepository implements IFeatureRepository {
    async findById(id: string): Promise<FeatureEntity | null> {
        const feature = await prisma.feature.findUnique({ where: { id } });
        if (!feature) return null;
        return new FeatureEntity(feature.id, feature.name, feature.createdAt, feature.updatedAt);
    }

    async create(data: CreateData): Promise<FeatureEntity> {
        const feature = await prisma.feature.create({ data });
        return new FeatureEntity(feature.id, feature.name, feature.createdAt, feature.updatedAt);
    }
}
```

## 4. Presentation Layer

### Controller (presentation/controllers/[feature].controller.ts)
```typescript
import { RequestHandler, Response } from 'express';
import { injectable, inject } from 'tsyringe';
import { FEATURE_TOKENS } from '../../../../shared/container/tokens/feature.tokens';
import { CreateFeatureUseCase } from '../../application/usecases/CreateFeature.usecase';

@injectable()
export class FeatureController {
    constructor(
        @inject(FEATURE_TOKENS.CreateFeatureUseCase) private readonly createFeatureUseCase: CreateFeatureUseCase
    ) {}

    create: RequestHandler = async (req, res): Promise<void> => {
        try {
            const result = await this.createFeatureUseCase.execute(req.body);
            res.status(201).json(result);
        } catch (error) {
            this.handleError(error, res);
        }
    };

    private handleError(error: unknown, res: Response): void {
        console.error('Error:', error);
        res.status(500).json({ message: 'Erro interno' });
    }
}
```

### Routes (presentation/routes/[feature].routes.ts)
```typescript
import { Router } from 'express';
import { featureController } from '../../../../shared/container/controllers';

const router = Router();

router.post('/', featureController.create);

export default router;
```

## 5. Register in Container

The container is split per module: each module owns a `tokens/*.tokens.ts` file
and a `modules/*.container.ts` setup function. `container.ts` is the composition
root that calls every setup function.

### Add Tokens (shared/container/tokens/feature.tokens.ts)
```typescript
export const FEATURE_TOKENS = {
    IFeatureRepository: Symbol.for('IFeatureRepository'),
    CreateFeatureUseCase: Symbol.for('CreateFeatureUseCase'),
    FeatureController: Symbol.for('FeatureController'),
} as const;
```

Re-export it from `shared/container/tokens/index.ts`:
```typescript
export { FEATURE_TOKENS } from './feature.tokens';
```

### Register (shared/container/modules/feature.container.ts)
```typescript
import { container } from 'tsyringe';
import { FEATURE_TOKENS } from '../tokens/feature.tokens';
import { FeatureRepository } from '../../../modules/feature/infrastructure/repositories/Feature.repository';
import { CreateFeatureUseCase } from '../../../modules/feature/application/usecases/CreateFeature.usecase';
import { FeatureController } from '../../../modules/feature/presentation/controllers/feature.controller';

export function setupFeatureContainer() {
    container.registerSingleton(FEATURE_TOKENS.IFeatureRepository, FeatureRepository);
    container.register(FEATURE_TOKENS.CreateFeatureUseCase, CreateFeatureUseCase);
    container.register(FEATURE_TOKENS.FeatureController, FeatureController);
}
```

### Wire into the composition root (shared/container/container.ts)
```typescript
import { setupFeatureContainer } from './modules/feature.container';

export function setupContainer() {
    // ...existing modules
    setupFeatureContainer();
}
```

### Export Controller (shared/container/controllers.ts)
```typescript
import { FEATURE_TOKENS } from './tokens/feature.tokens';
import { FeatureController } from '../../modules/feature/presentation/controllers/feature.controller';

export const featureController = container.resolve<FeatureController>(FEATURE_TOKENS.FeatureController);
```

## 6. Register Routes (shared/routes/index.ts)
```typescript
import featureRoutes from '../../modules/feature/presentation/routes/feature.routes';

router.use('/feature', featureRoutes);
```

## Key Points

1. **Controllers are now injectable** - Use `@injectable()` decorator
2. **Controllers use RequestHandler** - Methods are typed as `RequestHandler`
3. **Controllers are registered in DI** - Added to container and exported via facade
4. **Routes import from controllers.ts** - Not instantiated directly
5. **Use constructor injection** - All dependencies injected via constructor
6. **Private error handling** - Each controller has its own `handleError` method

