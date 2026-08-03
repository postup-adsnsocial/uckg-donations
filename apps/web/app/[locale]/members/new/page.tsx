import { localeFromRoute } from '../../../i18n/config';
import { MemberFormPage } from '../../../members/member-form-page';

export default async function Page({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return <MemberFormPage locale={localeFromRoute(locale)} />;
}
