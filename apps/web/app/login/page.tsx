import { BrandPanel } from '../components/brand-panel';
import { LoginForm } from './login-form';

export default function LoginPage() {
  return (
    <main className="auth-shell">
      <BrandPanel />

      <section className="auth-form-panel">
        <div className="auth-form-panel__inner">
          <div className="mobile-wordmark wordmark">
            <span className="wordmark__symbol" aria-hidden="true">
              U
            </span>
            <span className="wordmark__copy">
              <strong>Universal</strong>
              <small>Gestão Financeira</small>
            </span>
          </div>

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
