import { BrandWordmark } from './brand-wordmark';

export function BrandPanel() {
  return (
    <aside className="brand-panel" aria-label="Universal Gestão Financeira">
      <div className="brand-panel__grid" aria-hidden="true" />

      <BrandWordmark priority />

      <div className="brand-panel__content">
        <p className="section-label section-label--light">
          Painel administrativo
        </p>
        <h1>Clareza para cuidar. Segurança para servir.</h1>
        <p>
          Uma visão responsável das contribuições, com isolamento por igreja e
          rastreabilidade para cada operação.
        </p>
      </div>

      <ul className="trust-list" aria-label="Características da plataforma">
        <li>
          <span className="trust-list__icon" aria-hidden="true">
            01
          </span>
          <span>
            <strong>Multi-igreja</strong>
            Dados separados por congregação
          </span>
        </li>
        <li>
          <span className="trust-list__icon" aria-hidden="true">
            02
          </span>
          <span>
            <strong>Auditoria contínua</strong>
            Histórico íntegro e verificável
          </span>
        </li>
        <li>
          <span className="trust-list__icon" aria-hidden="true">
            03
          </span>
          <span>
            <strong>Acesso protegido</strong>
            Permissões definidas por função
          </span>
        </li>
      </ul>

      <p className="brand-panel__footer">
        Universal • Sistema de Gestão Financeira
      </p>
    </aside>
  );
}
