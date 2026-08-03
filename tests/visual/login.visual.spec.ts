import { expect, test } from '@playwright/test';

const locales = [
  { code: 'pt-BR', languageLabel: 'Português' },
  { code: 'en', languageLabel: 'English' },
  { code: 'es', languageLabel: 'Español' },
] as const;

for (const locale of locales) {
  test(`${locale.code} login passes the visual quality gate`, async ({
    page,
  }) => {
    await page.goto(`/${locale.code}/login`, { waitUntil: 'networkidle' });
    await page.evaluate(async () => document.fonts.ready);
    await page.addStyleTag({
      content: 'nextjs-portal { display: none !important; }',
    });

    await expect(page.getByRole('combobox')).toHaveValue(locale.code);
    await expect(page.getByRole('combobox')).toContainText(
      locale.languageLabel,
    );

    const layoutIssues = await page.evaluate(() => {
      const issues: string[] = [];
      const root = document.documentElement;
      const tolerance = 1;

      if (root.scrollWidth > root.clientWidth + tolerance) {
        issues.push(
          `horizontal overflow: ${root.scrollWidth}px > ${root.clientWidth}px`,
        );
      }

      const requiredTargets = [
        document.querySelector('.locale-switcher'),
        document.querySelector('.primary-button'),
        document.querySelector('.password-toggle'),
      ].filter((element): element is Element => element !== null);

      for (const element of requiredTargets) {
        const rect = element.getBoundingClientRect();
        if (rect.width < 44 || rect.height < 44) {
          issues.push(
            `${element.className} touch target is ${Math.round(rect.width)}x${Math.round(rect.height)}px`,
          );
        }
      }

      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');

      for (const input of document.querySelectorAll('input')) {
        if (!context) break;

        const text = input.value || input.placeholder;
        const style = getComputedStyle(input);
        context.font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
        const horizontalPadding =
          Number.parseFloat(style.paddingLeft) +
          Number.parseFloat(style.paddingRight);
        const availableWidth = input.clientWidth - horizontalPadding;
        const textWidth = context.measureText(text).width;

        if (textWidth > availableWidth + tolerance) {
          issues.push(
            `${input.name} text needs ${Math.ceil(textWidth)}px but has ${Math.floor(availableWidth)}px`,
          );
        }
      }

      const localeSelect = document.querySelector<HTMLSelectElement>(
        '.locale-switcher select',
      );
      if (localeSelect && context) {
        const style = getComputedStyle(localeSelect);
        const selectedText =
          localeSelect.options[localeSelect.selectedIndex]?.text ?? '';
        context.font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
        const textWidth = context.measureText(selectedText).width;
        const arrowAllowance = 28;
        const availableWidth = localeSelect.clientWidth - arrowAllowance;

        if (textWidth > availableWidth + tolerance) {
          issues.push(
            `locale label needs ${Math.ceil(textWidth)}px but has ${Math.floor(availableWidth)}px`,
          );
        }
      }

      return issues;
    });

    expect(layoutIssues).toEqual([]);
    await expect(page).toHaveScreenshot(`${locale.code}-login.png`, {
      fullPage: true,
    });
  });
}
