import Image from "next/image";
import Link from "next/link";
import ThemeToggle from "./ThemeToggle";

/* Moldura das páginas legais: header e rodapé simples, miolo em prosa legível. */
export default function LegalPage({
    title,
    updated,
    children,
}: Readonly<{ title: string; updated: string; children: React.ReactNode }>) {
    return (
        <main className="flex min-h-screen flex-col">
            <header className="bg-brand-deep text-white">
                <div className="mx-auto flex max-w-3xl items-center gap-3 px-6 py-6">
                    <Link href="/" className="flex items-center gap-3">
                        <Image
                            src="/icon.png"
                            alt="Parqi"
                            width={32}
                            height={32}
                            className="h-8 w-8 rounded-[22%]"
                        />
                        <span className="font-display text-xl font-bold tracking-tight">Parqi</span>
                    </Link>
                    <div className="ml-auto">
                        <ThemeToggle />
                    </div>
                </div>
            </header>

            <article className="mx-auto w-full max-w-3xl flex-1 px-6 pt-[clamp(2.5rem,7vh,4.5rem)] pb-[clamp(3rem,8vh,5rem)]">
                <h1 className="font-display text-4xl font-bold tracking-tight">{title}</h1>
                <p className="mt-3 text-sm text-ink-soft">Última atualização: {updated}</p>
                <div className="legal-prose mt-10">{children}</div>
            </article>

            <footer className="bg-brand-deep text-white">
                <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-4 px-6 py-8 text-sm">
                    <span>© {new Date().getFullYear()} Parqi</span>
                    <nav className="flex flex-wrap gap-x-6 gap-y-2">
                        <Link href="/termos" className="text-on-brand underline underline-offset-4 hover:text-white">
                            Termos e Condições
                        </Link>
                        <Link href="/privacidade" className="text-on-brand underline underline-offset-4 hover:text-white">
                            Privacidade
                        </Link>
                        <a href="mailto:geral@parqi.pt" className="text-on-brand underline underline-offset-4 hover:text-white">
                            geral@parqi.pt
                        </a>
                    </nav>
                </div>
            </footer>
        </main>
    );
}
