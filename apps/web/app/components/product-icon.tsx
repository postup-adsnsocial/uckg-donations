export type ProductIconName =
  | 'churches'
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
        <path d="M4 21V10.5L12 5l8 5.5V21" />
        <path d="M9 21v-5.5a3 3 0 0 1 6 0V21M2.5 21h19M12 5V2M10 3.5h4" />
        <path d="M7.5 11.5h.01M16.5 11.5h.01" />
      </svg>
    );
  }

  if (name === 'members') {
    return (
      <svg {...sharedProps}>
        <circle cx="9" cy="7.5" r="3.5" />
        <path d="M3 21v-2.2A4.8 4.8 0 0 1 7.8 14h2.4a4.8 4.8 0 0 1 4.8 4.8V21" />
        <path d="M15.5 4.5a3.4 3.4 0 0 1 0 6.1M21 21v-2.2a4.8 4.8 0 0 0-3.2-4.5" />
      </svg>
    );
  }

  if (name === 'users') {
    return (
      <svg {...sharedProps}>
        <circle cx="8" cy="8" r="3" />
        <path d="M2.5 20v-1.6A4.4 4.4 0 0 1 6.9 14h2.2a4.4 4.4 0 0 1 4.4 4.4V20" />
        <path d="M16 8h6M19 5v6M15.5 14.5a4 4 0 0 1 6 3.5v2" />
      </svg>
    );
  }

  if (name === 'profile') {
    return (
      <svg {...sharedProps}>
        <circle cx="12" cy="8" r="4" />
        <path d="M4 21a8 8 0 0 1 16 0" />
      </svg>
    );
  }

  if (name === 'launch') {
    return (
      <svg {...sharedProps}>
        <path d="M3 7.5h18v12H3zM3.5 8l8.5 6 8.5-6" />
        <circle cx="18.5" cy="5.5" r="3.5" />
        <path d="M18.5 3.8v3.4M16.8 5.5h3.4" />
      </svg>
    );
  }

  if (name === 'reports') {
    return (
      <svg {...sharedProps}>
        <path d="M5 3h10l4 4v14H5zM15 3v5h4" />
        <path d="M9 17v-3M12 17v-6M15 17v-4" />
      </svg>
    );
  }

  if (name === 'logout') {
    return (
      <svg {...sharedProps}>
        <path d="M10 4H5v16h5M14 8l4 4-4 4M8 12h10" />
      </svg>
    );
  }

  return (
    <svg {...sharedProps}>
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
    </svg>
  );
}
