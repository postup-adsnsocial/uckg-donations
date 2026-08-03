import Image from 'next/image';

interface BrandWordmarkProps {
  className?: string;
  priority?: boolean;
}

export function BrandWordmark({
  className = '',
  priority = false,
}: BrandWordmarkProps) {
  return (
    <div className={`wordmark ${className}`.trim()}>
      <span className="wordmark__symbol">
        <Image
          alt=""
          height={490}
          priority={priority}
          src="/universal-logo.png"
          width={625}
        />
      </span>
      <span className="wordmark__copy">
        <strong>Universal</strong>
        <small>Gestão Financeira</small>
      </span>
    </div>
  );
}
