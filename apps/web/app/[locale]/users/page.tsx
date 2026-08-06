import { localeFromRoute } from '../../i18n/config';
import { UsersPage } from '../../users/users-page';

export default async function Page({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return <UsersPage locale={localeFromRoute(locale)} />;
}
