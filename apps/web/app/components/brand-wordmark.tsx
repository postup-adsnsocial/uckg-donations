import Image from 'next/image';

interface BrandWordmarkProps {
  className?: string;
  productName: string;
  priority?: boolean;
}

export function BrandWordmark({
  className = '',
  productName,
  priority = false,
}: BrandWordmarkProps) {
  return (
    <div className={`wordmark ${className}`.trim()}>
      <span className="wordmark__symbol">
        <Image
          alt=""
          height={96}
          priority={priority}
          src="/program-logo.png"
          width={96}
        />
      </span>
      <span className="wordmark__copy">
        <strong>{productName}</strong>
      </span>
    </div>
  );
}
