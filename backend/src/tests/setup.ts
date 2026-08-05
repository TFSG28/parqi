// Test setup file
// This runs before all tests

import 'reflect-metadata';
import { afterAll } from 'vitest';
import { setupContainer } from '../shared/container/container';

// Regista as dependências (repositórios, use cases, controllers) ANTES de os
// ficheiros de teste serem importados - as rotas resolvem os controllers do
// container no momento do import.
setupContainer();

afterAll(() => {
  // Cleanup code that runs after all tests
});
