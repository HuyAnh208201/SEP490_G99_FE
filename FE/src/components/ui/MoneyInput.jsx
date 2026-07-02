import { useEffect, useState } from 'react';
import { formatMoneyInput, parseMoneyInput } from '../../lib/money.js';

const inputClass =
  'w-full rounded-lg border border-[var(--admin-border)] bg-white py-2.5 pl-3 pr-10 text-sm tabular-nums focus:border-[#0058be] focus:outline-none focus:ring-2 focus:ring-[#0058be]/20';

export default function MoneyInput({ value, onChange, placeholder = '0', required, id, name }) {
  const [display, setDisplay] = useState(() => formatMoneyInput(value));

  useEffect(() => {
    setDisplay(formatMoneyInput(value));
  }, [value]);

  function handleChange(e) {
    const raw = e.target.value;
    setDisplay(raw);
    const parsed = parseMoneyInput(raw);
    onChange(parsed);
  }

  function handleBlur() {
    setDisplay(formatMoneyInput(value));
  }

  return (
    <div className="relative">
      <input
        id={id}
        name={name}
        type="text"
        inputMode="decimal"
        autoComplete="off"
        required={required}
        value={display}
        onChange={handleChange}
        onBlur={handleBlur}
        placeholder={placeholder}
        className={inputClass}
      />
      <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs font-medium text-[var(--admin-subtle)]">
        ₫
      </span>
    </div>
  );
}
