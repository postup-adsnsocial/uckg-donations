'use client';

import { useRouter } from 'next/navigation';
import { type FormEvent, useState } from 'react';

import { apiRequest } from '../lib/api';

export function LoginForm() {
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
          response.status === 401
            ? 'E-mail ou senha incorretos. Verifique os dados e tente novamente.'
            : 'Não foi possível entrar agora. Tente novamente em instantes.',
        );
        return;
      }

      router.push('/dashboard');
      router.refresh();
    } catch {
      setError(
        'A API não está disponível. Confirme se o ambiente local está em execução.',
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="login-form" onSubmit={handleSubmit} noValidate>
      <div className="field-group">
        <label htmlFor="email">E-mail</label>
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
            placeholder="nome@universal.org"
            required
            type="email"
            value={email}
          />
        </div>
      </div>

      <div className="field-group">
        <label htmlFor="password">Senha</label>
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
            placeholder="Digite sua senha"
            required
            type={showPassword ? 'text' : 'password'}
            value={password}
          />
          <button
            aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
            className="password-toggle"
            onClick={() => setShowPassword((visible) => !visible)}
            type="button"
          >
            {showPassword ? 'Ocultar' : 'Mostrar'}
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
        <span>{submitting ? 'Entrando…' : 'Entrar no painel'}</span>
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M5 12h14M14 7l5 5-5 5" />
        </svg>
      </button>
    </form>
  );
}
