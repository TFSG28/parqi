/**
 * Verifica a cor do herói nos dois temas (emula prefers-color-scheme).
 * Uso: node frontend/scripts/check-hero-colors.mjs [url]
 */
import { createRequire } from 'node:module';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(join(dirname(fileURLToPath(import.meta.url)), '../../backend/package.json'));
const { chromium } = require('playwright-core');

const url = process.argv[2] || 'http://localhost:3129';
const executablePath = process.env.CHROME_PATH;

const browser = await chromium.launch({ executablePath, headless: true, args: ['--no-sandbox'] });

try {
    const heroColor = async (scheme) => {
        const page = await browser.newPage({ colorScheme: scheme });
        await page.goto(url, { waitUntil: 'networkidle' });
        const color = await page.evaluate(() => {
            const el = document.querySelector('main > section');
            return getComputedStyle(el).backgroundColor;
        });
        await page.close();
        return color;
    };

    const light = await heroColor('light');
    const dark = await heroColor('dark');

    const rgb = (s) => (s.match(/\d+/g) || []).slice(0, 3).map(Number).join(',');
    const ok = rgb(light) === '5,58,140' && rgb(dark) === '28,28,30';

    console.log(JSON.stringify({ light, dark, expected: { light: '#053A8C', dark: '#1C1C1E' } }));
    console.log(ok ? 'HERO OK: light #053A8C / dark #1C1C1E' : 'HERO MISMATCH');
    process.exitCode = ok ? 0 : 1;
} finally {
    await browser.close();
}
