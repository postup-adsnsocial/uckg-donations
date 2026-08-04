'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';

import { AppShell, type AppChurch } from '../components/app-shell';
import { type EnvelopeRecord, formatMoney } from '../envelopes/types';
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
  const router = useRouter();
  const searchParams = useSearchParams();
  const [member, setMember] = useState<MemberRecord | null>(null);
  const [history, setHistory] = useState<EnvelopeRecord[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  useEffect(() => {
    let active = true;
    const headers = { 'x-church-id': church.id };

    async function load() {
      setHistoryLoading(true);
      const [memberResponse, historyResponse] = await Promise.all([
        apiRequest(`/members/${id}`, { headers }),
        apiRequest(`/donations?memberId=${encodeURIComponent(id)}`, {
          headers,
        }),
      ]);
      if (!active) return;
      if (memberResponse.ok)
        setMember((await memberResponse.json()) as MemberRecord);
      if (historyResponse.ok)
        setHistory((await historyResponse.json()) as EnvelopeRecord[]);
      setHistoryLoading(false);
    }

    void load();
    return () => {
      active = false;
    };
  }, [church.id, id]);
  if (!member) return <p className="product-empty">{copy.common.loading}</p>;
  async function deleteMember() {
    if (!window.confirm(copy.members.deleteConfirm)) return;
    setDeleting(true);
    const response = await apiRequest(`/members/${id}`, {
      headers: { 'x-church-id': church.id },
      method: 'DELETE',
    });
    if (response.ok) {
      router.push(`/${locale}/members?deleted=1`);
      return;
    }
    setDeleting(false);
  }
  const date = new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(
    new Date(member.createdAt),
  );
  const hasAddress = Boolean(
    member.addressLine1 ||
      member.addressLine2 ||
      member.city ||
      member.region ||
      member.postalCode,
  );
  const locality = [member.city, member.region].filter(Boolean).join(', ');
  const addressLines = hasAddress
    ? [
        member.addressLine1,
        member.addressLine2,
        [locality, member.postalCode].filter(Boolean).join(' '),
        member.country === 'US' ? 'United States' : member.country,
      ].filter(Boolean)
    : [];
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
          <button
            className="danger-button"
            disabled={deleting}
            type="button"
            onClick={() => void deleteMember()}
          >
            {deleting ? copy.members.deleting : copy.members.delete}
          </button>
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
            {addressLines.length
              ? addressLines.map((line, index) => (
                  <span key={line}>
                    {index ? <br /> : null}
                    {line}
                  </span>
                ))
              : '—'}
          </address>
          {member.notes ? (
            <div className="detail-notes">
              <strong>{copy.members.notes}</strong>
              <p>{member.notes}</p>
            </div>
          ) : null}
        </article>
      </section>
      <section className="product-panel member-history">
        <header className="member-history__header">
          <div>
            <h3>{copy.members.historyTitle}</h3>
            <p>{copy.members.historyIntro}</p>
          </div>
        </header>
        {historyLoading ? (
          <p className="product-empty">{copy.common.loading}</p>
        ) : history.length ? (
          <div className="product-table-wrap">
            <table className="product-table member-history__table">
              <thead>
                <tr>
                  <th>{copy.envelopes.date}</th>
                  <th>{copy.envelopes.paymentMethod}</th>
                  <th>{copy.envelopes.amount}</th>
                  <th>{copy.envelopes.image}</th>
                  <th>
                    <span className="sr-only">{copy.envelopes.details}</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {history.map((item) => (
                  <tr key={item.id}>
                    <td data-label={copy.envelopes.date}>
                      {new Intl.DateTimeFormat(locale, {
                        dateStyle: 'medium',
                      }).format(new Date(`${item.receivedOn}T12:00:00`))}
                    </td>
                    <td data-label={copy.envelopes.paymentMethod}>
                      {copy.envelopes[item.paymentMethod]}
                    </td>
                    <td data-label={copy.envelopes.amount}>
                      <strong>{formatMoney(item.amountCents, locale)}</strong>
                    </td>
                    <td data-label={copy.envelopes.image}>
                      {item.envelope ? '✓' : '—'}
                    </td>
                    <td>
                      <Link
                        aria-label={`${copy.envelopes.view}: ${new Intl.DateTimeFormat(locale).format(new Date(`${item.receivedOn}T12:00:00`))}`}
                        className="member-action"
                        href={`/${locale}/envelopes/${item.id}`}
                        title={copy.envelopes.view}
                      >
                        <svg
                          aria-hidden="true"
                          focusable="false"
                          viewBox="0 0 24 24"
                        >
                          <path d="M2.8 12s3.3-5.5 9.2-5.5 9.2 5.5 9.2 5.5-3.3 5.5-9.2 5.5S2.8 12 2.8 12Z" />
                          <circle cx="12" cy="12" r="2.7" />
                        </svg>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="product-empty">{copy.members.historyEmpty}</p>
        )}
      </section>
    </>
  );
}
