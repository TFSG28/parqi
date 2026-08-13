import Link from "next/link";

export default function NotFound() {
    return (
        <main className="flex min-h-screen flex-col items-center justify-center gap-6 px-6 text-center">
            <span className="inline-flex h-20 w-20 items-center justify-center rounded-[22%] bg-brand font-display text-5xl font-bold text-white" aria-hidden>
                ?
            </span>
            <h1 className="font-display text-3xl font-bold">Página não encontrada</h1>
            <Link href="/" className="text-brand underline underline-offset-4 hover:opacity-80">
                Voltar ao início
            </Link>
        </main>
    );
}
