import { Link } from 'react-router-dom';
import Card from '../ui/Card.jsx';

export default function DashboardQuickLinks({ links, title = 'Shortcuts' }) {
  if (!links?.length) return null;
  return (
    <Card>
      <h2 className="text-sm font-semibold text-[var(--admin-text)]">{title}</h2>
      <ul className="mt-3 grid gap-1 sm:grid-cols-2">
        {links.map((link) => (
          <li key={link.to}>
            <Link
              to={link.to}
              className="flex items-center justify-between rounded-lg px-3 py-2 text-sm font-medium text-[var(--admin-brand)] transition hover:bg-[#0058be]/5"
            >
              {link.label}
              <span aria-hidden>→</span>
            </Link>
          </li>
        ))}
      </ul>
    </Card>
  );
}
