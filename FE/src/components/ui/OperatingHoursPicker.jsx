import {
  HOUR_PRESETS,
  formatOperatingHours,
  validateOperatingHours,
} from '../../lib/operatingHours.js';
import FormField from './FormField.jsx';

const timeClass =
  'w-full rounded-lg border border-[var(--admin-border)] bg-white px-3 py-2.5 text-sm focus:border-[#0058be] focus:outline-none focus:ring-2 focus:ring-[#0058be]/20';

export default function OperatingHoursPicker({ open, close, onChange, error: externalError }) {
  const validation = validateOperatingHours(open, close);
  const preview = formatOperatingHours(open, close);
  const error = externalError || validation;

  function setPreset(preset) {
    onChange({ open: preset.open, close: preset.close });
  }

  return (
    <FormField
      label="Operating hours"
      required
      error={error}
    >
      <div className="space-y-3">
        <div className="flex flex-wrap gap-2">
          {HOUR_PRESETS.map((p) => (
            <button
              key={p.label}
              type="button"
              onClick={() => setPreset(p)}
              className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                open === p.open && close === p.close
                  ? 'border-[#0058be] bg-[#0058be]/10 text-[#0058be]'
                  : 'border-[var(--admin-border)] text-[var(--admin-muted)] hover:border-[#0058be]/40'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <label className="block space-y-1">
            <span className="text-[11px] font-medium text-[var(--admin-subtle)]">Opens</span>
            <input
              type="time"
              required
              value={open}
              onChange={(e) => onChange({ open: e.target.value, close })}
              className={timeClass}
            />
          </label>
          <label className="block space-y-1">
            <span className="text-[11px] font-medium text-[var(--admin-subtle)]">Closes</span>
            <input
              type="time"
              required
              value={close}
              onChange={(e) => onChange({ open, close: e.target.value })}
              className={timeClass}
            />
          </label>
        </div>

        {preview && !error && (
          <p className="rounded-lg bg-[#f7f9fb] px-3 py-2 text-sm text-[var(--admin-muted)]">
            Display: <strong className="text-[var(--admin-text)]">{preview}</strong>
          </p>
        )}
      </div>
    </FormField>
  );
}
