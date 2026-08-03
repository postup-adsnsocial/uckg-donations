import { localeFromRoute } from '../../i18n/config';
import { MembersListPage } from '../../members/members-list-page';

export default async function Page({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return <MembersListPage locale={localeFromRoute(locale)} />;
}
