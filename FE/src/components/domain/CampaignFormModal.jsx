import { useEffect, useMemo, useState } from 'react';
import { fetchBranches } from '../../api/branches.js';
import { createCampaign, updateCampaign } from '../../api/campaigns.js';
import { usePermissions } from '../../contexts/PermissionsContext.jsx';
import {
  CAMPAIGN_SCOPES,
  CAMPAIGN_TYPES,
  buildConditions,
  parseConditionsToForm,
  toApiDateTime,
  toDatetimeLocalValue,
} from '../../constants/campaigns.js';
import Modal from '../ui/Modal.jsx';
import Button from '../ui/Button.jsx';
import FormField from '../ui/FormField.jsx';
import MoneyInput from '../ui/MoneyInput.jsx';

const EMPTY = {
  name: '',
  type: 'PERCENT',
  discountValue: '',
  scope: 'CHAIN',
  branchIds: [],
  priority: '0',
  startAt: '',
  endAt: '',
  minOrderAmount: '',
  buyQuantity: '',
  getQuantity: '',
};

const inputClass =
  'w-full rounded-lg border border-[var(--admin-border)] bg-white px-3 py-2.5 text-sm focus:border-[#0058be] focus:outline-none focus:ring-2 focus:ring-[#0058be]/20';

function defaultScopeForRole(webRole) {
  if (webRole === 'BRANCH_MANAGER') return 'BRANCH';
  return 'CHAIN';
}

function canPickScope(webRole) {
  return webRole === 'DIRECTOR';
}

export default function CampaignFormModal({ open, onClose, onSaved, editing }) {
  const { role } = usePermissions();
  const webRole =
    role === 'MANAGER' ? 'BRANCH_MANAGER' : role === 'OWNER' ? 'DIRECTOR' : role;

  const [step, setStep] = useState('details');
  const [form, setForm] = useState(EMPTY);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const lockedScope = useMemo(() => defaultScopeForRole(webRole), [webRole]);
  const scopeEditable = canPickScope(webRole);

  useEffect(() => {
    if (!open) return;
    setStep('details');
    setError('');
    if (editing) {
      const cond = parseConditionsToForm(editing.conditions);
      setForm({
        name: editing.name || '',
        type: editing.type || 'PERCENT',
        discountValue: editing.discountValue ?? '',
        scope: editing.scope || lockedScope,
        branchIds: Array.isArray(editing.branchIds) ? editing.branchIds.map(String) : [],
        priority: String(editing.priority ?? 0),
        startAt: toDatetimeLocalValue(editing.startAt),
        endAt: toDatetimeLocalValue(editing.endAt),
        ...cond,
      });
    } else {
      setForm({ ...EMPTY, scope: lockedScope });
    }
    fetchBranches()
      .then((data) => setBranches(Array.isArray(data) ? data : []))
      .catch(() => setBranches([]));
  }, [open, editing, lockedScope]);

  function patch(updates) {
    setForm((f) => ({ ...f, ...updates }));
  }

  function toggleBranch(id) {
    const sid = String(id);
    setForm((f) => {
      const set = new Set(f.branchIds);
      if (set.has(sid)) set.delete(sid);
      else set.add(sid);
      return { ...f, branchIds: [...set] };
    });
  }

  function goToConfirm(e) {
    e.preventDefault();
    setError('');
    if (!form.name.trim()) {
      setError('Campaign name is required.');
      return;
    }
    if (!form.startAt || !form.endAt) {
      setError('Start and end dates are required.');
      return;
    }
    if (new Date(form.endAt) <= new Date(form.startAt)) {
      setError('End date must be after start date.');
      return;
    }
    const discount = Number(form.discountValue);
    if (!Number.isFinite(discount) || discount < 0) {
      setError('Discount value must be a valid number.');
      return;
    }
    if (form.type === 'BUY_X_GET_Y') {
      if (!form.buyQuantity || !form.getQuantity) {
        setError('Buy and get quantities are required for this type.');
        return;
      }
    }
    setStep('confirm');
  }

  async function handleSave() {
    setError('');
    setLoading(true);
    const scope = scopeEditable ? form.scope : lockedScope;
    const payload = {
      name: form.name.trim(),
      type: form.type,
      discountValue: Number(form.discountValue),
      conditions: buildConditions(form.type, form),
      priority: Number(form.priority) || 0,
      startAt: toApiDateTime(form.startAt),
      endAt: toApiDateTime(form.endAt),
      scope,
      branchIds:
        scope === 'CHAIN' && form.branchIds.length > 0
          ? form.branchIds.map(Number)
          : undefined,
    };

    try {
      if (editing?.id) {
        await updateCampaign(editing.id, payload);
      } else {
        await createCampaign(payload);
      }
      onSaved?.();
      onClose();
    } catch (err) {
      const fieldErrors = err.errors ? Object.values(err.errors).join('. ') : '';
      setError(fieldErrors || err.message || 'Unable to save campaign');
      setStep('confirm');
    } finally {
      setLoading(false);
    }
  }

  const scopeValue = scopeEditable ? form.scope : lockedScope;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? 'Edit campaign' : 'New campaign'}
      description={
        webRole === 'BRANCH_MANAGER'
          ? 'Branch managers can create promotions for their branch only.'
          : 'Directors can create chain-wide promotions and activate them.'
      }
      size="lg"
    >
      {step === 'details' && (
        <form onSubmit={goToConfirm} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Campaign name" required className="sm:col-span-2">
              <input
                required
                autoFocus
                value={form.name}
                onChange={(e) => patch({ name: e.target.value })}
                className={inputClass}
              />
            </FormField>

            <FormField label="Type" required>
              <select
                value={form.type}
                onChange={(e) => patch({ type: e.target.value })}
                className={inputClass}
              >
                {CAMPAIGN_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </FormField>

            <FormField
              label={form.type === 'PERCENT' ? 'Discount (%)' : 'Discount value'}
              required
              hint={form.type === 'PERCENT' ? 'e.g. 10 for 10% off' : undefined}
            >
              {form.type === 'FIXED_AMOUNT' ? (
                <MoneyInput
                  value={form.discountValue}
                  onChange={(v) => patch({ discountValue: v })}
                  required
                />
              ) : (
                <input
                  required
                  type="number"
                  min="0"
                  step={form.type === 'PERCENT' ? '0.01' : '1'}
                  value={form.discountValue}
                  onChange={(e) => patch({ discountValue: e.target.value })}
                  className={inputClass}
                />
              )}
            </FormField>

            {scopeEditable && (
              <FormField label="Scope" required>
                <select
                  value={form.scope}
                  onChange={(e) => patch({ scope: e.target.value, branchIds: [] })}
                  className={inputClass}
                >
                  {CAMPAIGN_SCOPES.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </FormField>
            )}

            {!scopeEditable && (
              <FormField label="Scope">
                <input
                  readOnly
                  value={CAMPAIGN_SCOPES.find((s) => s.value === lockedScope)?.label || lockedScope}
                  className={`${inputClass} bg-[#f7f9fb]`}
                />
              </FormField>
            )}

            <FormField label="Priority" hint="Higher runs first when multiple promos apply.">
              <input
                type="number"
                min="0"
                value={form.priority}
                onChange={(e) => patch({ priority: e.target.value })}
                className={inputClass}
              />
            </FormField>

            <FormField label="Start" required>
              <input
                required
                type="datetime-local"
                value={form.startAt}
                onChange={(e) => patch({ startAt: e.target.value })}
                className={inputClass}
              />
            </FormField>

            <FormField label="End" required>
              <input
                required
                type="datetime-local"
                value={form.endAt}
                onChange={(e) => patch({ endAt: e.target.value })}
                className={inputClass}
              />
            </FormField>

            {scopeValue === 'CHAIN' && branches.length > 0 && (
              <FormField
                label="Limit to branches"
                hint="Leave empty to apply chain-wide. Optional subset of branches."
                className="sm:col-span-2"
              >
                <div className="max-h-36 space-y-1 overflow-y-auto rounded-lg border border-[var(--admin-border)] p-2">
                  {branches.map((b) => (
                    <label key={b.id} className="flex cursor-pointer items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={form.branchIds.includes(String(b.id))}
                        onChange={() => toggleBranch(b.id)}
                      />
                      {b.name}
                    </label>
                  ))}
                </div>
              </FormField>
            )}
          </div>

          <div className="rounded-xl border border-[var(--admin-border)] bg-[#f7f9fb] p-4 space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--admin-muted)]">
              Conditions (optional)
            </p>
            {form.type === 'BUY_X_GET_Y' ? (
              <div className="grid gap-3 sm:grid-cols-2">
                <FormField label="Buy quantity" required>
                  <input
                    required
                    type="number"
                    min="1"
                    value={form.buyQuantity}
                    onChange={(e) => patch({ buyQuantity: e.target.value })}
                    className={inputClass}
                  />
                </FormField>
                <FormField label="Get quantity" required>
                  <input
                    required
                    type="number"
                    min="1"
                    value={form.getQuantity}
                    onChange={(e) => patch({ getQuantity: e.target.value })}
                    className={inputClass}
                  />
                </FormField>
              </div>
            ) : (
              <FormField label="Minimum order amount (₫)" hint="Leave blank for no minimum.">
                <MoneyInput
                  value={form.minOrderAmount}
                  onChange={(v) => patch({ minOrderAmount: v })}
                />
              </FormField>
            )}
          </div>

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-2 border-t border-[var(--admin-border)] pt-4">
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit">Continue</Button>
          </div>
        </form>
      )}

      {step === 'confirm' && (
        <div className="space-y-4">
          <div className="rounded-xl border border-[var(--admin-border)] bg-[#f7f9fb] p-4 text-sm">
            <dl className="space-y-2">
              <div className="flex justify-between gap-4">
                <dt className="text-[var(--admin-muted)]">Name</dt>
                <dd className="font-medium">{form.name}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-[var(--admin-muted)]">Type</dt>
                <dd>{CAMPAIGN_TYPES.find((t) => t.value === form.type)?.label}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-[var(--admin-muted)]">Scope</dt>
                <dd>{scopeValue}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-[var(--admin-muted)]">Period</dt>
                <dd className="text-right text-xs">
                  {form.startAt} → {form.endAt}
                </dd>
              </div>
            </dl>
          </div>

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-2 border-t border-[var(--admin-border)] pt-4">
            <Button type="button" variant="secondary" onClick={() => setStep('details')}>
              Back
            </Button>
            <Button onClick={handleSave} loading={loading}>
              {editing ? 'Save changes' : 'Create campaign'}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
