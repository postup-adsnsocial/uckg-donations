import { notFound } from 'next/navigation';
import { EnvelopeDetailPage } from '../../../envelopes/envelope-detail-page';
import { isLocale } from '../../../i18n/config';

export default async function Page({
  params,
}: {
  params: Promise<{ id: string; locale: string }>;
}) {
  const { id, locale } = await params;
  if (!isLocale(locale)) notFound();
  return <EnvelopeDetailPage id={id} locale={locale} />;
}
