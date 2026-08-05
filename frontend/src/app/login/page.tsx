'use client';

import { useRouter } from 'next/navigation';
import { LoginForm } from '@/components/feature/LoginForm';

export default function LoginPage() {
    const router = useRouter();

    return (
        <main className="flex min-h-screen items-center justify-center p-6">
            <div className="w-full max-w-sm flex flex-col gap-6">
                <div className="text-center">
                    <h1 className="text-2xl font-bold">Entrar</h1>
                    <p className="text-sm text-gray-600">Acede à tua conta</p>
                </div>

                <LoginForm onSuccess={() => router.push('/')} />
            </div>
        </main>
    );
}
