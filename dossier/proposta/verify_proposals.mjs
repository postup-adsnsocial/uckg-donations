import { chromium } from '@playwright/test';
import { mkdir } from 'node:fs/promises';

const proposalRoot = new URL('./', import.meta.url);
const qaRoot = '/tmp/uckg-proposal-qa';
await mkdir(qaRoot, { recursive: true });

const proposals = [
  {
    file: 'proposta-comercial-uckg-pt.html',
    locale: 'pt',
    marker: 'Duas formas de contratar',
  },
  {
    file: 'commercial-proposal-uckg-en.html',
    locale: 'en',
    marker: 'Two ways to contract',
  },
  {
    file: 'propuesta-comercial-uckg-es.html',
    locale: 'es',
    marker: 'Dos formas de contratar',
  },
];

const browser = await chromium.launch();
const page = await browser.newPage({
  colorScheme: 'light',
  reducedMotion: 'reduce',
  viewport: { height: 1000, width: 1440 },
});

const errors = [];
page.on('console', (message) => {
  if (message.type() === 'error') errors.push(message.text());
});
page.on('pageerror', (error) => errors.push(error.message));

await page.goto(new URL('index.html', proposalRoot).href);
await page.screenshot({ path: `${qaRoot}/index.png` });
if ((await page.locator('.languages a').count()) !== 3)
  throw new Error('Language index must expose three proposal links.');

for (const proposal of proposals) {
  await page.setViewportSize({ height: 1000, width: 1440 });
  await page.goto(new URL(proposal.file, proposalRoot).href);
  await page.waitForLoadState('load');
  await page.evaluate(async () => document.fonts.ready);
  await page.getByText(proposal.marker).waitFor();

  const failedImages = await page.locator('img').evaluateAll((images) =>
    images
      .filter((image) => !image.complete || image.naturalWidth === 0)
      .map((image) => image.getAttribute('src')),
  );
  if (failedImages.length)
    throw new Error(`${proposal.locale}: broken images: ${failedImages.join(', ')}`);

  const desktopOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  );
  if (desktopOverflow) throw new Error(`${proposal.locale}: desktop overflow.`);

  await page.locator('.hero').screenshot({
    animations: 'disabled',
    path: `${qaRoot}/${proposal.locale}-hero.png`,
  });
  await page.locator('#investimento').screenshot({
    animations: 'disabled',
    path: `${qaRoot}/${proposal.locale}-pricing.png`,
  });

  await page.setViewportSize({ height: 812, width: 375 });
  const mobileOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  );
  if (mobileOverflow) throw new Error(`${proposal.locale}: mobile overflow.`);
  await page.locator('.hero').screenshot({
    animations: 'disabled',
    path: `${qaRoot}/${proposal.locale}-mobile.png`,
  });
}

await browser.close();
if (errors.length) throw new Error(`Browser errors:\n${errors.join('\n')}`);
console.log(`Verified ${proposals.length} proposals and language index. QA: ${qaRoot}`);
