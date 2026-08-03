import { localeFromRoute } from '../../../i18n/config';
import { MemberDetailPage } from '../../../members/member-detail-page';

export default async function Page({
  params,
}: {
  params: Promise<{ id: string; locale: string }>;
}) {
  const { id, locale } = await params;
  return <MemberDetailPage id={id} locale={localeFromRoute(locale)} />;
}
