'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';

import { AppShell, type AppChurch } from '../components/app-shell';
import type { Locale } from '../i18n/config';
import { productCopies } from '../i18n/product-copy';
import { apiRequest } from '../lib/api';
import type { MemberRecord } from './types';

export function MemberDetailPage({
  id,
  locale,
}: {
  id: string;
  locale: Locale;
}) {
  return (
    <AppShell active="members" locale={locale}>
      {({ church }) => <MemberDetail church={church} id={id} locale={locale} />}
    </AppShell>
  );
}

function MemberDetail({
  church,
  id,
  locale,
}: {
  church: AppChurch;
  id: string;
  locale: Locale;
}) {
  const copy = productCopies[locale];
  const searchParams = useSearchParams();
  const [member, setMember] = useState<MemberRecord | null>(null);
  useEffect(() => {
    apiRequest(`/members/${id}`, {
      headers: { 'x-church-id': church.id },
    }).then(async (response) => {
      if (response.ok) setMember((await response.json()) as MemberRecord);
    });
  }, [church.id, id]);
  if (!member) return <p className="product-empty">{copy.common.loading}</p>;
  const date = new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(
    new Date(member.createdAt),
  );
  return (
    <>
      <header className="product-heading">
        <div>
          <p className="section-label">
            {copy.common.church}: {church.name}
          </p>
          <h2>{member.fullName}</h2>
          <p>{copy.members.details}</p>
        </div>
        <div className="heading-actions">
          <Link className="product-secondary-link" href={`/${locale}/members`}>
            {copy.common.back}
          </Link>
          <Link
            className="product-primary-link"
            href={`/${locale}/members/${id}/edit`}
          >
            {copy.members.edit}
          </Link>
        </div>
      </header>
      {searchParams.get('saved') ? (
        <p className="form-feedback form-feedback--success">
          {copy.members.saved}
        </p>
      ) : null}
      <section className="detail-layout">
        <article className="product-panel detail-card">
          <header>
            <span className="member-avatar">{member.fullName.slice(0, 1)}</span>
            <div>
              <h3>{member.fullName}</h3>
              <span className={`record-status record-status--${member.status}`}>
                {member.status === 'active'
                  ? copy.common.active
                  : copy.common.inactive}
              </span>
            </div>
          </header>
          <dl>
            <div>
              <dt>{copy.members.email}</dt>
              <dd>{member.email ?? '—'}</dd>
            </div>
            <div>
              <dt>{copy.members.phone}</dt>
              <dd>{member.phone ?? '—'}</dd>
            </div>
            <div>
              <dt>{copy.members.created}</dt>
              <dd>{date}</dd>
            </div>
            <div>
              <dt>{copy.common.church}</dt>
              <dd>{church.name}</dd>
            </div>
          </dl>
        </article>
        <article className="product-panel detail-card">
          <h3>{copy.members.address1}</h3>
          <address>
            {member.addressLine1 ?? '—'}
            {member.addressLine2 ? (
              <>
                <br />
                {member.addressLine2}
              </>
            ) : null}
            <br />
            {member.city}, {member.region} {member.postalCode}
            <br />
            United States
          </address>
          {member.notes ? (
            <div className="detail-notes">
              <strong>{copy.members.notes}</strong>
              <p>{member.notes}</p>
            </div>
          ) : null}
        </article>
      </section>
    </>
  );
}
