import Image from "next/image";
import Link from "next/link";
import ScrollReveal from "@/components/feature/ScrollReveal";
import ThemeToggle from "@/components/feature/ThemeToggle";

/* Ecrãs reais da app, dentro de molduras de telemóvel. */
const PHONE_SCREENS = [
  {
    src: "/app/mapa-dark.jpg",
    alt: "App Parqi: mapa em tema escuro com estacionamentos por perto",
    caption: "Mapa em tema escuro",
    width: 1080,
    height: 2400,
  },
  {
    src: "/app/mapa-light.jpg",
    alt: "App Parqi: mapa em tema claro com estacionamentos por perto",
    caption: "Mapa em tema claro",
    width: 1080,
    height: 2400,
  },
  {
    src: "/app/pesquisa-light.jpg",
    alt: "App Parqi: lista de estacionamentos com confiança da comunidade",
    caption: "Pesquisa com confiança da comunidade",
    width: 1080,
    height: 2400,
  },
  {
    src: "/app/pesquisa-dark.jpg",
    alt: "App Parqi: lista de estacionamentos em tema escuro",
    caption: "Pesquisa em tema escuro",
    width: 1080,
    height: 2400,
  },
];

function PhoneFrame({
  src,
  alt,
  width,
  height,
  priority = false,
}: Readonly<{ src: string; alt: string; width: number; height: number; priority?: boolean }>) {
  return (
    <div className="rounded-[38px] bg-[#101114] p-1.25 shadow-[0_18px_36px_-14px_rgba(0,0,0,0.45)]">
      <div className="overflow-hidden rounded-[33px]">
        <Image
          src={src}
          alt={alt}
          width={width}
          height={height}
          sizes="260px"
          className="h-auto w-full"
          priority={priority}
        />
      </div>
    </div>
  );
}

const PILLARS = [
  {
    glyph: "P",
    accent: false,
    title: "Dados abertos, já no mapa",
    text: "Os parques das câmaras municipais e do OpenStreetMap entram no Parqi para todos os concelhos de Portugal.",
  },
  {
    glyph: "+",
    accent: true,
    title: "A comunidade acrescenta o resto",
    text: "Qualquer condutor pode adicionar um lugar: nome, tipo, lotação e a posição exata, num ponto ou numa área desenhada no mapa.",
  },
  {
    glyph: "✓",
    accent: false,
    title: "Confiança que se vê",
    text: "Cada lugar mostra uma pontuação de confiança alimentada por confirmações da comunidade, e as contribuições passam por validação antes de aparecer no mapa.",
  },
];

const FAQ_ITEMS = [
  {
    q: "Como funciona a confiança (0–10)?",
    a: "Cada voto ajusta a pontuação: +1,5 por confirmação e −2 por reporte. A partir de 5 o lugar fica Verificado; abaixo de 3 entra em revisão.",
  },
  {
    q: "Como funciona o peso dos votos?",
    a: "Contas novas e utilizadores sem confiança votam com peso 0,5. A partir da reputação 5 (Confiável) passas a votar com peso total.",
  },
  {
    q: "Posso alterar ou anular o meu voto?",
    a: "Sim. Na app, toca outra vez no teu voto para o anular, ou vota no sentido contrário para o mudar. A confiança é recalculada de imediato.",
  },
  {
    q: "Quem pode adicionar estacionamentos?",
    a: "Qualquer pessoa com conta e email validado. Contribuições de contas novas entram na fila de moderação antes de aparecerem no mapa.",
  },
  {
    q: "De onde vêm os dados oficiais?",
    a: "Importamos dados públicos da OpenStreetMap, Geoapify e câmaras municipais. Esses lugares têm confiança base mais alta que os da comunidade.",
  },
  {
    q: "Como elimino a minha conta?",
    a: "Na app, em Perfil → Eliminar conta, com confirmação por palavra-passe. As contribuições já validadas ficam no mapa, anonimizadas.",
  },
];

function ParkingSign({ className, inverted }: Readonly<{ className?: string; inverted?: boolean }>) {
  return (
    <span
      className={`inline-flex select-none items-center justify-center rounded-[22%] font-display font-bold ${inverted ? "bg-white text-brand" : "bg-brand text-white"
        } ${className ?? ""}`}
      aria-hidden
    >
      P
    </span>
  );
}

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'Parqi',
  applicationCategory: 'TravelApplication',
  operatingSystem: 'Android, iOS',
  description:
    'App comunitária gratuita para encontrar estacionamento em Portugal. Dados públicos + comunidade.',
  offers: {
    '@type': 'Offer',
    price: '0',
    priceCurrency: 'EUR',
  },
};

export default function Home() {
  return (
    <main>
      {/* JSON-LD Structured Data para SEO */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Herói: a página abre como um sinal de estacionamento */}
      <section className="bg-brand-deep text-white">
        <div className="mx-auto max-w-5xl px-6">
          <header className="flex items-center gap-3 py-8">
            <Image
              src="/icon.png"
              alt="Parqi"
              width={36}
              height={36}
              className="h-9 w-9 rounded-[22%]"
              priority
            />
            <span className="font-display text-2xl font-bold tracking-tight">Parqi</span>
            <div className="ml-auto">
              <ThemeToggle />
            </div>
          </header>

          <div className="grid items-center gap-14 pt-[clamp(1.5rem,6vh,4rem)] pb-[clamp(4rem,10vh,7rem)] md:grid-cols-[3fr_2fr]">
            <div>
              <h1 className="rise font-display text-[clamp(3rem,9vw,5.5rem)] leading-[0.98] font-extrabold tracking-tight">
                Estacionar
                <br />
                sem dar voltas.
              </h1>
              <p className="rise rise-2 mt-8 max-w-[36ch] text-lg leading-relaxed text-on-brand">
                O Parqi junta dados públicos e uma comunidade de condutores para
                te mostrar onde estacionar em Portugal.
              </p>
              <p className="rise rise-3 mt-10 flex flex-wrap items-center gap-3 text-sm">
                <span className="text-on-brand">Brevemente na</span>
                <span className="store-badge rounded-full border border-accent/80 px-4 py-1.5 font-semibold">
                  App Store
                </span>
                <span className="store-badge rounded-full border border-accent/80 px-4 py-1.5 font-semibold">
                  Google Play
                </span>
              </p>
            </div>
            <div className="rise rise-3 relative mx-auto h-110 w-75 sm:h-127.5 sm:w-85">
              {/* Telemóvel de trás: mapa claro, rodado */}
              <div className="absolute left-0 top-10 w-[52%] -rotate-6 opacity-95">
                <PhoneFrame {...PHONE_SCREENS[1]} />
              </div>
              {/* Telemóvel da frente: mapa escuro */}
              <div className="absolute right-0 top-0 w-[62%] rotate-2">
                <PhoneFrame {...PHONE_SCREENS[0]} priority />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Como funciona */}
      <section className="mx-auto max-w-3xl px-6 pt-[clamp(3.5rem,9vh,6rem)] pb-[clamp(4rem,10vh,7rem)]">
        <ScrollReveal>
          <h2 className="sr-solo font-display text-4xl font-bold tracking-tight">Como funciona</h2>
        </ScrollReveal>

        <ScrollReveal className="mt-14 space-y-14">
          {PILLARS.map((pillar) => (
            <article key={pillar.title} className="sr-item grid grid-cols-[auto_1fr] gap-x-6">
              <span
                className={`inline-flex h-12 w-12 select-none items-center justify-center rounded-[22%] font-display text-2xl font-bold ${pillar.accent ? "bg-accent text-on-accent" : "bg-brand text-white"
                  }`}
                aria-hidden
              >
                {pillar.glyph}
              </span>
              <div className="pt-1">
                <h3 className="font-display text-2xl font-bold">{pillar.title}</h3>
                <p className="mt-2 max-w-[52ch] leading-relaxed text-ink-soft">{pillar.text}</p>
              </div>
            </article>
          ))}
        </ScrollReveal>

        <ScrollReveal threshold={0.3}>
          <div className="road-line sr-solo mt-[clamp(3.5rem,9vh,6rem)]" />
        </ScrollReveal>

        <ScrollReveal threshold={0.3}>
          <p className="sr-solo mt-10 max-w-[52ch] text-lg leading-relaxed text-ink-soft">
            A app é grátis e feita para a comunidade.
          </p>
        </ScrollReveal>
      </section>

      {/* A app — molduras de telemóvel com ecrãs reais */}
      <section className="mx-auto max-w-5xl px-6 pb-[clamp(4rem,10vh,7rem)]">
        <ScrollReveal>
          <h2 className="sr-solo font-display text-4xl font-bold tracking-tight">A app</h2>
        </ScrollReveal>

        <ScrollReveal className="mt-12 flex flex-wrap justify-center gap-8">
          {PHONE_SCREENS.map((screen, i) => (
            <figure
              key={screen.src}
              className="sr-item w-55"
              style={{ transitionDelay: `${i * 90}ms` }}
            >
              <div className="rounded-[38px] bg-[#101114] p-1.25 shadow-[0_18px_36px_-14px_rgba(0,0,0,0.35)]">
                <div className="overflow-hidden rounded-[33px]">
                  <Image
                    src={screen.src}
                    alt={screen.alt}
                    width={screen.width}
                    height={screen.height}
                    sizes="220px"
                    className="h-auto w-full"
                  />
                </div>
              </div>
              <figcaption className="mt-4 text-center text-sm text-ink-soft">
                {screen.caption}
              </figcaption>
            </figure>
          ))}
        </ScrollReveal>
      </section>

      {/* Perguntas frequentes — disclosure nativa (<details>), funciona sem JS */}
      <section className="mx-auto max-w-3xl px-6 pb-[clamp(4rem,10vh,7rem)]">
        <ScrollReveal>
          <h2 className="sr-solo font-display text-4xl font-bold tracking-tight">Perguntas frequentes</h2>
        </ScrollReveal>

        <ScrollReveal className="mt-10 space-y-3">
          {FAQ_ITEMS.map((item) => (
            <details
              key={item.q}
              className="sr-item group rounded-xl border border-border bg-surface px-5 py-4"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-base font-semibold text-ink [&::-webkit-details-marker]:hidden">
                {item.q}
                <span
                  aria-hidden
                  className="text-xl leading-none text-brand transition-transform duration-200 motion-reduce:transition-none group-open:rotate-45"
                >
                  +
                </span>
              </summary>
              <p className="mt-3 max-w-[62ch] leading-relaxed text-ink-soft">{item.a}</p>
            </details>
          ))}
        </ScrollReveal>
      </section>

      {/* Rodapé: fecho em azul, como o herói */}
      <footer className="bg-brand-deep text-white">
        <ScrollReveal threshold={0.2}>
          <div className="sr-solo mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-6 px-6 py-12">
            <span className="flex items-center gap-3">
              <ParkingSign inverted className="h-6 w-6 text-sm" />
              <span className="font-medium">© {new Date().getFullYear()} Parqi</span>
            </span>
            <nav className="flex flex-wrap gap-x-6 gap-y-2">
              <Link
                href="/termos"
                className="text-on-brand underline underline-offset-4 transition-colors hover:text-white"
              >
                Termos e Condições
              </Link>
              <Link
                href="/privacidade"
                className="text-on-brand underline underline-offset-4 transition-colors hover:text-white"
              >
                Privacidade
              </Link>
              <a
                href="mailto:geral@parqi.pt"
                className="text-on-brand underline underline-offset-4 transition-colors hover:text-white"
              >
                geral@parqi.pt
              </a>
            </nav>
          </div>
        </ScrollReveal>
      </footer>
    </main>
  );
}
