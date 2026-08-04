import { ChurchesPage } from '../../churches/churches-page';
import { localeFromRoute } from '../../i18n/config';

export default async function Page({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return <ChurchesPage locale={localeFromRoute(locale)} />;
}
