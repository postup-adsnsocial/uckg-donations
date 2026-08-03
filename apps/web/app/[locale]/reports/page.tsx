import { notFound } from 'next/navigation';
import { isLocale } from '../../i18n/config';
import { ReportsPage } from '../../reports/reports-page';

export default async function Page({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  return <ReportsPage locale={locale} />;
}
