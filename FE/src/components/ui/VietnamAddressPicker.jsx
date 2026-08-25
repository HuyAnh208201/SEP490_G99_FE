import { useMemo } from 'react';
import { composeAddress, getDistricts, getProvinces } from '../../lib/vietnamAddress.js';
import FormField from './FormField.jsx';

const selectClass =
  'w-full rounded-lg border border-[var(--admin-border)] bg-white px-3 py-2.5 text-sm focus:border-[#0058be] focus:outline-none focus:ring-2 focus:ring-[#0058be]/20';

export default function VietnamAddressPicker({
  street,
  provinceId,
  districtId,
  onChange,
  streetError,
  locationError,
}) {
  const provinces = useMemo(() => getProvinces(), []);
  const districts = useMemo(() => getDistricts(provinceId), [provinceId]);

  const preview = composeAddress({ street, provinceId, districtId });

  return (
    <div className="space-y-4">
      <FormField label="Province / City" required error={locationError && !provinceId ? locationError : ''}>
        <select
          required
          value={provinceId}
          onChange={(e) =>
            onChange({ street, provinceId: e.target.value, districtId: '' })
          }
          className={selectClass}
        >
          <option value="">Select province / city (A–Z)</option>
          {provinces.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </FormField>

      <FormField label="District" required error={locationError && provinceId && !districtId ? locationError : ''}>
        <select
          required
          disabled={!provinceId}
          value={districtId}
          onChange={(e) => onChange({ street, provinceId, districtId: e.target.value })}
          className={`${selectClass} disabled:cursor-not-allowed disabled:bg-[#f7f9fb]`}
        >
          <option value="">{provinceId ? 'Select district (A–Z)' : 'Choose province first'}</option>
          {districts.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>
      </FormField>

      <FormField
        label="Street address"
        required
        error={streetError}
      >
        <input
          required
          value={street}
          onChange={(e) => onChange({ street: e.target.value, provinceId, districtId })}
          placeholder="e.g. 123 Main Street"
          className={selectClass}
        />
      </FormField>

      {preview && (
        <p className="rounded-lg border border-[var(--admin-border)] bg-[#f7f9fb] px-3 py-2 text-sm text-[var(--admin-muted)]">
          Full address: <strong className="text-[var(--admin-text)]">{preview}</strong>
        </p>
      )}
    </div>
  );
}
