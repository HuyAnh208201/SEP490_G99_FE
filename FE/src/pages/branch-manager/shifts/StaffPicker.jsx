import { memo } from 'react';

function StaffPicker({ title, required, employees, selectedIds, onToggle, maxTotal, currentTotal }) {
  return (
    <div className="rounded-lg border border-[var(--admin-border)]">
      <div className="flex items-center justify-between border-b border-[var(--admin-border)] bg-[#f7f9fb] px-3 py-2">
        <span className="text-sm font-semibold text-[var(--admin-text)]">
          {title}
          {required ? <span className="text-amber-700"> *</span> : null}
        </span>
        <span className="text-xs text-[var(--admin-muted)]">{selectedIds.length} selected</span>
      </div>
      <div className="max-h-56 space-y-1 overflow-y-auto p-2">
        {employees.length === 0 ? (
          <p className="px-1 py-2 text-sm text-[var(--admin-muted)]">No available staff.</p>
        ) : (
          employees.map((emp) => {
            const checked = selectedIds.includes(emp.employeeId);
            const disableAdd = !checked && currentTotal >= maxTotal;
            return (
              <label
                key={emp.employeeId}
                className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-sm ${
                  disableAdd ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:bg-[#f7f9fb]'
                }`}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  disabled={disableAdd}
                  onChange={(e) => onToggle(emp.employeeId, e.target.checked)}
                />
                <span className="min-w-0">
                  <span className="block font-medium text-[var(--admin-text)]">{emp.fullName}</span>
                  <span className="block truncate text-xs text-[var(--admin-subtle)]">{emp.email}</span>
                </span>
              </label>
            );
          })
        )}
      </div>
    </div>
  );
}

export default memo(StaffPicker);
