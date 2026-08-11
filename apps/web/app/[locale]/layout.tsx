import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import { AppSessionProvider } from '../components/app-session';
import { DocumentLocale } from '../components/document-locale';
import { isLocale, locales } from '../i18n/config';
import { getDictionary } from '../i18n/dictionaries';

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;

  if (!isLocale(locale)) {
    return {};
  }

  const dictionary = getDictionary(locale);

  return {
    description: dictionary.brand.description,
    title: `Universal | ${dictionary.brand.productName}`,
  };
}

export default async function LocaleLayout({
  children,
  params,
}: Readonly<{
  children: ReactNode;
  params: Promise<{ locale: string }>;
}>) {
  const { locale } = await params;

  if (!isLocale(locale)) {
    notFound();
  }

  return (
    <AppSessionProvider locale={locale}>
      <DocumentLocale locale={locale} />
      {children}
    </AppSessionProvider>
  );
}
