'use client';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import Loading from './Loading';

interface ProtectedPageProps {
    children: React.ReactNode;
    allowedRoles?: string | string[];
    redirectPath?: string;
}

export const ProtectedPage = ({
    children,
    allowedRoles,
    redirectPath = '/',
}: ProtectedPageProps) => {
    const { user, loading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!loading && user) {
            if (allowedRoles !== undefined) {
                const rolesArray = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];

                if (!user.role || !rolesArray.includes(user.role)) {
                    router.push(redirectPath);
                    return;
                }
            }
        } else if (!loading && !user) {
            router.push('/');
        }
    }, [user, loading, router, allowedRoles, redirectPath]);

    if (loading) {
        return <Loading />;
    }

    if (!user) {
        return null;
    }

    if (allowedRoles !== undefined) {
        const rolesArray = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
        if (!user.role || !rolesArray.includes(user.role)) {
            return null;
        }
    }

    return <>{children}</>;
};
