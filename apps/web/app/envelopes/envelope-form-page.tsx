'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

import { AppShell, type AppChurch } from '../components/app-shell';
import type { Locale } from '../i18n/config';
import { productCopies } from '../i18n/product-copy';
import { apiRequest } from '../lib/api';
import type { MemberRecord } from '../members/types';

type PaymentMethod = 'card' | 'cash' | 'check';

function formatLocalDate(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function PaymentMethodIcon({ method }: { method: PaymentMethod }) {
  if (method === 'card') {
    return (
      <svg aria-hidden="true" viewBox="0 0 24 24">
        <rect x="2.75" y="5" width="18.5" height="14" rx="2.5" />
        <path d="M3 9.5h18M7 15h4" />
      </svg>
    );
  }
  if (method === 'cash') {
    return (
      <svg aria-hidden="true" viewBox="0 0 24 24">
        <rect x="2.75" y="5.5" width="18.5" height="13" rx="2" />
        <path d="M6.5 8.5a2 2 0 0 1-2 2v3a2 2 0 0 1 2 2h11a2 2 0 0 1 2-2v-3a2 2 0 0 1-2-2h-11Z" />
        <circle cx="12" cy="12" r="2.25" />
      </svg>
    );
  }
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M7 9h6M7 13h10M7 17h5M15.5 8.5l1.25 1.25L19 7.5" />
    </svg>
  );
}

function CameraIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="M8.5 6.5 10 4.75h4L15.5 6.5H19A2.5 2.5 0 0 1 21.5 9v8A2.5 2.5 0 0 1 19 19.5H5A2.5 2.5 0 0 1 2.5 17V9A2.5 2.5 0 0 1 5 6.5h3.5Z" />
      <circle cx="12" cy="13" r="3.5" />
    </svg>
  );
}

function UploadIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="M12 15V3m0 0L7.5 7.5M12 3l4.5 4.5M4 14v4.5A2.5 2.5 0 0 0 6.5 21h11a2.5 2.5 0 0 0 2.5-2.5V14" />
    </svg>
  );
}

export function EnvelopeFormPage({ locale }: { locale: Locale }) {
  return (
    <AppShell active="launch" locale={locale}>
      {({ church }) => <EnvelopeForm church={church} locale={locale} />}
    </AppShell>
  );
}

function EnvelopeForm({
  church,
  locale,
}: {
  church: AppChurch;
  locale: Locale;
}) {
  const copy = productCopies[locale];
  const router = useRouter();
  const [members, setMembers] = useState<MemberRecord[]>([]);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [selectedImageUrl, setSelectedImageUrl] = useState('');
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraStatus, setCameraStatus] = useState<
    'starting' | 'live' | 'preview' | 'error'
  >('starting');
  const [cameraError, setCameraError] = useState('');
  const [capturedImage, setCapturedImage] = useState<File | null>(null);
  const [capturedImageUrl, setCapturedImageUrl] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const cameraSessionRef = useRef(0);

  useEffect(() => {
    apiRequest('/members?page=1&pageSize=200&status=active', {
      headers: { 'x-church-id': church.id },
    }).then(async (response) => {
      if (response.ok)
        setMembers(
          ((await response.json()) as { items: MemberRecord[] }).items.filter(
            (member) => member.status === 'active',
          ),
        );
    });
  }, [church.id]);

  useEffect(() => {
    if (cameraStatus !== 'live' || !videoRef.current || !streamRef.current)
      return;
    videoRef.current.srcObject = streamRef.current;
    void videoRef.current.play().catch(() => {
      stopCamera();
      setCameraError(copy.envelopes.cameraPermissionError);
      setCameraStatus('error');
    });
  }, [cameraStatus, copy.envelopes.cameraPermissionError]);

  useEffect(
    () => () => {
      if (selectedImageUrl) URL.revokeObjectURL(selectedImageUrl);
    },
    [selectedImageUrl],
  );

  useEffect(
    () => () => {
      if (capturedImageUrl) URL.revokeObjectURL(capturedImageUrl);
    },
    [capturedImageUrl],
  );

  useEffect(
    () => () => {
      cameraSessionRef.current += 1;
      streamRef.current?.getTracks().forEach((track) => track.stop());
    },
    [],
  );

  useEffect(() => {
    if (!cameraOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeCamera();
    };
    document.addEventListener('keydown', closeOnEscape);
    return () => document.removeEventListener('keydown', closeOnEscape);
  });

  function stopCamera() {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  }

  function clearCapturedImage() {
    setCapturedImage(null);
    setCapturedImageUrl('');
  }

  function closeCamera() {
    cameraSessionRef.current += 1;
    stopCamera();
    clearCapturedImage();
    setCameraOpen(false);
    setCameraError('');
  }

  function selectImage(image: File | null) {
    setSelectedImage(image);
    setSelectedImageUrl(image ? URL.createObjectURL(image) : '');
  }

  async function openCamera() {
    const cameraSession = cameraSessionRef.current + 1;
    cameraSessionRef.current = cameraSession;
    setCameraOpen(true);
    setCameraStatus('starting');
    setCameraError('');
    clearCapturedImage();

    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError(copy.envelopes.cameraUnavailable);
      setCameraStatus('error');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          facingMode: { ideal: 'environment' },
          height: { ideal: 1440 },
          width: { ideal: 1920 },
        },
      });
      if (cameraSession !== cameraSessionRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      streamRef.current = stream;
      setCameraStatus('live');
    } catch {
      setCameraError(copy.envelopes.cameraPermissionError);
      setCameraStatus('error');
    }
  }

  function capturePhoto() {
    const video = videoRef.current;
    if (!video?.videoWidth || !video.videoHeight) {
      setCameraError(copy.envelopes.cameraPermissionError);
      setCameraStatus('error');
      return;
    }

    const maximumEdge = 2000;
    const scale = Math.min(
      1,
      maximumEdge / Math.max(video.videoWidth, video.videoHeight),
    );
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(video.videoWidth * scale);
    canvas.height = Math.round(video.videoHeight * scale);
    canvas
      .getContext('2d')
      ?.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          setCameraError(copy.envelopes.cameraPermissionError);
          setCameraStatus('error');
          return;
        }
        const image = new File([blob], `envelope-${Date.now()}.jpg`, {
          type: 'image/jpeg',
        });
        setCapturedImage(image);
        setCapturedImageUrl(URL.createObjectURL(image));
        setCameraStatus('preview');
      },
      'image/jpeg',
      0.9,
    );
  }

  function retakePhoto() {
    clearCapturedImage();
    setCameraStatus('live');
  }

  function confirmPhoto() {
    if (!capturedImage) return;
    selectImage(capturedImage);
    cameraSessionRef.current += 1;
    stopCamera();
    clearCapturedImage();
    setCameraOpen(false);
  }

  async function save(formData: FormData) {
    setSaving(true);
    setMessage('');
    const formImage = formData.get('image');
    const image =
      selectedImage ?? (formImage instanceof File ? formImage : null);
    const amount = Number(String(formData.get('amount')).replace(',', '.'));
    const response = await apiRequest('/donations', {
      body: JSON.stringify({
        amountCents: Math.round(amount * 100),
        memberId: formData.get('memberId') || null,
        notes: formData.get('notes') || undefined,
        receivedOn: formData.get('receivedOn'),
        paymentMethod: formData.get('paymentMethod'),
      }),
      headers: { 'x-church-id': church.id },
      method: 'POST',
    });
    if (!response.ok) {
      setSaving(false);
      setMessage(copy.envelopes.error);
      return;
    }
    const donation = (await response.json()) as { id: string };
    if (image?.size) {
      const upload = new FormData();
      upload.set('file', image);
      const uploadResponse = await apiRequest(
        `/donations/${donation.id}/envelope`,
        { body: upload, headers: { 'x-church-id': church.id }, method: 'POST' },
      );
      if (!uploadResponse.ok) {
        setSaving(false);
        setMessage(copy.envelopes.error);
        return;
      }
    }
    router.push(`/${locale}/envelopes?saved=1`);
  }

  return (
    <>
      <header className="product-heading">
        <div>
          <p className="section-label">
            {copy.common.church}: {church.name}
          </p>
          <h2>{copy.envelopes.new}</h2>
          <p>{copy.envelopes.listIntro}</p>
        </div>
        <Link className="product-secondary-link" href={`/${locale}/envelopes`}>
          {copy.common.cancel}
        </Link>
      </header>
      <form
        className="product-form product-panel"
        action={(formData) => void save(formData)}
      >
        <div className="church-assignment">
          <span>✓</span>
          <div>
            <small>{copy.common.church}</small>
            <strong>{church.name}</strong>
          </div>
        </div>
        <fieldset>
          <legend>{copy.envelopes.details}</legend>
          <div className="form-grid">
            <label className="form-field">
              <span>{copy.envelopes.amount} (USD)</span>
              <input
                name="amount"
                type="text"
                inputMode="decimal"
                maxLength={12}
                pattern="[0-9]+([.,][0-9]{1,2})?"
                required
                placeholder="0.00"
              />
            </label>
            <label className="form-field">
              <span>{copy.envelopes.date}</span>
              <input
                name="receivedOn"
                type="date"
                required
                defaultValue={formatLocalDate(new Date())}
              />
            </label>
            <div className="form-field form-field--wide payment-method-field">
              <span id="payment-method-label">
                {copy.envelopes.paymentMethod}
              </span>
              <div
                aria-labelledby="payment-method-label"
                className="payment-method-options"
                role="radiogroup"
              >
                {(
                  [
                    ['cash', copy.envelopes.cash],
                    ['card', copy.envelopes.card],
                    ['check', copy.envelopes.check],
                  ] as const
                ).map(([method, label]) => (
                  <label className="payment-method-option" key={method}>
                    <input
                      defaultChecked={method === 'cash'}
                      name="paymentMethod"
                      required
                      type="radio"
                      value={method}
                    />
                    <span className="payment-method-option__icon">
                      <PaymentMethodIcon method={method} />
                    </span>
                    <strong>{label}</strong>
                    <span
                      aria-hidden="true"
                      className="payment-method-option__check"
                    >
                      ✓
                    </span>
                  </label>
                ))}
              </div>
            </div>
            <label className="form-field form-field--wide">
              <span>
                {copy.envelopes.member} · {copy.common.optional}
              </span>
              <select name="memberId" defaultValue="">
                <option value="">{copy.common.anonymous}</option>
                {members.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.fullName}
                  </option>
                ))}
              </select>
            </label>
            <div className="form-field form-field--wide envelope-image-capture">
              <span>
                {copy.envelopes.image} · {copy.common.optional}
              </span>
              <input
                ref={fileInputRef}
                aria-label={`${copy.envelopes.image} · ${copy.common.optional}`}
                className="visually-hidden-input"
                hidden
                name="image"
                type="file"
                accept="image/jpeg,image/png"
                onChange={(event) =>
                  selectImage(event.currentTarget.files?.[0] ?? null)
                }
              />
              {selectedImageUrl ? (
                <div className="envelope-image-selection">
                  {/* Blob previews are local-only and cannot use Next image optimization. */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img alt={copy.envelopes.previewAlt} src={selectedImageUrl} />
                  <div>
                    <strong>{copy.envelopes.imageReady}</strong>
                    <p>{copy.envelopes.imageHint}</p>
                    <button
                      className="image-remove-button"
                      type="button"
                      onClick={() => {
                        selectImage(null);
                        if (fileInputRef.current)
                          fileInputRef.current.value = '';
                      }}
                    >
                      {copy.envelopes.removeImage}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="image-source-panel">
                  <p>{copy.envelopes.imageHint}</p>
                  <div className="image-source-actions">
                    <button
                      className="image-source-button image-source-button--primary"
                      type="button"
                      onClick={() => void openCamera()}
                    >
                      <CameraIcon />
                      <span>{copy.envelopes.cameraAction}</span>
                    </button>
                    <button
                      className="image-source-button"
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <UploadIcon />
                      <span>{copy.envelopes.chooseImage}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
            <label className="form-field form-field--wide">
              <span>
                {copy.envelopes.notes} · {copy.common.optional}
              </span>
              <textarea name="notes" rows={4} maxLength={500} />
            </label>
          </div>
        </fieldset>
        {message ? (
          <p className="form-feedback form-feedback--error" role="alert">
            {message}
          </p>
        ) : null}
        <div className="form-actions">
          <Link href={`/${locale}/envelopes`}>{copy.common.cancel}</Link>
          <button disabled={saving} type="submit">
            {saving ? copy.common.saving : copy.common.save}
          </button>
        </div>
      </form>
      {cameraOpen ? (
        <div className="camera-dialog-backdrop">
          <section
            aria-labelledby="camera-dialog-title"
            aria-modal="true"
            className="camera-dialog"
            role="dialog"
          >
            <header className="camera-dialog__header">
              <div>
                <h3 id="camera-dialog-title">{copy.envelopes.cameraTitle}</h3>
                <p>{copy.envelopes.cameraIntro}</p>
              </div>
              <button
                aria-label={copy.envelopes.closeCamera}
                className="camera-dialog__close"
                type="button"
                onClick={closeCamera}
              >
                ×
              </button>
            </header>
            <div className="camera-viewport">
              {cameraStatus === 'starting' ? (
                <div className="camera-message" role="status">
                  <span className="camera-spinner" />
                  <p>{copy.envelopes.cameraStarting}</p>
                </div>
              ) : null}
              {cameraStatus === 'live' ? (
                <video ref={videoRef} autoPlay muted playsInline />
              ) : null}
              {cameraStatus === 'preview' && capturedImageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img alt={copy.envelopes.previewAlt} src={capturedImageUrl} />
              ) : null}
              {cameraStatus === 'error' ? (
                <div
                  className="camera-message camera-message--error"
                  role="alert"
                >
                  <CameraIcon />
                  <p>{cameraError}</p>
                </div>
              ) : null}
            </div>
            <footer className="camera-dialog__actions">
              <button type="button" onClick={closeCamera}>
                {copy.common.cancel}
              </button>
              {cameraStatus === 'live' ? (
                <button
                  className="camera-primary-action"
                  type="button"
                  onClick={capturePhoto}
                >
                  <CameraIcon />
                  {copy.envelopes.takePhoto}
                </button>
              ) : null}
              {cameraStatus === 'preview' ? (
                <>
                  <button type="button" onClick={retakePhoto}>
                    {copy.envelopes.retakePhoto}
                  </button>
                  <button
                    className="camera-primary-action"
                    type="button"
                    onClick={confirmPhoto}
                  >
                    {copy.envelopes.usePhoto}
                  </button>
                </>
              ) : null}
            </footer>
          </section>
        </div>
      ) : null}
    </>
  );
}
