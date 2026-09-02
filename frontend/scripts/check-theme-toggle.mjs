/**
 * Verifica o toggle de tema: clica e confirma que o ícone sol/lua troca e
 * que a classe .dark alterna no <html>.
 *
 * Uso: node frontend/scripts/check-theme-toggle.mjs [url]
 */
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

// playwright-core vive nas dependências do backend; resolve a partir daí.
const require = createRequire(join(dirname(fileURLToPath(import.meta.url)), '../../backend/package.json'));
const { chromium } = require('playwright-core');

const url = process.argv[2] || 'http://localhost:3127';
const executablePath = process.env.CHROME_PATH;

const browser = await chromium.launch({
    executablePath,
    headless: true,
    args: ['--no-sandbox'],
});

try {
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: 'networkidle' });

    const button = page.locator('button[aria-pressed]');
    await button.waitFor({ state: 'visible' });

    const state = async () =>
        page.evaluate(() => ({
            isDarkClass: document.documentElement.classList.contains('dark'),
            sunVisible: getComputedStyle(document.querySelector('[data-icon="sun"]')).display !== 'none',
            moonVisible: getComputedStyle(document.querySelector('[data-icon="moon"]')).display !== 'none',
        }));

    const before = await state();
    await button.click();
    await page.waitForTimeout(300);
    const after = await state();
    await button.click();
    await page.waitForTimeout(300);
    const back = await state();

    // O estado inicial depende da preferência do browser; o que interessa é
    // que o ícone segue a classe .dark em todas as três leituras.
    const iconMatchesClass = (s) =>
        s.isDarkClass ? (s.sunVisible && !s.moonVisible) : (s.moonVisible && !s.sunVisible);
    const ok =
        iconMatchesClass(before) &&
        iconMatchesClass(after) &&
        iconMatchesClass(back) &&
        before.isDarkClass !== after.isDarkClass;

    console.log(JSON.stringify({ before, after, back }, null, 2));
    console.log(ok ? 'TOGGLE OK: icon swaps with .dark class on both clicks' : 'TOGGLE BROKEN');
    process.exitCode = ok ? 0 : 1;
} finally {
    await browser.close();
}
