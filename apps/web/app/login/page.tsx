import { BrandPanel } from '../components/brand-panel';
import { BrandWordmark } from '../components/brand-wordmark';
import { LoginForm } from './login-form';

export default function LoginPage() {
  return (
    <main className="auth-shell">
      <BrandPanel />

      <section className="auth-form-panel">
        <div className="auth-form-panel__inner">
          <BrandWordmark className="mobile-wordmark" priority />

          <header className="auth-header">
            <p className="section-label">Acesso seguro</p>
            <h2>Bem-vindo de volta</h2>
            <p>
              Entre com suas credenciais para acessar o painel da sua igreja.
            </p>
          </header>

          <LoginForm />

          <p className="support-note">
            Problemas para acessar?{' '}
            <span>Fale com o administrador do sistema.</span>
          </p>
        </div>

        <footer className="auth-form-panel__footer">
          <span>Ambiente protegido</span>
          <span aria-hidden="true">•</span>
          <span>Sessão segura de 12 horas</span>
        </footer>
      </section>
    </main>
  );
}
