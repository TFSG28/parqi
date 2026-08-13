'use client';

import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { isValidEmail } from '@/validators';
import { Button } from '@/components/ui/Button';
import TextInput from '@/components/ui/TextInput';

interface LoginFormProps {
    /** Called after a successful login (e.g. to redirect). */
    onSuccess?: () => void;
    /** Extra classes for the form wrapper. */
    className?: string;
}

interface FieldErrors {
    email?: string;
    password?: string;
}

/**
 * Reusable, self-contained login form.
 *
 * Owns its own field state and validation, delegates the actual auth to
 * AuthContext (`login`). Navigation is left to the parent via `onSuccess`, so
 * the form stays decoupled from any specific route.
 *
 *   <LoginForm onSuccess={() => router.push('/dashboard')} />
 */
export function LoginForm({ onSuccess, className = '' }: Readonly<LoginFormProps>) {
    const { login } = useAuth();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
    const [formError, setFormError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    // Client-side checks. Mirrors the backend LoginSchema (valid email +
    // non-empty password); strength rules belong to registration, not login.
    function validate(): boolean {
        const errors: FieldErrors = {};
        if (!isValidEmail(email)) errors.email = 'Email inválido';
        if (!password) errors.password = 'A palavra-passe é obrigatória';
        setFieldErrors(errors);
        return Object.keys(errors).length === 0;
    }

    async function submit() {
        setFormError(null);

        if (!validate()) return;

        setLoading(true);
        try {
            await login(email.trim(), password);
            onSuccess?.();
        } catch (error) {
            setFormError(error instanceof Error ? error.message : 'Não foi possível iniciar sessão.');
        } finally {
            setLoading(false);
        }
    }

    return (
        <form
            onSubmit={(e) => {
                e.preventDefault();
                void submit();
            }}
            className={`flex flex-col gap-4 w-full ${className}`.trim()}
            noValidate
        >
            <TextInput
                label="Email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                error={fieldErrors.email}
                disabled={loading}
            />

            <TextInput
                label="Palavra-passe"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                error={fieldErrors.password}
                disabled={loading}
            />

            {formError && (
                <p role="alert" className="text-sm text-danger">
                    {formError}
                </p>
            )}

            <Button type="submit" isLoading={loading} className="w-full mt-2">
                Entrar
            </Button>
        </form>
    );
}
