import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';

const inputClass =
  'w-full rounded-lg border-2 border-dashed border-[#0058be]/30 bg-[#f0f6ff] px-3 py-3 font-mono text-base tracking-wider text-[var(--admin-text)] placeholder:font-sans placeholder:text-sm placeholder:tracking-normal placeholder:text-[var(--admin-subtle)] focus:border-[#0058be] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0058be]/20';

/**
 * Scanner-friendly barcode field for POS hardware input.
 * - Monospace, prominent border
 * - autofocus for USB/Bluetooth scanners (rapid digits + Enter)
 */
const BarcodeInput = forwardRef(function BarcodeInput(
  {
    value,
    onChange,
    onScan,
    onGenerate,
    generating,
    label = 'Barcode',
    hint,
    required,
    autoFocus,
    id,
    name,
  },
  ref,
) {
  const innerRef = useRef(null);
  useImperativeHandle(ref, () => innerRef.current);

  useEffect(() => {
    if (autoFocus && innerRef.current) {
      innerRef.current.focus();
    }
  }, [autoFocus]);

  function handleKeyDown(e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      onScan?.(value);
      innerRef.current?.select();
    }
  }

  function handleChange(e) {
    const next = e.target.value.replace(/[^\dA-Za-z-]/g, '');
    onChange(next);
  }

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-[var(--admin-muted)]">
          {label}
          {required && <span className="text-[var(--admin-danger)]"> *</span>}
        </span>
        <span className="rounded-full bg-[#0058be]/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#0058be]">
          Scan ready
        </span>
        {onGenerate && (
          <button
            type="button"
            onClick={onGenerate}
            disabled={generating}
            className="rounded-lg border border-[#0058be]/30 bg-white px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#0058be] hover:bg-[#f0f6ff] disabled:opacity-60"
          >
            {generating ? 'Generating…' : 'Generate'}
          </button>
        )}
      </div>
      <div className="relative">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--admin-subtle)]">
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.6">
            <path d="M4 6h2v12H4zM8 6h1v12H8zM11 6h2v12h-2zM15 6h1v12h-1zM18 6h2v12h-2z" />
          </svg>
        </span>
        <input
          ref={innerRef}
          id={id}
          name={name}
          type="text"
          inputMode="numeric"
          autoComplete="off"
          spellCheck={false}
          required={required}
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder="Scan or type EAN / UPC…"
          className={`${inputClass} pl-10`}
        />
      </div>
      {hint && <p className="text-xs text-[var(--admin-subtle)]">{hint}</p>}
    </div>
  );
});

export default BarcodeInput;
