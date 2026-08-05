---
inclusion: manual
---

# Desenvolvimento Frontend

Guia para desenvolvimento de componentes e páginas no frontend Next.js.

## Estrutura de Componentes

### Componentes UI (Reutilizáveis)

Localizados em `src/components/ui/`:
- Button, Input, Modal, Select, Textarea
- Card, Badge, Tooltip
- Loading, ErrorMessage

### Componentes de Feature

Localizados em `src/components/features/`:
- ThemeToggle, ProtectedPage
- Componentes específicos de funcionalidades

## Criando um Componente UI

```tsx
// src/components/ui/Button.tsx
import Link from 'next/link';

interface ButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  isLoading?: boolean;
  type?: 'button' | 'submit' | 'reset';
  className?: string;
  href?: string;
}

export function Button({
  children,
  onClick,
  variant = 'primary',
  size = 'medium',
  disabled = false,
  isLoading = false,
  type = 'button',
  className = '',
  href,
}: ButtonProps) {
  const baseStyles = 'rounded-lg font-medium transition-colors';
  
  const variantStyles = {
    primary: 'bg-verde text-white hover:bg-verde/90',
    secondary: 'bg-gray-200 text-gray-800 hover:bg-gray-300',
    danger: 'bg-red-500 text-white hover:bg-red-600',
  };
  
  const sizeStyles = {
    small: 'px-3 py-1 text-sm',
    medium: 'px-4 py-2',
    large: 'px-6 py-3 text-lg',
  };

  const classes = `${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${className}`;

  if (href) {
    return (
      <Link href={href} className={classes}>
        {children}
      </Link>
    );
  }

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || isLoading}
      className={classes}
    >
      {isLoading ? 'Carregando...' : children}
    </button>
  );
}
```

## Criando uma Página

```tsx
// src/app/products/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useApi } from '@/hooks/useApi';
import { Button } from '@/components/ui/Button';
import { Loading } from '@/components/ui/Loading';
import { ErrorMessage } from '@/components/ui/ErrorMessage';

export default function ProductsPage() {
  const { data, loading, error, execute } = useApi();

  useEffect(() => {
    execute('get', '/api/products');
  }, []);

  if (loading) return <Loading />;
  if (error) return <ErrorMessage message={error} />;

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Produtos</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {data?.map((product) => (
          <div key={product.id} className="bg-white rounded-lg shadow p-4">
            <h2 className="text-xl font-semibold">{product.name}</h2>
            <p className="text-gray-600">{product.description}</p>
            <p className="text-verde font-bold mt-2">R$ {product.price}</p>
            <Button className="mt-4" href={`/products/${product.id}`}>
              Ver Detalhes
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
```

## Usando Hooks Customizados

### useApi Hook

```tsx
import { useApi } from '@/hooks/useApi';

function MyComponent() {
  const { data, loading, error, execute } = useApi();

  const handleSubmit = async (formData) => {
    await execute('post', '/api/products', formData);
  };

  return (
    // JSX
  );
}
```

### useAuth Hook

```tsx
import { useAuth } from '@/contexts/AuthContext';

function MyComponent() {
  const { user, isAuthenticated, login, logout } = useAuth();

  if (!isAuthenticated) {
    return <div>Faça login para continuar</div>;
  }

  return <div>Olá, {user.name}!</div>;
}
```

## Formulários com React Hook Form

```tsx
'use client';

import { useForm } from 'react-hook-form';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useApi } from '@/hooks/useApi';

interface FormData {
  name: string;
  email: string;
  password: string;
}

export default function RegisterPage() {
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>();
  const { execute, loading } = useApi();

  const onSubmit = async (data: FormData) => {
    await execute('post', '/api/auth/register', data);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="max-w-md mx-auto p-6">
      <Input
        label="Nome"
        {...register('name', { required: 'Nome é obrigatório' })}
        error={errors.name?.message}
      />
      
      <Input
        label="Email"
        type="email"
        {...register('email', { required: 'Email é obrigatório' })}
        error={errors.email?.message}
      />
      
      <Input
        label="Senha"
        type="password"
        {...register('password', { required: 'Senha é obrigatória' })}
        error={errors.password?.message}
      />
      
      <Button type="submit" isLoading={loading} className="w-full mt-4">
        Cadastrar
      </Button>
    </form>
  );
}
```

## Estilização com Tailwind

### Cores do Tema

```tsx
// Use as cores definidas no tailwind.config.ts
<div className="bg-verde text-white">Verde</div>
<div className="bg-azul text-white">Azul</div>
```

### Responsividade

```tsx
<div className="
  grid 
  grid-cols-1 
  md:grid-cols-2 
  lg:grid-cols-3 
  gap-4
">
  {/* Conteúdo */}
</div>
```

### Modal com Backdrop Blur

```tsx
<div className="fixed inset-0 bg-white/30 backdrop-blur-md flex items-center justify-center">
  <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full">
    <h2 className="text-2xl font-bold mb-4">Título do Modal</h2>
    <p>Conteúdo do modal</p>
  </div>
</div>
```

## Recursos

- Consulte componentes existentes em `src/components/`
- Consulte hooks em `src/hooks/`
- Consulte contextos em `src/contexts/`
