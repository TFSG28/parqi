import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from './Button';

describe('Button Component', () => {
  it('deve renderizar o botão com texto', () => {
    render(<Button>Clique aqui</Button>);
    
    const button = screen.getByText('Clique aqui');
    expect(button).toBeInTheDocument();
  });

  it('deve chamar onClick quando clicado', () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Clique aqui</Button>);
    
    const button = screen.getByText('Clique aqui');
    fireEvent.click(button);
    
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('deve estar desabilitado quando disabled é true', () => {
    render(<Button disabled>Clique aqui</Button>);
    
    const button = screen.getByText('Clique aqui');
    expect(button).toBeDisabled();
  });

  it('deve mostrar texto de carregamento quando isLoading é true', () => {
    render(<Button isLoading>Clique aqui</Button>);
    
    expect(screen.getByText('Carregando...')).toBeInTheDocument();
  });

  it('não deve chamar onClick quando desabilitado', () => {
    const handleClick = vi.fn();
    render(
      <Button onClick={handleClick} disabled>
        Clique aqui
      </Button>
    );
    
    const button = screen.getByText('Clique aqui');
    fireEvent.click(button);
    
    expect(handleClick).not.toHaveBeenCalled();
  });

  it('deve aplicar variante primary por padrão', () => {
    render(<Button>Clique aqui</Button>);
    
    const button = screen.getByText('Clique aqui');
    expect(button).toHaveClass('bg-accent');
  });

  it('deve aplicar variante secondary quando especificado', () => {
    render(<Button variant="secondary">Clique aqui</Button>);
    
    const button = screen.getByText('Clique aqui');
    expect(button).toHaveClass('bg-mist');
  });

  it('deve aplicar tamanho medium por padrão', () => {
    render(<Button>Clique aqui</Button>);
    
    const button = screen.getByText('Clique aqui');
    expect(button).toHaveClass('px-4', 'py-2');
  });

  it('deve aplicar tamanho small quando especificado', () => {
    render(<Button size="small">Clique aqui</Button>);
    
    const button = screen.getByText('Clique aqui');
    expect(button).toHaveClass('px-3', 'py-1');
  });

  it('deve renderizar como link quando href é fornecido', () => {
    render(<Button href="/test">Clique aqui</Button>);
    
    const link = screen.getByText('Clique aqui');
    expect(link.tagName).toBe('A');
    expect(link).toHaveAttribute('href', '/test');
  });

  it('deve aplicar className customizado', () => {
    render(<Button className="custom-class">Clique aqui</Button>);
    
    const button = screen.getByText('Clique aqui');
    expect(button).toHaveClass('custom-class');
  });
});
