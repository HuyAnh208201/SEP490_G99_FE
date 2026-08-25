import Button from '../../../components/ui/Button.jsx';
import FormField from '../../../components/ui/FormField.jsx';
import Modal from '../../../components/ui/Modal.jsx';
import MoneyInput from '../../../components/ui/MoneyInput.jsx';
import StaffPicker from './StaffPicker.jsx';
import { MAX_EMPLOYEES_PER_SHIFT } from './shiftGrid.js';

export default function AssignModal({
  assignCtx,
  needsIs,
  assignTotal,
  canSave,
  assignError,
  availableLoading,
  availableCashiers,
  availableIs,
  cashierIds,
  inventoryIds,
  openingCash,
  busy,
  onClose,
  onClear,
  onSave,
  onToggle,
  onOpeningCashChange,
}) {
  return (
    <Modal
      open={Boolean(assignCtx)}
      onClose={onClose}
      title="Assign staff"
      description={
        assignCtx
          ? `${assignCtx.date} · ${assignCtx.slot.start} – ${assignCtx.slot.end}${
              needsIs ? ' · Cashier + Inventory Staff required' : ' · Cashier required'
            } · max ${MAX_EMPLOYEES_PER_SHIFT}`
          : undefined
      }
      size="lg"
      footer={
        <div className="flex flex-wrap justify-between gap-2">
          <Button
            variant="ghost"
            className="!text-red-600"
            disabled={busy === 'assign' || availableLoading}
            onClick={onClear}
          >
            Clear selection
          </Button>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button loading={busy === 'assign'} disabled={!canSave} onClick={onSave}>
              Save
            </Button>
          </div>
        </div>
      }
    >
      {assignCtx && (
        <div className="space-y-4">
          <p className="text-xs font-medium text-[var(--admin-muted)]">
            {assignTotal}/{MAX_EMPLOYEES_PER_SHIFT} selected
          </p>
          {assignError && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {assignError}
            </div>
          )}
          {assignCtx.slot.isFirst && (
            <div className="rounded-lg border border-[var(--admin-border)] bg-[#f7f9fb] p-3">
              <FormField label="Opening cash">
                <MoneyInput value={openingCash} onChange={onOpeningCashChange} placeholder="0" />
              </FormField>
            </div>
          )}
          {availableLoading ? (
            <p className="text-sm text-[var(--admin-muted)]">Loading available staff…</p>
          ) : (
            <div className={`grid gap-4 ${needsIs ? 'sm:grid-cols-2' : 'grid-cols-1'}`}>
              <StaffPicker
                title="Cashiers"
                required
                employees={availableCashiers}
                selectedIds={cashierIds}
                maxTotal={MAX_EMPLOYEES_PER_SHIFT}
                currentTotal={assignTotal}
                onToggle={(id, checked) => onToggle('CASHIER', id, checked)}
              />
              {(needsIs || inventoryIds.length > 0) && (
                <StaffPicker
                  title="Inventory staff"
                  required={needsIs}
                  employees={availableIs}
                  selectedIds={inventoryIds}
                  maxTotal={MAX_EMPLOYEES_PER_SHIFT}
                  currentTotal={assignTotal}
                  onToggle={(id, checked) => onToggle('INVENTORY_STAFF', id, checked)}
                />
              )}
            </div>
          )}
          <p className="text-xs text-[var(--admin-subtle)]">
            Saving with no one selected clears this slot. The shift is created only when you save.
          </p>
        </div>
      )}
    </Modal>
  );
}
