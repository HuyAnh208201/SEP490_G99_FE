const ICONS = {
  dashboard: (
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.7"
      d="M4 5h6v6H4V5zm10 0h6v10h-6V5zM4 13h6v6H4v-6zm10 4h6v2h-6v-2z"
    />
  ),
  users: (
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.7"
      d="M16 19v-1a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v1M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm11 8v-1a4 4 0 0 0-3-3.87M19 7a4 4 0 1 1-8 0"
    />
  ),
  store: (
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.7"
      d="M3 9.5 5 4h14l2 5.5M4 9.5h16V19a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V9.5z"
    />
  ),
  tag: (
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.7"
      d="M20 12V8a2 2 0 0 0-2-2h-4M4 12V8a2 2 0 0 1 2-2h4m0 12 8-8-8-8-8 8 8 8z"
    />
  ),
  settings: (
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.7"
      d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zm8.5-3.5a6.5 6.5 0 0 0-.1-1l2-1.6-2-3.4-2.4 1a6.8 6.8 0 0 0-1.7-1l-.4-2.6H9.1l-.4 2.6a6.8 6.8 0 0 0-1.7 1l-2.4-1-2 3.4 2 1.6a6.5 6.5 0 0 0 0 2l-2 1.6 2 3.4 2.4-1c.5.4 1.1.7 1.7 1l.4 2.6h4.8l.4-2.6c.6-.3 1.2-.6 1.7-1l2.4 1 2-3.4-2-1.6c.1-.3.1-.7.1-1z"
    />
  ),
  folder: (
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.7"
      d="M3 7h6l2 2h10v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z"
    />
  ),
  package: (
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.7"
      d="M12 3 3 8l9 5 9-5-9-5zm0 10-9-5v8l9 5 9-5v-8l-9 5z"
    />
  ),
  truck: (
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.7"
      d="M3 17h1m13 0h1M5 17h10M3 12h12l3 4v1H3v-5zm3-4h6l3 4"
    />
  ),
  warehouse: (
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.7"
      d="M3 10 12 4l9 6v9H3v-9zm6 9v-5h6v5"
    />
  ),
  boxes: (
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.7"
      d="M4 7h16v12H4V7zm4 0V4h8v3M8 11h8"
    />
  ),
  inbox: (
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.7"
      d="M4 6h16v12H4V6zm4 6h8l2 4H6l2-4z"
    />
  ),
  dispatch: (
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.7"
      d="M5 12h12m0 0-4-4m4 4-4 4M19 5v14"
    />
  ),
  request: (
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.7"
      d="M9 5H5a2 2 0 0 0-2 2v12l4-2 4 2 4-2 4 2V7a2 2 0 0 0-2-2h-4M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2"
    />
  ),
  branch: (
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.7"
      d="M12 3v18M7 8h10M7 12h6"
    />
  ),
  staff: (
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.7"
      d="M17 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8"
    />
  ),
  clock: (
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.7"
      d="M12 8v4l3 2M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z"
    />
  ),
  cash: (
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.7"
      d="M12 3v18M7 8c0 2.2 2.2 4 5 4s5-1.8 5-4M7 16c0-2.2 2.2-4 5-4s5 1.8 5 4"
    />
  ),
  chart: (
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.7"
      d="M4 19V9m6 10V5m6 14v-8m6 8V3"
    />
  ),
  report: (
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.7"
      d="M6 4h9l3 3v13H6V4zm3 8h6m-6 4h9"
    />
  ),
  plan: (
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.7"
      d="M4 6h16M4 12h10M4 18h14"
    />
  ),
  user: (
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.7"
      d="M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4zm-8 9a8 8 0 0 1 16 0"
    />
  ),
  lock: (
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.7"
      d="M8 11V7a4 4 0 1 1 8 0v4M6 11h12v10H6V11z"
    />
  ),
};

export default function NavIcon({ name, className = 'h-5 w-5' }) {
  const path = ICONS[name];
  if (!path) return null;
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      {path}
    </svg>
  );
}
