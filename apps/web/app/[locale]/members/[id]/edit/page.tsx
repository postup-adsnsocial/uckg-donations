import { localeFromRoute } from '../../../../i18n/config';
import { MemberFormPage } from '../../../../members/member-form-page';

export default async function Page({
  params,
}: {
  params: Promise<{ id: string; locale: string }>;
}) {
  const { id, locale } = await params;
  return <MemberFormPage id={id} locale={localeFromRoute(locale)} />;
}
