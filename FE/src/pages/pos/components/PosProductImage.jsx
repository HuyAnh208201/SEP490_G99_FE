import { useState } from 'react';

function ProductPlaceholder({ name, className, accent }) {
  return (
    <div
      className={`flex items-center justify-center ${className}`}
      style={{
        backgroundColor: accent?.tint ?? '#f3f8ff',
        color: accent?.text ?? 'var(--admin-brand)',
      }}
      aria-label={`${name || 'Product'} image placeholder`}
    >
      <svg viewBox="0 0 48 48" className="h-12 w-12" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M10 16 24 9l14 7-14 7-14-7Z" strokeLinejoin="round" />
        <path d="M10 16v16l14 7 14-7V16M24 23v16" strokeLinejoin="round" />
        <path d="m17 12.5 14 7" opacity=".45" />
      </svg>
    </div>
  );
}

export default function PosProductImage({ src, name, accent, className = 'h-24 w-full rounded-lg' }) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return <ProductPlaceholder name={name} className={className} accent={accent} />;
  }

  return (
    <img
      src={src}
      alt={name || 'Product'}
      loading="lazy"
      onError={() => setFailed(true)}
      className={`object-contain bg-white ${className}`}
    />
  );
}
