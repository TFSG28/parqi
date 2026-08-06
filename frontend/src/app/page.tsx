import ScrollReveal from "@/components/feature/ScrollReveal";

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

function ParkingSign({ className, inverted }: { className?: string; inverted?: boolean }) {
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

/* Cena de mapa: ruas esquematizadas e um trajeto que termina no sinal P. */
function MapScene({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 320 340"
      role="img"
      aria-label="Mapa esquemático com um trajeto até um lugar de estacionamento"
      className={className}
    >
      {/* quarteirões */}
      <g fill="#ffffff" opacity="0.07">
        <rect x="24" y="30" width="88" height="64" rx="6" />
        <rect x="138" y="18" width="72" height="76" rx="6" />
        <rect x="24" y="122" width="60" height="92" rx="6" />
        <rect x="110" y="122" width="100" height="60" rx="6" />
        <rect x="236" y="96" width="62" height="86" rx="6" />
        <rect x="66" y="242" width="96" height="68" rx="6" />
        <rect x="188" y="210" width="110" height="100" rx="6" />
      </g>
      {/* ruas */}
      <g stroke="#ffffff" strokeOpacity="0.22" strokeWidth="3" strokeLinecap="round">
        <path d="M0 108 H320" />
        <path d="M0 196 H320" />
        <path d="M96 0 V340" />
        <path d="M222 0 V340" />
      </g>
      {/* trajeto */}
      <path
        d="M14 330 H96 V196 H222 V108"
        fill="none"
        stroke="#ff7a00"
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="route-draw"
      />
      {/* destino: sinal P com pulso */}
      <g className="pulse-target">
        <circle r="30" fill="#ff7a00" opacity="0.25" />
        <rect x="-22" y="-22" width="44" height="44" rx="10" fill="#ffffff" />
        <text
          y="12"
          textAnchor="middle"
          fontFamily="var(--font-display)"
          fontWeight="800"
          fontSize="34"
          fill="#3b6bff"
        >
          P
        </text>
      </g>
    </svg>
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
  aggregateRating: {
    '@type': 'AggregateRating',
    ratingValue: '4.5',
    ratingCount: '1',
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
      <section className="bg-brand text-white">
        <div className="mx-auto max-w-5xl px-6">
          <header className="flex items-center gap-3 py-8">
            <ParkingSign inverted className="h-9 w-9 text-xl" />
            <span className="font-display text-2xl font-bold tracking-tight">parqi</span>
          </header>

          <div className="grid items-center gap-14 pt-[clamp(1.5rem,6vh,4rem)] pb-[clamp(4rem,10vh,7rem)] md:grid-cols-[3fr_2fr]">
            <div>
              <h1 className="rise font-display text-[clamp(3rem,9vw,5.5rem)] leading-[0.98] font-extrabold tracking-tight">
                Estacionar
                <br />
                sem dar voltas.
              </h1>
              <p className="rise rise-2 mt-8 max-w-[36ch] text-lg leading-relaxed text-mist">
                O Parqi junta dados públicos e uma comunidade de condutores para
                te mostrar onde estacionar em Portugal, com a rota no Google
                Maps a um toque.
              </p>
              <p className="rise rise-3 mt-10 flex flex-wrap items-center gap-3 text-sm">
                <span className="text-mist">Brevemente em</span>
                <span className="store-badge rounded-full border border-accent/80 px-4 py-1.5 font-semibold">
                  App Store
                </span>
                <span className="store-badge rounded-full border border-accent/80 px-4 py-1.5 font-semibold">
                  Google Play
                </span>
              </p>
            </div>
            <MapScene className="rise rise-3 mx-auto w-full max-w-[320px]" />
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
                className={`inline-flex h-12 w-12 select-none items-center justify-center rounded-[22%] font-display text-2xl font-bold ${pillar.accent ? "bg-accent text-ink" : "bg-brand text-white"
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
            A app é grátis e feita pela comunidade.
          </p>
        </ScrollReveal>
      </section>

      {/* Rodapé: fecho em azul, como o herói */}
      <footer className="bg-brand text-white">
        <ScrollReveal threshold={0.2}>
          <div className="sr-solo mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-6 px-6 py-12">
            <span className="flex items-center gap-3">
              <ParkingSign inverted className="h-6 w-6 text-sm" />
              <span className="font-medium">© {new Date().getFullYear()} Parqi</span>
            </span>
            <a
              href="mailto:ola@parqi.pt"
              className="text-mist underline underline-offset-4 transition-colors hover:text-white"
            >
              ola@parqi.pt
            </a>
          </div>
        </ScrollReveal>
      </footer>
    </main>
  );
}
