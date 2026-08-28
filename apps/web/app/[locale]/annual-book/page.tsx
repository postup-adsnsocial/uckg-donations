import { notFound } from 'next/navigation';

import { AnnualBookPage } from '../../annual-book/annual-book-page';
import { isLocale } from '../../i18n/config';

export default async function Page({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  return <AnnualBookPage locale={locale} />;
}
