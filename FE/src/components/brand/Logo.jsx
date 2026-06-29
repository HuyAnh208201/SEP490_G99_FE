export default function Logo({ size = 40, className = '' }) {
  return (
    <div
      className={`flex items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-lime-400 shadow-lg shadow-emerald-500/30 ${className}`}
      style={{ width: size, height: size }}
      aria-hidden
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        width={size * 0.55}
        height={size * 0.55}
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M3 9.5 5 4h14l2 5.5"
          stroke="white"
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
        <path
          d="M4 9.5h16v9.5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V9.5Z"
          stroke="white"
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
        <path d="M9 14h6" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    </div>
  );
}
