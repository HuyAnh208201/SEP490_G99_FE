import { forwardRef, useId } from 'react';

const Input = forwardRef(function Input(
  { label, error, hint, rightSlot, className = '', id: idProp, ...rest },
  ref,
) {
  const reactId = useId();
  const id = idProp || `in-${reactId}`;

  return (
    <div className="w-full">
      {label && (
        <label
          htmlFor={id}
          className="mb-1.5 block text-sm font-medium text-slate-700"
        >
          {label}
        </label>
      )}
      <div className="relative">
        <input
          id={id}
          ref={ref}
          className={`block w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 transition focus:border-emerald-400 focus:bg-white focus:outline-none focus:ring-4 focus:ring-emerald-100 ${
            rightSlot ? 'pr-11' : ''
          } ${error ? 'border-rose-300 bg-rose-50 focus:border-rose-400 focus:ring-rose-100' : ''} ${className}`}
          {...rest}
        />
        {rightSlot && (
          <div className="absolute inset-y-0 right-2 flex items-center">
            {rightSlot}
          </div>
        )}
      </div>
      {hint && !error && (
        <p className="mt-1.5 text-xs text-slate-500">{hint}</p>
      )}
      {error && <p className="mt-1.5 text-xs text-rose-600">{error}</p>}
    </div>
  );
});

export default Input;
