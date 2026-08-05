'use client'

import { useId } from 'react'
import { useTheme } from '@/context/ThemeContext'

/**
 * Tactile day/night toggle: a sun that morphs into a crescent moon.
 * Visual state is driven by the `.dark` class (set before paint by the theme
 * init script), so it never flashes on hydration; behavior comes from context.
 */
export default function ThemeToggle() {
    const { theme, toggleTheme } = useTheme()
    const maskId = useId()
    const isDark = theme === 'dark'

    return (
        <button
            type="button"
            onClick={toggleTheme}
            aria-label={isDark ? 'Ativar tema claro' : 'Ativar tema escuro'}
            aria-pressed={isDark}
            className="
                group relative grid size-11 place-items-center overflow-hidden rounded-2xl
                border border-black/10 dark:border-white/10
                bg-linear-to-b from-amber-50 to-orange-100
                dark:from-slate-800 dark:to-slate-950
                shadow-sm transition-[transform,box-shadow] duration-300 ease-out
                hover:-translate-y-0.5 hover:shadow-md active:translate-y-0 active:scale-95
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2
                focus-visible:ring-amber-400/70 dark:focus-visible:ring-slate-300/50
                focus-visible:ring-offset-transparent
            "
        >
            {/* faint stars, only in the night sky */}
            <span
                aria-hidden
                className="
                    pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500
                    dark:opacity-100 motion-reduce:transition-none
                    bg-[radial-gradient(1px_1px_at_20%_30%,white,transparent),radial-gradient(1px_1px_at_75%_25%,white,transparent),radial-gradient(1.5px_1.5px_at_60%_70%,white,transparent)]
                "
            />

            <svg
                viewBox="0 0 24 24"
                className="
                    relative size-6 text-amber-500 dark:text-slate-100
                    transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]
                    dark:rotate-[-18deg] motion-reduce:transition-none
                "
            >
                <mask id={maskId}>
                    <rect x="0" y="0" width="24" height="24" fill="white" />
                    {/* off-body in light (full sun); slides in to carve the crescent in dark */}
                    <circle
                        cx="24"
                        cy="9"
                        r="7"
                        fill="black"
                        className="transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]5 motion-reduce:transition-none"
                    />
                </mask>

                {/* the celestial body */}
                <circle cx="12" cy="12" r="5.5" fill="currentColor" mask={`url(#${maskId})`} />

                {/* sun rays: retract and fade as night falls */}
                <g
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    className="origin-center transition-all duration-500 group-hover:rotate-45 dark:scale-0 dark:opacity-0 motion-reduce:transition-none"
                >
                    <line x1="12" y1="1.5" x2="12" y2="3.5" />
                    <line x1="12" y1="20.5" x2="12" y2="22.5" />
                    <line x1="1.5" y1="12" x2="3.5" y2="12" />
                    <line x1="20.5" y1="12" x2="22.5" y2="12" />
                    <line x1="4.4" y1="4.4" x2="5.9" y2="5.9" />
                    <line x1="18.1" y1="18.1" x2="19.6" y2="19.6" />
                    <line x1="4.4" y1="19.6" x2="5.9" y2="18.1" />
                    <line x1="18.1" y1="5.9" x2="19.6" y2="4.4" />
                </g>
            </svg>
        </button>
    )
}
