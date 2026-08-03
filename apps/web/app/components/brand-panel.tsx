import { BrandWordmark } from './brand-wordmark';
import type { Dictionary } from '../i18n/dictionaries';

interface BrandPanelProps {
  copy: Dictionary['brand'];
}

export function BrandPanel({ copy }: BrandPanelProps) {
  return (
    <aside className="brand-panel" aria-label={`Universal ${copy.productName}`}>
      <div className="brand-panel__grid" aria-hidden="true" />

      <BrandWordmark priority productName={copy.productName} />

      <div className="brand-panel__content">
        <p className="section-label section-label--light">
          {copy.administrativePanel}
        </p>
        <h1>{copy.title}</h1>
        <p>{copy.description}</p>
      </div>

      <ul className="trust-list" aria-label={copy.featuresLabel}>
        {copy.features.map((feature, index) => (
          <li key={feature.title}>
            <span className="trust-list__icon" aria-hidden="true">
              {String(index + 1).padStart(2, '0')}
            </span>
            <span>
              <strong>{feature.title}</strong>
              {feature.description}
            </span>
          </li>
        ))}
      </ul>

      <p className="brand-panel__footer">{copy.footer}</p>
    </aside>
  );
}
