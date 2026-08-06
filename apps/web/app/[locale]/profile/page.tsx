import { localeFromRoute } from '../../i18n/config';
import { ProfilePage } from '../../profile/profile-page';

export default async function Page({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return <ProfilePage locale={localeFromRoute(locale)} />;
}
