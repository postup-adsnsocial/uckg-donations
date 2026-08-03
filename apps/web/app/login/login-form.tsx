'use client';

import { useRouter } from 'next/navigation';
import { type FormEvent, useState } from 'react';

import { apiRequest } from '../lib/api';
import type { Dictionary } from '../i18n/dictionaries';
import type { Locale } from '../i18n/config';

interface LoginFormProps {
  copy: Dictionary['login'];
  locale: Locale;
}

export function LoginForm({ copy, locale }: LoginFormProps) {
  const router = useRouter();
  const [email, setEmail] = useState('post.assessoria@gmail.com');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      const response = await apiRequest('/auth/login', {
        body: JSON.stringify({ email, password }),
        method: 'POST',
      });

      if (!response.ok) {
        setError(
          response.status === 401 ? copy.invalidCredentials : copy.genericError,
        );
        return;
      }

      router.push(`/${locale}/dashboard`);
      router.refresh();
    } catch {
      setError(copy.apiUnavailable);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="login-form" onSubmit={handleSubmit} noValidate>
      <div className="field-group">
        <label htmlFor="email">{copy.emailLabel}</label>
        <div className="field-control">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M4 6.75h16v10.5H4z" />
            <path d="m4.5 7.25 7.5 5.5 7.5-5.5" />
          </svg>
          <input
            autoComplete="username"
            id="email"
            name="email"
            onChange={(event) => setEmail(event.target.value)}
            placeholder={copy.emailPlaceholder}
            required
            type="email"
            value={email}
          />
        </div>
      </div>

      <div className="field-group">
        <label htmlFor="password">{copy.passwordLabel}</label>
        <div className="field-control">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <rect x="5" y="10" width="14" height="10" rx="2" />
            <path d="M8 10V7a4 4 0 0 1 8 0v3" />
          </svg>
          <input
            autoComplete="current-password"
            id="password"
            minLength={6}
            name="password"
            onChange={(event) => setPassword(event.target.value)}
            placeholder={copy.passwordPlaceholder}
            required
            type={showPassword ? 'text' : 'password'}
            value={password}
          />
          <button
            aria-label={showPassword ? copy.hidePassword : copy.showPassword}
            className="password-toggle"
            onClick={() => setShowPassword((visible) => !visible)}
            type="button"
          >
            {showPassword ? copy.hidePassword : copy.showPassword}
          </button>
        </div>
      </div>

      {error ? (
        <p className="form-error" role="alert">
          <span aria-hidden="true">!</span>
          {error}
        </p>
      ) : null}

      <button className="primary-button" disabled={submitting} type="submit">
        <span>{submitting ? copy.submitting : copy.submit}</span>
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M5 12h14M14 7l5 5-5 5" />
        </svg>
      </button>
    </form>
  );
}
