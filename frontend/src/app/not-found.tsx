import Link from 'next/link';

export default function NotFound() {
    return (
        <div className="flex min-h-screen flex-col items-center justify-center">
            <h1 className="text-6xl font-bold mb-4">404</h1>
            <p className="text-xl text-gray-600 mb-8">Página não encontrada</p>
            <Link 
                href="/" 
                className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
                Voltar para início
            </Link>
        </div>
    );
}
