export type ProductIconName =
  | 'annual-book'
  | 'churches'
  | 'envelopes'
  | 'launch'
  | 'logout'
  | 'members'
  | 'overview'
  | 'profile'
  | 'reports'
  | 'users';

interface ProductIconProps {
  className?: string;
  name: ProductIconName;
}

export function ProductIcon({ className = '', name }: ProductIconProps) {
  const sharedProps = {
    'aria-hidden': true,
    className,
    viewBox: '0 0 24 24',
  } as const;

  if (name === 'churches') {
    return (
      <svg {...sharedProps}>
        <path d="M4 20V10l8-5.5 8 5.5v10" />
        <path d="M9 20v-4.5a3 3 0 0 1 6 0V20M2.5 20h19M12 4.5V2M9.5 2h5" />
        <path d="M7.5 11.5h.01M16.5 11.5h.01" />
      </svg>
    );
  }

  if (name === 'members') {
    return (
      <svg {...sharedProps}>
        <rect x="3" y="4" width="18" height="16" rx="3" />
        <circle cx="8.5" cy="9.5" r="2.3" />
        <path d="M5.5 16a3.3 3.3 0 0 1 6 0M14.5 9h3.5M14.5 13h3.5" />
      </svg>
    );
  }

  if (name === 'envelopes') {
    return (
      <svg {...sharedProps}>
        <rect x="3" y="5" width="18" height="14" rx="3" />
        <path d="m4.5 7 7.5 6 7.5-6M4.5 17l5.5-5M19.5 17 14 12" />
      </svg>
    );
  }

  if (name === 'users') {
    return (
      <svg {...sharedProps}>
        <circle cx="8" cy="8" r="3" />
        <circle cx="16.5" cy="9" r="2.5" />
        <path d="M2.5 20v-1.2A4.8 4.8 0 0 1 7.3 14h1.4a4.8 4.8 0 0 1 4.8 4.8V20" />
        <path d="M14 14.5h1.7a4.8 4.8 0 0 1 4.8 4.8v.7" />
      </svg>
    );
  }

  if (name === 'profile') {
    return (
      <svg {...sharedProps}>
        <circle cx="12" cy="12" r="9" />
        <circle cx="12" cy="9" r="3" />
        <path d="M6.5 19a5.8 5.8 0 0 1 11 0" />
      </svg>
    );
  }

  if (name === 'launch') {
    return (
      <svg {...sharedProps}>
        <rect x="5" y="3" width="14" height="18" rx="3" />
        <path d="M9 9h6M12 6v6M8.5 16h7M8.5 19h4" />
      </svg>
    );
  }

  if (name === 'reports') {
    return (
      <svg {...sharedProps}>
        <path d="M5 3h10l4 4v14H5zM15 3v5h4" />
        <path d="M9 17v-3M12 17v-6M15 17v-4M8.5 10h2" />
      </svg>
    );
  }

  if (name === 'annual-book') {
    return (
      <svg {...sharedProps}>
        <path d="M4 4.5A2.5 2.5 0 0 1 6.5 2H12v18H6.5A2.5 2.5 0 0 0 4 22z" />
        <path d="M20 4.5A2.5 2.5 0 0 0 17.5 2H12v18h5.5A2.5 2.5 0 0 1 20 22zM7 7h2M15 7h2M7 11h2M15 11h2" />
      </svg>
    );
  }

  if (name === 'logout') {
    return (
      <svg {...sharedProps}>
        <path d="M10 4H5v16h5M14 8l4 4-4 4M9 12h9" />
      </svg>
    );
  }

  return (
    <svg {...sharedProps}>
      <rect x="3" y="3" width="7" height="7" rx="2" />
      <rect x="14" y="3" width="7" height="7" rx="2" />
      <rect x="3" y="14" width="7" height="7" rx="2" />
      <rect x="14" y="14" width="7" height="7" rx="2" />
    </svg>
  );
}
