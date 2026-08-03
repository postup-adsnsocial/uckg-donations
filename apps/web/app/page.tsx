import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

import { localeCookieName, localeFromRoute } from './i18n/config';

export default async function HomePage() {
  const cookieStore = await cookies();
  const locale = localeFromRoute(cookieStore.get(localeCookieName)?.value);

  redirect(`/${locale}/login`);
}
