'use client';

import { IoMoonOutline, IoSunnyOutline } from 'react-icons/io5';
import { useTheme } from '@/context/ThemeContext';

/**
 * Toggle de tema discreto, como o da barra da app (ParqiHeader): círculo
 * plano com um ícone pequeno. Vive sobre o azul da marca no herói, por isso
 * usa branco translúcido em vez de cores próprias. Sem gradiente, sem sombra,
 * sem animação — sinalética, não decoração.
 *
 * Ambos os ícones estão no DOM e alternam via classes .dark (aplicadas antes
 * do primeiro paint pelo script de init no layout), para não haver troca de
 * ícone visível na hidratação.
 *
 * Class names em linha única de propósito: classNames multi-linha em
 * ficheiros CRLF produzem \r\n que o parser de HTML normaliza de forma
 * diferente do bundle do cliente, partindo a hidratação.
 */
export default function ThemeToggle() {
    const { theme, toggleTheme } = useTheme();
    const isDark = theme === 'dark';

    return (
        <button type="button" onClick={toggleTheme} aria-label={isDark ? 'Ativar tema claro' : 'Ativar tema escuro'} aria-pressed={isDark} className="grid size-11 place-items-center rounded-full border border-white/25 bg-white/10 text-white transition-colors duration-150 hover:bg-white/20 active:bg-white/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70">
            <IoSunnyOutline aria-hidden data-icon="sun" size={17} className="hidden dark:block" />
            <IoMoonOutline aria-hidden data-icon="moon" size={16} className="dark:hidden" />
        </button>
    );
}
