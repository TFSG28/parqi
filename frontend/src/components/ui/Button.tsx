'use client';

import Link from 'next/link';
import { ReactNode } from 'react';

type ButtonVariant = 'primary' | 'secondary';
type ButtonSize = 'small' | 'medium';

interface ButtonProps {
    children: ReactNode;
    onClick?: () => void;
    type?: 'submit' | 'reset' | 'button';
    variant?: ButtonVariant;
    size?: ButtonSize;
    disabled?: boolean;
    isLoading?: boolean;
    href?: string;
    className?: string;
}

const variantClasses: Record<ButtonVariant, string> = {
    primary: 'bg-verde text-white hover:bg-verde/80',
    secondary: 'bg-gray-200 text-gray-900 hover:bg-gray-300',
};

const sizeClasses: Record<ButtonSize, string> = {
    small: 'px-3 py-1 text-sm',
    medium: 'px-4 py-2',
};

export function Button({
    children,
    onClick,
    type = 'button',
    variant = 'primary',
    size = 'medium',
    disabled = false,
    isLoading = false,
    href,
    className = '',
}: Readonly<ButtonProps>) {
    const classes = [
        variantClasses[variant],
        sizeClasses[size],
        'rounded-md font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed',
        className,
    ]
        .filter(Boolean)
        .join(' ');

    // Rendered as a link when `href` is set (navigation), otherwise a button.
    if (href) {
        return (
            <Link href={href} className={classes} onClick={onClick}>
                {children}
            </Link>
        );
    }

    return (
        <button
            type={type}
            className={classes}
            onClick={onClick}
            disabled={disabled || isLoading}
        >
            {isLoading ? 'Carregando...' : children}
        </button>
    );
}
