'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import type { Locale } from '../i18n/config';
import type { Dictionary } from '../i18n/dictionaries';
import { apiRequest } from '../lib/api';

interface Member {
  email: string | null;
  fullName: string;
  id: string;
  phone: string | null;
  status: 'active' | 'inactive';
}

interface Donation {
  amountCents: number;
  envelope: {
    contentType: string;
    originalName: string;
    sizeBytes: number;
  } | null;
  id: string;
  member: { fullName: string; id: string } | null;
  notes: string | null;
  receivedOn: string;
}

interface MvpWorkspaceProps {
  churchId: string;
  copy: Dictionary['workspace'];
  locale: Locale;
}

export function MvpWorkspace({ churchId, copy, locale }: MvpWorkspaceProps) {
  const [members, setMembers] = useState<Member[]>([]);
  const [donations, setDonations] = useState<Donation[]>([]);
  const [memberBusy, setMemberBusy] = useState(false);
  const [envelopeBusy, setEnvelopeBusy] = useState(false);
  const [memberMessage, setMemberMessage] = useState('');
  const [envelopeMessage, setEnvelopeMessage] = useState('');
  const [preview, setPreview] = useState<{ name: string; url: string } | null>(
    null,
  );

  const headers = useMemo(() => ({ 'x-church-id': churchId }), [churchId]);

  const loadWorkspace = useCallback(async () => {
    const [membersResponse, donationsResponse] = await Promise.all([
      apiRequest('/members', { headers }),
      apiRequest('/donations', { headers }),
    ]);

    if (membersResponse.ok) {
      setMembers((await membersResponse.json()) as Member[]);
    }
    if (donationsResponse.ok) {
      setDonations((await donationsResponse.json()) as Donation[]);
    }
  }, [headers]);

  useEffect(() => {
    void loadWorkspace();
  }, [loadWorkspace]);

  const totalCents = donations.reduce(
    (total, donation) => total + donation.amountCents,
    0,
  );
  const money = new Intl.NumberFormat(locale, {
    currency: 'USD',
    style: 'currency',
  });
  const dates = new Intl.DateTimeFormat(locale, { timeZone: 'UTC' });

  async function createMember(formData: FormData) {
    setMemberBusy(true);
    setMemberMessage('');
    const payload = {
      email: formData.get('email'),
      fullName: formData.get('fullName'),
      phone: formData.get('phone'),
    };
    const response = await apiRequest('/members', {
      body: JSON.stringify(payload),
      headers,
      method: 'POST',
    });

    setMemberBusy(false);
    if (!response.ok) {
      setMemberMessage(copy.genericError);
      return;
    }

    setMemberMessage(copy.successMember);
    await loadWorkspace();
  }

  async function createEnvelope(formData: FormData) {
    setEnvelopeBusy(true);
    setEnvelopeMessage('');
    const amount = Number(String(formData.get('amount')).replace(',', '.'));
    const image = formData.get('image');

    if (!Number.isFinite(amount) || amount <= 0 || !(image instanceof File)) {
      setEnvelopeMessage(copy.genericError);
      setEnvelopeBusy(false);
      return;
    }

    const response = await apiRequest('/donations', {
      body: JSON.stringify({
        amountCents: Math.round(amount * 100),
        memberId: formData.get('memberId') || null,
        notes: formData.get('notes'),
        receivedOn: formData.get('receivedOn'),
      }),
      headers,
      method: 'POST',
    });

    if (!response.ok) {
      setEnvelopeMessage(copy.genericError);
      setEnvelopeBusy(false);
      return;
    }

    const donation = (await response.json()) as { id: string };
    const upload = new FormData();
    upload.set('file', image);
    const uploadResponse = await apiRequest(
      `/donations/${donation.id}/envelope`,
      { body: upload, headers, method: 'POST' },
    );

    setEnvelopeBusy(false);
    if (!uploadResponse.ok) {
      setEnvelopeMessage(copy.genericError);
      return;
    }

    setEnvelopeMessage(copy.successEnvelope);
    await loadWorkspace();
  }

  async function showEnvelope(donation: Donation) {
    const response = await apiRequest(`/donations/${donation.id}/envelope`, {
      headers,
    });

    if (!response.ok) {
      setEnvelopeMessage(copy.genericError);
      return;
    }

    if (preview) URL.revokeObjectURL(preview.url);
    setPreview({
      name: donation.envelope?.originalName ?? copy.envelopeImage,
      url: URL.createObjectURL(await response.blob()),
    });
  }

  return (
    <div className="mvp-workspace">
      <section className="workspace-card" id="members">
        <header className="workspace-card__header">
          <div>
            <p className="section-label">01</p>
            <h2>{copy.memberTitle}</h2>
          </div>
          <span className="workspace-count">{members.length}</span>
        </header>

        <form
          className="workspace-form"
          action={(formData) => void createMember(formData)}
        >
          <label className="workspace-field workspace-field--wide">
            <span>{copy.memberName}</span>
            <input name="fullName" required minLength={2} maxLength={160} />
          </label>
          <label className="workspace-field">
            <span>
              {copy.memberEmail} · {copy.optional}
            </span>
            <input name="email" type="email" maxLength={320} />
          </label>
          <label className="workspace-field">
            <span>
              {copy.memberPhone} · {copy.optional}
            </span>
            <input name="phone" type="tel" placeholder="+1 212 555 0100" />
          </label>
          <button
            className="workspace-submit"
            disabled={memberBusy}
            type="submit"
          >
            {memberBusy ? copy.saving : copy.saveMember}
          </button>
          {memberMessage ? (
            <p className="workspace-message" role="status">
              {memberMessage}
            </p>
          ) : null}
        </form>

        <div className="workspace-list">
          <h3>{copy.recentMembers}</h3>
          {members.length ? (
            members.map((member) => (
              <article className="member-row" key={member.id}>
                <span>{member.fullName.slice(0, 1).toUpperCase()}</span>
                <div>
                  <strong>{member.fullName}</strong>
                  <small>{member.email ?? member.phone ?? copy.optional}</small>
                </div>
              </article>
            ))
          ) : (
            <p className="workspace-empty">{copy.emptyMembers}</p>
          )}
        </div>
      </section>

      <section className="workspace-card" id="envelopes">
        <header className="workspace-card__header">
          <div>
            <p className="section-label">02</p>
            <h2>{copy.envelopeTitle}</h2>
          </div>
          <div className="workspace-total">
            <small>{copy.total}</small>
            <strong>{money.format(totalCents / 100)}</strong>
          </div>
        </header>

        <form
          className="workspace-form"
          action={(formData) => void createEnvelope(formData)}
        >
          <label className="workspace-field">
            <span>{copy.amount}</span>
            <input
              name="amount"
              type="number"
              min="0.01"
              step="0.01"
              required
            />
          </label>
          <label className="workspace-field">
            <span>{copy.date}</span>
            <input
              name="receivedOn"
              type="date"
              required
              defaultValue={new Date().toISOString().slice(0, 10)}
            />
          </label>
          <label className="workspace-field workspace-field--wide">
            <span>
              {copy.selectMember} · {copy.optional}
            </span>
            <select name="memberId" defaultValue="">
              <option value="">{copy.anonymous}</option>
              {members.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.fullName}
                </option>
              ))}
            </select>
          </label>
          <label className="workspace-field workspace-field--wide">
            <span>{copy.envelopeImage}</span>
            <input
              name="image"
              type="file"
              accept="image/jpeg,image/png"
              required
            />
          </label>
          <label className="workspace-field workspace-field--wide">
            <span>
              {copy.notes} · {copy.optional}
            </span>
            <textarea name="notes" maxLength={500} rows={3} />
          </label>
          <button
            className="workspace-submit"
            disabled={envelopeBusy}
            type="submit"
          >
            {envelopeBusy ? copy.saving : copy.saveEnvelope}
          </button>
          {envelopeMessage ? (
            <p className="workspace-message" role="status">
              {envelopeMessage}
            </p>
          ) : null}
        </form>

        <div className="workspace-list">
          <h3>{copy.historyTitle}</h3>
          {donations.length ? (
            donations.map((donation) => (
              <article className="donation-row" key={donation.id}>
                <div>
                  <strong>{money.format(donation.amountCents / 100)}</strong>
                  <small>
                    {donation.member?.fullName ?? copy.anonymous} ·{' '}
                    {dates.format(new Date(`${donation.receivedOn}T00:00:00Z`))}
                  </small>
                </div>
                {donation.envelope ? (
                  <button
                    type="button"
                    onClick={() => void showEnvelope(donation)}
                  >
                    {copy.viewImage}
                  </button>
                ) : null}
              </article>
            ))
          ) : (
            <p className="workspace-empty">{copy.emptyDonations}</p>
          )}
        </div>
      </section>

      {preview ? (
        <div
          className="image-preview"
          role="dialog"
          aria-modal="true"
          aria-label={preview.name}
          onClick={() => setPreview(null)}
        >
          <div onClick={(event) => event.stopPropagation()}>
            <button
              type="button"
              onClick={() => setPreview(null)}
              aria-label="Close"
            >
              ×
            </button>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={preview.url} alt={preview.name} />
          </div>
        </div>
      ) : null}
    </div>
  );
}
