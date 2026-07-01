import Badge from './Badge.jsx';

export default function DraftNotice({ children }) {
  return (
    <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50/80 px-4 py-3 text-sm text-amber-900">
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone="soon">Local draft</Badge>
        <span>
          {children ||
            'Backend CRUD is not available yet. Records are saved in this browser until the API is ready.'}
        </span>
      </div>
    </div>
  );
}
